import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env if present
dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional().or(z.literal("")).default(process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/nhs_db"),
  FRONTEND_URL: z.string().url().optional().or(z.literal("")).default(process.env.APP_URL || "http://localhost:3000"),
  SESSION_SECRET: z.string().min(1).default("default-very-long-and-secure-session-secret-key-32-chars-at-least"),
  R2_ACCOUNT_ID: z.string().optional().or(z.literal("")),
  R2_BUCKET: z.string().optional().or(z.literal("")),
  R2_ACCESS_KEY_ID: z.string().optional().or(z.literal("")),
  R2_SECRET_ACCESS_KEY: z.string().optional().or(z.literal("")),
  R2_ENDPOINT: z.string().url().optional().or(z.literal("")),
  R2_PUBLIC_URL: z.string().url().optional().or(z.literal("")),
  GEMINI_API_KEY: z.string().min(1).optional().or(z.literal("")),
});

let parsedEnv: z.infer<typeof environmentSchema>;
try {
  parsedEnv = environmentSchema.parse(process.env);
} catch (error: any) {
  console.error("❌ Environment validation failed:", error.format ? error.format() : error);
  throw error;
}

export const env = parsedEnv;
