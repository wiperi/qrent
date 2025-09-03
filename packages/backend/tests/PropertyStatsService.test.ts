// import { propertyStatsService } from '@/services/PropertyStatsService';
// import { prisma } from '@qrent/shared';
// import redis from '@/utils/redisClient';
// import * as ttetete from '../../backend/src/services/PropertyStatsService';

// // Mock Prisma and Redis
// jest.mock('@qrent/shared', () => ({
//   prisma: {
//     region: {
//       findMany: jest.fn(),
//     },
//     property: {
//       findMany: jest.fn(),
//     },
//   },
// }));

// jest.mock('@/utils/redisClient', () => ({
//   get: jest.fn(),
//   setEx: jest.fn(),
//   keys: jest.fn(),
//   del: jest.fn(),
// }));

// const mockPrisma = prisma as jest.Mocked<typeof prisma>;
// const mockRedis = redis as jest.Mocked<typeof redis>;

// describe('PropertyStatsService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('getRegionalStats', () => {
//     const mockRegions = [
//       { id: 1, name: 'melbourne' },
//       { id: 2, name: 'sydney' },
//     ];

//     const mockProperties = [
//       {
//         id: 1,
//         price: 500000,
//         bedroomCount: 2,
//         regionId: 1,
//         property_school: [
//           { commuteTime: 30 },
//           { commuteTime: 25 },
//         ],
//       },
//       {
//         id: 2,
//         price: 400000,
//         bedroomCount: 1,
//         regionId: 1,
//         property_school: [
//           { commuteTime: 20 },
//         ],
//       },
//       {
//         id: 3,
//         price: 0, // Edge case: zero price
//         bedroomCount: 0, // Edge case: zero bedrooms
//         regionId: 1,
//         property_school: [],
//       },
//     ];

//     it('should return statistics for specified regions', async () => {
//       mockRedis.get.mockResolvedValue(null); // Cache miss
//       mockPrisma.region.findMany.mockResolvedValue([mockRegions[0]]);
//       mockPrisma.property.findMany.mockResolvedValue(mockProperties.filter(p => p.regionId === 1));
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.regions).toHaveLength(1);
//       expect(result.regions[0]).toEqual({
//         regionName: 'melbourne',
//         avgPricePerRoom: 300000, // (500000/2 + 400000/1) / 2 = 450000 / 1.5 = 300000
//         avgCommuteTime: 25, // (30 + 25 + 20) / 3 = 25
//         totalProperties: 3,
//         avgPropertyPrice: 300000, // (500000 + 400000 + 0) / 3 = 300000
//       });
//       expect(result.cacheHit).toBe(false);
//       expect(result.timestamp).toBeInstanceOf(Date);
//     });

//     it('should handle empty regions input (all regions)', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue(mockRegions);
//       mockPrisma.property.findMany
//         .mockResolvedValueOnce(mockProperties.filter(p => p.regionId === 1))
//         .mockResolvedValueOnce([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('');

//       expect(result.regions).toHaveLength(2);
//       expect(result.regions[0].regionName).toBe('melbourne');
//       expect(result.regions[1].regionName).toBe('sydney');
//       expect(result.regions[1].totalProperties).toBe(0);
//     });

//     it('should return cached results when available', async () => {
//       const cachedData = {
//         regions: [
//           {
//             regionName: 'melbourne',
//             avgPricePerRoom: 300000,
//             avgCommuteTime: 25,
//             totalProperties: 2,
//             avgPropertyPrice: 450000,
//           },
//         ],
//         timestamp: new Date().toISOString(),
//         cacheHit: false,
//       };
//       mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.cacheHit).toBe(true);
//       expect(result.regions).toEqual(cachedData.regions);
//       expect(mockPrisma.region.findMany).not.toHaveBeenCalled();
//     });

//     it('should handle properties with zero bedrooms correctly', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([mockRegions[0]]);
//       mockPrisma.property.findMany.mockResolvedValue([
//         {
//           id: 1,
//           price: 300000,
//           bedroomCount: 0, // Should be excluded from avgPricePerRoom calculation
//           regionId: 1,
//           property_school: [],
//         },
//         {
//           id: 2,
//           price: 400000,
//           bedroomCount: 2,
//           regionId: 1,
//           property_school: [],
//         },
//       ]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.regions[0].avgPricePerRoom).toBe(200000); // Only 400000/2 = 200000
//       expect(result.regions[0].totalProperties).toBe(2);
//       expect(result.regions[0].avgPropertyPrice).toBe(350000); // (300000 + 400000) / 2
//     });

//     it('should handle null commute times correctly', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([mockRegions[0]]);
//       mockPrisma.property.findMany.mockResolvedValue([
//         {
//           id: 1,
//           price: 300000,
//           bedroomCount: 1,
//           regionId: 1,
//           property_school: [
//             { commuteTime: 20 },
//             { commuteTime: null }, // Should be excluded
//           ],
//         },
//       ]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.regions[0].avgCommuteTime).toBe(20); // Only non-null values counted
//     });

//     it('should return zero values when no data exists', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([mockRegions[0]]);
//       mockPrisma.property.findMany.mockResolvedValue([]); // No properties
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.regions[0]).toEqual({
//         regionName: 'melbourne',
//         avgPricePerRoom: 0,
//         avgCommuteTime: 0,
//         totalProperties: 0,
//         avgPropertyPrice: 0,
//       });
//     });

//     it('should handle non-existent regions', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]); // No matching regions
//       mockRedis.setEx.mockResolvedValue('OK');

//       const result = await propertyStatsService.getRegionalStats('nonexistent');

//       expect(result.regions).toHaveLength(1);
//       expect(result.regions[0]).toEqual({
//         regionName: 'nonexistent',
//         avgPricePerRoom: 0,
//         avgCommuteTime: 0,
//         totalProperties: 0,
//         avgPropertyPrice: 0,
//       });
//     });

//     it('should handle Redis errors gracefully', async () => {
//       mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
//       mockRedis.setEx.mockRejectedValue(new Error('Redis connection failed'));
//       mockPrisma.region.findMany.mockResolvedValue([mockRegions[0]]);
//       mockPrisma.property.findMany.mockResolvedValue([mockProperties[0]]);

//       const result = await propertyStatsService.getRegionalStats('melbourne');

//       expect(result.cacheHit).toBe(false);
//       expect(result.regions).toHaveLength(1);
//       // Should complete successfully despite Redis errors
//     });
//   });

//   describe('cache key generation', () => {
//     it('should generate consistent cache keys regardless of region order', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       // Test with different region orders
//       await propertyStatsService.getRegionalStats('sydney melbourne');
//       const call1 = mockRedis.setEx.mock.calls[0][0];

//       jest.clearAllMocks();
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       await propertyStatsService.getRegionalStats('melbourne sydney');
//       const call2 = mockRedis.setEx.mock.calls[0][0];

//       expect(call1).toBe(call2); // Cache keys should be identical
//     });

//     it('should handle empty regions for all regions cache key', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       await propertyStatsService.getRegionalStats('');
//       const cacheKey = mockRedis.setEx.mock.calls[0][0];

//       expect(cacheKey).toBe('property-stats:all');
//     });
//   });

//   describe('invalidateStatsCache', () => {
//     it('should clear all property stats cache entries', async () => {
//       mockRedis.keys.mockResolvedValue(['property-stats:melbourne', 'property-stats:sydney']);
//       mockRedis.del.mockResolvedValue(2);

//       await propertyStatsService.invalidateStatsCache();

//       expect(mockRedis.keys).toHaveBeenCalledWith('property-stats:*');
//       expect(mockRedis.del).toHaveBeenCalledWith(['property-stats:melbourne', 'property-stats:sydney']);
//     });

//     it('should handle no cache entries gracefully', async () => {
//       mockRedis.keys.mockResolvedValue([]);

//       await propertyStatsService.invalidateStatsCache();

//       expect(mockRedis.keys).toHaveBeenCalledWith('property-stats:*');
//       expect(mockRedis.del).not.toHaveBeenCalled();
//     });

//     it('should handle Redis errors during cache invalidation', async () => {
//       mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

//       // Should not throw, just log error
//       await expect(propertyStatsService.invalidateStatsCache()).resolves.not.toThrow();
//     });
//   });

//   describe('region parsing', () => {
//     it('should parse space-separated regions correctly', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       await propertyStatsService.getRegionalStats('melbourne   sydney  ');

//       expect(mockPrisma.region.findMany).toHaveBeenCalledWith({
//         where: {
//           OR: [
//             { name: { startsWith: 'melbourne' } },
//             { name: { startsWith: 'sydney' } },
//           ],
//         },
//         select: { id: true, name: true },
//       });
//     });

//     it('should handle undefined input as all regions', async () => {
//       mockRedis.get.mockResolvedValue(null);
//       mockPrisma.region.findMany.mockResolvedValue([]);
//       mockRedis.setEx.mockResolvedValue('OK');

//       await propertyStatsService.getRegionalStats(undefined);

//       expect(mockPrisma.region.findMany).toHaveBeenCalledWith({
//         where: {},
//         select: { id: true, name: true },
//       });
//     });
//   });
// });