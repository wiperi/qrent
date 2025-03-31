import { Prisma, prisma, User } from '@qrent/shared';
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
}

export const propertyService = new PropertyService();