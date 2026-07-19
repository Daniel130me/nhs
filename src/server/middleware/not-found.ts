import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/api-response";

export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  // If it's an API route, send JSON error. Otherwise, next() so static or SPA handles it.
  if (req.path.startsWith("/api")) {
    sendError(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
    return;
  }
  next();
}
