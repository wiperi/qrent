import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/AuthService';

export class AuthController {
  async changeAuthProfile(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const { phone, email } = req.body;

    const profile = await authService.changeAuthProfile(userId, {
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
