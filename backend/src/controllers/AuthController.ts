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

  async changeAuthProfile(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const { oldPassword, password, phone, email } = req.body;

    const profile = await authService.changeAuthProfile(userId, oldPassword, {
      password,
      phone,
      email,
    });

    res.json(profile);
  }

  async sendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    await authService.sendVerificationEmail(userId);
    res.json({ message: 'Verification email sent' });
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    const { email, code } = req.body;
    await authService.verifyEmail(email, code);
    res.json({ message: 'Email verified' });
  }
}

export const authController = new AuthController();
