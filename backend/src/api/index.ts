import { Router, Request, Response, NextFunction } from 'express';
import { tryCatch } from '@/utils/helper';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  tryCatch(() => {
    return res.json({ message: 'Hello, world!' });
  }, req, res, next);
});

export default router;
