import { Prisma, prisma, User } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import { generateToken } from '@/utils/helper';
import redis from '@/utils/redisClient';
import { emailService } from '@/services/EmailService';
import { hashPassword, comparePassword } from '@/utils/bcrypt';
import { userService } from './UserService';
import { oauthService } from './OAuthService';

class AuthService {
  async register(userData: User): Promise<string> {
    if (await prisma.user.findUnique({ where: { email: userData.email } })) {
      throw new HttpError(400, 'Email already exists');
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: await hashPassword(userData.password),
        authProvider: 'email',
      },
    });

    // Generate JWT token
    const token = generateToken(user.id);

    await this.createUserSession(user.id, token);

    return token;
  }

  async login(userData: Pick<User, 'email' | 'password'>): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      throw new HttpError(400, 'Email not found');
    }

    // OAuth 用户不允许使用密码登录
    if (user.authProvider && user.authProvider !== 'email') {
      throw new HttpError(400, `Please login with ${user.authProvider}`);
    }

    if (!user.password) {
      throw new HttpError(400, 'Password login not available for this account');
    }

    const isPasswordValid = await comparePassword(userData.password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(400, 'Invalid password');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    await this.createUserSession(user.id, token);

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

  /**
   * Google OAuth 登录/注册
   * 逻辑：
   * 1. 验证 Google ID token
   * 2. 检查是否已有该 Google 账号（通过 oauthProviderId）
   * 3. 如果存在，直接登录
   * 4. 如果不存在，检查邮箱是否已注册
   *    - 如果邮箱已存在：绑定 Google 到现有账号（账号合并）
   *    - 如果邮箱不存在：创建新账号
   */
  async googleOAuthLogin(idToken: string): Promise<string> {
    // 1. 验证 Google token，获取 sub 和 email
    const googleUser = await oauthService.verifyGoogleToken(idToken);

    // 2. 查找是否已有该 Google 账号
    let user = await prisma.user.findUnique({
      where: { oauthProviderId: googleUser.sub },
    });

    if (user) {
      // 已有 Google 账号，直接登录
      const token = generateToken(user.id);
      await this.createUserSession(user.id, token);
      return token;
    }

    // 3. 检查邮箱是否已注册（账号合并逻辑）
    user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // 邮箱已存在，绑定 Google 到现有账号
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: 'google',
          oauthProviderId: googleUser.sub,
          emailVerified: true,
          avatarUrl: googleUser.picture,
          name: googleUser.name || user.name,
        },
      });

      const token = generateToken(user.id);
      await this.createUserSession(user.id, token);
      return token;
    }

    // 4. 创建新账号
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        password: null,
        name: googleUser.name || 'User',
        authProvider: 'google',
        oauthProviderId: googleUser.sub,
        emailVerified: true,
        avatarUrl: googleUser.picture,
      },
    });

    const token = generateToken(user.id);
    await this.createUserSession(user.id, token);
    return token;
  }

  /**
   * 创建用户会话（私有方法）
   */
  private async createUserSession(userId: number, token: string): Promise<void> {
    await prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
export const authService = new AuthService();
