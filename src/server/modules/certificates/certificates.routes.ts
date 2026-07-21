import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess, sendError } from "../../utils/api-response";
import { requireActiveUser, requireRole } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { createNotification } from "../../services/notification.service";
import crypto from "crypto";

const router = Router();

// 1. PUBLIC: GET /api/certificates/verify/:code (Verification endpoint)
router.get(
  "/verify/:code",
  asyncHandler(async (req, res) => {
    const { code } = req.params;

    const certs = await query<any>(
      `SELECT 
        c.id,
        c.certificate_number as "certificateNumber",
        c.verification_code as "verificationCode",
        c.issued_at as "issuedAt",
        c.revoked,
        c.revoked_at as "revokedAt",
        c.revocation_reason as "revocationReason",
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        cls.course_name as "className",
        issuer.first_name || ' ' || issuer.last_name as "issuedByName"
      FROM certificates c
      JOIN users u ON c.student_id = u.id
      JOIN classes cls ON c.class_id = cls.id
      LEFT JOIN users issuer ON c.issued_by = issuer.id
      WHERE c.verification_code = $1 OR c.certificate_number = $1`,
      [code]
    );

    if (certs.length === 0) {
      return sendError(res, "Certificate not found or invalid verification code.", "CERTIFICATE_NOT_FOUND", 404);
    }

    return sendSuccess(res, certs[0], "Certificate successfully verified");
  })
);

// 2. STUDENT: GET /api/certificates/my-certificates (Student's own certificates)
router.get(
  "/my-certificates",
  requireActiveUser,
  asyncHandler(async (req, res) => {
    const studentId = req.user!.id;

    const certs = await query<any>(
      `SELECT 
        c.id,
        c.certificate_number as "certificateNumber",
        c.verification_code as "verificationCode",
        c.issued_at as "issuedAt",
        c.revoked,
        c.revocation_reason as "revocationReason",
        cls.course_name as "className",
        cls.id as "classId",
        issuer.first_name || ' ' || issuer.last_name as "issuedByName"
      FROM certificates c
      JOIN classes cls ON c.class_id = cls.id
      LEFT JOIN users issuer ON c.issued_by = issuer.id
      WHERE c.student_id = $1 AND c.revoked = FALSE
      ORDER BY c.issued_at DESC`,
      [studentId]
    );

    return sendSuccess(res, certs, "My certificates retrieved successfully");
  })
);

// 3. ADMIN: GET /api/v1/admin/certificates (List all certificates)
router.get(
  "/admin/certificates",
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const certs = await query<any>(
      `SELECT 
        c.id,
        c.certificate_number as "certificateNumber",
        c.verification_code as "verificationCode",
        c.issued_at as "issuedAt",
        c.revoked,
        c.revoked_at as "revokedAt",
        c.revocation_reason as "revocationReason",
        u.first_name || ' ' || u.last_name as "studentName",
        u.email as "studentEmail",
        cls.course_name as "className",
        issuer.first_name || ' ' || issuer.last_name as "issuedByName"
      FROM certificates c
      JOIN users u ON c.student_id = u.id
      JOIN classes cls ON c.class_id = cls.id
      LEFT JOIN users issuer ON c.issued_by = issuer.id
      ORDER BY c.issued_at DESC`
    );

    return sendSuccess(res, certs, "All certificates retrieved successfully");
  })
);

// 4. ADMIN: POST /api/v1/admin/classes/:classId/students/:studentId/issue-certificate (Issue Certificate with backend eligibility evaluation)
router.post(
  "/admin/classes/:classId/students/:studentId/issue",
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const { classId, studentId } = req.params;

    // A. Check if already issued
    const existing = await query("SELECT id FROM certificates WHERE student_id = $1 AND class_id = $2", [studentId, classId]);
    if (existing.length > 0) {
      return sendError(res, "A certificate has already been issued to this student for this class.", "CERTIFICATE_ALREADY_ISSUED", 400);
    }

    // B. Check student enrolment status
    const enrolment = await query<any>("SELECT status FROM enrolments WHERE student_id = $1 AND class_id = $2", [studentId, classId]);
    if (enrolment.length === 0) {
      return sendError(res, "Student is not enrolled in this class.", "NOT_ENROLLED", 400);
    }

    // C. Evaluate Attendance Eligibility (Minimum 80%)
    const completedSessions = await query<any>("SELECT id FROM class_sessions WHERE class_id = $1 AND status = 'COMPLETED'", [classId]);
    const totalSessionsCount = completedSessions.length;
    let attendanceRate = 100;

    if (totalSessionsCount > 0) {
      const sessionsAttended = await query<any>(
        `SELECT COUNT(*) as count FROM attendance_records 
         WHERE student_id = $1 
         AND session_id IN (SELECT id FROM class_sessions WHERE class_id = $2 AND status = 'COMPLETED') 
         AND status IN ('PRESENT', 'LATE')`,
        [studentId, classId]
      );
      const attendedCount = parseInt(sessionsAttended[0].count, 10);
      attendanceRate = Math.round((attendedCount / totalSessionsCount) * 100);
    }

    if (attendanceRate < 80) {
      return sendError(
        res,
        `Student does not qualify. Attendance is ${attendanceRate}%, which is below the required 80% minimum.`,
        "INELIGIBLE_ATTENDANCE",
        400
      );
    }

    // D. Evaluate Assignment Eligibility (Submit 100% of published assignments, and minimum cumulative score average of 50%)
    const publishedAssignments = await query<any>("SELECT id, total_marks FROM assignments WHERE class_id = $1 AND status = 'PUBLISHED'", [classId]);
    const totalAssignmentsCount = publishedAssignments.length;

    if (totalAssignmentsCount > 0) {
      const submissions = await query<any>(
        `SELECT assignment_id, score, status FROM assignment_submissions 
         WHERE student_id = $1 
         AND assignment_id IN (SELECT id FROM assignments WHERE class_id = $2 AND status = 'PUBLISHED')
         AND status IN ('SUBMITTED', 'LATE', 'GRADED')`,
        [studentId, classId]
      );

      const submittedIds = new Set(submissions.map((s: any) => s.assignment_id));
      if (submittedIds.size < totalAssignmentsCount) {
        return sendError(
          res,
          `Student does not qualify. Submitted ${submittedIds.size} of ${totalAssignmentsCount} published assignments. All assignments must be submitted.`,
          "INELIGIBLE_ASSIGNMENTS_MISSING",
          400
        );
      }

      // Calculate score average percentage
      let totalMaxMarks = 0;
      let totalEarnedScore = 0;
      publishedAssignments.forEach((a: any) => {
        totalMaxMarks += parseFloat(a.total_marks);
      });

      submissions.forEach((s: any) => {
        if (s.score !== null) {
          totalEarnedScore += parseFloat(s.score);
        }
      });

      const averageScorePercent = totalMaxMarks > 0 ? Math.round((totalEarnedScore / totalMaxMarks) * 100) : 100;
      if (averageScorePercent < 50) {
        return sendError(
          res,
          `Student does not qualify. Cumulative assignment grade is ${averageScorePercent}%, below the required 50% minimum.`,
          "INELIGIBLE_ASSIGNMENT_SCORE",
          400
        );
      }
    }

    // E. Generate Certificate Credentials
    const certificateNumber = `NHS-CERT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const verificationCode = crypto.randomUUID();

    const certId = crypto.randomUUID();
    await query(
      `INSERT INTO certificates (id, student_id, class_id, certificate_number, verification_code, issued_by, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [certId, studentId, classId, certificateNumber, verificationCode, req.user!.id]
    );

    // F. Notify student
    await createNotification(
      studentId,
      "CERTIFICATE_ISSUED",
      "Certificate Issued!",
      `Congratulations! Your certificate of completion has been issued for class. Verification Number: ${certificateNumber}.`,
      `/?verify=${verificationCode}`
    );

    await logAudit({
      req,
      action: "Issue Certificate",
      entityType: "certificate",
      entityId: certId,
      newValues: { certificateNumber, verificationCode, studentId, classId }
    });

    return sendSuccess(
      res,
      { id: certId, certificateNumber, verificationCode, issuedAt: new Date().toISOString() },
      "Certificate issued successfully to the student."
    );
  })
);

// 5. ADMIN: POST /api/v1/admin/certificates/:id/revoke (Revoke Certificate)
router.post(
  "/admin/certificates/:id/revoke",
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return sendError(res, "A valid reason of at least 5 characters is required to revoke a certificate.", "VALIDATION_ERROR", 400);
    }

    const certs = await query<any>("SELECT id, student_id, certificate_number, class_id FROM certificates WHERE id = $1", [id]);
    if (certs.length === 0) {
      return sendError(res, "Certificate not found.", "NOT_FOUND", 404);
    }

    const cert = certs[0];

    await query(
      `UPDATE certificates 
       SET revoked = TRUE, revoked_at = NOW(), revoked_by = $1, revocation_reason = $2 
       WHERE id = $3`,
      [req.user!.id, reason, id]
    );

    await createNotification(
      cert.student_id,
      "CERTIFICATE_REVOKED",
      "Certificate Revoked",
      `Your certificate ${cert.certificate_number} has been revoked by an administrator. Reason: ${reason}.`,
      "/"
    );

    await logAudit({
      req,
      action: "Revoke Certificate",
      entityType: "certificate",
      entityId: id,
      metadata: { reason, certificateNumber: cert.certificate_number }
    });

    return sendSuccess(res, { success: true }, "Certificate revoked successfully.");
  })
);

export default router;
