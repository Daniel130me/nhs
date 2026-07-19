import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { BadRequestError } from "../../utils/errors";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
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

router.put("/:id/status", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== 'Active' && status !== 'Deactivated') {
    throw new BadRequestError("Invalid status value (must be Active or Deactivated)");
  }

  await query("UPDATE instructors SET status = $1 WHERE id = $2", [status, id]);
  return sendSuccess(res, { success: true }, `Instructor status updated to ${status} successfully`);
}));

export default router;
