import { Router, Request, Response, NextFunction } from 'express';
import { tryCatch } from '@/utils/helper';
import { UserDTO } from '@qrent/shared';
import { userRegisterService } from '@/services/auth';

const router = Router();

router.get('/hello', (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Hello, world!' });
});

router.post('/auth/register', (req: Request, res: Response, next: NextFunction) => {
  tryCatch(async () => {
    const user = req.body as UserDTO;
    const userId = await userRegisterService(user);
    res.json({ userId });
  }, req, res, next);
});

export default router;
