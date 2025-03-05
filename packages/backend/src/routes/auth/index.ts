import { authController } from '@/controllers/AuthController';
import { catchError } from '@/utils/helper';
import { Router } from 'express';

const router = Router();

router.post('/register', catchError(authController.register));
router.post('/login', catchError(authController.login));

export default router;
