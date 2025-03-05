import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '@/controllers/AuthController';
import { catchError } from '@/utils/helper';

const router = Router();

// Public routes (no authentication required)
router.post('/auth/register', catchError(authController.register));
router.post('/auth/login', catchError(authController.login));

router.get('/echo', (req: Request, res: Response) => {
  const echo = req.query.echo;
  res.json({ echo });
});

export default router;
