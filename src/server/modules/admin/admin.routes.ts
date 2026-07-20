import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import { requireRole } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { z } from "zod";

const router = Router();

// Protect all routes within this admin router for ADMIN and SUPER_ADMIN roles only
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

// GET /api/v1/admin/instructors
router.get(
  "/instructors",
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search).trim() : "";
    const status = req.query.status ? String(req.query.status).trim() : "All";
    const center = req.query.center ? String(req.query.center).trim() : "All";
    const course = req.query.course ? String(req.query.course).trim() : "All";
    
    const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
    const limit = req.query.limit ? Math.max(1, parseInt(String(req.query.limit), 10)) : 10;

    let sql = `
      SELECT 
        id, 
        first_name AS "firstName", 
        last_name AS "lastName", 
        email, 
        role, 
        status, 
        gender, 
        center, 
        courses, 
        created_at AS "createdAt" 
      FROM users 
      WHERE role = 'INSTRUCTOR' AND deleted_at IS NULL
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    if (status && status !== "All") {
      params.push(status.toUpperCase());
      sql += ` AND status = $${params.length}`;
    }

    if (center && center !== "All") {
      params.push(center);
      sql += ` AND center = $${params.length}`;
    }

    if (course && course !== "All") {
      params.push(`%${course}%`);
      sql += ` AND courses::text ILIKE $${params.length}`;
    }

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    // Add ordering and pagination
    sql += ` ORDER BY created_at DESC`;
    
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    
    const offset = (page - 1) * limit;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const rows = await query(sql, params);

    // Format rows to ensure frontend maps perfectly
    const formatted = rows.map((row: any) => ({
      ...row,
      courses: typeof row.courses === "string" ? JSON.parse(row.courses) : row.courses
    }));

    return sendSuccess(
      res,
      {
        instructors: formatted,
        meta: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      },
      "Instructors retrieved successfully"
    );
  })
);

// GET /api/v1/admin/instructors/:id
router.get(
  "/instructors/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const rows = await query<any>(
      `SELECT 
        id, 
        first_name AS "firstName", 
        last_name AS "lastName", 
        email, 
        role, 
        status, 
        gender, 
        center, 
        courses, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt" 
      FROM users 
      WHERE id = $1 AND role = 'INSTRUCTOR' AND deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFoundError("Instructor not found.");
    }

    const row = rows[0];
    const formatted = {
      ...row,
      courses: typeof row.courses === "string" ? JSON.parse(row.courses) : row.courses
    };

    return sendSuccess(res, formatted, "Instructor details retrieved successfully");
  })
);

// PATCH /api/v1/admin/instructors/:id/status
router.patch(
  "/instructors/:id/status",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      throw new BadRequestError("Status is required.");
    }

    const newStatus = status.toUpperCase();
    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Get current status
    const users = await query<any>("SELECT id, status, email FROM users WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (users.length === 0) {
      throw new NotFoundError("Instructor user record not found.");
    }

    const user = users[0];
    const currentStatus = user.status;

    if (currentStatus === newStatus) {
      return sendSuccess(res, { success: true }, `Status is already ${newStatus}`);
    }

    // Validate transition
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ["ACTIVE", "REJECTED"],
      ACTIVE: ["SUSPENDED", "REJECTED"],
      SUSPENDED: ["ACTIVE", "REJECTED"],
      REJECTED: ["ACTIVE", "SUSPENDED"]
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestError(`Transition from ${currentStatus} to ${newStatus} is not permitted.`);
    }

    // Determine audit log action
    let action = "Status Update";
    if (newStatus === "ACTIVE") {
      action = currentStatus === "PENDING" ? "Instructor approval" : "Account reactivation";
    } else if (newStatus === "SUSPENDED") {
      action = "Account suspension";
    } else if (newStatus === "REJECTED") {
      action = "Instructor rejection";
    }

    // Execute update in users
    await query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, id]);

    // Sync with legacy instructors table
    const legacyStatus = newStatus === "ACTIVE" ? "Active" : "Deactivated";
    await query("UPDATE instructors SET status = $1 WHERE id = $2", [legacyStatus, id]);

    // Handle session invalidation if suspended or rejected
    if (newStatus === "SUSPENDED" || newStatus === "REJECTED") {
      await query(`DELETE FROM "session" WHERE sess::text LIKE $1`, [`%"userId":"${id}"%`]);
    }

    // Write audit log
    await logAudit({
      req,
      action,
      entityType: "user",
      entityId: id,
      oldValues: { status: currentStatus },
      newValues: { status: newStatus },
      metadata: { reason }
    });

    return sendSuccess(res, { success: true, status: newStatus }, `Instructor status updated to ${newStatus} successfully.`);
  })
);

// POST /api/v1/admin/instructors/:id/approve
router.post(
  "/instructors/:id/approve",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const users = await query<any>("SELECT id, status, email FROM users WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (users.length === 0) {
      throw new NotFoundError("Instructor user not found.");
    }

    const currentStatus = users[0].status;
    if (currentStatus === "ACTIVE") {
      return sendSuccess(res, { success: true }, "Instructor account is already Active.");
    }

    // Update to ACTIVE
    await query("UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1", [id]);
    await query("UPDATE instructors SET status = 'Active' WHERE id = $1", [id]);

    // Audit log
    await logAudit({
      req,
      action: "Instructor approval",
      entityType: "user",
      entityId: id,
      oldValues: { status: currentStatus },
      newValues: { status: "ACTIVE" },
      metadata: { reason }
    });

    return sendSuccess(res, { success: true }, "Instructor approved successfully.");
  })
);

// POST /api/v1/admin/instructors/:id/reject
router.post(
  "/instructors/:id/reject",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const users = await query<any>("SELECT id, status, email FROM users WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (users.length === 0) {
      throw new NotFoundError("Instructor user not found.");
    }

    const currentStatus = users[0].status;
    if (currentStatus === "REJECTED") {
      return sendSuccess(res, { success: true }, "Instructor account is already Rejected.");
    }

    // Update to REJECTED
    await query("UPDATE users SET status = 'REJECTED', updated_at = NOW() WHERE id = $1", [id]);
    await query("UPDATE instructors SET status = 'Deactivated' WHERE id = $1", [id]);

    // Force sign out
    await query(`DELETE FROM "session" WHERE sess::text LIKE $1`, [`%"userId":"${id}"%`]);

    // Audit log
    await logAudit({
      req,
      action: "Instructor rejection",
      entityType: "user",
      entityId: id,
      oldValues: { status: currentStatus },
      newValues: { status: "REJECTED" },
      metadata: { reason }
    });

    return sendSuccess(res, { success: true }, "Instructor profile rejected successfully.");
  })
);

// PATCH /api/v1/admin/instructors/:id/profile
router.patch(
  "/instructors/:id/profile",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const bodySchema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      gender: z.string().optional(),
      center: z.string().optional(),
      courses: z.array(z.string()).default([])
    });

    const parsed = bodySchema.parse(req.body);

    const users = await query<any>(
      "SELECT id, first_name, last_name, gender, center, courses FROM users WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );

    if (users.length === 0) {
      throw new NotFoundError("Instructor user not found.");
    }

    const current = users[0];

    // Update users
    await query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, gender = $3, center = $4, courses = $5, updated_at = NOW() 
       WHERE id = $6`,
      [
        parsed.firstName,
        parsed.lastName,
        parsed.gender || null,
        parsed.center || null,
        JSON.stringify(parsed.courses),
        id
      ]
    );

    // Update legacy instructors table
    await query(
      `UPDATE instructors 
       SET first_name = $1, last_name = $2, gender = $3, center = $4, courses = $5 
       WHERE id = $6`,
      [
        parsed.firstName,
        parsed.lastName,
        parsed.gender || null,
        parsed.center || null,
        JSON.stringify(parsed.courses),
        id
      ]
    );

    // Audit log
    await logAudit({
      req,
      action: "Instructor profile update",
      entityType: "user",
      entityId: id,
      oldValues: {
        firstName: current.first_name,
        lastName: current.last_name,
        gender: current.gender,
        center: current.center,
        courses: typeof current.courses === "string" ? JSON.parse(current.courses) : current.courses
      },
      newValues: parsed
    });

    return sendSuccess(res, { success: true }, "Instructor profile updated successfully.");
  })
);

// PATCH /api/v1/admin/instructors/:id/role
router.patch(
  "/instructors/:id/role",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      throw new BadRequestError("Role is required.");
    }

    const newRole = role.toUpperCase();
    if (newRole !== "INSTRUCTOR" && newRole !== "ADMIN" && newRole !== "SUPER_ADMIN") {
      throw new BadRequestError("Invalid role. Must be one of: INSTRUCTOR, ADMIN, SUPER_ADMIN");
    }

    // Get current user details
    const users = await query<any>("SELECT id, role, email FROM users WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (users.length === 0) {
      throw new NotFoundError("Instructor user not found.");
    }

    const currentRole = users[0].role;
    if (currentRole === newRole) {
      return sendSuccess(res, { success: true }, `Role is already ${newRole}`);
    }

    // Super Admin rules: Admins cannot promote themselves to super admin, and cannot change super admins
    if (req.user!.role !== "SUPER_ADMIN" && (newRole === "SUPER_ADMIN" || currentRole === "SUPER_ADMIN")) {
      throw new BadRequestError("Only a SUPER_ADMIN can manage or promote users to SUPER_ADMIN role.");
    }

    // Execute update
    await query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", [newRole, id]);

    // Audit log
    await logAudit({
      req,
      action: "Role change",
      entityType: "user",
      entityId: id,
      oldValues: { role: currentRole },
      newValues: { role: newRole }
    });

    return sendSuccess(res, { success: true, role: newRole }, "User role updated successfully.");
  })
);

export default router;
