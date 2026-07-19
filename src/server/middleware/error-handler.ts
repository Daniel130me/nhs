import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/api-response";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = req.requestId || "unknown";
  
  // Log the complete internal error with request details
  logger.error(`[Request-ID: ${requestId}] Unhandled Error: ${err.message}`, err);

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    });

    sendError(
      res,
      "The submitted information is invalid",
      "VALIDATION_ERROR",
      400,
      fields
    );
    return;
  }

  // 2. Handle Custom AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }

  // 3. Handle PostgreSQL constraint errors
  if (err.code && typeof err.code === "string") {
    // Unique violation (e.g. email exists)
    if (err.code === "23505") {
      sendError(
        res,
        "A resource with this identifier already exists.",
        "DUPLICATE_RESOURCE",
        409
      );
      return;
    }
    // Foreign key violation
    if (err.code === "23503") {
      sendError(
        res,
        "A referenced resource does not exist.",
        "FOREIGN_KEY_VIOLATION",
        400
      );
      return;
    }
  }

  // 4. Default: Unexpected Internal Server Error
  const isProduction = env.NODE_ENV === "production";
  const safeMessage = isProduction
    ? "An unexpected internal server error occurred"
    : err.message || "Internal server error";

  sendError(
    res,
    safeMessage,
    "INTERNAL_SERVER_ERROR",
    err.statusCode || 500
  );
}
