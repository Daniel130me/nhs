import { Router } from "express";
import crypto from "crypto";
import { query } from "../../config/database";
import { loginSchema, registerSchema, changePasswordSchema } from "./auth.schema";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

const router = Router();

function getSha256(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

router.post("/login", asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const { email, password } = payload;

  const instructors = await query(
    "SELECT * FROM instructors WHERE LOWER(email) = LOWER($1)",
    [email.trim()]
  );

  if (instructors.length > 0) {
    const inst = instructors[0];
    const savedPassword = inst.password || 'password123';
    const inputHashed = getSha256(password);

    // Verify either raw password matches or hashed password matches
    if (savedPassword !== password && savedPassword !== inputHashed) {
      throw new UnauthorizedError("Invalid password");
    }

    // Auto-migrate to hashed on successful login
    if (savedPassword === password && password !== inputHashed) {
      try {
        await query("UPDATE instructors SET password = $1 WHERE id = $2", [inputHashed, inst.id]);
        logger.info(`[Auth Security] Auto-upgraded password hash for instructor ${inst.email}`);
      } catch (dbErr) {
        logger.error("Failed to auto-upgrade password to hash:", dbErr);
      }
    }

    const status = inst.status || 'Active';
    if (status === 'Deactivated') {
      throw new BadRequestError("Your account has been deactivated. Please contact an Administrator.");
    }

    return sendSuccess(res, {
      id: inst.id,
      firstName: inst.first_name,
      lastName: inst.last_name,
      email: inst.email,
      gender: inst.gender,
      center: inst.center,
      courses: inst.courses,
      role: inst.role,
      status: status,
      createdAt: inst.created_at
    }, "Login successful");
  }

  throw new NotFoundError("Instructor not found with this email");
}));

router.post("/register", asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const { firstName, lastName, email, password, gender, center, courses, role } = payload;

  const id = `inst-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const hashedPassword = getSha256(password);
  
  const initialStatus = role === 'Admin' ? 'Active' : 'Deactivated';
  
  await query(
    `INSERT INTO instructors (id, first_name, last_name, email, password, gender, center, courses, role, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      firstName,
      lastName,
      email.trim(),
      hashedPassword,
      gender || "",
      center || "",
      JSON.stringify(courses || []),
      role,
      initialStatus,
      createdAt
    ]
  );

  return sendSuccess(res, {
    id,
    firstName,
    lastName,
    email,
    gender,
    center,
    courses,
    role,
    status: initialStatus,
    createdAt
  }, "Registration successful", 201);
}));

router.post("/change-password", asyncHandler(async (req, res) => {
  const payload = changePasswordSchema.parse(req.body);
  const { instructorId, currentPassword, newPassword } = payload;

  const instructors = await query("SELECT * FROM instructors WHERE id = $1", [instructorId]);
  if (instructors.length === 0) {
    throw new NotFoundError("Instructor profile not found");
  }

  const inst = instructors[0];
  const savedPassword = inst.password || 'password123';
  const currentInputHashed = getSha256(currentPassword);

  if (savedPassword !== currentPassword && savedPassword !== currentInputHashed) {
    throw new UnauthorizedError("Current password verification failed");
  }

  const newHashed = getSha256(newPassword);
  await query("UPDATE instructors SET password = $1 WHERE id = $2", [newHashed, instructorId]);
  
  return sendSuccess(res, { success: true }, "Password updated securely");
}));

export default router;
