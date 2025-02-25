import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';

const router = Router();
const authController = new AuthController();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

export default router;
