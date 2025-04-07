import { Prisma, prisma, User, UserPreference, Property } from '@qrent/shared';
import HttpError from '@/error/HttpError';

class PropertyService {
  /**
   * Subscribe a user to updates for a specific property
   * @param userId - ID of the user
   * @param propertyId - ID of the property to subscribe to
   * @returns Promise resolving to the subscription response
   */
  async subscribeToProperty(userId: number, propertyId: number): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { properties: true },
      });

      if (!user) {
        throw new HttpError(400, 'User not found???');
      }
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new HttpError(404, 'Property not found');
      }

      const isSubscribed = user.properties.some(property => property.id === propertyId);
      if (isSubscribed) {
        throw new HttpError(409, 'Already subscribed to this property');
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          properties: {
            connect: { id: propertyId },
          },
        },
      });

      return `Successfully subscribed to property`;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpError(400, 'Subscription already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Get properties based on user preferences with pagination
   * @param preferences - User preferences with pagination parameters
   * @returns Promise resolving to the filtered properties
   */
  async getPropertiesByPreferences(
    preferences: UserPreference & { page: number; pageSize: number; publishedAt?: string }
  ): Promise<Property[]> {
    const page = preferences.page;
    const pageSize = preferences.pageSize;
    const skip = (page - 1) * pageSize;

    if (page == undefined) {
      throw new HttpError(400, 'Page is required');
    }

    if (pageSize == undefined) {
      throw new HttpError(400, 'Page size is required');
    }

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

        averageScore: {
          gte: preferences.minRating ?? 0,
        },

        ...(preferences.publishedAt ? { publishedAt: { gte: new Date(preferences.publishedAt) } } : {}),
      },
      take: pageSize,
      skip,
    });

    return properties;
  }
}

export const propertyService = new PropertyService();
