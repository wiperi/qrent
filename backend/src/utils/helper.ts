import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import HttpError from '@/error/HttpError';
import { LOCALE } from '@qrent/shared/enum';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function catchError(
  fn: (req: Request, res: Response, next: NextFunction) => any
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res, next);
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Authentication middleware that verifies JWT tokens
 * Paths in the whitelist will bypass authentication
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Define whitelist paths that bypass authentication
    const whitelistPaths = [
      '/auth/login',
      '/auth/register',
      '/echo',
      '/properties/search',
      '/property-stats',
    ];

    // Check if the path is in the whitelist
    if (whitelistPaths.some(path => req.path.startsWith(path))) {
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ') &&
        process.env.BACKEND_JWT_SECRET_KEY
      ) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, process.env.BACKEND_JWT_SECRET_KEY);
          req.user = decoded as JwtPayload;
          return next();
        } catch (error) {
          req.user = undefined;
          return next();
        }
      }
      return next();
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.BACKEND_JWT_SECRET_KEY;
    if (!secret) {
      throw new HttpError(500, 'JWT secret is not configured');
    }

    const decoded = jwt.verify(token, secret);

    // Add user data to request object
    req.user = decoded as JwtPayload;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new HttpError(401, 'Token expired'));
    } else if (error instanceof HttpError) {
      next(error);
    } else {
      next(new HttpError(401, 'Failed to authenticate token'));
    }
  }
};

export function generateToken(userId: number): string {
  const secret = process.env.BACKEND_JWT_SECRET_KEY;

  if (!secret) {
    throw new HttpError(500, 'JWT secret is not configured');
  }

  return jwt.sign({ userId }, secret, { expiresIn: '90d' });
}
