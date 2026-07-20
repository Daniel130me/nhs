import { describe, test, expect } from "vitest";
import { createStudentSchema, importStudentsSchema, enrolmentSchema } from "../server/modules/admin/admin.schema";
import { acceptInvitationSchema, forgotPasswordSchema, resetPasswordSchema } from "../server/modules/auth/auth.schema";

describe("Student Creation Zod Schema Validation", () => {
  test("creates a valid student", () => {
    const valid = {
      firstName: "James",
      lastName: "Bond",
      email: "james.bond@mi6.gov.uk",
      studentNumber: "007",
      phone: "+447000000007",
      centerId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      gender: "Male"
    };
    const parsed = createStudentSchema.safeParse(valid);
    if (!parsed.success) {
      console.log("VALIDATION ERROR IS:", JSON.stringify(parsed.error.format(), null, 2));
    }
    expect(parsed.success).toBe(true);
  });

  test("rejects student with invalid email", () => {
    const invalid = {
      firstName: "James",
      lastName: "Bond",
      email: "not-an-email",
    };
    const parsed = createStudentSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  test("rejects import with empty students list", () => {
    const invalidImport = { students: [] };
    const parsed = importStudentsSchema.safeParse(invalidImport);
    expect(parsed.success).toBe(false);
  });

  test("accepts multiple students in import schema", () => {
    const validImport = {
      students: [
        { firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
        { firstName: "Bob", lastName: "Jones", email: "bob@example.com" }
      ]
    };
    const parsed = importStudentsSchema.safeParse(validImport);
    expect(parsed.success).toBe(true);
  });
});

describe("Invitation and Auth Zod Schema Validation", () => {
  test("accepts invitation with strong matching passwords", () => {
    const payload = {
      password: "StrongPassword123!",
      passwordConfirmation: "StrongPassword123!"
    };
    const parsed = acceptInvitationSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  test("rejects mismatched passwords during invitation accept", () => {
    const payload = {
      password: "StrongPassword123!",
      passwordConfirmation: "DifferentPassword123!"
    };
    const parsed = acceptInvitationSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  test("rejects weak password missing uppercase during invitation accept", () => {
    const payload = {
      password: "weakpassword123!",
      passwordConfirmation: "weakpassword123!"
    };
    const parsed = acceptInvitationSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  test("valid forgot password payload passes", () => {
    const payload = { email: "student@example.com" };
    const parsed = forgotPasswordSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  test("valid reset password passes validation", () => {
    const payload = {
      password: "ComplexPassword123!",
      passwordConfirmation: "ComplexPassword123!"
    };
    const parsed = resetPasswordSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });
});

describe("Enrolment Zod Schema Validation", () => {
  test("accepts valid student UUID enrolment", () => {
    const payload = { studentId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" };
    const parsed = enrolmentSchema.safeParse(payload);
    if (!parsed.success) {
      console.log("ENROLMENT ERROR IS:", JSON.stringify(parsed.error.format(), null, 2));
    }
    expect(parsed.success).toBe(true);
  });

  test("rejects malformed studentId", () => {
    const payload = { studentId: "not-a-uuid" };
    const parsed = enrolmentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
