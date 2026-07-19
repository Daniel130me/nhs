import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  gender: z.string().optional(),
  center: z.string().optional(),
  courses: z.array(z.string()).optional(),
  role: z.enum(["Instructor", "Admin"]),
});

export const changePasswordSchema = z.object({
  instructorId: z.string().min(1, "Instructor ID is required"),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});
