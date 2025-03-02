import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const secretKey = process.env.JWT_SECRET || 'your_secret_key';
import HttpError from '@/error/HttpError';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
  interface Request {
    user: any;
  }
}

export function generateToken(userId: string): string {
    const expiresIn = '1h';
    return jwt.sign({ userId }, secretKey, { expiresIn });
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) {
      return next(new HttpError(401, 'Token is missing'));
    }
  
    jwt.verify(token, secretKey, (err: any, user: any) => {
      if (err) {
        return next(new HttpError(403, 'Token is not valid'));
        }
        req.user = user;
      next();
    });
  };