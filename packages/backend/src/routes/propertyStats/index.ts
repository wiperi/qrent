import { propertyStatsController } from '@/controllers/PropertyStatsController';
import { catchError } from '@/utils/helper';
import { Router } from 'express';

const router: Router = Router();

// GET /api/property-stats - Get property statistics for specified regions
router.get('/', catchError(propertyStatsController.getStats));

// DELETE /api/property-stats/cache - Invalidate property statistics cache
router.delete('/cache', catchError(propertyStatsController.invalidateCache));

export default router;