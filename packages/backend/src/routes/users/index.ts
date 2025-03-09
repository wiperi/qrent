import { catchError } from "@/utils/helper";
import { prisma } from "@qrent/shared/prisma/client";
import { Router, Request, Response, NextFunction } from "express";
import { UserPreference } from "@qrent/shared";
import HttpError from "@/error/HttpError";
const router = Router();

router.post("/preferences/search", catchError(async (req: Request, res: Response, next: NextFunction) => {

  const preferences = req.body as UserPreference;

  if (req.user?.userId === undefined) {
    throw new HttpError(401, 'Unauthorized');
  }

  await prisma.userPreference.create({
    data: {
      ...preferences,
      userId: req.user.userId,
    },
  });
  
  return res.status(201).json({
    message: "Successfully created preferences",
  });
}));

export default router;
