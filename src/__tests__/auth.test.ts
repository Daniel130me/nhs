import { describe, test, expect } from "vitest";
import crypto from "crypto";
import { z } from "zod";

function hashPassword(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex");
}

describe("Security & Authentication Hashing Unit Tests", () => {
  test("SHA-256 password hashing utility produces correct hashes", () => {
    const password = "password123";
    const hash = hashPassword(password);
    
    expect(hash).toBe("ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f");
    expect(hash).not.toBe(password);
  });

  test("SHA-256 hashing is deterministic", () => {
    const p1 = "NewHorizons2026!";
    expect(hashPassword(p1)).toBe(hashPassword(p1));
  });
});

describe("Zod Payload Schema Validation Tests", () => {
  const loginSchema = z.object({
    email: z.string().email("Invalid email format").min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
  });

  test("valid login payload passes validation", () => {
    const validPayload = {
      email: "admin@newhorizons.com",
      password: "password123"
    };
    const parsed = loginSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  test("invalid login payload fails validation with email error", () => {
    const invalidPayload = {
      email: "invalid-email-format",
      password: "12"
    };
    const parsed = loginSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
