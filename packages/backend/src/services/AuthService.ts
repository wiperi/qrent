import { Prisma, prisma, UserDTO } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import { hashPassword, comparePassword } from '../utils/hash';

class AuthService {
  async register(userData: UserDTO): Promise<void> {
    try {
      const hashedPassword = await hashPassword(userData.password);
      userData.password = hashedPassword;
      await prisma.user.create({
        data: userData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpError(400, 'User already exists');
        }
      }
      throw error;
    }
  }

  async login(userData: Pick<UserDTO, 'email' | 'password'>): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }
    const isPasswordValid = await comparePassword(userData.password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(400, 'Invalid password');
    }
  }
}

export const authService = new AuthService();