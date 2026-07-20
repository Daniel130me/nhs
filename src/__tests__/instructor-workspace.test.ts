import { describe, test, expect } from "vitest";
import { createWeeklyLogSchema } from "../server/modules/weekly-logs/weekly-logs.routes";

describe("Instructor Workspace Schemas", () => {
  test("Valid weekly log payload passes schema validation", () => {
    const validLog = {
      classId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      hoursLogged: 40,
      achievements: "Completed modules 1 and 2.",
      challenges: "Some networking issues.",
      supportRequired: "None.",
      status: "SUBMITTED",
      moduleIds: ["b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"]
    };
    
    const parsed = createWeeklyLogSchema.safeParse(validLog);
    expect(parsed.success).toBe(true);
  });

  test("Weekly log rejects negative teaching hours", () => {
    const invalidLog = {
      classId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      hoursLogged: -5,
      status: "DRAFT"
    };
    
    const parsed = createWeeklyLogSchema.safeParse(invalidLog);
    expect(parsed.success).toBe(false);
  });

  test("Weekly log rejects impossible teaching hours (>168)", () => {
    const invalidLog = {
      classId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      hoursLogged: 169,
      status: "DRAFT"
    };
    
    const parsed = createWeeklyLogSchema.safeParse(invalidLog);
    expect(parsed.success).toBe(false);
  });

  test("Weekly log rejects invalid UUID formats for classId", () => {
    const invalidLog = {
      classId: "not-a-uuid",
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      hoursLogged: 20,
      status: "DRAFT"
    };
    
    const parsed = createWeeklyLogSchema.safeParse(invalidLog);
    expect(parsed.success).toBe(false);
  });
});
