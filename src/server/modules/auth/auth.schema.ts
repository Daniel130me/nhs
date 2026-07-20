import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(10, "Password must be at least 10 characters long"),
  gender: z.string().optional(),
  center: z.string().optional(),
  courses: z.array(z.string()).optional(),
  role: z.string().optional(),
});

export const instructorRegisterSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email format").max(255),
  password: z.string()
    .min(10, "Password must be at least 10 characters long")
    .max(128, "Password cannot exceed 128 characters")
    .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
    .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least one number" }),
  passwordConfirmation: z.string(),
  phone: z.string().optional(),
  center: z.string().min(1, "Centre is required"),
  courses: z.array(z.string()).min(1, "At least one course competency must be selected"),
  gender: z.string().optional(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const acceptInvitationSchema = z.object({
  password: z.string()
    .min(10, "Password must be at least 10 characters long")
    .max(128, "Password cannot exceed 128 characters")
    .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
    .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least one number" }),
  passwordConfirmation: z.string(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(10, "Password must be at least 10 characters long")
    .max(128, "Password cannot exceed 128 characters")
    .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
    .refine((val) => /[0-9]/.test(val), { message: "Password must contain at least one number" }),
  passwordConfirmation: z.string(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

