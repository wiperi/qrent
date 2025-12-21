import { Prisma, prisma } from '@qrent/shared';
import HttpError from '@/error/HttpError';

class ValidationService {
  /**
   * 验证分页参数
   */
  validatePagination(page: number, pageSize: number): void {
    if (page === undefined || page === null) {
      throw new HttpError(400, 'Page is required');
    }

    if (pageSize === undefined || pageSize === null) {
      throw new HttpError(400, 'Page size is required');
    }

    if (page < 1) {
      throw new HttpError(400, 'Page must be greater than 0');
    }

    if (pageSize < 1 || pageSize > 100) {
      throw new HttpError(400, 'Page size must be between 1 and 100');
    }
  }

  /**
   * 验证排序参数
   */
  validateOrderBy(orderBy: Prisma.PropertyOrderByWithRelationInput[]): void {
    if (!orderBy) return;

    for (const obj of orderBy) {
      for (const key in obj) {
        // 检查字段是否存在
        if (!(key in prisma.property.fields)) {
          throw new HttpError(400, `Invalid orderBy key: ${key}`);
        }

        // 检查排序方向
        const value = obj[key as keyof typeof obj];
        if (value !== 'asc' && value !== 'desc') {
          throw new HttpError(400, `Invalid orderBy value: ${value}`);
        }
      }
    }
  }

  /**
   * 验证用户是否存在
   */
  async validateUserExists(userId: number): Promise<void> {
    if (!userId) {
      throw new HttpError(400, 'User ID is required');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(400, 'User not found');
    }
  }

  /**
   * 验证房产是否存在
   */
  async validatePropertyExists(propertyId: number): Promise<void> {
    if (!propertyId) {
      throw new HttpError(400, 'Property ID is required');
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new HttpError(404, 'Property not found');
    }
  }

  /**
   * 验证用户是否已订阅房产
   */
  async validateUserNotSubscribed(userId: number, propertyId: number): Promise<void> {
    const isSubscribed = await prisma.user.findUnique({
      where: {
        id: userId,
        properties: {
          some: {
            id: propertyId,
          },
        },
      },
    });

    if (isSubscribed) {
      throw new HttpError(409, 'Already subscribed to this property');
    }
  }

  async validateUserSubscribed(userId: number, propertyId: number): Promise<void> {
    const isSubscribed = await prisma.user.findUnique({
      where: {
        id: userId,
        properties: {
          some: {
            id: propertyId,
          },
        },
      },
    });

    if (!isSubscribed) {
      throw new HttpError(404, 'User not subscribed to this property');
    }
  }

  /**
   * 验证偏好设置参数
   */
  validatePreferences(preferences: any): void {
    // 验证价格范围
    if (preferences.minPrice && preferences.maxPrice) {
      if (preferences.minPrice > preferences.maxPrice) {
        throw new HttpError(400, 'Min price cannot be greater than max price');
      }
    }

    // 验证卧室数量范围
    if (preferences.minBedrooms && preferences.maxBedrooms) {
      if (preferences.minBedrooms > preferences.maxBedrooms) {
        throw new HttpError(400, 'Min bedrooms cannot be greater than max bedrooms');
      }
    }

    // 验证浴室数量范围
    if (preferences.minBathrooms && preferences.maxBathrooms) {
      if (preferences.minBathrooms > preferences.maxBathrooms) {
        throw new HttpError(400, 'Min bathrooms cannot be greater than max bathrooms');
      }
    }

    // 验证通勤时间范围
    if (preferences.minCommuteTime && preferences.maxCommuteTime) {
      if (preferences.minCommuteTime > preferences.maxCommuteTime) {
        throw new HttpError(400, 'Min commute time cannot be greater than max commute time');
      }
    }
  }
}

export default new ValidationService();
