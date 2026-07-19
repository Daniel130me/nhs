import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { aiService } from "../../services/ai.service";
import { BadRequestError } from "../../utils/errors";

const router = Router();

// --- Courses ---
router.get("/", asyncHandler(async (req, res) => {
  const courses = await query("SELECT * FROM courses ORDER BY created_at DESC");
  return sendSuccess(res, courses, "Courses retrieved successfully");
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id, name, category, description, lessons } = req.body;
  if (!name || !category) {
    throw new BadRequestError("Name and Category are required");
  }

  const crsId = id || `course-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const createdAt = new Date().toISOString();

  // Check if course already exists to update it, otherwise insert
  const existing = await query("SELECT id FROM courses WHERE id = $1", [crsId]);
  if (existing.length > 0) {
    await query(
      `UPDATE courses 
       SET name = $1, category = $2, description = $3, lessons = $4
       WHERE id = $5`,
      [name, category, description || "", JSON.stringify(lessons || []), crsId]
    );
  } else {
    await query(
      `INSERT INTO courses (id, name, category, description, lessons, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [crsId, name, category, description || "", JSON.stringify(lessons || []), createdAt]
    );
  }

  return sendSuccess(res, { id: crsId, name, category, description, lessons, createdAt }, "Course saved successfully");
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query("DELETE FROM courses WHERE id = $1", [id]);
  return sendSuccess(res, { success: true }, "Course deleted successfully");
}));

// --- AI Gemini Integration ---
router.post("/gemini/author-course", asyncHandler(async (req, res) => {
  const { courseName, category } = req.body;
  if (!courseName) {
    throw new BadRequestError("courseName is required");
  }

  const courseData = await aiService.authorCourse(courseName, category);
  return sendSuccess(res, courseData, "Course outline authored successfully by AI");
}));

export default router;
