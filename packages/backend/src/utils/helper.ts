import { NextFunction, Request, Response } from 'express';

/**
 * Executes a function, if success, return the response
 * if error, catch it and pass to next middleware
 *
 * @param fn - The function to execute.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @returns The JSON response if the function executes successfully.
 * @throws Passes any caught error to the next middleware.
 */
export async function tryCatch(fn: any, req: Request, res: Response, next: NextFunction) {
  try {
    return res.json(await fn());
  } catch (error) {
    next(error);
  }
}

export async function catchError(fn: Function): Promise<Function> {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(await fn(req, res, next));
    } catch (error) {
      next(error);
    }
  }
}