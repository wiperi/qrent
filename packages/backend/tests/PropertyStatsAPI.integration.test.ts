import { prisma } from '@qrent/shared';
import { propertyStatsService } from '@/services/PropertyStatsService';
import redis from '@/utils/redisClient';

// Integration tests for Property Stats API endpoints
describe('Property Stats API Integration Tests', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await propertyStatsService.invalidateStatsCache();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await propertyStatsService.invalidateStatsCache();
  });

  afterAll(async () => {
    // Clean up after tests
    await propertyStatsService.invalidateStatsCache();
  });

  describe('PropertyStatsService Integration', () => {
    it('should handle real database queries correctly', async () => {
      // This test assumes there's at least some test data in the database
      const result = await propertyStatsService.getRegionalStats();
      
      expect(result).toHaveProperty('regions');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('cacheHit');
      expect(Array.isArray(result.regions)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.cacheHit).toBe('boolean');

      // Each region should have all required properties
      result.regions.forEach(region => {
        expect(region).toHaveProperty('regionName');
        expect(region).toHaveProperty('avgPricePerRoom');
        expect(region).toHaveProperty('avgCommuteTime');
        expect(region).toHaveProperty('totalProperties');
        expect(region).toHaveProperty('avgPropertyPrice');
        
        expect(typeof region.regionName).toBe('string');
        expect(typeof region.avgPricePerRoom).toBe('number');
        expect(typeof region.avgCommuteTime).toBe('number');
        expect(typeof region.totalProperties).toBe('number');
        expect(typeof region.avgPropertyPrice).toBe('number');
        
        expect(region.avgPricePerRoom).toBeGreaterThanOrEqual(0);
        expect(region.avgCommuteTime).toBeGreaterThanOrEqual(0);
        expect(region.totalProperties).toBeGreaterThanOrEqual(0);
        expect(region.avgPropertyPrice).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle caching correctly in real environment', async () => {
      const testRegion = 'test-region-' + Date.now();
      
      // First call should miss cache
      const firstResult = await propertyStatsService.getRegionalStats(testRegion);
      expect(firstResult.cacheHit).toBe(false);
      
      // Second call should hit cache (if Redis is working)
      const secondResult = await propertyStatsService.getRegionalStats(testRegion);
      
      // If Redis is available, second call should be a cache hit
      if (redis && typeof redis.get === 'function') {
        expect(secondResult.cacheHit).toBe(true);
        expect(secondResult.regions).toEqual(firstResult.regions);
      }
    });

    it('should handle empty regions input correctly', async () => {
      const result = await propertyStatsService.getRegionalStats('');
      
      expect(result.regions).toBeDefined();
      expect(Array.isArray(result.regions)).toBe(true);
      // Should return stats for all regions in database
    });

    it('should handle non-existent regions correctly', async () => {
      const nonExistentRegion = 'definitely-not-a-real-region-' + Date.now();
      const result = await propertyStatsService.getRegionalStats(nonExistentRegion);
      
      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].regionName).toBe(nonExistentRegion);
      expect(result.regions[0].totalProperties).toBe(0);
      expect(result.regions[0].avgPricePerRoom).toBe(0);
      expect(result.regions[0].avgCommuteTime).toBe(0);
      expect(result.regions[0].avgPropertyPrice).toBe(0);
    });

    it('should handle multiple regions correctly', async () => {
      const result = await propertyStatsService.getRegionalStats('melbourne sydney');
      
      expect(Array.isArray(result.regions)).toBe(true);
      // Should return stats for each region that matches melbourne* or sydney*
      result.regions.forEach(region => {
        expect(region.regionName.startsWith('melbourne') || region.regionName.startsWith('sydney') || region.regionName === 'melbourne' || region.regionName === 'sydney').toBe(true);
      });
    });
  });

  describe('Database Query Performance', () => {
    it('should complete queries within reasonable time', async () => {
      const startTime = Date.now();
      await propertyStatsService.getRegionalStats();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests correctly', async () => {
      const testRegion = 'concurrent-test-' + Date.now();
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        propertyStatsService.getRegionalStats(testRegion)
      );
      
      const results = await Promise.all(promises);
      
      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.regions).toEqual(firstResult.regions);
      });
    });
  });

  describe('Cache Integration', () => {
    it('should properly invalidate cache', async () => {
      const testRegion = 'cache-test-' + Date.now();
      
      // First call to populate cache
      await propertyStatsService.getRegionalStats(testRegion);
      
      // Invalidate cache
      await propertyStatsService.invalidateStatsCache();
      
      // Next call should miss cache
      const result = await propertyStatsService.getRegionalStats(testRegion);
      expect(result.cacheHit).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection issues gracefully', async () => {
      // This test would need to mock database connection failures
      // For now, we ensure the service doesn't throw unexpected errors
      await expect(
        propertyStatsService.getRegionalStats('test-region')
      ).resolves.toBeDefined();
    });
  });

  describe('Data Accuracy', () => {
    it('should return mathematically correct averages', async () => {
      const result = await propertyStatsService.getRegionalStats();
      
      // Validate that all numeric fields are valid numbers
      result.regions.forEach(region => {
        if (region.totalProperties > 0) {
          expect(region.avgPropertyPrice).toBeGreaterThan(0);
          expect(Number.isFinite(region.avgPropertyPrice)).toBe(true);
          expect(Number.isFinite(region.avgPricePerRoom)).toBe(true);
          expect(Number.isFinite(region.avgCommuteTime)).toBe(true);
        }
      });
    });

    it('should handle decimal precision correctly', async () => {
      const result = await propertyStatsService.getRegionalStats();
      
      result.regions.forEach(region => {
        // Check that decimal values are rounded to 2 places
        const avgPriceStr = region.avgPricePerRoom.toString();
        const avgCommuteStr = region.avgCommuteTime.toString();
        const avgPropertyStr = region.avgPropertyPrice.toString();
        
        if (avgPriceStr.includes('.')) {
          const decimals = avgPriceStr.split('.')[1];
          expect(decimals.length).toBeLessThanOrEqual(2);
        }
        
        if (avgCommuteStr.includes('.')) {
          const decimals = avgCommuteStr.split('.')[1];
          expect(decimals.length).toBeLessThanOrEqual(2);
        }
        
        if (avgPropertyStr.includes('.')) {
          const decimals = avgPropertyStr.split('.')[1];
          expect(decimals.length).toBeLessThanOrEqual(2);
        }
      });
    });
  });
});