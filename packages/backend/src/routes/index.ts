import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import { clearDb } from '@qrent/shared/utils/db';
import { catchError } from '@/utils/helper';
import userRoutes from './users';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);


router.get('/echo', (req: Request, res: Response) => {
  const echo = req.query.echo;
  res.json({ echo });
});

router.delete('/clear', catchError(async (req: Request, res: Response) => {
  await clearDb();
  res.json({ message: 'Database cleared' });
}));

export default router;
