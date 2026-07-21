import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { classSchema } from "./classes.schema";
import { requireActiveUser, requireClassInstructor } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { ClassRepository } from "../../repositories/class.repository";
import { CourseRepository } from "../../repositories/course.repository";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import { z } from "zod";
import { createNotification } from "../../services/notification.service";

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

// ---- CLASS SESSIONS & ATTENDANCE ENDPOINTS ----

const sessionSchema = z.object({
  title: z.string().min(1, "Session title is required"),
  startsAt: z.string().datetime({ message: "Invalid startsAt datetime" }),
  endsAt: z.string().datetime({ message: "Invalid endsAt datetime" }),
  location: z.string().optional().nullable(),
  meetingUrl: z.string().url().optional().nullable().or(z.literal("")).or(z.literal(null)),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).default('SCHEDULED')
}).refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  message: "endsAt must be after startsAt",
  path: ["endsAt"]
});

const attendanceRecordItemSchema = z.object({
  studentId: z.string().uuid("Invalid student ID format"),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  arrivalTime: z.string().datetime().optional().nullable(),
  note: z.string().optional().nullable()
});

const attendancePayloadSchema = z.object({
  records: z.array(attendanceRecordItemSchema)
});

// GET all students in a class
router.get("/:classId/students", requireActiveUser, asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const students = await query<any>(
    `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", 
            u.email, u.gender, u.center, u.phone, u.status
     FROM enrolments e
     JOIN users u ON e.student_id = u.id
     WHERE e.class_id = $1 AND e.status = 'ACTIVE' AND u.deleted_at IS NULL`,
    [classId]
  );
  return sendSuccess(res, students, "Class students retrieved successfully");
}));

// GET all sessions of a class
router.get("/:classId/sessions", requireActiveUser, asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const sessions = await query<any>(
    `SELECT id, class_id as "classId", title, starts_at as "startsAt", 
            ends_at as "endsAt", location, meeting_url as "meetingUrl", status,
            created_by as "createdBy", created_at as "createdAt"
     FROM class_sessions
     WHERE class_id = $1
     ORDER BY starts_at ASC`,
    [classId]
  );
  return sendSuccess(res, sessions, "Sessions retrieved successfully");
}));

// POST a new session
router.post("/:classId/sessions", requireClassInstructor("classId"), asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const body = sessionSchema.parse(req.body);
  const id = req.body.id || undefined;
  
  const result = await query<any>(
    `INSERT INTO class_sessions (id, class_id, title, starts_at, ends_at, location, meeting_url, status, created_by)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, class_id as "classId", title, starts_at as "startsAt", ends_at as "endsAt", 
               location, meeting_url as "meetingUrl", status, created_by as "createdBy"`,
    [
      id,
      classId,
      body.title,
      body.startsAt,
      body.endsAt,
      body.location || null,
      body.meetingUrl || null,
      body.status,
      req.user!.id
    ]
  );
  // Notify all enrolled students in the class
  const students = await query<any>(
    "SELECT student_id FROM enrolments WHERE class_id = $1 AND status = 'ACTIVE'",
    [classId]
  );
  for (const s of students) {
    await createNotification(
      s.student_id,
      "UPCOMING_SESSION",
      "New Session Scheduled",
      `A new session "${body.title}" has been scheduled for your class.`,
      `/student/classes`
    );
  }

  return sendSuccess(res, result[0], "Session created successfully", 201);
}));

// PUT update an existing session
router.put("/:classId/sessions/:sessionId", requireClassInstructor("classId"), asyncHandler(async (req, res) => {
  const { classId, sessionId } = req.params;
  const body = sessionSchema.parse(req.body);
  
  const result = await query<any>(
    `UPDATE class_sessions
     SET title = $1, starts_at = $2, ends_at = $3, location = $4, meeting_url = $5, status = $6, updated_at = NOW()
     WHERE id = $7 AND class_id = $8
     RETURNING id, class_id as "classId", title, starts_at as "startsAt", ends_at as "endsAt", 
               location, meeting_url as "meetingUrl", status`,
    [
      body.title,
      body.startsAt,
      body.endsAt,
      body.location || null,
      body.meetingUrl || null,
      body.status,
      sessionId,
      classId
    ]
  );
  
  if (result.length === 0) {
    throw new NotFoundError("Session not found under this class");
  }
  return sendSuccess(res, result[0], "Session updated successfully");
}));

// DELETE a session
router.delete("/:classId/sessions/:sessionId", requireClassInstructor("classId"), asyncHandler(async (req, res) => {
  const { classId, sessionId } = req.params;
  await query(
    "DELETE FROM class_sessions WHERE id = $1 AND class_id = $2",
    [sessionId, classId]
  );
  return sendSuccess(res, { success: true }, "Session deleted successfully");
}));

// GET attendance for a session
router.get("/:classId/sessions/:sessionId/attendance", requireClassInstructor("classId"), asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const records = await query<any>(
    `SELECT id, session_id as "sessionId", student_id as "studentId", status,
            arrival_time as "arrivalTime", note, recorded_by as "recordedBy", 
            created_at as "createdAt", updated_at as "updatedAt"
     FROM attendance_records
     WHERE session_id = $1`,
    [sessionId]
  );
  return sendSuccess(res, records, "Attendance records retrieved successfully");
}));

// POST save/update attendance for a session
router.post("/:classId/sessions/:sessionId/attendance", requireClassInstructor("classId"), asyncHandler(async (req, res) => {
  const { classId, sessionId } = req.params;
  const { records } = attendancePayloadSchema.parse(req.body);

  // 1. Verify session exists and belongs to this class
  const sessions = await query<any>(
    "SELECT id FROM class_sessions WHERE id = $1 AND class_id = $2",
    [sessionId, classId]
  );
  if (sessions.length === 0) {
    throw new NotFoundError("Session not found under this class");
  }

  // 2. Fetch enrolled students for this class
  const enrollments = await query<any>(
    "SELECT student_id FROM enrolments WHERE class_id = $1 AND status = 'ACTIVE'",
    [classId]
  );
  const enrolledStudentIds = new Set(enrollments.map((e: any) => e.student_id));

  // 3. Prevent attendance for unrelated students / outside enrolment
  for (const record of records) {
    if (!enrolledStudentIds.has(record.studentId)) {
      throw new BadRequestError(`Student ${record.studentId} is not enrolled in this class`);
    }
  }

  // 4. Save/update attendance records (upsert)
  const savedRecords = [];
  for (const record of records) {
    const existing = await query<any>(
      "SELECT status, arrival_time, note FROM attendance_records WHERE session_id = $1 AND student_id = $2",
      [sessionId, record.studentId]
    );

    const result = await query<any>(
      `INSERT INTO attendance_records (session_id, student_id, status, arrival_time, note, recorded_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (session_id, student_id) DO UPDATE SET
         status = EXCLUDED.status,
         arrival_time = EXCLUDED.arrival_time,
         note = EXCLUDED.note,
         recorded_by = EXCLUDED.recorded_by,
         updated_at = NOW()
       RETURNING id, session_id as "sessionId", student_id as "studentId", status, arrival_time as "arrivalTime", note`,
      [
        sessionId,
        record.studentId,
        record.status,
        record.arrivalTime || null,
        record.note || null,
        req.user!.id
      ]
    );

    savedRecords.push(result[0]);

    // Write audit log if changed
    const oldVal = existing.length > 0 ? existing[0] : null;
    if (!oldVal || oldVal.status !== record.status || oldVal.note !== record.note || oldVal.arrival_time !== record.arrivalTime) {
      await logAudit({
        req,
        action: oldVal ? "Update Attendance" : "Record Attendance",
        entityType: "attendance",
        entityId: result[0].id,
        oldValues: oldVal,
        newValues: { status: record.status, arrivalTime: record.arrivalTime, note: record.note }
      });
    }
  }

  return sendSuccess(res, savedRecords, "Attendance recorded successfully");
}));

// GET attendance summary for a class
router.get("/:classId/attendance-summary", requireActiveUser, asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Get all completed sessions for this class
  const sessions = await query<any>(
    "SELECT id FROM class_sessions WHERE class_id = $1 AND status = 'COMPLETED'",
    [classId]
  );
  
  // If no completed sessions, calculate against all sessions
  const allSessions = await query<any>(
    "SELECT id FROM class_sessions WHERE class_id = $1",
    [classId]
  );

  const referenceSessions = sessions.length > 0 ? sessions : allSessions;
  if (referenceSessions.length === 0) {
    return sendSuccess(res, [], "No sessions defined for this class yet");
  }

  const sessionIds = referenceSessions.map((s: any) => s.id);

  const stats = await query<any>(
    `SELECT ar.student_id as "studentId",
            CONCAT(u.first_name, ' ', u.last_name) as "studentName",
            u.email as "studentEmail",
            COUNT(CASE WHEN ar.status = 'PRESENT' THEN 1 END) as present,
            COUNT(CASE WHEN ar.status = 'LATE' THEN 1 END) as late,
            COUNT(CASE WHEN ar.status = 'ABSENT' THEN 1 END) as absent,
            COUNT(CASE WHEN ar.status = 'EXCUSED' THEN 1 END) as excused
     FROM attendance_records ar
     JOIN users u ON ar.student_id = u.id
     WHERE ar.session_id = ANY($1)
     GROUP BY ar.student_id, u.first_name, u.last_name, u.email`,
    [sessionIds]
  );

  const formatted = stats.map((s: any) => {
    const presentCount = parseInt(s.present || "0");
    const lateCount = parseInt(s.late || "0");
    const excusedCount = parseInt(s.excused || "0");
    const totalCount = presentCount + lateCount + excusedCount + parseInt(s.absent || "0");
    
    const attended = presentCount + lateCount;
    const percentage = totalCount > 0 ? Math.round((attended / totalCount) * 100) : 100;

    return {
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      present: presentCount,
      late: lateCount,
      absent: parseInt(s.absent || "0"),
      excused: excusedCount,
      percentage
    };
  });

  return sendSuccess(res, formatted, "Attendance summary retrieved successfully");
}));

export default router;
