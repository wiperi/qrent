import { Prisma, prisma, User, Preference, Property, Region } from '@qrent/shared';
import { EMAIL_PREFERENCE, PROPERTY_TYPE, SCHOOL } from '@qrent/shared/enum';
import HttpError from '@/error/HttpError';
import validationService from './ValidationService';
import _ from 'lodash';
import { emailService } from './EmailService';

// Type definitions for service responses
type PropertyWithRegion = Omit<Property, 'regionId'> & {
  regionId?: number | undefined;
  region: string | null;
  commuteTime: number | null;
};

type TopRegion = {
  propertyCount: number;
  averagePrice: number;
  averageCommuteTime: number;
  region: string | null;
};

type SearchPropertiesResponse = {
  properties: PropertyWithRegion[];
  totalCount: number;
  filteredCount: number;
  averagePrice: number;
  averageCommuteTime: number;
  topRegions: TopRegion[];
};

class PropertyService {
  async fetchSubscriptions(userId: number): Promise<PropertyWithRegion[]> {
    await validationService.validateUserExists(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        properties: {
          include: {
            region: true,
          },
        },
      },
    });

    return (
      user?.properties.map(p => ({
        ...p,
        regionId: undefined,
        region: p.region?.name || null,
        commuteTime: null,
      })) || []
    );
  }

  async subscribeToProperty(userId: number, propertyId: number): Promise<string> {
    await validationService.validateUserExists(userId);
    await validationService.validatePropertyExists(propertyId);
    await validationService.validateUserNotSubscribed(userId, propertyId);

    // Connect user to property (subscribe)
    await prisma.user.update({
      where: { id: userId },
      data: {
        properties: {
          connect: { id: propertyId },
        },
      },
    });

    return `Successfully subscribed to property`;
  }

  async unsubscribeFromProperty(userId: number, propertyId: number): Promise<string> {
    await validationService.validateUserExists(userId);
    await validationService.validatePropertyExists(propertyId);
    await validationService.validateUserSubscribed(userId, propertyId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        properties: { disconnect: { id: propertyId } },
      },
    });

    return `Successfully unsubscribed from property`;
  }

  async createPreference(preferences: Omit<Preference, 'id'>): Promise<Preference> {
    return await prisma.preference.create({
      data: preferences,
    });
  }

  /**
   * Get properties based on user preferences with pagination
   * @param preferences - User preferences with pagination parameters
   * @returns Promise resolving to the filtered properties
   */
  async getPropertiesByPreferences(
    preferences: Omit<Preference, 'id'> & {
      page: number;
      pageSize: number;
      publishedAt?: string;
      orderBy?: Prisma.PropertyOrderByWithRelationInput[];
    }
  ): Promise<SearchPropertiesResponse> {
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

    const filter: Prisma.PropertyWhereInput = {};

    // Move-in date filter
    if (preferences.moveInDate) {
      filter.availableDate = { lte: new Date(preferences.moveInDate) };
    }

    // Price filter
    filter.price = {};
    if (preferences.minPrice) {
      filter.price.gte = preferences.minPrice;
    }
    if (preferences.maxPrice) {
      filter.price.lte = preferences.maxPrice;
    }

    // Bedroom filter
    filter.bedroomCount = {};
    if (preferences.minBedrooms) {
      filter.bedroomCount.gte = preferences.minBedrooms;
    }
    if (preferences.maxBedrooms) {
      filter.bedroomCount.lte = preferences.maxBedrooms;
    }

    // Bathroom filter
    filter.bathroomCount = {};
    if (preferences.minBathrooms) {
      filter.bathroomCount.gte = preferences.minBathrooms;
    }
    if (preferences.maxBathrooms) {
      filter.bathroomCount.lte = preferences.maxBathrooms;
    }

    // Property type filter
    if (preferences.propertyType) {
      filter.propertyType = preferences.propertyType;
    }

    // Rating filter
    filter.averageScore = {};
    if (preferences.minRating) {
      filter.averageScore.gte = preferences.minRating;
    }

    // Regions filter
    let regionFilter: Prisma.PropertyWhereInput[] = [];
    if (preferences.regions && preferences.regions.length > 0) {
      const regions = preferences.regions.split(' ');
      regionFilter = regions.map(region => ({
        region: {
          name: {
            startsWith: region,
          },
        },
      }));
      filter.OR = regionFilter;
    }

    // Target school filter
    // Commute time filter
    filter.propertySchools = {
      some: {
        school: {
          name: preferences.targetSchool,
        },
        commuteTime: {
          lte: preferences.maxCommuteTime ?? undefined,
          gte: preferences.minCommuteTime ?? undefined,
        },
      },
    };

    // Published date filter
    if (preferences.publishedAt) {
      filter.publishedAt = { gte: new Date(preferences.publishedAt) };
    }

    // Get properties that match the filter
    const properties = await prisma.property
      .findMany({
        include: {
          region: true,
        },
        where: filter,
        take: pageSize,
        skip,
        orderBy,
      })
      .then(properties => {
        return Promise.all(
          properties.map(async p => {
            const { commuteTime } = await prisma.propertySchool.findFirstOrThrow({
              select: {
                commuteTime: true,
              },
              where: {
                propertyId: p.id,
                school: {
                  name: preferences.targetSchool,
                },
              },
            });

            return {
              ...p,
              regionId: undefined,
              region: p.region?.name || null,
              commuteTime,
            };
          })
        );
      });

    const aggregate = await prisma.property.aggregate({
      where: filter,
      _count: true,
      _avg: {
        price: true,
      },
    });

    // Get average commute time for the target school
    const avgCommuteTime = await prisma.propertySchool.aggregate({
      where: {
        property: {
          ...filter,
        },
        school: {
          name: preferences.targetSchool,
        },
      },
      _avg: {
        commuteTime: true,
      },
    });

    // Total number of properties in the database
    const totalCount = await prisma.property.count({
      where: {
        propertySchools: {
          some: {
            school: {
              name: preferences.targetSchool,
            },
          },
        },
      },
    });

    const topRegionsRaw = await prisma.property.groupBy({
      by: ['regionId'],
      where: filter,
      _count: true,
      _avg: {
        price: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topRegions = await Promise.all(
      topRegionsRaw.map(async r => {
        const region = await prisma.region.findUnique({
          where: {
            id: r.regionId,
          },
        });

        const commuteTime = await prisma.propertySchool.aggregate({
          where: {
            property: {
              ...filter,
              regionId: r.regionId,
            },
            school: {
              name: preferences.targetSchool,
            },
          },
          _avg: {
            commuteTime: true,
          },
        });

        return {
          propertyCount: r._count || 0,
          averagePrice: r._avg.price || 0,
          averageCommuteTime: commuteTime._avg.commuteTime || 0,
          region: region?.name || null,
        };
      })
    );

    return {
      properties,
      totalCount,
      filteredCount: aggregate._count || 0,
      averagePrice: aggregate._avg.price || 0,
      averageCommuteTime: avgCommuteTime._avg.commuteTime || 0,
      topRegions,
    };
  }

  async fetchPreference(userId: number): Promise<Preference | null> {
    const preference = await prisma.preference.findFirst({
      where: {
        userId,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (!preference) {
      throw new HttpError(404, 'Preference not found');
    }

    return preference;
  }

  async sendDailyPropertyRecommendation() {
    const recipients = await prisma.user.findMany({
      where: {
        emailPreferences: {
          some: {
            type: EMAIL_PREFERENCE.DailyPropertyRecommendation,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    for (const recipient of recipients) {
      let recommendations: any[] = [];

      const preference = await prisma.preference.findFirst({
        where: {
          userId: recipient.id,
        },
        orderBy: {
          id: 'desc',
        },
      });

      if (!preference) {
        recommendations = await prisma.property.findMany({
          include: {
            region: true,
          },
          orderBy: {
            averageScore: 'desc',
          },
          take: 10,
        });
        continue;
      } else {
        const preferenceArg: Preference & {
          page: number;
          pageSize: number;
          orderBy: Prisma.PropertyOrderByWithRelationInput[];
        } = {
          ...preference,
          page: 1,
          pageSize: 10,
          orderBy: [
            {
              averageScore: 'desc',
            },
          ],
        };
        const { properties } = await this.getPropertiesByPreferences(preferenceArg);
        recommendations = properties;
      }

      await emailService.sendDailyPropertyRecommendation(recipient.email, recommendations);
    }
  }
}

export const propertyService = new PropertyService();
