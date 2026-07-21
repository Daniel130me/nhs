import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { requireRole } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { z } from "zod";

const router = Router();

// Protect all report endpoints to ADMIN and SUPER_ADMIN roles only
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

// Helper function to build CSV server-side
function jsonToCsv(data: any[], headers: string[], keys: string[]): string {
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
  const rows = data.map(item => {
    return keys.map(key => {
      const val = item[key];
      const stringVal = val === null || val === undefined ? "" : String(val);
      return `"${stringVal.replace(/"/g, '""')}"`;
    }).join(",");
  });
  return [headerRow, ...rows].join("\n");
}

// 1. GET /api/v1/admin/reports/enrolments
router.get(
  "/enrolments",
  asyncHandler(async (req, res) => {
    const {
      startDate,
      endDate,
      centerId,
      courseId,
      classId,
      studentId,
      status,
      sortBy = "enrolled_at",
      sortOrder = "DESC",
      page = "1",
      limit = "10",
      export: exportType,
    } = req.query as any;

    let sql = `
      SELECT 
        e.id,
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        c.course_name as "className",
        c.id as "classId",
        e.status,
        e.enrolled_at as "enrolledAt",
        e.completed_at as "completedAt",
        e.grade_score as "gradeScore",
        sp.phone as "studentPhone",
        ctr.name as "centerName"
      FROM enrolments e
      JOIN users u ON e.student_id = u.id
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN centres ctr ON sp.centre_id = ctr.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      sql += ` AND e.enrolled_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND e.enrolled_at <= $${params.length}`;
    }
    if (centerId && centerId !== "All") {
      params.push(centerId);
      sql += ` AND sp.centre_id = $${params.length}`;
    }
    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND e.class_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      sql += ` AND e.student_id = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    const validSortColumns = ["enrolled_at", "studentName", "className", "status", "grade_score"];
    const sortCol = validSortColumns.includes(sortBy) ? sortBy : "enrolled_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    sql += ` ORDER BY ${sortCol === "studentName" ? "u.first_name" : sortCol === "className" ? "c.course_name" : sortCol} ${order}`;

    await logAudit({
      req,
      action: `View Enrolments Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Enrolment ID", "Student Name", "Student Email", "Class/Course", "Status", "Enrolled At", "Completed At", "Grade Score", "Center"],
        ["id", "studentName", "studentEmail", "className", "status", "enrolledAt", "completedAt", "gradeScore", "centerName"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="enrolments_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Enrolments report retrieved successfully");
  })
);

// 2. GET /api/v1/admin/reports/progress
router.get(
  "/progress",
  asyncHandler(async (req, res) => {
    const {
      classId,
      studentId,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        e.student_id as "studentId",
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        c.id as "classId",
        c.course_name as "courseName",
        e.status as "enrolmentStatus",
        COALESCE((
          SELECT COUNT(*) 
          FROM lessons l 
          JOIN course_modules cm ON l.module_id = cm.id 
          WHERE cm.course_version_id = c.course_version_id
        ), 0) as "totalLessons",
        COALESCE((
          SELECT COUNT(*) 
          FROM lesson_completions lc 
          JOIN lessons l ON lc.lesson_id = l.id 
          JOIN course_modules cm ON l.module_id = cm.id 
          WHERE lc.student_id = e.student_id AND cm.course_version_id = c.course_version_id
        ), 0) as "completedLessons"
      FROM enrolments e
      JOIN users u ON e.student_id = u.id
      JOIN classes c ON e.class_id = c.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND e.class_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      sql += ` AND e.student_id = $${params.length}`;
    }

    await logAudit({
      req,
      action: `View Progress Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const formattedData = data.map((d: any) => ({
        ...d,
        progressPercent: d.totalLessons > 0 ? Math.round((d.completedLessons / d.totalLessons) * 100) + "%" : "0%"
      }));
      const csv = jsonToCsv(
        formattedData,
        ["Student ID", "Student Name", "Student Email", "Class ID", "Course Name", "Status", "Total Lessons", "Completed Lessons", "Progress %"],
        ["studentId", "studentName", "studentEmail", "classId", "courseName", "enrolmentStatus", "totalLessons", "completedLessons", "progressPercent"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="progress_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);
    const formatted = rows.map((r: any) => ({
      ...r,
      progressPercent: r.totalLessons > 0 ? Math.round((r.completedLessons / r.totalLessons) * 100) : 0
    }));

    return sendSuccess(res, {
      data: formatted,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Progress report retrieved successfully");
  })
);

// 3. GET /api/v1/admin/reports/attendance
router.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const {
      classId,
      studentId,
      status,
      startDate,
      endDate,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        ar.id,
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        c.course_name as "className",
        cs.title as "sessionTitle",
        cs.starts_at as "sessionDate",
        ar.status,
        ar.arrival_time as "arrivalTime",
        ar.note
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      JOIN users u ON ar.student_id = u.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND cs.class_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      sql += ` AND ar.student_id = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      sql += ` AND ar.status = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      sql += ` AND cs.starts_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND cs.starts_at <= $${params.length}`;
    }

    sql += ` ORDER BY cs.starts_at DESC`;

    await logAudit({
      req,
      action: `View Attendance Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Record ID", "Student Name", "Student Email", "Class Name", "Session Title", "Session Date", "Status", "Arrival Time", "Note"],
        ["id", "studentName", "studentEmail", "className", "sessionTitle", "sessionDate", "status", "arrivalTime", "note"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="attendance_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Attendance report retrieved successfully");
  })
);

// 4. GET /api/v1/admin/reports/assignments
router.get(
  "/assignments",
  asyncHandler(async (req, res) => {
    const {
      classId,
      status,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        a.id,
        a.title,
        c.course_name as "className",
        a.total_marks as "totalMarks",
        a.due_at as "dueAt",
        a.status,
        a.allow_late_submission as "allowLate",
        a.max_attempts as "maxAttempts",
        a.created_at as "createdAt",
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as "submissionsCount"
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND a.class_id = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC`;

    await logAudit({
      req,
      action: `View Assignments Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Assignment ID", "Title", "Class Name", "Total Marks", "Due At", "Status", "Allow Late", "Max Attempts", "Created At", "Submissions"],
        ["id", "title", "className", "totalMarks", "dueAt", "status", "allowLate", "maxAttempts", "createdAt", "submissionsCount"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="assignments_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Assignments report retrieved successfully");
  })
);

// 5. GET /api/v1/admin/reports/assessments
router.get(
  "/assessments",
  asyncHandler(async (req, res) => {
    const {
      classId,
      studentId,
      status,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        asub.id,
        a.title as "assignmentTitle",
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        c.course_name as "className",
        asub.attempt_number as "attemptNumber",
        asub.status,
        asub.submitted_at as "submittedAt",
        asub.score,
        a.total_marks as "totalMarks",
        asub.feedback,
        asub.graded_at as "gradedAt",
        grader.first_name || ' ' || grader.last_name as "gradedByName"
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN classes c ON a.class_id = c.id
      JOIN users u ON asub.student_id = u.id
      LEFT JOIN users grader ON asub.graded_by = grader.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND a.class_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      sql += ` AND asub.student_id = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      sql += ` AND asub.status = $${params.length}`;
    }

    sql += ` ORDER BY asub.submitted_at DESC`;

    await logAudit({
      req,
      action: `View Assessments Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Submission ID", "Assignment", "Student Name", "Student Email", "Class Name", "Attempt", "Status", "Submitted At", "Score", "Total Marks", "Grader"],
        ["id", "assignmentTitle", "studentName", "studentEmail", "className", "attemptNumber", "status", "submittedAt", "score", "totalMarks", "gradedByName"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="assessments_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Assessments/Submissions report retrieved successfully");
  })
);

// 6. GET /api/v1/admin/reports/instructors
router.get(
  "/instructors",
  asyncHandler(async (req, res) => {
    const {
      centerId,
      status,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as "name",
        u.email,
        u.center,
        u.status,
        u.created_at as "createdAt",
        (SELECT COUNT(*) FROM classes WHERE instructor_id = u.id) as "classesCount",
        (SELECT COUNT(*) FROM weekly_logs_new WHERE instructor_id = u.id AND status = 'APPROVED') as "approvedLogsCount"
      FROM users u
      WHERE u.role = 'INSTRUCTOR' AND u.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (centerId && centerId !== "All") {
      params.push(centerId);
      sql += ` AND u.center = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    sql += ` ORDER BY u.created_at DESC`;

    await logAudit({
      req,
      action: `View Instructors Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Instructor ID", "Name", "Email", "Center", "Status", "Classes Count", "Approved Logs", "Joined Date"],
        ["id", "name", "email", "center", "status", "classesCount", "approvedLogsCount", "createdAt"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="instructors_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Instructors report retrieved successfully");
  })
);

// 7. GET /api/v1/admin/reports/feedback
router.get(
  "/feedback",
  asyncHandler(async (req, res) => {
    const {
      classId,
      hadIssue,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        fr.id,
        fc.title as "campaignTitle",
        c.course_name as "className",
        CASE WHEN fc.anonymous THEN 'Anonymous' ELSE (u.first_name || ' ' || u.last_name) END as "studentName",
        fr.pace,
        fr.clarity,
        fr.confidence,
        fr.materials_rating as "materialsRating",
        fr.lab_rating as "labRating",
        fr.had_issue as "hadIssue",
        fr.issue_severity as "issueSeverity",
        fr.comments,
        fr.created_at as "createdAt"
      FROM feedback_responses fr
      JOIN feedback_campaigns fc ON fr.campaign_id = fc.id
      JOIN classes c ON fc.class_id = c.id
      LEFT JOIN users u ON fr.student_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (classId && classId !== "All") {
      params.push(classId);
      sql += ` AND fc.class_id = $${params.length}`;
    }
    if (hadIssue !== undefined && hadIssue !== "All") {
      params.push(hadIssue === "true" || hadIssue === true);
      sql += ` AND fr.had_issue = $${params.length}`;
    }

    sql += ` ORDER BY fr.created_at DESC`;

    await logAudit({
      req,
      action: `View Feedback Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["Feedback ID", "Campaign Title", "Class Name", "Student Name", "Pace", "Clarity", "Confidence", "Materials Rating", "Lab Rating", "Had Issue", "Severity", "Comments", "Created At"],
        ["id", "campaignTitle", "className", "studentName", "pace", "clarity", "confidence", "materialsRating", "labRating", "hadIssue", "issueSeverity", "comments", "createdAt"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="feedback_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Feedback report retrieved successfully");
  })
);

// 8. GET /api/v1/admin/reports/storage
router.get(
  "/storage",
  asyncHandler(async (req, res) => {
    const {
      mimeType,
      export: exportType,
      page = "1",
      limit = "10",
    } = req.query as any;

    let sql = `
      SELECT 
        f.id,
        f.name,
        f.url,
        f.mime_type as "mimeType",
        f.size,
        u.first_name || ' ' || u.last_name as "uploadedByName",
        f.created_at as "createdAt"
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (mimeType && mimeType !== "All") {
      params.push(`%${mimeType}%`);
      sql += ` AND f.mime_type ILIKE $${params.length}`;
    }

    sql += ` ORDER BY f.created_at DESC`;

    await logAudit({
      req,
      action: `View Storage Report${exportType === "csv" ? " (CSV Export)" : ""}`,
      entityType: "report",
    });

    if (exportType === "csv") {
      const data = await query<any>(sql, params);
      const csv = jsonToCsv(
        data,
        ["File ID", "File Name", "File URL", "MIME Type", "Size (Bytes)", "Uploaded By", "Uploaded At"],
        ["id", "name", "url", "mimeType", "size", "uploadedByName", "createdAt"]
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="storage_report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Pagination
    const countSql = `SELECT COUNT(*) FROM (${sql}) AS subquery`;
    const countResult = await query<{ count: string }>(countSql, params);
    const totalCount = parseInt(countResult[0].count, 10);

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    params.push(parsedLimit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(sql, params);

    return sendSuccess(res, {
      data: rows,
      meta: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(totalCount / parsedLimit),
      }
    }, "Storage report retrieved successfully");
  })
);

export default router;
