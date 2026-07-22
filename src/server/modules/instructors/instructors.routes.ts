import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser, requireAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", requireActiveUser, asyncHandler(async (req, res) => {
  const instructors = await query("SELECT * FROM instructors WHERE deleted_at IS NULL ORDER BY created_at DESC");
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
  const userStatus = status === 'Active' ? 'ACTIVE' : 'SUSPENDED';
  await query("UPDATE users SET status = $1 WHERE id = $2", [userStatus, id]);

  return sendSuccess(res, { success: true }, `Instructor status updated to ${status} successfully`);
}));

router.delete("/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query("UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
  await query("UPDATE instructors SET deleted_at = NOW(), status = 'DELETED' WHERE id = $1", [id]).catch(() => {});
  await query(`DELETE FROM "session" WHERE sess::text LIKE $1`, [`%"userId":"${id}"%`]);
  return sendSuccess(res, { success: true }, "Instructor account and all associated records permanently deleted from system");
}));

export default router;
