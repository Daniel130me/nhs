import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { weeklyLogSchema } from "./weekly-logs.schema";
import { requireActiveUser } from "../../middleware/auth";

const router = Router();

router.get("/", requireActiveUser, asyncHandler(async (req, res) => {
  const logs = await query("SELECT * FROM weekly_logs ORDER BY submitted_at DESC");
  const formatted = logs.map(log => ({
    id: log.id,
    classId: log.class_id,
    weekNumber: log.week_number,
    hoursLogged: log.hours_logged,
    modulesCoveredThisWeek: log.modules_covered_this_week,
    challenges: log.challenges,
    submittedAt: log.submitted_at,
    instructorId: log.instructor_id
  }));
  return sendSuccess(res, formatted, "Weekly logs retrieved successfully");
}));

router.post("/", requireActiveUser, asyncHandler(async (req, res) => {
  const payload = weeklyLogSchema.parse(req.body);
  const { classId, weekNumber, hoursLogged, modulesCoveredThisWeek, challenges, instructorId } = payload;

  const logId = req.body.id || `log-${Date.now()}`;
  const submittedAt = new Date().toISOString();

  await query(
    `INSERT INTO weekly_logs (id, class_id, week_number, hours_logged, modules_covered_this_week, challenges, submitted_at, instructor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      logId,
      classId,
      weekNumber,
      hoursLogged || 0,
      JSON.stringify(modulesCoveredThisWeek || []),
      challenges || "",
      submittedAt,
      instructorId
    ]
  );

  return sendSuccess(res, {
    id: logId,
    classId,
    weekNumber,
    hoursLogged,
    modulesCoveredThisWeek,
    challenges,
    submittedAt,
    instructorId
  }, "Weekly log submitted successfully", 201);
}));

export default router;
