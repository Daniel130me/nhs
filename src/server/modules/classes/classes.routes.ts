import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { classSchema } from "./classes.schema";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { ClassRepository } from "../../repositories/class.repository";
import { CourseRepository } from "../../repositories/course.repository";
import { BadRequestError } from "../../utils/errors";

const router = Router();

// Helper to resolve Course Version ID by Course Title/Name
async function resolveOrCreateCourseVersion(courseName: string, modules: any[], creatorId: string): Promise<string> {
  const existing = await query<any>(
    "SELECT id FROM courses WHERE LOWER(title) = LOWER($1) AND deleted_at IS NULL LIMIT 1",
    [courseName]
  );

  if (existing.length > 0) {
    const versions = await query<any>(
      "SELECT id FROM course_versions WHERE course_id = $1 ORDER BY version_number ASC LIMIT 1",
      [existing[0].id]
    );
    if (versions.length > 0) {
      return versions[0].id;
    }
  }

  // If no course exists, create a new relational course + version
  const courseCode = `course-${courseName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const newC = await CourseRepository.create({
    code: courseCode.substring(0, 100),
    title: courseName,
    shortDescription: `Syllabus for ${courseName}`,
    fullDescription: `Syllabus for ${courseName}`,
    status: "PUBLISHED",
    createdBy: creatorId
  }, (modules || []).map((m: any, idx: number) => ({
    title: m.name || `Module ${idx + 1}`,
    position: idx + 1,
    lessons: []
  })));

  return newC.versions![0].id;
}

// Helper to resolve Center ID for an instructor
async function resolveCentreIdForInstructor(instructorId: string): Promise<string | null> {
  const user = await query<any>("SELECT center FROM users WHERE id::text = $1", [instructorId]);
  if (user.length > 0 && user[0].center) {
    const centre = await query<any>("SELECT id FROM centres WHERE LOWER(name) = LOWER($1) LIMIT 1", [user[0].center]);
    if (centre.length > 0) {
      return centre[0].id;
    }
  }
  const firstCentre = await query<any>("SELECT id FROM centres LIMIT 1");
  return firstCentre.length > 0 ? firstCentre[0].id : null;
}

router.get("/", asyncHandler(async (req, res) => {
  const classes = await ClassRepository.getAll();
  
  // Format the normalized records to backward-compatible shape for the UI
  const formatted = await Promise.all(classes.map(async (c) => {
    // Fetch course_modules to represent class modules in the UI
    const courseModules = await query<any>(
      "SELECT id, title FROM course_modules WHERE course_version_id = $1 ORDER BY position ASC",
      [c.courseVersionId]
    );

    return {
      id: c.id,
      courseName: c.courseName || c.name,
      instructorId: c.instructorId || "",
      instructorName: c.instructorName || "Unassigned",
      totalDurationHours: c.capacity || 40,
      classroom: c.deliveryMode,
      scheduleType: c.deliveryMode,
      days: c.deliveryMode === 'Weekend' ? ['Saturday', 'Sunday'] : ['Monday', 'Wednesday'],
      timeSlot: c.timezone === 'Africa/Lagos' ? 'Morning' : 'Afternoon',
      startDate: c.startDate,
      endDate: c.endDate,
      modules: courseModules.map((m: any, idx: number) => ({
        id: m.id,
        name: m.title,
        done: idx < 2
      })),
      status: c.status === 'ACTIVE' ? 'Active' : c.status === 'COMPLETED' ? 'Completed' : 'Paused',
      createdAt: c.createdAt
    };
  }));

  return sendSuccess(res, formatted, "Classes retrieved successfully");
}));

router.post("/", requireActiveUser, asyncHandler(async (req, res) => {
  const payload = classSchema.parse(req.body);
  const {
    courseName,
    instructorId,
    instructorName,
    classroom,
    totalDurationHours,
    scheduleType,
    days,
    timeSlot,
    startDate,
    endDate,
    modules,
    status
  } = payload;

  const creatorId = req.user?.id || instructorId;
  const courseVersionId = await resolveOrCreateCourseVersion(courseName, modules, creatorId);
  const centreId = await resolveCentreIdForInstructor(instructorId);

  // Map class status
  let finalStatus = 'ACTIVE';
  if (status) {
    const upStatus = status.toUpperCase();
    if (['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(upStatus)) {
      finalStatus = upStatus;
    }
  }

  const classId = req.body.id || `class-${Date.now()}`;

  const newCls = await ClassRepository.create({
    courseVersionId,
    centreId,
    code: classId.substring(0, 100),
    name: courseName,
    deliveryMode: scheduleType || "Weekday",
    capacity: totalDurationHours || 40,
    startDate,
    endDate,
    timezone: "Africa/Lagos",
    status: finalStatus,
    createdBy: creatorId,
    instructorId,
    instructorName
  });

  await logAudit({
    req,
    action: "Class assignment",
    entityType: "class",
    entityId: newCls.id,
    newValues: { instructorId, instructorName, courseName }
  });

  // Return mapped backward-compatible shape
  return sendSuccess(res, {
    id: newCls.id,
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
    createdAt: newCls.createdAt
  }, "Class created successfully", 201);
}));

router.put("/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    courseName,
    instructorId,
    instructorName,
    classroom,
    totalDurationHours,
    scheduleType,
    days,
    timeSlot,
    startDate,
    endDate,
    modules,
    status
  } = req.body;

  const creatorId = req.user?.id || instructorId;
  const courseVersionId = await resolveOrCreateCourseVersion(courseName, modules || [], creatorId);
  const centreId = await resolveCentreIdForInstructor(instructorId);

  let finalStatus = 'ACTIVE';
  if (status) {
    const upStatus = status.toUpperCase();
    if (['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(upStatus)) {
      finalStatus = upStatus;
    }
  }

  await ClassRepository.update(id, {
    courseVersionId,
    centreId,
    code: id.substring(0, 100),
    name: courseName,
    deliveryMode: scheduleType || "Weekday",
    capacity: totalDurationHours || 40,
    startDate,
    endDate,
    status: finalStatus,
    createdBy: creatorId,
    instructorId
  });

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
  await ClassRepository.delete(id);
  return sendSuccess(res, { success: true }, "Class deleted successfully");
}));

export default router;
