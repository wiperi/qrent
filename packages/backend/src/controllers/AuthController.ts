import { Request, Response, NextFunction } from 'express';
import { User } from '@qrent/shared';
import { authService } from '@/services/AuthService';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    const user = req.body as User;
    const token = await authService.register(user);
    res.status(201).json({ token });
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const user = req.body as User;
    const token = await authService.login({
      email: user.email,
      password: user.password,
    });
    res.json({ token });
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;

    await authService.changePassword(userId, oldPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  }
}

export const authController = new AuthController();
