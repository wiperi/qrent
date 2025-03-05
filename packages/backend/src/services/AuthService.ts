import { Prisma, prisma, UserDTO } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import jwt from 'jsonwebtoken';

class AuthService {
  async register(userData: UserDTO): Promise<string> {
    try {
      const user = await prisma.user.create({
        data: userData,
      });
      
      // Generate JWT token
      return this.generateToken(String(user.id));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpError(400, 'User already exists');
        }
      }
      throw error;
    }
  }

  async login(userData: Pick<UserDTO, 'email' | 'password'>): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      throw new HttpError(400, 'User not found');
    }
    if (user.password !== userData.password) {
      throw new HttpError(400, 'Invalid password');
    }
    
    // Generate JWT token
    return this.generateToken(String(user.id));
  }
  
  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new HttpError(500, 'JWT secret is not configured');
    }
    
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: '24h' }
    );
  }
}

export const authService = new AuthService();