import { Request, Response, NextFunction } from "express";
import { query } from "../config/database";
import { UnauthorizedError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError("Authentication required. Please log in.");
  }

  if (!req.user) {
    const users = await query("SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", [req.session.userId]);
    if (users.length === 0) {
      res.clearCookie("nhs_sid");
      throw new UnauthorizedError("Session invalid or user not found.");
    }
    const user = users[0];
    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      email: user.email,
    };
  }

  next();
});

export const requireActiveUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Ensure we are authenticated first
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError("Authentication required. Please log in.");
  }

  if (!req.user) {
    const users = await query("SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", [req.session.userId]);
    if (users.length === 0) {
      res.clearCookie("nhs_sid");
      throw new UnauthorizedError("Session invalid or user not found.");
    }
    const user = users[0];
    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      email: user.email,
    };
  }

  if (req.user.status !== "ACTIVE") {
    throw new UnauthorizedError("Access denied. Your account status is not ACTIVE.");
  }

  next();
});

export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Ensure we are authenticated first
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError("Authentication required. Please log in.");
  }

  if (!req.user) {
    const users = await query("SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", [req.session.userId]);
    if (users.length === 0) {
      res.clearCookie("nhs_sid");
      throw new UnauthorizedError("Session invalid or user not found.");
    }
    const user = users[0];
    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      email: user.email,
    };
  }

  if (req.user.status !== "ACTIVE") {
    throw new UnauthorizedError("Access denied. Your account status is not ACTIVE.");
  }

  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    throw new UnauthorizedError("Access denied. Admin privileges required.");
  }

  next();
});

