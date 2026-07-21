import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { requireActiveUser } from "../../middleware/auth";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/errors";
import { z } from "zod";
import { createNotification } from "../../services/notification.service";

const router = Router();

// Zod schema for weekly log validation
export const createWeeklyLogSchema = z.object({
  classId: z.string().uuid("Invalid class ID format"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD"),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekEnd must be YYYY-MM-DD"),
  hoursLogged: z.number().min(0, "Hours logged cannot be negative").max(168, "Impossible teaching hours (max 168 per week)"),
  achievements: z.string().optional().nullable().default(""),
  challenges: z.string().optional().nullable().default(""),
  supportRequired: z.string().optional().nullable().default(""),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED']).default('DRAFT'),
  moduleIds: z.array(z.string().uuid("Invalid module ID format")).optional().default([])
});

// GET all weekly logs (filtered by instructor role if applicable)
router.get("/", requireActiveUser, asyncHandler(async (req, res) => {
  const isInstructor = req.user!.role === "INSTRUCTOR";
  
  let logsQuery = `
    SELECT w.id, w.class_id as "classId", w.instructor_id as "instructorId",
           w.week_start::text as "weekStart", w.week_end::text as "weekEnd", 
           w.hours_logged as "hoursLogged", w.achievements, w.challenges, 
           w.support_required as "supportRequired", w.status, 
           w.submitted_at as "submittedAt", w.reviewed_by as "reviewedBy", 
           w.reviewed_at as "reviewedAt", w.review_comment as "reviewComment",
           w.created_at as "createdAt",
           c.name as "className",
           CONCAT(u.first_name, ' ', u.last_name) as "instructorName"
    FROM weekly_logs_new w
    JOIN classes c ON w.class_id = c.id
    JOIN users u ON w.instructor_id = u.id
  `;
  const params: any[] = [];
  
  if (isInstructor) {
    logsQuery += ` WHERE w.instructor_id = $1`;
    params.push(req.user!.id);
  }
  
  logsQuery += ` ORDER BY w.week_start DESC`;
  
  const logs = await query<any>(logsQuery, params);
  
  // For each log, fetch covered modules
  const formatted = await Promise.all(logs.map(async (log: any) => {
    const modules = await query<any>(
      `SELECT wlm.module_id as "moduleId", cm.title, wlm.coverage_note as "coverageNote"
       FROM weekly_log_modules wlm
       JOIN course_modules cm ON wlm.module_id = cm.id
       WHERE wlm.weekly_log_id = $1`,
      [log.id]
    );
    
    return {
      ...log,
      modules
    };
  }));
  
  return sendSuccess(res, formatted, "Weekly logs retrieved successfully");
}));

// POST create/submit a new weekly log
router.post("/", requireActiveUser, asyncHandler(async (req, res) => {
  const body = createWeeklyLogSchema.parse(req.body);
  const instructorId = req.user!.id; // Force logged-in instructor
  
  // 1. Unassigned class check
  const assigned = await query(
    "SELECT 1 FROM class_instructors WHERE class_id = $1 AND instructor_id = $2",
    [body.classId, instructorId]
  );
  if (assigned.length === 0 && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError("Access denied. You can only submit logs for classes you are assigned to.");
  }
  
  // 2. Duplicate log check
  const duplicate = await query(
    "SELECT id FROM weekly_logs_new WHERE class_id = $1 AND instructor_id = $2 AND week_start = $3",
    [body.classId, instructorId, body.weekStart]
  );
  if (duplicate.length > 0) {
    throw new BadRequestError("Duplicate Log: A weekly log already exists for this class and week");
  }
  
  // 3. Dates constraint check
  if (new Date(body.weekEnd) < new Date(body.weekStart)) {
    throw new BadRequestError("weekEnd cannot precede weekStart");
  }
  
  // 4. Module course validation check
  const classes = await query<any>(
    "SELECT course_version_id FROM classes WHERE id = $1",
    [body.classId]
  );
  if (classes.length === 0) {
    throw new NotFoundError("Class not found");
  }
  const courseVersionId = classes[0].course_version_id;
  
  const validModules = await query<any>(
    "SELECT id FROM course_modules WHERE course_version_id = $1",
    [courseVersionId]
  );
  const validModuleIds = new Set(validModules.map((m: any) => m.id));
  
  for (const modId of body.moduleIds) {
    if (!validModuleIds.has(modId)) {
      throw new BadRequestError(`Module ID ${modId} does not belong to the course for this class`);
    }
  }
  
  // 5. Insert weekly log
  const submittedAt = body.status === 'SUBMITTED' ? new Date().toISOString() : null;
  const logId = req.body.id || undefined;
  
  const result = await query<any>(
    `INSERT INTO weekly_logs_new (id, class_id, instructor_id, week_start, week_end, hours_logged, achievements, challenges, support_required, status, submitted_at)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, class_id as "classId", instructor_id as "instructorId", week_start::text as "weekStart", 
               week_end::text as "weekEnd", hours_logged as "hoursLogged", achievements, challenges, 
               support_required as "supportRequired", status, submitted_at as "submittedAt"`,
    [
      logId,
      body.classId,
      instructorId,
      body.weekStart,
      body.weekEnd,
      body.hoursLogged,
      body.achievements,
      body.challenges,
      body.supportRequired,
      body.status,
      submittedAt
    ]
  );
  
  const newLog = result[0];
  
  // 6. Insert module covered records
  for (const modId of body.moduleIds) {
    await query(
      `INSERT INTO weekly_log_modules (weekly_log_id, module_id, coverage_note)
       VALUES ($1, $2, $3)`,
      [newLog.id, modId, ""]
    );
  }
  
  return sendSuccess(res, { ...newLog, moduleIds: body.moduleIds }, "Weekly log submitted successfully", 201);
}));

// PUT update weekly log (Draft saving / Submitting)
router.put("/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = createWeeklyLogSchema.partial().parse(req.body);
  
  // Check if log exists
  const existing = await query<any>(
    "SELECT instructor_id, status FROM weekly_logs_new WHERE id = $1",
    [id]
  );
  if (existing.length === 0) {
    throw new NotFoundError("Weekly log not found");
  }
  
  const log = existing[0];
  
  // Authorization: instructor can only update their own logs
  if (req.user!.role === 'INSTRUCTOR' && log.instructor_id !== req.user!.id) {
    throw new ForbiddenError("Access denied. You can only modify your own weekly logs.");
  }
  
  // If already approved, prevent updates
  if (log.status === 'APPROVED') {
    throw new BadRequestError("Approved weekly logs cannot be edited");
  }
  
  // Apply updates
  const fields: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;
  
  if (body.weekStart) {
    fields.push(`week_start = $${paramIdx++}`);
    values.push(body.weekStart);
  }
  if (body.weekEnd) {
    fields.push(`week_end = $${paramIdx++}`);
    values.push(body.weekEnd);
  }
  if (body.hoursLogged !== undefined) {
    fields.push(`hours_logged = $${paramIdx++}`);
    values.push(body.hoursLogged);
  }
  if (body.achievements !== undefined) {
    fields.push(`achievements = $${paramIdx++}`);
    values.push(body.achievements);
  }
  if (body.challenges !== undefined) {
    fields.push(`challenges = $${paramIdx++}`);
    values.push(body.challenges);
  }
  if (body.supportRequired !== undefined) {
    fields.push(`support_required = $${paramIdx++}`);
    values.push(body.supportRequired);
  }
  if (body.status) {
    fields.push(`status = $${paramIdx++}`);
    values.push(body.status);
    
    if (body.status === 'SUBMITTED') {
      fields.push(`submitted_at = NOW()`);
    }
  }
  
  if (fields.length > 0) {
    values.push(id);
    await query(
      `UPDATE weekly_logs_new SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIdx}`,
      values
    );
  }
  
  // Update modules if specified
  if (body.moduleIds) {
    await query("DELETE FROM weekly_log_modules WHERE weekly_log_id = $1", [id]);
    for (const modId of body.moduleIds) {
      await query(
        `INSERT INTO weekly_log_modules (weekly_log_id, module_id, coverage_note)
         VALUES ($1, $2, $3)`,
        [id, modId, ""]
      );
    }
  }
  
  return sendSuccess(res, { success: true }, "Weekly log updated successfully");
}));

// PUT Admin review & approval/return
router.put("/:id/review", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError("Access denied. Admin permissions required to review logs.");
  }
  
  const reviewSchema = z.object({
    status: z.enum(['APPROVED', 'RETURNED', 'UNDER_REVIEW']),
    reviewComment: z.string().optional().nullable()
  });
  
  const { status, reviewComment } = reviewSchema.parse(req.body);
  
  const result = await query<any>(
    `UPDATE weekly_logs_new
     SET status = $1, review_comment = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $4
     RETURNING id, status, review_comment as "reviewComment"`,
    [status, reviewComment || null, req.user!.id, id]
  );
  
  if (result.length === 0) {
    throw new NotFoundError("Weekly log not found");
  }

  // Fetch log details to notify instructor
  const logInfo = await query<any>(
    "SELECT instructor_id, week_start FROM weekly_logs_new WHERE id = $1",
    [id]
  );
  if (logInfo.length > 0) {
    const instrId = logInfo[0].instructor_id;
    const weekStart = logInfo[0].week_start;
    if (status === 'RETURNED') {
      await createNotification(
        instrId,
        "WEEKLY_LOG_RETURNED",
        "Weekly Log Returned",
        `Your weekly log for week starting ${weekStart} has been returned for revisions. Comment: ${reviewComment || "No comment."}`,
        `/instructor/logs`
      );
    } else if (status === 'APPROVED') {
      await createNotification(
        instrId,
        "WEEKLY_LOG_APPROVED",
        "Weekly Log Approved",
        `Your weekly log for week starting ${weekStart} has been approved.`,
        `/instructor/logs`
      );
    }
  }
  
  return sendSuccess(res, result[0], `Weekly log successfully reviewed as ${status}`);
}));

export default router;
