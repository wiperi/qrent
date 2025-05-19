import { propertyController } from '@/controllers/PropertyController';
import { catchError } from '@/utils/helper';
import { Router } from 'express';

const router = Router();

router.post('/search', catchError(propertyController.fetchProperty));

router.post('/:propertyId/subscribe', catchError(propertyController.handleProperty));

router.post('/:propertyId/subscribe', catchError(propertyController.handleProperty));

export default router;
