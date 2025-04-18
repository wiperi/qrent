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
    preferences: UserPreference & {
      page: number;
      pageSize: number;
      publishedAt?: string;
      orderBy?: Prisma.PropertyOrderByWithRelationInput[];
    }
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

    let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [];

    if (preferences.orderBy) {
      // Check if every key is a valid db column
      for (const obj of preferences.orderBy) {
        for (const key in obj) {
          if (!(key in prisma.property.fields)) {
            throw new HttpError(400, `Invalid orderBy key: ${key}`);
          }

          if (obj[key as keyof typeof obj] !== 'asc' && obj[key as keyof typeof obj] !== 'desc') {
            throw new HttpError(400, `Invalid orderBy value: ${obj[key as keyof typeof obj]}`);
          }
        }
      }
      orderBy = preferences.orderBy;
    }

    const where: Prisma.PropertyWhereInput = {};

    // Price filter
    where.pricePerWeek = { gte: preferences.minPrice ?? 0 };
    if (preferences.maxPrice) {
      where.pricePerWeek.lte = preferences.maxPrice;
    }

    // Bedroom filter
    where.bedroomCount = { gte: preferences.minBedrooms ?? 0 };
    if (preferences.maxBedrooms) {
      where.bedroomCount.lte = preferences.maxBedrooms;
    }

    // Bathroom filter
    where.bathroomCount = { gte: preferences.minBathrooms ?? 0 };
    if (preferences.maxBathrooms) {
      where.bathroomCount.lte = preferences.maxBathrooms;
    }

    // Property type filter
    if (preferences.propertyType) {
      where.propertyType = preferences.propertyType;
    }

    // Rating filter
    where.averageScore = { gte: preferences.minRating ?? 0 };

    // Commute time filter
    where.commuteTime = { gte: preferences.minCommuteTime ?? 0 };
    if (preferences.maxCommuteTime) {
      where.commuteTime.lte = preferences.maxCommuteTime;
    }

    // Regions filter
    if (preferences.regions && preferences.regions.length > 0) {
      const regions = preferences.regions.split(' ');
      where.OR = regions.map(region => ({
        addressLine2: {
          contains: region,
        },
      }));
    }

    // Published date filter
    if (preferences.publishedAt) {
      where.publishedAt = { gte: new Date(preferences.publishedAt) };
    }

    const properties = await prisma.property.findMany({
      where,
      take: pageSize,
      skip,
      orderBy,
    });

    return properties;
  }
}

export const propertyService = new PropertyService();
