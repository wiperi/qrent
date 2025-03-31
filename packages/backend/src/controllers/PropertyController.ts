import { Request, Response, NextFunction } from "express";
import { propertyService } from "@/services/PropertyService";

export class PropertyController {
  async handleProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.body;

      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const result = await propertyService.subscribeToProperty(userId, propertyId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const propertyController = new PropertyController();