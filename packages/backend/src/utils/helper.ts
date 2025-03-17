import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import HttpError from '@/error/HttpError';

export function catchError(fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res, next);
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Authentication middleware that verifies JWT tokens
 * Paths in the whitelist will bypass authentication
 */
export const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Define whitelist paths that bypass authentication
  const whitelistPaths = ['/auth/login', '/auth/register'];
  
  // Check if the path is in the whitelist
  if (whitelistPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError(401, 'No token provided'));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new HttpError(500, 'JWT secret is not configured'));
    }
    
    const decoded = jwt.verify(token, secret);
    
    // Add user data to request object
    req.user = decoded as JwtPayload;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new HttpError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      return next(new HttpError(401, 'Token expired'));
    }
    return next(new HttpError(401, 'Failed to authenticate token'));
  }
};

export function generateToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new HttpError(500, 'JWT secret is not configured');
  }

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: '90d' }
  );
}
