import { propertyController } from '@/controllers/PropertyController';
import { catchError } from '@/utils/helper';
import { Router } from 'express';

const router: Router = Router();

router.post('/search', catchError(propertyController.fetchProperty));
router.put('/:propertyId/subscribe', catchError(propertyController.handleSubscribeProperty));
router.delete('/:propertyId/unsubscribe', catchError(propertyController.handleUnsubscribeProperty));

export default router;
