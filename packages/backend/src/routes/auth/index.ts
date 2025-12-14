import { authController } from '@/controllers/AuthController';
import { catchError } from '@/utils/helper';
import { Router } from 'express';

const router: Router = Router();

// Traditional auth methods (register/login) have been removed
// Use Google OAuth via tRPC instead (see authRouter.googleOAuthLogin)
router.put('/profile', catchError(authController.changeAuthProfile));
router.post('/email/send-verification', catchError(authController.sendVerificationEmail));
router.post('/email/verify', catchError(authController.verifyEmail));

export default router;
