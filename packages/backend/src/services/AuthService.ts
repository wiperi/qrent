import { Prisma, prisma, User } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import { generateToken } from '@/utils/helper';
import redis from '@/utils/redisClient';
import { emailService } from '@/services/EmailService';
import { hashPassword, comparePassword } from '@/utils/bcrypt';
import { userService } from './UserService';

class AuthService {
  async register(userData: User): Promise<string> {
    if (await prisma.user.findUnique({ where: { email: userData.email } })) {
      throw new HttpError(400, 'Email already exists');
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: await hashPassword(userData.password),
      },
    });

    // Generate JWT token
    const token = generateToken(user.id);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }

  async login(userData: Pick<User, 'email' | 'password'>): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      throw new HttpError(400, 'Email not found');
    }

    const isPasswordValid = await comparePassword(userData.password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(400, 'Invalid password');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }

  async changeAuthProfile(
    userId: number,
    oldPassword: string,
    newData: Pick<User, 'password' | 'phone' | 'email'>
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }

    const isOldPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new HttpError(400, 'Invalid old password');
    }

    if (newData.password && (await comparePassword(newData.password, user.password))) {
      throw new HttpError(400, 'New password cannot be the same as the old password');
    }

    if (newData.email && (await prisma.user.findUnique({ where: { email: newData.email } }))) {
      throw new HttpError(400, 'Email already exists');
    }

    if (newData.phone && (await prisma.user.findUnique({ where: { phone: newData.phone } }))) {
      throw new HttpError(400, 'Phone number already exists');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newData.password ? await hashPassword(newData.password) : user.password,
        phone: newData.phone ?? user.phone,
        email: newData.email ?? user.email,
        emailVerified: newData.email === user.email ? user.emailVerified : false,
      },
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

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    await redis.setEx(
      `email_verification_code:${user.email}`,
      60 * 30,
      verificationCode.toString()
    );

    await emailService.sendVerificationCode(user.email, verificationCode);
  }

  async verifyEmail(email: string, code: number) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }

    if (user.emailVerified) {
      throw new HttpError(400, 'Email already verified');
    }

    const cachedCode = await redis.get(`email_verification_code:${user.email}`);

    if (cachedCode !== code.toString()) {
      throw new HttpError(400, 'Incorrect verification code');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }
}
export const authService = new AuthService();
