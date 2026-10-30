import { prisma, User } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import { generateToken } from '@/utils/helper';
import redis from '@/utils/redisClient';
import { emailService } from '@/services/EmailService';
import { hashPassword, comparePassword } from '@/utils/bcrypt';
import { userService } from './UserService';
import { registerInput, loginInput, changeAuthInput, verificationInput } from '../utils/auth-input';
import {
  authKey,
  authStoreCall,
  consumeVerification,
  limitAuth,
  newVerificationCode,
  verificationDigest,
} from '../utils/auth-security';
import { z } from 'zod';

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid account details');
  return parsed.data;
}

class AuthService {
  async register(input: unknown): Promise<string> {
    const userData = parseInput(registerInput, input);
    await limitAuth(redis, 'register', userData.email, 5, 3600);
    if (await prisma.user.findUnique({ where: { email: userData.email } })) {
      throw new HttpError(400, 'Email already exists');
    }

    const password = await hashPassword(userData.password);
    return prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          gender: userData.gender,
          password,
        },
        select: { id: true },
      });
      const token = generateToken(user.id);
      await tx.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
      return token;
    });
  }

  async login(input: unknown): Promise<string> {
    const userData = parseInput(loginInput, input);
    await limitAuth(redis, 'login', userData.email, 10, 15 * 60);
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      // Match a password check's work without exposing account existence by timing.
      await hashPassword(userData.password);
      throw new HttpError(401, 'Invalid email or password');
    }

    const isPasswordValid = await comparePassword(userData.password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, 'Invalid email or password');
    }

    return prisma.$transaction(async tx => {
      // Serialize against password changes. A login which checked the old hash
      // must not create a new session after the password-change revocation.
      const rows = await tx.$queryRaw<Array<{ password: string; email: string }>>`
        SELECT password, email FROM users WHERE id = ${user.id} FOR UPDATE
      `;
      if (rows[0]?.password !== user.password || rows[0]?.email !== user.email) {
        throw new HttpError(401, 'Invalid email or password');
      }
      const token = generateToken(user.id);
      await tx.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
      return token;
    });
  }

  async changeAuthProfile(
    userId: number,
    oldPassword: string,
    input: Partial<Pick<User, 'password' | 'phone' | 'email'>>
  ) {
    const { oldPassword: validatedPassword, ...newData } = parseInput(changeAuthInput, {
      ...input,
      oldPassword,
    });
    await limitAuth(redis, 'change-profile', String(userId), 10, 15 * 60);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }

    const isOldPasswordValid = await comparePassword(validatedPassword, user.password);
    if (!isOldPasswordValid) {
      throw new HttpError(400, 'Invalid old password');
    }

    if (newData.password && (await comparePassword(newData.password, user.password))) {
      throw new HttpError(400, 'New password cannot be the same as the old password');
    }

    const emailChanged = newData.email !== undefined && newData.email !== user.email.toLowerCase();
    if (emailChanged && (await prisma.user.findUnique({ where: { email: newData.email } }))) {
      throw new HttpError(400, 'Email already exists');
    }

    if (
      newData.phone &&
      newData.phone !== user.phone &&
      (await prisma.user.findUnique({ where: { phone: newData.phone } }))
    ) {
      throw new HttpError(400, 'Phone number already exists');
    }

    const changes: Partial<Pick<User, 'password' | 'email' | 'phone' | 'emailVerified'>> = {};
    if (newData.password) changes.password = await hashPassword(newData.password);
    if (newData.phone !== undefined && newData.phone !== user.phone) changes.phone = newData.phone;
    if (newData.email !== undefined && newData.email !== user.email) changes.email = newData.email;
    if (emailChanged) changes.emailVerified = false;
    if (!Object.keys(changes).length) return userService.getProfile(userId);
    await prisma.$transaction(async tx => {
      const updated = await tx.user.updateMany({
        where: { id: userId, password: user.password, email: user.email },
        data: changes,
      });
      if (updated.count !== 1) throw new HttpError(409, 'Account changed. Please sign in again.');
      if (newData.password) await tx.userSession.deleteMany({ where: { userId } });
    });

    return userService.getProfile(userId);
  }

  async sendVerificationEmail(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }

    if (user.emailVerified) return;
    if (!(await emailService.availability()).available)
      throw new HttpError(503, 'Email verification is not available');
    await limitAuth(redis, 'email-send-minute', String(userId), 1, 60);
    await limitAuth(redis, 'email-send-day', String(userId), 10, 24 * 3600);
    const verificationCode = newVerificationCode();
    await authStoreCall(redis, () =>
      redis.setEx(
        authKey('email-code', user.email),
        60 * 30,
        verificationDigest(user.email, verificationCode)
      )
    );

    try {
      await emailService.sendVerificationCode(user.email, verificationCode);
    } catch {
      await consumeVerification(redis, user.email, verificationCode);
      throw new HttpError(503, 'Email delivery temporarily unavailable');
    }
  }

  async verifyEmail(rawEmail: string, rawCode: number) {
    const { email, code } = parseInput(verificationInput, { email: rawEmail, code: rawCode });
    await limitAuth(redis, 'email-verify', email, 5, 10 * 60);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }

    if (user.emailVerified) {
      throw new HttpError(400, 'Email already verified');
    }

    if (!(await consumeVerification(redis, user.email, code))) {
      throw new HttpError(400, 'Incorrect verification code');
    }

    const updated = await prisma.user.updateMany({
      where: { id: user.id, email: user.email, emailVerified: false },
      data: { emailVerified: true },
    });
    if (updated.count !== 1)
      throw new HttpError(409, 'Email changed. Request a new verification code.');
  }

  async logout(userId: number, token: string) {
    await prisma.userSession.deleteMany({ where: { userId, token } });
  }

  async capabilities() {
    return {
      emailVerification: (await emailService.availability()).available,
      verificationResendSeconds: 60,
    };
  }
}
export const authService = new AuthService();
