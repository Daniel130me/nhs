import { Router } from "express";
import crypto from "crypto";
import argon2 from "argon2";
import { query } from "../../config/database";
import { loginSchema, registerSchema, instructorRegisterSchema } from "./auth.schema";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import rateLimit from "express-rate-limit";
import { requireActiveUser } from "../../middleware/auth";

const router = Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: "Too many registrations, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper for SHA-256 hashing
function getSha256(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

// 1. PUBLIC INSTRUCTOR REGISTRATION
router.post(
  "/register/instructor",
  registerLimiter,
  asyncHandler(async (req, res) => {
    // Validate inputs
    const payload = instructorRegisterSchema.parse(req.body);
    const { firstName, lastName, email, password, center, courses, gender } = payload;

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in users table
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL", [normalizedEmail]);
    if (existing.length > 0) {
      throw new BadRequestError("An account with this email is already registered.");
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const userId = crypto.randomUUID();

    // Insert into unified users table (role is INSTRUCTOR, status is PENDING)
    await query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, center, courses, gender, is_password_migrated)
       VALUES ($1, $2, $3, $4, $5, 'INSTRUCTOR', 'PENDING', $6, $7, $8, TRUE)`,
      [
        userId,
        firstName,
        lastName,
        normalizedEmail,
        passwordHash,
        center,
        JSON.stringify(courses),
        gender || null,
      ]
    );

    // Insert into legacy instructors table to ensure backward compatibility
    await query(
      `INSERT INTO instructors (id, first_name, last_name, email, password, gender, center, courses, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Instructor', 'Deactivated')`,
      [
        userId,
        firstName,
        lastName,
        normalizedEmail,
        passwordHash,
        gender || "",
        center,
        JSON.stringify(courses),
      ]
    );

    logger.info(`[Auth] Registered new instructor ${normalizedEmail} (PENDING status)`);

    return sendSuccess(
      res,
      {
        id: userId,
        firstName,
        lastName,
        email: normalizedEmail,
        role: "INSTRUCTOR",
        status: "PENDING",
        center,
        courses,
        createdAt: new Date().toISOString(),
      },
      "Registration successful. Your application is pending approval by an administrator.",
      201
    );
  })
);

// Fallback legacy register endpoint
router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const { firstName, lastName, email, password, gender, center, courses, role } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    // Enforce public registration cannot assign privileged roles
    const safeRole = "INSTRUCTOR";
    const safeStatus = "PENDING";

    const existing = await query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL", [normalizedEmail]);
    if (existing.length > 0) {
      throw new BadRequestError("An account with this email is already registered.");
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const userId = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, center, courses, gender, is_password_migrated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
      [
        userId,
        firstName,
        lastName,
        normalizedEmail,
        passwordHash,
        safeRole,
        safeStatus,
        center || null,
        JSON.stringify(courses || []),
        gender || null,
      ]
    );

    await query(
      `INSERT INTO instructors (id, first_name, last_name, email, password, gender, center, courses, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Instructor', 'Deactivated')`,
      [
        userId,
        firstName,
        lastName,
        normalizedEmail,
        passwordHash,
        gender || "",
        center || "",
        JSON.stringify(courses || []),
      ]
    );

    return sendSuccess(
      res,
      {
        id: userId,
        firstName,
        lastName,
        email: normalizedEmail,
        role: safeRole,
        status: safeStatus,
        center,
        courses,
        createdAt: new Date().toISOString(),
      },
      "Registration successful",
      201
    );
  })
);

// 2. LOGIN
router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res, next) => {
    const payload = loginSchema.parse(req.body);
    const { email, password } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    // Look up the user
    const users = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL", [normalizedEmail]);
    if (users.length === 0) {
      // Use generic invalid-credentials response for security
      throw new UnauthorizedError("Invalid email or password.");
    }

    const user = users[0];

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new UnauthorizedError("Account is temporarily locked due to too many failed attempts. Please try again later.");
    }

    // Check status
    if (user.status === "PENDING") {
      throw new UnauthorizedError("Your registration application is currently pending approval.");
    } else if (user.status === "SUSPENDED") {
      throw new UnauthorizedError("Your account has been suspended. Please contact an Administrator.");
    } else if (user.status === "REJECTED") {
      throw new UnauthorizedError("Your registration application was rejected.");
    }

    let isValid = false;

    // Verify Password
    if (user.is_password_migrated) {
      isValid = await argon2.verify(user.password_hash, password);
    } else {
      // Temporary password migrator checking both plaintext & legacy SHA-256 hashes
      const legacyHashed = getSha256(password);
      if (user.password_hash === password || user.password_hash === legacyHashed) {
        isValid = true;
        
        // Upgrade immediately to Argon2id
        try {
          const argonHash = await argon2.hash(password, { type: argon2.argon2id });
          await query(
            `UPDATE users 
             SET password_hash = $1, is_password_migrated = TRUE, password_changed_at = NOW() 
             WHERE id = $2`,
            [argonHash, user.id]
          );
          // Sync with legacy instructors table
          await query("UPDATE instructors SET password = $1 WHERE LOWER(email) = LOWER($2)", [argonHash, normalizedEmail]);
          logger.info(`[Auth Security] Securely migrated password hash to Argon2id for user ${normalizedEmail}`);
        } catch (migrationErr) {
          logger.error("Failed to rehash legacy password on login:", migrationErr);
        }
      }
    }

    if (!isValid) {
      // Handle failed login attempts
      const newAttempts = user.failed_login_attempts + 1;
      let lockoutQuery = "";
      let params: any[] = [];

      if (newAttempts >= 5) {
        // Lock account for 15 minutes
        lockoutQuery = `UPDATE users SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $2`;
        params = [newAttempts, user.id];
      } else {
        lockoutQuery = `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`;
        params = [newAttempts, user.id];
      }

      await query(lockoutQuery, params);
      throw new UnauthorizedError("Invalid email or password.");
    }

    // Reset failed login attempts and update last_login_at
    await query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    // Save login metadata to the session
    req.session.regenerate((err) => {
      if (err) {
        logger.error("Session regeneration error:", err);
        return next(err);
      }

      req.session.userId = user.id;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error("Session save error:", saveErr);
          return next(saveErr);
        }

        return sendSuccess(
          res,
          {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            status: user.status,
            center: user.center,
            courses: user.courses,
            createdAt: user.created_at,
          },
          "Login successful"
        );
      });
    });
  })
);

// 3. GET CURRENT USER
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.session || !req.session.userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const users = await query("SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", [req.session.userId]);
    if (users.length === 0) {
      res.clearCookie("nhs_sid");
      throw new UnauthorizedError("User session not found.");
    }

    const user = users[0];

    // Propagate req.user object for authorization middleware in other route scopes
    req.user = {
      id: user.id,
      role: user.role,
      status: user.status,
      email: user.email,
    };

    return sendSuccess(res, {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      center: user.center,
      courses: user.courses,
      createdAt: user.created_at,
    });
  })
);

// 4. LOGOUT
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          logger.error("Error destroying session:", err);
        }
        res.clearCookie("nhs_sid");
        return sendSuccess(res, { success: true }, "Logged out successfully");
      });
    } else {
      res.clearCookie("nhs_sid");
      return sendSuccess(res, { success: true }, "Logged out successfully");
    }
  })
);

// 5. LOGOUT FROM ALL DEVICES
router.post(
  "/logout-all",
  asyncHandler(async (req, res) => {
    if (!req.session || !req.session.userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const userId = req.session.userId;

    // Delete all sessions matching this user from connect-pg-simple session table
    await query(`DELETE FROM "session" WHERE sess->>'userId' = $1`, [userId]);

    res.clearCookie("nhs_sid");
    return sendSuccess(res, { success: true }, "Logged out of all sessions and devices successfully");
  })
);

// 6. CHANGE PASSWORD
router.post(
  "/change-password",
  requireActiveUser,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new BadRequestError("Current password and new password are required.");
    }

    if (newPassword.length < 10) {
      throw new BadRequestError("New password must be at least 10 characters long.");
    }
    // Check complexity
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new BadRequestError("New password must contain at least one uppercase letter, one lowercase letter, and one number.");
    }

    const userId = req.user!.id;
    const users = await query("SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
    if (users.length === 0) {
      throw new UnauthorizedError("User not found.");
    }

    const user = users[0];

    // Verify current password
    let isValid = false;
    if (user.is_password_migrated) {
      isValid = await argon2.verify(user.password_hash, currentPassword);
    } else {
      const legacyHashed = getSha256(currentPassword);
      if (user.password_hash === currentPassword || user.password_hash === legacyHashed) {
        isValid = true;
      }
    }

    if (!isValid) {
      throw new BadRequestError("Invalid current password.");
    }

    // Hash new password using Argon2id
    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    // Update in database
    await query(
      `UPDATE users 
       SET password_hash = $1, is_password_migrated = TRUE, password_changed_at = NOW(), failed_login_attempts = 0 
       WHERE id = $2`,
      [newHash, userId]
    );

    // Sync with legacy instructors table
    await query("UPDATE instructors SET password = $1 WHERE id = $2", [newHash, userId]);

    logger.info(`[Auth Security] Password changed successfully for user ${user.email}`);

    return sendSuccess(res, { success: true }, "Password changed successfully.");
  })
);

export default router;
