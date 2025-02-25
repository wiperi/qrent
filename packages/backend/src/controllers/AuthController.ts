import { Request, Response, NextFunction } from 'express';
import { UserDTO } from '@qrent/shared';
import { authService } from '@/services/AuthService';

export class AuthController {

  async register(req: Request, res: Response, next: NextFunction) {
    const user = req.body as UserDTO;
    const userId = await authService.register(user);
    res.json({ userId });
  };


  async login(req: Request, res: Response, next: NextFunction) {
    const user = req.body as UserDTO;
    const userId = await authService.login(user);
    res.json({ userId });
  };
} 