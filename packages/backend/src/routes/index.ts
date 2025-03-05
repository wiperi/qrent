import { Router } from 'express';
import { authController } from '@/controllers/AuthController';
import { catchError } from '@/utils/helper';

const router = Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

router.post('/auth/register', catchError(authController.register));
router.post('/auth/login', catchError(authController.login));


export default router;
