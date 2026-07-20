import { vi, describe, test, expect, beforeEach } from "vitest";
import { CourseRepository } from "../server/repositories/course.repository";
import { ClassRepository } from "../server/repositories/class.repository";
import { EnrolmentRepository } from "../server/repositories/enrolment.repository";
import { query } from "../server/config/database";
import { BadRequestError, NotFoundError } from "../server/utils/errors";

vi.mock("../server/config/database", () => {
  return {
    query: vi.fn(),
  };
});

describe("Core Relational Academic Model & Repository Constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("1. CourseRepository creates a Course and Course Version with modules", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: "course-uuid-1" }]) // INSERT INTO courses
      .mockResolvedValueOnce([{ id: "version-uuid-1" }]) // INSERT INTO course_versions
      .mockResolvedValueOnce([{ id: "module-uuid-1" }]); // INSERT INTO course_modules

    const newC = await CourseRepository.create({
      code: "ICT-FUND-01",
      title: "ICT Fundamentals",
      shortDescription: "Fundamentals of ICT",
      status: "PUBLISHED",
      createdBy: "admin-123",
    }, [
      {
        title: "Module 1",
        position: 1,
        lessons: []
      }
    ]);

    expect(newC.id).toBe("course-uuid-1");
    expect(newC.versions![0].id).toBe("version-uuid-1");
    expect(newC.versions![0].modules![0].id).toBe("module-uuid-1");
  });

  test("2. ClassRepository rejects end date preceding start date", async () => {
    await expect(
      ClassRepository.create({
        courseVersionId: "version-123",
        centreId: "centre-123",
        code: "class-01",
        name: "Test Class",
        deliveryMode: "Weekday",
        startDate: "2026-08-15",
        endDate: "2026-08-10", // Invalid!
        timezone: "Africa/Lagos",
        status: "ACTIVE",
        createdBy: "admin-123",
      })
    ).rejects.toThrow(BadRequestError);
  });

  test("3. ClassRepository rejects invalid course version", async () => {
    vi.mocked(query).mockResolvedValueOnce([]); // Select from course_versions returning empty

    await expect(
      ClassRepository.create({
        courseVersionId: "invalid-version",
        centreId: "centre-123",
        code: "class-02",
        name: "Test Class",
        deliveryMode: "Weekday",
        startDate: "2026-08-10",
        endDate: "2026-08-15",
        timezone: "Africa/Lagos",
        status: "ACTIVE",
        createdBy: "admin-123",
      })
    ).rejects.toThrow(NotFoundError);
  });

  test("4. ClassRepository rejects zero/negative capacity", async () => {
    await expect(
      ClassRepository.create({
        courseVersionId: "version-123",
        centreId: "centre-123",
        code: "class-03",
        name: "Test Class",
        deliveryMode: "Weekday",
        capacity: 0, // Invalid!
        startDate: "2026-08-10",
        endDate: "2026-08-15",
        timezone: "Africa/Lagos",
        status: "ACTIVE",
        createdBy: "admin-123",
      })
    ).rejects.toThrow(BadRequestError);
  });

  test("5. EnrolmentRepository rejects duplicate enrolments for the same class and student", async () => {
    // 1. Mock select query returning existing enrollment
    vi.mocked(query).mockResolvedValueOnce([{ id: "enrolment-existing" }]);

    await expect(
      EnrolmentRepository.enrol("class-123", "student-123", "admin-123")
    ).rejects.toThrow(BadRequestError);
  });
});
