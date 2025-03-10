import { catchError } from '@/utils/helper';
import { prisma } from '@qrent/shared/prisma/client';
import { Router, Request, Response, NextFunction } from 'express';
import { UserPreference } from '@qrent/shared';
import HttpError from '@/error/HttpError';
import _ from 'lodash';

const router = Router();

router.put(
  '/preferences/search',
  catchError(async (req: Request, res: Response, next: NextFunction) => {
    const preferences = req.body as UserPreference;

    if (req.user?.userId === undefined) {
      throw new HttpError(401, 'Unauthorized');
    }

    const existingPreferences = await prisma.userPreference.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (existingPreferences) {
      await prisma.userPreference.update({
        where: {
          id: existingPreferences.id,
        },
        data: {
          ...preferences,
        },
      });

      return res.status(200).json({
        message: 'Successfully updated preferences',
      });
    } else {
      await prisma.userPreference.create({
        data: {
          ...preferences,
          userId: req.user.userId,
        },
      });

      return res.status(201).json({
        message: 'Successfully created preferences',
      });
    }
  })
);

router.get(
  '/preferences/search',
  catchError(async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.userId === undefined) {
      throw new HttpError(401, 'Unauthorized');
    }

    const preferences = await prisma.userPreference.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!preferences) {
      throw new HttpError(404, 'Preferences not found');
    }

    return res.json({
      preferences: _.omit(preferences, ['userId', 'id']),
    });
  })
);

export default router;
