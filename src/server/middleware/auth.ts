import { Request, Response, NextFunction } from "express";
import { query } from "../config/database";
import { UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "../../types";
import { verifyToken } from "../utils/token";

export const bearerTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      if (!req.session) {
        req.session = {} as any;
      }
      req.session.userId = decoded.userId;
    }
  }
  next();
};

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
    throw new ForbiddenError("Access denied. Admin privileges required.");
  }

  next();
});

// requireRole(...roles)
export function requireRole(...roles: UserRole[]) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Role ${req.user.role} is not permitted.`);
    }

    next();
  });
}

// requireOwnership(...)
export const requireOwnership = (paramName: string = "id") => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

    const role = req.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return next(); // Admins bypass ownership check
    }

    const targetId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (targetId !== req.user.id) {
      throw new ForbiddenError("Access denied. You do not own this resource.");
    }

    next();
  });
};

// requireClassInstructor(...)
export const requireClassInstructor = (classIdParam: string = "id") => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

    const role = req.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return next(); // Admins bypass
    }

    const classId = req.params[classIdParam] || req.body[classIdParam] || req.query[classIdParam];
    if (!classId) {
      throw new BadRequestError("Class ID is required.");
    }

    const classes = await query("SELECT * FROM classes WHERE id = $1", [classId]);
    if (classes.length === 0) {
      throw new NotFoundError("Class not found.");
    }

    // Check if assigned in class_instructors table
    const assignment = await query(
      "SELECT 1 FROM class_instructors WHERE class_id = $1 AND instructor_id = $2",
      [classId, req.user.id]
    );
    if (assignment.length === 0) {
      throw new ForbiddenError("Access denied. You are not the assigned instructor for this class.");
    }

    next();
  });
};

// requireClassStudent(...)
export const requireClassStudent = (classIdParam: string = "id") => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

    const role = req.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return next(); // Admins bypass
    }

    const classId = req.params[classIdParam] || req.body[classIdParam] || req.query[classIdParam];
    if (!classId) {
      throw new BadRequestError("Class ID is required.");
    }

    const classes = await query("SELECT * FROM classes WHERE id = $1", [classId]);
    if (classes.length === 0) {
      throw new NotFoundError("Class not found.");
    }

    const cls = classes[0];

    if (role === "INSTRUCTOR") {
      const assignment = await query(
        "SELECT 1 FROM class_instructors WHERE class_id = $1 AND instructor_id = $2",
        [classId, req.user.id]
      );
      if (assignment.length === 0) {
        throw new ForbiddenError("Access denied. You are not the assigned instructor for this class.");
      }
      return next();
    }

    if (role === "STUDENT") {
      // In a real system, we'd check an enrollments table. For now, we allow access to active student users.
      return next();
    }

    throw new ForbiddenError("Access denied. Insufficient permissions.");
  });
};

