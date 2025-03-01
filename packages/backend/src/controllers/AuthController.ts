import { Request, Response, NextFunction } from 'express';
import { UserDTO } from '@qrent/shared';
import { authService } from '@/services/AuthService';

export class AuthController {

  async register(req: Request, res: Response, next: NextFunction) {
    const user = req.body as UserDTO;
    await authService.register(user);
    res.json({});
  };


  async login(req: Request, res: Response, next: NextFunction) {
    const user = req.body as UserDTO;
    await authService.login({ email: user.email, password: user.password });
    res.json({});
  };
} 