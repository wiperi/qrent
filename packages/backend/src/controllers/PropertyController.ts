import { Request, Response, NextFunction } from 'express';
import { propertyService } from '@/services/PropertyService';
import { prisma, UserPreference } from '@qrent/shared';

export class PropertyController {
  async handleProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.body;

      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const result = await propertyService.subscribeToProperty(userId, propertyId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async fetchProperty(req: Request, res: Response) {
    const preferences: UserPreference & { page: number; pageSize: number } = req.body;

    const properties = await propertyService.getPropertiesByPreferences(preferences);
    res.json(properties);
  }
}

export const propertyController = new PropertyController();
