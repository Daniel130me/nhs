import { vi, describe, test, expect, beforeEach } from "vitest";
import { requireRole, requireOwnership, requireClassInstructor, requireActiveUser } from "../server/middleware/auth";
import { query } from "../server/config/database";
import { UnauthorizedError, ForbiddenError } from "../server/utils/errors";

// Mock the database query function
vi.mock("../server/config/database", () => {
  return {
    query: vi.fn(),
  };
});

describe("Role-Based Authorization & Middleware Policies", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      session: {
        userId: "user-123",
      },
      user: null,
      params: {},
      body: {},
      query: {},
    };
    res = {
      clearCookie: vi.fn(),
    };
  });

  // Helper to run middleware wrapped in asyncHandler
  async function runMiddleware(middleware: any, request: any, response: any) {
    return new Promise<void>((resolve, reject) => {
      const next = (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };
      middleware(request, response, next);
    });
  }

  test("1. Unauthenticated request throws 401 Unauthorized", async () => {
    req.session = null; // No session
    const middleware = requireRole("ADMIN");

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(UnauthorizedError);
  });

  test("2. Student calling admin route throws 403 Forbidden", async () => {
    req.user = {
      id: "user-123",
      role: "STUDENT",
      status: "ACTIVE",
      email: "student@newhorizons.com",
    };
    const middleware = requireRole("ADMIN", "SUPER_ADMIN");

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(ForbiddenError);
  });

  test("3. Instructor calling approval route throws 403 Forbidden", async () => {
    req.user = {
      id: "user-instructor",
      role: "INSTRUCTOR",
      status: "ACTIVE",
      email: "instructor@newhorizons.com",
    };
    const middleware = requireRole("ADMIN", "SUPER_ADMIN");

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(ForbiddenError);
  });

  test("4. Instructor viewing unassigned class throws 403 Forbidden", async () => {
    req.user = {
      id: "instructor-1",
      role: "INSTRUCTOR",
      status: "ACTIVE",
      email: "inst1@newhorizons.com",
    };
    req.params.id = "class-99"; // Target class ID

    // Mock database returning a class belonging to instructor-2
    vi.mocked(query).mockResolvedValueOnce([
      { id: "class-99", instructor_id: "instructor-2" },
    ]);

    const middleware = requireClassInstructor("id");

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(ForbiddenError);
    expect(query).toHaveBeenCalledWith("SELECT * FROM classes WHERE id = $1", ["class-99"]);
  });

  test("5. Student viewing other student's results throws 403 Forbidden", async () => {
    req.user = {
      id: "student-1",
      role: "STUDENT",
      status: "ACTIVE",
      email: "stud1@newhorizons.com",
    };
    req.params.id = "student-2"; // Requesting another student's ID

    const middleware = requireOwnership("id");

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(ForbiddenError);
  });

  test("6. Suspended user session invalidation throws 401/Unauthorized", async () => {
    req.user = {
      id: "suspended-user",
      role: "INSTRUCTOR",
      status: "SUSPENDED",
      email: "suspended@newhorizons.com",
    };

    const middleware = requireActiveUser;

    await expect(runMiddleware(middleware, req, res)).rejects.toThrow(UnauthorizedError);
  });
});
