import { catchError } from '@/utils/helper';
import { prisma, UserPreference } from '@qrent/shared';
import { Router } from 'express';

const router = Router();

router.post(
  '/search',
  catchError(async (req, res) => {
    const preferences: UserPreference & { page: number; pageSize: number } = req.body;
    const page = preferences.page;
    const pageSize = preferences.pageSize;
    const skip = (page - 1) * pageSize;

    const properties = await prisma.property.findMany({
      where: {
        pricePerWeek: {
          gte: preferences.minPrice ?? 0,
          ...(preferences.maxPrice ? { lte: preferences.maxPrice } : {}),
        },

        bedroomCount: {
          gte: preferences.minBedrooms ?? 0,
          ...(preferences.maxBedrooms ? { lte: preferences.maxBedrooms } : {}),
        },

        bathroomCount: {
          gte: preferences.minBathrooms ?? 0,
          ...(preferences.maxBathrooms ? { lte: preferences.maxBathrooms } : {}),
        },

        ...(preferences.propertyType ? { propertyType: preferences.propertyType } : {}),

        ...(preferences.minRating
          ? {
              averageScore: {
                gte: preferences.minRating,
              },
            }
          : {}),

        commuteTime: {
          gte: preferences.minCommuteTime ?? 0,
          ...(preferences.maxCommuteTime ? { lte: preferences.maxCommuteTime } : {}),
        },

        ...(preferences.regions && preferences.regions.length > 0
          ? {
              addressLine2: {
                contains: preferences.regions,
              },
            }
          : {}),
      },
      take: pageSize,
      skip,
    });

    res.json(properties);
  })
);

export default router;
