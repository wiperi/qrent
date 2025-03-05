import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: string | jwt.JwtPayload; // 这里扩展 user
    }
  }
}
