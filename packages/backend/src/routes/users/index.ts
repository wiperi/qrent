import { catchError } from '@/utils/helper';
import { Router } from 'express';
import { propertyController } from '@/controllers/PropertyController';
import { userController } from '@/controllers/UserController';

const router: Router = Router();

router.get('/subscriptions', catchError(propertyController.getSubscriptions));
router.get('/preference', catchError(userController.getPreference));
router.get('/profile', catchError(userController.getProfile));
router.put('/profile', catchError(userController.updateProfile));

export default router;
