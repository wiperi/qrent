import { Request, Response, NextFunction } from 'express';
import { propertyStatsService } from '@/services/PropertyStatsService';
import HttpError from '@/error/HttpError';

export class PropertyStatsController {
  /**
   * GET /api/property-stats
   * 
   * Get property statistics for specified regions
   * 
   * Query parameters:
   * - regions (optional): Space-separated region names (e.g., "melbourne sydney")
   * 
   * Returns:
   * - regions: Array of region statistics
   * - timestamp: When the statistics were generated
   * - cacheHit: Whether data came from cache
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { regions } = req.query;

      // Validate regions parameter if provided
      if (regions && typeof regions !== 'string') {
        throw new HttpError(400, 'Regions parameter must be a string');
      }

      // Validate region format if provided
      if (regions && !/^[a-z-]+(\s[a-z-]+)*$/.test(regions)) {
        throw new HttpError(
          400, 
          'Regions must be space-separated words containing only lowercase letters and hyphens'
        );
      }

      const stats = await propertyStatsService.getRegionalStats(regions);
      res.json(stats);
      
    } catch (error) {
      // Pass HttpError instances directly to error handler
      if (error instanceof HttpError) {
        return next(error);
      }

      // Handle database connection errors
      if (error instanceof Error && error.message.includes('database')) {
        return next(new HttpError(500, 'Unable to retrieve statistics from database'));
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.message.includes('timeout')) {
        return next(new HttpError(504, 'Request timeout while calculating statistics'));
      }
      
      // Generic error fallback
      console.error('Property stats REST error:', error);
      return next(new HttpError(500, 'An unexpected error occurred while retrieving property statistics'));
    }
  }

  /**
   * DELETE /api/property-stats/cache
   * 
   * Invalidate the property statistics cache
   * 
   * Clears all cached statistical data. Useful when property data is updated
   * and fresh statistics need to be calculated.
   * 
   * Returns:
   * - success: Boolean indicating if cache was cleared
   * - message: Success or error message
   * - timestamp: When the operation was performed
   */
  async invalidateCache(req: Request, res: Response, next: NextFunction) {
    try {
      await propertyStatsService.invalidateStatsCache();
      res.json({
        success: true,
        message: 'Property statistics cache cleared successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Cache invalidation REST error:', error);
      return next(new HttpError(500, 'Failed to clear property statistics cache'));
    }
  }
}

export const propertyStatsController = new PropertyStatsController();