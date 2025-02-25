import { Prisma, prisma, UserDTO } from '@qrent/shared';
import HttpError from '@/error/HttpError';

class AuthService {
  async register(userData: UserDTO): Promise<number> {
    try {
      const user = await prisma.user.create({
        data: userData,
      });
      return user.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpError(400, 'User already exists');
        }
      }
      throw error;
    }
  }

  async login(userData: Pick<UserDTO, 'email' | 'password'>): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }
    if (user.password !== userData.password) {
      throw new HttpError(400, 'Invalid password');
    }
    return user.id;
  }
}

export const authService = new AuthService();