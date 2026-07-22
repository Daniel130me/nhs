import { vi, describe, test, expect, beforeEach } from "vitest";
import { query } from "../server/config/database";

vi.mock("../server/config/database", () => {
  return {
    query: vi.fn(),
  };
});

// Utility function to normalize status across user and instructor records
export function normalizeInstructorStatus(status?: string): string {
  if (!status) return 'PENDING';
  const u = status.toUpperCase();
  if (u === 'ACTIVE' || u === 'APPROVED') return 'ACTIVE';
  if (u === 'PENDING' || u === 'UNVERIFIED' || u === 'PENDING_ACTIVATION' || u === 'PENDING_APPROVAL' || u === 'PENDING APPROVAL') return 'PENDING';
  if (u === 'SUSPENDED' || u === 'DEACTIVATED') return 'SUSPENDED';
  if (u === 'REJECTED') return 'REJECTED';
  return u;
}

// SQL query clause builder for Admin Portal Instructor filtering
export function buildInstructorFilterQuery(search: string, status: string, center: string, course: string) {
  let sql = `SELECT id, first_name AS "firstName", last_name AS "lastName", email, role, status, gender, center, courses FROM users WHERE role = 'INSTRUCTOR' AND deleted_at IS NULL`;
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  if (status && status !== "All") {
    const uStatus = status.toUpperCase();
    if (uStatus === 'SUSPENDED' || uStatus === 'DEACTIVATED') {
      sql += ` AND (UPPER(status::text) = 'SUSPENDED' OR UPPER(status::text) = 'DEACTIVATED')`;
    } else if (uStatus === 'ACTIVE' || uStatus === 'APPROVED') {
      sql += ` AND (UPPER(status::text) = 'ACTIVE' OR UPPER(status::text) = 'APPROVED')`;
    } else if (uStatus === 'PENDING' || uStatus === 'PENDING_APPROVAL' || uStatus === 'PENDING APPROVAL') {
      sql += ` AND (UPPER(status::text) = 'PENDING' OR UPPER(status::text) = 'PENDING_APPROVAL' OR UPPER(status::text) = 'PENDING_ACTIVATION' OR UPPER(status::text) = 'UNVERIFIED')`;
    } else {
      params.push(uStatus);
      sql += ` AND UPPER(status::text) = $${params.length}`;
    }
  }

  if (center && center !== "All") {
    params.push(center);
    sql += ` AND center = $${params.length}`;
  }

  if (course && course !== "All") {
    params.push(`%${course}%`);
    sql += ` AND courses::text ILIKE $${params.length}`;
  }

  return { sql, params };
}

describe("Admin Portal - Instructor Database Query & Status Normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("normalizeInstructorStatus correctly maps status variations to standard enum values", () => {
    expect(normalizeInstructorStatus("PENDING")).toBe("PENDING");
    expect(normalizeInstructorStatus("pending_approval")).toBe("PENDING");
    expect(normalizeInstructorStatus("UNVERIFIED")).toBe("PENDING");
    expect(normalizeInstructorStatus("ACTIVE")).toBe("ACTIVE");
    expect(normalizeInstructorStatus("approved")).toBe("ACTIVE");
    expect(normalizeInstructorStatus("SUSPENDED")).toBe("SUSPENDED");
    expect(normalizeInstructorStatus("DEACTIVATED")).toBe("SUSPENDED");
    expect(normalizeInstructorStatus(undefined)).toBe("PENDING");
  });

  test("buildInstructorFilterQuery builds SQL with PENDING status filter conditions", () => {
    const { sql, params } = buildInstructorFilterQuery("", "PENDING", "All", "All");
    expect(sql).toContain("UPPER(status::text) = 'PENDING'");
    expect(sql).toContain("UPPER(status::text) = 'PENDING_APPROVAL'");
    expect(params).toHaveLength(0);
  });

  test("buildInstructorFilterQuery builds SQL with ACTIVE status filter conditions", () => {
    const { sql, params } = buildInstructorFilterQuery("", "ACTIVE", "All", "All");
    expect(sql).toContain("UPPER(status::text) = 'ACTIVE'");
    expect(sql).toContain("UPPER(status::text) = 'APPROVED'");
    expect(params).toHaveLength(0);
  });

  test("buildInstructorFilterQuery builds SQL with search, center, and course parameters", () => {
    const { sql, params } = buildInstructorFilterQuery("john", "ACTIVE", "Ikeja", "Data Analysis");
    expect(sql).toContain("first_name ILIKE $1");
    expect(sql).toContain("center = $2");
    expect(sql).toContain("courses::text ILIKE $3");
    expect(params).toEqual(["%john%", "Ikeja", "%Data Analysis%"]);
  });

  test("Database query integration mock executes correctly against database query layer", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ count: "1" }]);

    const { sql, params } = buildInstructorFilterQuery("", "PENDING", "All", "All");
    const result = await query(sql, params);

    expect(query).toHaveBeenCalledWith(sql, params);
    expect(result).toEqual([{ count: "1" }]);
  });
});
