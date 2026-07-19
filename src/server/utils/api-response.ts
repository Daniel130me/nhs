import { Response } from "express";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Operation completed successfully",
  statusCode = 200
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  statusCode = 500,
  fields?: Record<string, string[]>
): Response {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
  return res.status(statusCode).json(response);
}
