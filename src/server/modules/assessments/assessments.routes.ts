import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { aiService } from "../../services/ai.service";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { createNotification } from "../../services/notification.service";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema
} from "./assessments.schema";

const router = Router();

// ==========================================
// HELPERS & AUTHORIZATION
// ==========================================

async function checkClassInstructorAccess(classId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  if (userRole === "INSTRUCTOR") {
    const assignments = await query(
      "SELECT 1 FROM class_instructors WHERE class_id = $1 AND instructor_id = $2",
      [classId, userId]
    );
    return assignments.length > 0;
  }
  return false;
}

async function checkClassStudentAccess(classId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
  if (userRole === "INSTRUCTOR") {
    return checkClassInstructorAccess(classId, userId, userRole);
  }
  if (userRole === "STUDENT") {
    const enrolments = await query(
      "SELECT 1 FROM enrolments WHERE class_id = $1 AND student_id = $2 AND status = 'ACTIVE'",
      [classId, userId]
    );
    return enrolments.length > 0;
  }
  return false;
}

// ==========================================
// ASSIGNMENT ENDPOINTS
// ==========================================

// Create Assignment
router.post("/assignments", requireActiveUser, asyncHandler(async (req, res) => {
  const parsed = createAssignmentSchema.parse(req.body);

  const hasAccess = await checkClassInstructorAccess(parsed.classId, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to manage assignments for this class.");
  }

  const publishedAt = parsed.status === "PUBLISHED" ? new Date().toISOString() : null;
  const resourcesJson = JSON.stringify(parsed.resources);

  const results = await query(
    `INSERT INTO assignments (
      class_id, lesson_id, title, instructions, total_marks, due_at, 
      allow_late_submission, max_attempts, status, created_by, published_at, resources
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      parsed.classId,
      parsed.lessonId || null,
      parsed.title,
      parsed.instructions,
      parsed.totalMarks,
      parsed.dueAt || null,
      parsed.allowLateSubmission,
      parsed.maxAttempts,
      parsed.status,
      req.user!.id,
      publishedAt,
      resourcesJson
    ]
  );

  await logAudit({
    req,
    action: "Create Assignment",
    entityType: "assignment",
    entityId: results[0].id,
    newValues: results[0]
  });

  if (parsed.status === "PUBLISHED") {
    const students = await query<any>(
      "SELECT student_id FROM enrolments WHERE class_id = $1 AND status = 'ACTIVE'",
      [parsed.classId]
    );
    for (const s of students) {
      await createNotification(
        s.student_id,
        "ASSIGNMENT_PUBLICATION",
        "New Assignment Published",
        `Assignment "${results[0].title}" has been published.`,
        `/student/assignments`
      );
      if (results[0].due_at) {
        await createNotification(
          s.student_id,
          "ASSIGNMENT_DUE",
          "Assignment Due Date Scheduled",
          `Assignment "${results[0].title}" is scheduled to be due on ${new Date(results[0].due_at).toLocaleDateString()}.`,
          `/student/assignments`
        );
      }
    }
  }

  return sendSuccess(res, results[0], "Assignment created successfully", 201);
}));

// Update Assignment
router.put("/assignments/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = updateAssignmentSchema.parse(req.body);

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [id]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  const hasAccess = await checkClassInstructorAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to update assignments for this class.");
  }

  const updatedStatus = parsed.status || current.status;
  let publishedAt = current.published_at;
  if (updatedStatus === "PUBLISHED" && current.status !== "PUBLISHED") {
    publishedAt = new Date().toISOString();
  }

  const results = await query(
    `UPDATE assignments SET
      title = COALESCE($1, title),
      instructions = COALESCE($2, instructions),
      total_marks = COALESCE($3, total_marks),
      due_at = COALESCE($4, due_at),
      allow_late_submission = COALESCE($5, allow_late_submission),
      max_attempts = COALESCE($6, max_attempts),
      status = COALESCE($7, status),
      lesson_id = COALESCE($8, lesson_id),
      published_at = $9,
      resources = COALESCE($10, resources),
      updated_at = NOW()
    WHERE id = $11
    RETURNING *`,
    [
      parsed.title,
      parsed.instructions,
      parsed.totalMarks,
      parsed.dueAt !== undefined ? parsed.dueAt : current.due_at,
      parsed.allowLateSubmission,
      parsed.maxAttempts,
      parsed.status,
      parsed.lessonId !== undefined ? parsed.lessonId : current.lesson_id,
      publishedAt,
      parsed.resources ? JSON.stringify(parsed.resources) : null,
      id
    ]
  );

  await logAudit({
    req,
    action: "Update Assignment",
    entityType: "assignment",
    entityId: id,
    oldValues: current,
    newValues: results[0]
  });

  if (updatedStatus === "PUBLISHED" && current.status !== "PUBLISHED") {
    const students = await query<any>(
      "SELECT student_id FROM enrolments WHERE class_id = $1 AND status = 'ACTIVE'",
      [current.class_id]
    );
    for (const s of students) {
      await createNotification(
        s.student_id,
        "ASSIGNMENT_PUBLICATION",
        "New Assignment Published",
        `Assignment "${results[0].title}" has been published.`,
        `/student/assignments`
      );
      if (results[0].due_at) {
        await createNotification(
          s.student_id,
          "ASSIGNMENT_DUE",
          "Assignment Due Date Scheduled",
          `Assignment "${results[0].title}" is scheduled to be due on ${new Date(results[0].due_at).toLocaleDateString()}.`,
          `/student/assignments`
        );
      }
    }
  }

  return sendSuccess(res, results[0], "Assignment updated successfully");
}));

// Delete Assignment
router.delete("/assignments/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [id]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  const hasAccess = await checkClassInstructorAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to delete assignments for this class.");
  }

  await query("DELETE FROM assignments WHERE id = $1", [id]);

  await logAudit({
    req,
    action: "Delete Assignment",
    entityType: "assignment",
    entityId: id,
    oldValues: current
  });

  return sendSuccess(res, { id }, "Assignment deleted successfully");
}));

// List Assignments for Class
router.get("/classes/:classId/assignments", requireActiveUser, asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const hasAccess = await checkClassStudentAccess(classId, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to access assignments for this class.");
  }

  let list;
  if (req.user!.role === "STUDENT") {
    list = await query(
      `SELECT * FROM assignments 
       WHERE class_id = $1 AND status = 'PUBLISHED' 
       ORDER BY due_at ASC, created_at DESC`,
      [classId]
    );
  } else {
    list = await query(
      `SELECT * FROM assignments 
       WHERE class_id = $1 
       ORDER BY created_at DESC`,
      [classId]
    );
  }

  const formatted = list.map(item => ({
    id: item.id,
    classId: item.class_id,
    lessonId: item.lesson_id,
    title: item.title,
    instructions: item.instructions,
    totalMarks: parseFloat(item.total_marks),
    dueAt: item.due_at,
    allowLateSubmission: item.allow_late_submission,
    maxAttempts: item.max_attempts,
    status: item.status,
    createdBy: item.created_by,
    publishedAt: item.published_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    resources: item.resources || []
  }));

  return sendSuccess(res, formatted, "Assignments retrieved successfully");
}));

// Get Assignment Detail
router.get("/assignments/:id", requireActiveUser, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [id]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  const hasAccess = await checkClassStudentAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to access this assignment.");
  }

  if (req.user!.role === "STUDENT" && current.status !== "PUBLISHED") {
    throw new ForbiddenError("This assignment is not accessible.");
  }

  const formatted = {
    id: current.id,
    classId: current.class_id,
    lessonId: current.lesson_id,
    title: current.title,
    instructions: current.instructions,
    totalMarks: parseFloat(current.total_marks),
    dueAt: current.due_at,
    allowLateSubmission: current.allow_late_submission,
    maxAttempts: current.max_attempts,
    status: current.status,
    createdBy: current.created_by,
    publishedAt: current.published_at,
    createdAt: current.created_at,
    updatedAt: current.updated_at,
    resources: current.resources || []
  };

  return sendSuccess(res, formatted, "Assignment retrieved successfully");
}));

// ==========================================
// SUBMISSION ENDPOINTS
// ==========================================

// Instructor View Submissions for an Assignment
router.get("/assignments/:assignmentId/submissions", requireActiveUser, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [assignmentId]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  const hasAccess = await checkClassInstructorAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to view submissions for this class.");
  }

  const submissions = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email
     FROM assignment_submissions s
     JOIN users u ON s.student_id = u.id
     WHERE s.assignment_id = $1
     ORDER BY s.submitted_at DESC, s.attempt_number DESC`,
    [assignmentId]
  );

  const submissionIds = submissions.map(sub => sub.id);
  let filesMap: Record<string, Array<{ id: string; name: string; url: string }>> = {};

  if (submissionIds.length > 0) {
    const files = await query(
      `SELECT sf.submission_id, f.id, f.name, f.url
       FROM submission_files sf
       JOIN files f ON sf.file_id = f.id
       WHERE sf.submission_id = ANY($1::uuid[])`,
      [submissionIds]
    );

    files.forEach(f => {
      if (!filesMap[f.submission_id]) {
        filesMap[f.submission_id] = [];
      }
      filesMap[f.submission_id].push({
        id: f.id,
        name: f.name,
        url: f.url
      });
    });
  }

  const formatted = submissions.map(s => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    studentName: `${s.first_name} ${s.last_name}`,
    studentEmail: s.email,
    attemptNumber: s.attempt_number,
    textContent: s.text_content,
    status: s.status,
    submittedAt: s.submitted_at,
    score: s.score !== null ? parseFloat(s.score) : null,
    feedback: s.feedback,
    gradedBy: s.graded_by,
    gradedAt: s.graded_at,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    files: filesMap[s.id] || []
  }));

  return sendSuccess(res, formatted, "Submissions retrieved successfully");
}));

// Student View Their Submissions for an Assignment
router.get("/assignments/:assignmentId/my-submissions", requireActiveUser, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [assignmentId]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  const hasAccess = await checkClassStudentAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to access this class.");
  }

  const submissions = await query(
    `SELECT * FROM assignment_submissions
     WHERE assignment_id = $1 AND student_id = $2
     ORDER BY attempt_number DESC`,
    [assignmentId, req.user!.id]
  );

  const submissionIds = submissions.map(sub => sub.id);
  let filesMap: Record<string, Array<{ id: string; name: string; url: string }>> = {};

  if (submissionIds.length > 0) {
    const files = await query(
      `SELECT sf.submission_id, f.id, f.name, f.url
       FROM submission_files sf
       JOIN files f ON sf.file_id = f.id
       WHERE sf.submission_id = ANY($1::uuid[])`,
      [submissionIds]
    );

    files.forEach(f => {
      if (!filesMap[f.submission_id]) {
        filesMap[f.submission_id] = [];
      }
      filesMap[f.submission_id].push({
        id: f.id,
        name: f.name,
        url: f.url
      });
    });
  }

  const formatted = submissions.map(s => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    attemptNumber: s.attempt_number,
    textContent: s.text_content,
    status: s.status,
    submittedAt: s.submitted_at,
    score: s.score !== null ? parseFloat(s.score) : null,
    feedback: s.feedback,
    gradedBy: s.graded_by,
    gradedAt: s.graded_at,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    files: filesMap[s.id] || []
  }));

  return sendSuccess(res, formatted, "Your submissions retrieved successfully");
}));

// Submit / Save Draft Submission
router.post("/assignments/:assignmentId/submissions", requireActiveUser, asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const parsed = submitAssignmentSchema.parse(req.body);

  if (req.user!.role !== "STUDENT" && req.user!.role !== "SUPER_ADMIN" && req.user!.role !== "ADMIN") {
    throw new ForbiddenError("Only student users can make assignment submissions.");
  }

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [assignmentId]);
  if (assignments.length === 0) {
    throw new NotFoundError("Assignment not found");
  }
  const current = assignments[0];

  if (current.status !== "PUBLISHED") {
    throw new ForbiddenError("This assignment is not open for submissions.");
  }

  const hasAccess = await checkClassStudentAccess(current.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not actively enrolled in this class.");
  }

  // Get current submissions
  const existing = await query(
    `SELECT * FROM assignment_submissions
     WHERE assignment_id = $1 AND student_id = $2
     ORDER BY attempt_number DESC`,
    [assignmentId, req.user!.id]
  );

  let targetSubmission;
  let attemptNumber = 1;
  let isNewAttempt = true;

  if (existing.length > 0) {
    const latest = existing[0];
    if (latest.status === "DRAFT") {
      // Overwrite/edit the current draft
      targetSubmission = latest;
      attemptNumber = latest.attempt_number;
      isNewAttempt = false;
    } else if (latest.status === "RETURNED") {
      // Allowed to resubmit - starts a new attempt
      attemptNumber = latest.attempt_number + 1;
      isNewAttempt = true;
    } else {
      // Attempt is finalized
      throw new BadRequestError("You cannot edit a finalized attempt unless returned for resubmission.");
    }
  }

  if (isNewAttempt && attemptNumber > current.max_attempts) {
    throw new BadRequestError(`Attempt limit reached. You have already used ${existing.length} of ${current.max_attempts} attempts.`);
  }

  // Calculate late status
  let finalStatus: string = parsed.status;
  const now = new Date();
  let submittedAt = parsed.status === "SUBMITTED" ? now.toISOString() : null;

  if (parsed.status === "SUBMITTED" && current.due_at) {
    const dueTime = new Date(current.due_at);
    if (now > dueTime) {
      if (!current.allow_late_submission) {
        throw new BadRequestError("Late submissions are not permitted for this assignment.");
      }
      finalStatus = "LATE";
    }
  }

  let submissionId: string;

  if (targetSubmission) {
    // Update existing draft
    submissionId = targetSubmission.id;
    await query(
      `UPDATE assignment_submissions SET
        text_content = $1,
        status = $2,
        submitted_at = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [parsed.textContent || null, finalStatus, submittedAt, submissionId]
    );
  } else {
    // Create new submission
    const insertResult = await query(
      `INSERT INTO assignment_submissions (
        assignment_id, student_id, attempt_number, text_content, status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [assignmentId, req.user!.id, attemptNumber, parsed.textContent || null, finalStatus, submittedAt]
    );
    submissionId = insertResult[0].id;
  }

  // Update submission files if provided
  if (parsed.fileIds) {
    // Clear old links
    await query("DELETE FROM submission_files WHERE submission_id = $1", [submissionId]);

    // Insert new links
    for (const fileId of parsed.fileIds) {
      // Verify file existence and ownership
      const fileCheck = await query("SELECT 1 FROM files WHERE id = $1 AND uploaded_by = $2", [fileId, req.user!.id]);
      if (fileCheck.length === 0) {
        throw new BadRequestError(`Invalid file ID: ${fileId}. You must own the file to attach it.`);
      }

      await query(
        `INSERT INTO submission_files (submission_id, file_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [submissionId, fileId]
      );
    }
  }

  const updatedSub = await query("SELECT * FROM assignment_submissions WHERE id = $1", [submissionId]);

  await logAudit({
    req,
    action: parsed.status === "SUBMITTED" ? "Submit Assignment" : "Save Draft Submission",
    entityType: "assignment_submission",
    entityId: submissionId,
    newValues: updatedSub[0]
  });

  return sendSuccess(res, updatedSub[0], parsed.status === "SUBMITTED" ? "Assignment submitted successfully" : "Draft saved successfully");
}));

// Grade Submission
router.post("/submissions/:submissionId/grade", requireActiveUser, asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const parsed = gradeSubmissionSchema.parse(req.body);

  const submissions = await query("SELECT * FROM assignment_submissions WHERE id = $1", [submissionId]);
  if (submissions.length === 0) {
    throw new NotFoundError("Submission not found");
  }
  const current = submissions[0];

  const assignments = await query("SELECT * FROM assignments WHERE id = $1", [current.assignment_id]);
  const currentAssignment = assignments[0];

  const hasAccess = await checkClassInstructorAccess(currentAssignment.class_id, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to grade submissions for this class.");
  }

  if (parsed.score > parseFloat(currentAssignment.total_marks)) {
    throw new BadRequestError(`Score (${parsed.score}) cannot exceed the maximum total marks (${currentAssignment.total_marks}) allowed for this assignment.`);
  }

  const results = await query(
    `UPDATE assignment_submissions SET
      score = $1,
      feedback = $2,
      status = $3,
      graded_by = $4,
      graded_at = NOW(),
      updated_at = NOW()
    WHERE id = $5
    RETURNING *`,
    [parsed.score, parsed.feedback || null, parsed.status, req.user!.id, submissionId]
  );

  await logAudit({
    req,
    action: "Grade Submission",
    entityType: "assignment_submission",
    entityId: submissionId,
    oldValues: current,
    newValues: results[0]
  });

  if (parsed.status === "GRADED") {
    await createNotification(
      current.student_id,
      "GRADE_PUBLISHED",
      "Grade Published",
      `Your submission for "${currentAssignment.title}" has been graded. Score: ${parsed.score}/${currentAssignment.total_marks}`,
      `/student/assignments`
    );
  } else if (parsed.status === "RETURNED") {
    await createNotification(
      current.student_id,
      "ASSIGNMENT_RETURNED",
      "Assignment Returned",
      `Your submission for "${currentAssignment.title}" has been returned for revisions.`,
      `/student/assignments`
    );
  }

  return sendSuccess(res, results[0], "Submission graded successfully");
}));

// ==========================================
// GRADEBOOK ENDPOINTS
// ==========================================

// Get Class Gradebook
router.get("/classes/:classId/gradebook", requireActiveUser, asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const hasAccess = await checkClassStudentAccess(classId, req.user!.id, req.user!.role);
  if (!hasAccess) {
    throw new ForbiddenError("You are not authorized to view the gradebook for this class.");
  }

  // Get all published assignments
  const allAssignments = await query(
    `SELECT id, title, total_marks, due_at, status 
     FROM assignments 
     WHERE class_id = $1 AND status = 'PUBLISHED'
     ORDER BY due_at ASC, created_at ASC`,
    [classId]
  );

  const formattedAssignments = allAssignments.map(item => ({
    id: item.id,
    title: item.title,
    totalMarks: parseFloat(item.total_marks),
    dueAt: item.due_at
  }));

  // Get students enrolled in the class
  let studentsQuery = `
    SELECT u.id, u.first_name, u.last_name, u.email
    FROM enrolments e
    JOIN users u ON e.student_id = u.id
    WHERE e.class_id = $1 AND e.status = 'ACTIVE'
  `;
  let studentsParams: any[] = [classId];

  // If requester is a student, they can only view their own row!
  if (req.user!.role === "STUDENT") {
    studentsQuery += ` AND u.id = $2`;
    studentsParams.push(req.user!.id);
  }

  const students = await query(studentsQuery, studentsParams);

  // Get all submissions for these students and assignments
  const studentIds = students.map(s => s.id);
  let formattedStudents: any[] = [];

  if (studentIds.length > 0) {
    const submissions = await query(
      `SELECT s.*
       FROM assignment_submissions s
       WHERE s.assignment_id IN (SELECT id FROM assignments WHERE class_id = $1)
       AND s.student_id = ANY($2::uuid[])`,
      [classId, studentIds]
    );

    // Group submissions by student & assignment to find the highest / latest graded score
    const subMap: Record<string, Record<string, typeof submissions[0]>> = {};
    submissions.forEach(sub => {
      const sId = sub.student_id;
      const aId = sub.assignment_id;
      if (!subMap[sId]) {
        subMap[sId] = {};
      }
      
      const existing = subMap[sId][aId];
      if (!existing) {
        subMap[sId][aId] = sub;
      } else {
        // Prefer latest submitted or graded attempt
        if (sub.attempt_number > existing.attempt_number) {
          subMap[sId][aId] = sub;
        }
      }
    });

    formattedStudents = students.map(st => {
      const studentGrades: Record<string, any> = {};
      let totalEarned = 0;
      let totalPossible = 0;
      let missingCount = 0;
      let lateCount = 0;

      formattedAssignments.forEach(asg => {
        const sub = subMap[st.id]?.[asg.id];
        const now = new Date();
        const dueTime = asg.dueAt ? new Date(asg.dueAt) : null;
        const isPastDue = dueTime ? now > dueTime : false;

        let score = null;
        let status = "UNSUBMITTED";
        let isLate = false;
        let isMissing = false;
        let feedback = null;
        let attemptNumber = 0;

        if (sub) {
          score = sub.score !== null ? parseFloat(sub.score) : null;
          status = sub.status;
          attemptNumber = sub.attempt_number;
          feedback = sub.feedback;
          isLate = sub.status === "LATE";
          if (isLate) lateCount++;

          if (sub.status === "GRADED" && score !== null) {
            totalEarned += score;
          }
        } else {
          if (isPastDue) {
            isMissing = true;
            missingCount++;
            status = "MISSING";
          }
        }

        totalPossible += asg.totalMarks;

        studentGrades[asg.id] = {
          score,
          status,
          isLate,
          isMissing,
          feedback,
          attemptNumber,
          totalMarks: asg.totalMarks
        };
      });

      const percentage = totalPossible > 0 ? parseFloat(((totalEarned / totalPossible) * 100).toFixed(2)) : 100;

      return {
        id: st.id,
        firstName: st.first_name,
        lastName: st.last_name,
        email: st.email,
        grades: studentGrades,
        totalEarned: parseFloat(totalEarned.toFixed(2)),
        totalPossible: parseFloat(totalPossible.toFixed(2)),
        percentage,
        missingCount,
        lateCount
      };
    });
  }

  return sendSuccess(res, {
    assignments: formattedAssignments,
    students: formattedStudents
  }, "Gradebook data retrieved successfully");
}));


export default router;
