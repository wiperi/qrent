import { propertyService } from '@/services/PropertyService';
import { userService } from '@/services/UserService';
import { Request, Response, NextFunction } from 'express';

class UserController {
  async getPreference(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const preferences = await propertyService.fetchPreference(userId);
    res.json(preferences);
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const profile = await userService.getProfile(userId);
    res.json(profile);
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.userId;
    const { name, gender, emailPreferences } = req.body;
    const profile = await userService.updateProfile(userId, { name, gender, emailPreferences });
    res.json(profile);
  }
}

export const userController = new UserController();
