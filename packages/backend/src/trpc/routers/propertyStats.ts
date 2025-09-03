import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPC } from '../trpc';
import { propertyStatsService, RegionStats, PropertyStatsResponse } from '@/services/PropertyStatsService';

const t = createTRPC();

export const publicProcedure = t.procedure;

// Input validation schema for property statistics requests
const propertyStatsInputSchema = z.object({
  regions: z
    .string()
    .regex(
      /^[a-z-]+(\s[a-z-]+)*$/,
      'Regions must be space-separated words containing only lowercase letters and hyphens'
    )
    .optional()
    .describe('Space-separated region names (e.g., "melbourne sydney"). Leave empty for all regions.')
});

// Output validation schema for individual region statistics
const regionStatsSchema = z.object({
  regionName: z.string().describe('Name of the region'),
  avgPricePerRoom: z.number().min(0).describe('Average price per room in the region'),
  avgCommuteTime: z.number().min(0).describe('Average commute time in minutes'),
  totalProperties: z.number().int().min(0).describe('Total number of properties in the region'),
  avgPropertyPrice: z.number().min(0).describe('Average property price in the region')
}) satisfies z.ZodType<RegionStats>;

// Output validation schema for the complete response
const propertyStatsResponseSchema = z.object({
  regions: z.array(regionStatsSchema).describe('Statistics for each requested region'),
  timestamp: z.date().describe('Timestamp when the statistics were generated'),
  cacheHit: z.boolean().describe('Whether the data was retrieved from cache')
}) satisfies z.ZodType<PropertyStatsResponse>;

export const propertyStatsRouter = t.router({
  /**
   * Get property statistics for specified regions
   * 
   * Returns aggregated statistics including:
   * - Average price per room (property price / bedroom count)
   * - Average commute time to schools
   * - Total number of properties
   * - Average property price
   * 
   * If regions parameter is empty, returns statistics for all regions.
   * All statistical fields return 0 when no data is available (never null).
   */
  getStats: publicProcedure
    .meta({
      description: 'Get property statistics for specified regions',
      examples: [
        {
          input: { regions: 'zetland wolli-creek' },
          description: 'Get statistics for zetland and wolli-creek regions'
        },
        {
          input: {},
          description: 'Get statistics for all regions'
        }
      ]
    })
    .input(propertyStatsInputSchema)
    .output(propertyStatsResponseSchema)
    .query(async ({ input }) => {
      try {
        const stats = await propertyStatsService.getRegionalStats(input.regions);
        return stats;
      } catch (error) {
        // Handle database connection errors
        if (error instanceof Error && error.message.includes('database')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unable to retrieve statistics from database',
            cause: error
          });
        }
        
        // Handle timeout errors
        if (error instanceof Error && error.message.includes('timeout')) {
          throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Request timeout while calculating statistics',
            cause: error
          });
        }
        
        // Handle validation errors
        if (error instanceof Error && error.message.includes('validation')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid region format provided',
            cause: error
          });
        }
        
        // Generic error fallback
        console.error('Property stats error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while retrieving property statistics',
          cause: error
        });
      }
    }),

  /**
   * Invalidate the property statistics cache
   * 
   * Clears all cached statistical data. Useful when property data is updated
   * and fresh statistics need to be calculated.
   */
  invalidateCache: publicProcedure
    .meta({
      description: 'Invalidate property statistics cache',
      examples: [
        {
          input: {},
          description: 'Clear all cached property statistics'
        }
      ]
    })
    .input(z.object({}))
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      timestamp: z.date()
    }))
    .mutation(async () => {
      try {
        await propertyStatsService.invalidateStatsCache();
        return {
          success: true,
          message: 'Property statistics cache cleared successfully',
          timestamp: new Date()
        };
      } catch (error) {
        console.error('Cache invalidation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear property statistics cache',
          cause: error
        });
      }
    })
});

export type PropertyStatsRouter = typeof propertyStatsRouter;