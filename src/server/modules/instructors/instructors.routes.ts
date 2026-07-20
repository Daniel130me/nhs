import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser, requireAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", requireActiveUser, asyncHandler(async (req, res) => {
  const instructors = await query("SELECT * FROM instructors ORDER BY created_at DESC");
  const formatted = instructors.map(inst => ({
    id: inst.id,
    firstName: inst.first_name,
    lastName: inst.last_name,
    email: inst.email,
    gender: inst.gender,
    center: inst.center,
    courses: inst.courses,
    role: inst.role,
    status: inst.status || 'Active',
    createdAt: inst.created_at
  }));
  return sendSuccess(res, formatted, "Instructors retrieved successfully");
}));

router.put("/:id/status", requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== 'Active' && status !== 'Deactivated') {
    throw new BadRequestError("Invalid status value (must be Active or Deactivated)");
  }

  // Update in legacy instructors table
  await query("UPDATE instructors SET status = $1 WHERE id = $2", [status, id]);
  
  // Also update in unified users table!
  const userStatus = status === 'Active' ? 'ACTIVE' : 'PENDING';
  await query("UPDATE users SET status = $1 WHERE id = $2", [userStatus, id]);

  return sendSuccess(res, { success: true }, `Instructor status updated to ${status} successfully`);
}));

export default router;
