import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { classSchema } from "./classes.schema";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const classes = await query("SELECT * FROM classes ORDER BY created_at DESC");
  const formatted = classes.map(c => ({
    id: c.id,
    courseName: c.course_name,
    instructorId: c.instructor_id,
    instructorName: c.instructor_name,
    totalDurationHours: c.total_duration_hours,
    classroom: c.classroom,
    scheduleType: c.schedule_type,
    days: c.days,
    timeSlot: c.time_slot,
    startDate: c.start_date,
    endDate: c.end_date,
    modules: c.modules,
    status: c.status,
    createdAt: c.created_at
  }));
  return sendSuccess(res, formatted, "Classes retrieved successfully");
}));

router.post("/", requireActiveUser, asyncHandler(async (req, res) => {
  const payload = classSchema.parse(req.body);
  const {
    courseName,
    instructorId,
    instructorName,
    totalDurationHours,
    classroom,
    scheduleType,
    days,
    timeSlot,
    startDate,
    endDate,
    modules,
    status
  } = payload;

  const classId = req.body.id || `class-${Date.now()}`;
  const createdAt = new Date().toISOString();

  await query(
    `INSERT INTO classes (id, course_name, instructor_id, instructor_name, total_duration_hours, classroom, schedule_type, days, time_slot, start_date, end_date, modules, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      classId,
      courseName,
      instructorId,
      instructorName,
      totalDurationHours || 0,
      classroom || "",
      scheduleType || "Weekday",
      JSON.stringify(days || []),
      timeSlot || "Morning",
      startDate || "",
      endDate || "",
      JSON.stringify(modules || []),
      status || "Active",
      createdAt
    ]
  );

  await logAudit({
    req,
    action: "Class assignment",
    entityType: "class",
    entityId: classId,
    newValues: { instructorId, instructorName, courseName }
  });

  return sendSuccess(res, {
    id: classId,
    courseName,
    instructorId,
    instructorName,
    totalDurationHours,
    classroom,
    scheduleType,
    days,
    timeSlot,
    startDate,
    endDate,
    modules,
    status,
    createdAt
  }, "Class created successfully", 201);
}));

router.put("/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    courseName,
    instructorId,
    instructorName,
    totalDurationHours,
    classroom,
    scheduleType,
    days,
    timeSlot,
    startDate,
    endDate,
    modules,
    status
  } = req.body;

  await query(
    `UPDATE classes 
     SET course_name = $1, instructor_id = $2, instructor_name = $3, total_duration_hours = $4, 
         classroom = $5, schedule_type = $6, days = $7, time_slot = $8, start_date = $9, 
         end_date = $10, modules = $11, status = $12
     WHERE id = $13`,
    [
      courseName,
      instructorId,
      instructorName,
      totalDurationHours,
      classroom,
      scheduleType,
      JSON.stringify(days),
      timeSlot,
      startDate,
      endDate,
      JSON.stringify(modules),
      status,
      id
    ]
  );

  await logAudit({
    req,
    action: "Class assignment",
    entityType: "class",
    entityId: id,
    newValues: { instructorId, instructorName, courseName }
  });

  return sendSuccess(res, { success: true }, "Class updated successfully");
}));

router.delete("/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query("DELETE FROM classes WHERE id = $1", [id]);
  return sendSuccess(res, { success: true }, "Class deleted successfully");
}));

export default router;
