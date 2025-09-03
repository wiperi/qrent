import { prisma } from '@qrent/shared';
import redis from '@/utils/redisClient';

// Type definitions for service responses
export interface RegionStats {
  regionName: string;
  avgPricePerRoom: number;
  avgCommuteTime: number;
  totalProperties: number;
  avgPropertyPrice: number;
}

export interface PropertyStatsResponse {
  regions: RegionStats[];
  timestamp: Date;
  cacheHit: boolean;
}

class PropertyStatsService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'property-stats';

  /**
   * Get regional statistics for specified regions
   * @param regionsInput Space-separated region names, or undefined for all regions
   * @returns PropertyStatsResponse with statistics for each region
   */
  async getRegionalStats(regionsInput?: string): Promise<PropertyStatsResponse> {
    // Parse and validate regions
    const regions = this.parseRegions(regionsInput);

    // Check cache
    const cacheKey = this.generateCacheKey(regions);
    const cached = await this.getCachedStats(cacheKey);
    if (cached) {
      return { ...cached, cacheHit: true, timestamp: new Date() };
    }

    // Query database for statistics
    const stats = await this.calculateRegionalStats(regions);

    // Prepare response
    const response: PropertyStatsResponse = {
      regions: stats,
      timestamp: new Date(),
      cacheHit: false,
    };

    // Cache results
    await this.cacheStats(cacheKey, response);

    return response;
  }

  /**
   * Parse space-separated region strings into array
   * @param regionsInput Space-separated region names
   * @returns Array of region names, or empty array for all regions
   */
  private parseRegions(regionsInput?: string): string[] {
    if (!regionsInput || regionsInput.trim() === '') {
      return []; // Empty array means all regions
    }

    return regionsInput
      .trim()
      .split(/\s+/)
      .filter(region => region.length > 0)
      .map(region => region.toLowerCase());
  }

  /**
   * Calculate statistics for specified regions using Prisma
   * @param regions Array of region names, empty for all regions
   * @returns Array of RegionStats
   */
  private async calculateRegionalStats(regions: string[]): Promise<RegionStats[]> {
    // Build where clause for regions
    const regionFilter =
      regions.length > 0
        ? {
            region: {
              name: {
                in: regions.map(region => ({ startsWith: region })),
              },
            },
          }
        : {}; // No filter for all regions case

    // Get all matching regions first
    const matchingRegions = await prisma.region.findMany({
      where:
        regions.length > 0
          ? {
              OR: regions.map(region => ({
                name: { startsWith: region },
              })),
            }
          : {},
      select: { id: true, name: true },
    });

    const regionStats: RegionStats[] = [];

    for (const region of matchingRegions) {
      // Get properties for this specific region
      const properties = await prisma.property.findMany({
        where: { regionId: region.id },
        include: {
          property_school: {
            select: { commuteTime: true },
          },
        },
      });

      // Calculate statistics
      const totalProperties = properties.length;

      // Average property price
      const avgPropertyPrice =
        totalProperties > 0 ? properties.reduce((sum, p) => sum + p.price, 0) / totalProperties : 0;

      // Average price per room (excluding properties with 0 bedrooms)
      const propertiesWithBedrooms = properties.filter(p => p.bedroomCount > 0);
      const avgPricePerRoom =
        propertiesWithBedrooms.length > 0
          ? propertiesWithBedrooms.reduce((sum, p) => sum + p.price / p.bedroomCount, 0) /
            propertiesWithBedrooms.length
          : 0;

      // Average commute time (from all property-school relationships)
      const commuteTimesFlat = properties.flatMap(p =>
        p.property_school.map(ps => ps.commuteTime).filter((time): time is number => time !== null)
      );
      const avgCommuteTime =
        commuteTimesFlat.length > 0
          ? commuteTimesFlat.reduce((sum, time) => sum + time, 0) / commuteTimesFlat.length
          : 0;

      regionStats.push({
        regionName: region.name,
        avgPricePerRoom: Math.round(avgPricePerRoom * 100) / 100, // Round to 2 decimals
        avgCommuteTime: Math.round(avgCommuteTime * 100) / 100, // Round to 2 decimals
        totalProperties,
        avgPropertyPrice: Math.round(avgPropertyPrice * 100) / 100, // Round to 2 decimals
      });
    }

    // Handle case where no regions match the input
    if (regions.length > 0 && regionStats.length === 0) {
      // Return zero stats for requested regions that don't exist
      for (const requestedRegion of regions) {
        regionStats.push({
          regionName: requestedRegion,
          avgPricePerRoom: 0,
          avgCommuteTime: 0,
          totalProperties: 0,
          avgPropertyPrice: 0,
        });
      }
    }

    return regionStats;
  }

  /**
   * Generate consistent cache key from regions array
   * @param regions Array of region names
   * @returns Cache key string
   */
  private generateCacheKey(regions: string[]): string {
    // Sort regions to ensure consistent cache keys regardless of input order
    const sortedRegions = [...regions].sort();
    const regionKey = sortedRegions.length > 0 ? sortedRegions.join(':') : 'all';
    return `${this.CACHE_PREFIX}:${regionKey}`;
  }

  /**
   * Get cached statistics from Redis
   * @param cacheKey Cache key to retrieve
   * @returns Cached PropertyStatsResponse or null if not found
   */
  private async getCachedStats(cacheKey: string): Promise<PropertyStatsResponse | null> {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert timestamp back to Date object
        parsed.timestamp = new Date(parsed.timestamp);
        return parsed;
      }
    } catch (error) {
      console.error('Redis cache retrieval error:', error);
    }
    return null;
  }

  /**
   * Cache statistics in Redis
   * @param cacheKey Cache key to store under
   * @param stats PropertyStatsResponse to cache
   */
  private async cacheStats(cacheKey: string, stats: PropertyStatsResponse): Promise<void> {
    try {
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(stats));
    } catch (error) {
      console.error('Redis cache storage error:', error);
    }
  }

  /**
   * Invalidate all property statistics cache entries
   * Used when property data is updated
   */
  async invalidateStatsCache(): Promise<void> {
    try {
      const keys = await redis.keys(`${this.CACHE_PREFIX}:*`);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }
}

export const propertyStatsService = new PropertyStatsService();
export default propertyStatsService;
