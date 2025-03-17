import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }

  interface JwtPayload {
    userId: number;
  }
}
