import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { aiService } from "../../services/ai.service";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { CourseRepository } from "../../repositories/course.repository";

const router = Router();

// --- Courses ---
router.get("/", asyncHandler(async (req, res) => {
  const courses = await CourseRepository.getAll();
  // Map normalized Courses to expected format
  const formatted = courses.map(crs => {
    const mainVersion = crs.versions && crs.versions[0];
    const lessons = mainVersion && mainVersion.modules
      ? mainVersion.modules.flatMap(m => (m.lessons || []).map(l => ({
          id: l.id,
          title: l.title,
          description: l.description || "",
          resources: typeof l.content === 'string' ? JSON.parse(l.content) : l.content || []
        })))
      : [];

    return {
      id: crs.id,
      name: crs.title,
      category: crs.code.split('-')[0] || "General ICT",
      description: crs.shortDescription || "",
      lessons: lessons,
      createdAt: crs.createdAt
    };
  });

  return sendSuccess(res, formatted, "Courses retrieved successfully");
}));

router.post("/", requireActiveUser, asyncHandler(async (req, res) => {
  const { id, name, category, description, lessons } = req.body;
  if (!name || !category) {
    throw new BadRequestError("Name and Category are required");
  }

  // Find system admin ID for ownership
  const admins = await query<any>(
    "SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND deleted_at IS NULL LIMIT 1"
  );
  const adminUserId = admins.length > 0 ? admins[0].id : req.user?.id || req.body.instructorId;

  if (!adminUserId) {
    throw new BadRequestError("User authentication session required to save curriculum.");
  }

  const crsId = id || `course-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // Check if course already exists to update it, otherwise insert
  const existing = await CourseRepository.getById(crsId);

  if (existing) {
    await CourseRepository.update(crsId, {
      title: name,
      shortDescription: description || "",
      fullDescription: description || "",
      status: "PUBLISHED"
    });
  } else {
    // Relational creation
    const modulesParam = [{
      title: "Main Curriculum Module",
      position: 1,
      lessons: (lessons || []).map((l: any, idx: number) => ({
        title: l.title || `Lesson ${idx + 1}`,
        description: l.description || "",
        content: JSON.stringify(l.resources || []),
        lessonType: "TEXT",
        position: idx + 1,
        isPreview: false,
        isRequired: true,
        status: "PUBLISHED"
      }))
    }];

    await CourseRepository.create({
      code: `${category.replace(/[^a-zA-Z0-9]/g, '')}-${crsId}`.substring(0, 100),
      title: name,
      shortDescription: description || "",
      fullDescription: description || "",
      status: "PUBLISHED",
      createdBy: adminUserId
    }, modulesParam);
  }

  await logAudit({
    req,
    action: "Course publication",
    entityType: "course",
    entityId: crsId,
    newValues: { name, category, description }
  });

  return sendSuccess(res, { id: crsId, name, category, description, lessons }, "Course saved successfully");
}));

router.delete("/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CourseRepository.delete(id);
  return sendSuccess(res, { success: true }, "Course deleted successfully");
}));

// --- AI Gemini Integration ---
router.post("/gemini/author-course", requireActiveUser, asyncHandler(async (req, res) => {
  const { courseName, category } = req.body;
  if (!courseName) {
    throw new BadRequestError("courseName is required");
  }

  const courseData = await aiService.authorCourse(courseName, category);
  return sendSuccess(res, courseData, "Course outline authored successfully by AI");
}));

export default router;
