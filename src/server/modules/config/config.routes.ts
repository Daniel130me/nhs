import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { NotFoundError } from "../../utils/errors";
import { requireAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const configs = await query("SELECT * FROM system_config WHERE key = 'default'");
  if (configs.length > 0) {
    return sendSuccess(res, {
      centers: configs[0].centers,
      courses: configs[0].courses,
      timeSlots: configs[0].time_slots
    }, "Configuration retrieved successfully");
  }
  throw new NotFoundError("Default system configuration not found");
}));

router.put("/", requireAdmin, asyncHandler(async (req, res) => {
  const { centers, courses, timeSlots } = req.body;
  await query(
    `UPDATE system_config 
     SET centers = $1, courses = $2, time_slots = $3
     WHERE key = 'default'`,
    [JSON.stringify(centers), JSON.stringify(courses), JSON.stringify(timeSlots)]
  );
  return sendSuccess(res, { success: true }, "System configuration updated successfully");
}));

export default router;
