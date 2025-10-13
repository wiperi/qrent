import { Request, Response, NextFunction } from 'express';
import { propertyService } from '@/services/PropertyService';
import { Preference } from '@qrent/shared';
import _ from 'lodash';

export class PropertyController {
  async handleSubscribeProperty(req: Request, res: Response, next: NextFunction) {
    const propertyId = parseInt(req.params.propertyId);
    const userId = req.user!.userId;
    const result = await propertyService.subscribeToProperty(userId, propertyId);

    res.json(result);
  }

  async handleUnsubscribeProperty(req: Request, res: Response, next: NextFunction) {
    const propertyId = parseInt(req.params.propertyId);
    const userId = req.user!.userId;
    const result = await propertyService.unsubscribeFromProperty(userId, propertyId);

    res.json(result);
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const result = await propertyService.fetchSubscriptions(userId);

    res.json(result);
  }

  async fetchProperty(req: Request, res: Response) {
    let preferences: Preference & { page: number; pageSize: number } = req.body;

    if (req.user?.userId) {
      preferences.userId = req.user.userId;
    }
    await propertyService.createPreference(
      _.omit(preferences, ['page', 'pageSize', 'orderBy', 'publishedAt']) as Preference
    );

    const properties = await propertyService.getPropertiesByPreferences(preferences);
    res.json(properties);
  }
}

export const propertyController = new PropertyController();
