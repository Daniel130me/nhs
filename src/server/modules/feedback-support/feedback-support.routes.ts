import { Router, Request, Response } from "express";
import { query } from "../../config/database";
import { sendSuccess, sendError } from "../../utils/api-response";
import { asyncHandler } from "../../utils/async-handler";
import { requireActiveUser, requireRole } from "../../middleware/auth";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/errors";
import { z } from "zod";
import { createNotification } from "../../services/notification.service";

const router = Router();

// ==========================================
// SCHEMAS
// ==========================================

const createCampaignSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(255),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  anonymous: z.boolean().default(false),
  oneResponsePerStudent: z.boolean().default(true),
});

const submitResponseSchema = z.object({
  pace: z.number().int().min(1).max(5).optional().nullable(),
  clarity: z.number().int().min(1).max(5).optional().nullable(),
  confidence: z.number().int().min(1).max(5).optional().nullable(),
  materialsRating: z.number().int().min(1).max(5).optional().nullable(),
  labRating: z.number().int().min(1).max(5).optional().nullable(),
  hadIssue: z.boolean().default(false),
  issueSeverity: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  autoCreateSupportCase: z.boolean().optional().default(false),
});

const createCaseSchema = z.object({
  classId: z.string().uuid().optional().nullable(),
  category: z.string().min(1).max(100),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
});

const updateCaseSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  resolutionNote: z.string().optional().nullable(),
});

// ==========================================
// FEEDBACK CAMPAIGN ENDPOINTS
// ==========================================

// Create a feedback campaign (Admins and Instructors)
router.post(
  "/feedback/campaigns",
  requireRole("ADMIN", "SUPER_ADMIN", "INSTRUCTOR"),
  asyncHandler(async (req: Request, res: Response) => {
    const body = createCampaignSchema.parse(req.body);
    const opensAt = new Date(body.opensAt);
    const closesAt = new Date(body.closesAt);

    if (closesAt <= opensAt) {
      throw new BadRequestError("closesAt must be after opensAt.");
    }

    // Verify class exists
    const classes = await query("SELECT id, name FROM classes WHERE id = $1", [body.classId]);
    if (classes.length === 0) {
      throw new NotFoundError("Class not found.");
    }

    const result = await query<any>(
      `INSERT INTO feedback_campaigns (class_id, title, opens_at, closes_at, anonymous, one_response_per_student, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, class_id as "classId", title, opens_at as "opensAt", closes_at as "closesAt", anonymous, one_response_per_student as "oneResponsePerStudent", created_by as "createdBy", created_at as "createdAt"`,
      [body.classId, body.title, opensAt, closesAt, body.anonymous, body.oneResponsePerStudent, req.user!.id]
    );

    // Notify all active students in the class
    const students = await query<any>(
      `SELECT student_id FROM enrolments WHERE class_id = $1 AND status = 'ACTIVE'`,
      [body.classId]
    );

    for (const s of students) {
      await createNotification(
        s.student_id,
        "FEEDBACK_CAMPAIGN_OPEN",
        "New Feedback Campaign",
        `A new feedback campaign "${body.title}" has been launched for your class. Please share your feedback!`,
        `/student/surveys`
      );
    }

    return sendSuccess(res, result[0], "Feedback campaign created successfully", 201);
  })
);

// Get feedback campaigns
router.get(
  "/feedback/campaigns",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.query;
    let campaigns: any[] = [];

    if (req.user!.role === "STUDENT") {
      // Students only get active campaigns for classes they are enrolled in
      const queryStr = `
        SELECT fc.id, fc.class_id as "classId", fc.title, fc.opens_at as "opensAt", fc.closes_at as "closesAt", 
               fc.anonymous, fc.one_response_per_student as "oneResponsePerStudent", fc.created_at as "createdAt",
               c.name as "className",
               EXISTS (
                 SELECT 1 FROM feedback_participation fp 
                 WHERE fp.campaign_id = fc.id AND fp.student_id = $1
               ) as "hasResponded"
        FROM feedback_campaigns fc
        JOIN classes c ON fc.class_id = c.id
        JOIN enrolments e ON e.class_id = c.id
        WHERE e.student_id = $1 AND e.status = 'ACTIVE'
          AND fc.opens_at <= NOW() AND fc.closes_at >= NOW()
        ORDER BY fc.closes_at ASC
      `;
      campaigns = await query(queryStr, [req.user!.id]);
    } else {
      // Admins/Instructors get all campaigns (or filtered by class)
      let queryStr = `
        SELECT fc.id, fc.class_id as "classId", fc.title, fc.opens_at as "opensAt", fc.closes_at as "closesAt", 
               fc.anonymous, fc.one_response_per_student as "oneResponsePerStudent", fc.created_by as "createdBy", 
               fc.created_at as "createdAt", c.name as "className"
        FROM feedback_campaigns fc
        JOIN classes c ON fc.class_id = c.id
      `;
      const params: any[] = [];
      if (classId && typeof classId === "string") {
        queryStr += ` WHERE fc.class_id = $1`;
        params.push(classId);
      }
      queryStr += ` ORDER BY fc.created_at DESC`;
      campaigns = await query(queryStr, params);
    }

    return sendSuccess(res, campaigns, "Campaigns retrieved successfully");
  })
);

// Get specific campaign details
router.get(
  "/feedback/campaigns/:id",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const campaigns = await query<any>(
      `SELECT fc.id, fc.class_id as "classId", fc.title, fc.opens_at as "opensAt", fc.closes_at as "closesAt", 
              fc.anonymous, fc.one_response_per_student as "oneResponsePerStudent", fc.created_at as "createdAt",
              c.name as "className"
       FROM feedback_campaigns fc
       JOIN classes c ON fc.class_id = c.id
       WHERE fc.id = $1`,
      [id]
    );

    if (campaigns.length === 0) {
      throw new NotFoundError("Feedback campaign not found.");
    }

    const campaign = campaigns[0];

    if (req.user!.role === "STUDENT") {
      // Check enrolment
      const enrol = await query(
        `SELECT 1 FROM enrolments WHERE class_id = $1 AND student_id = $2 AND status = 'ACTIVE'`,
        [campaign.classId, req.user!.id]
      );
      if (enrol.length === 0) {
        throw new ForbiddenError("You are not authorized to view this feedback campaign.");
      }

      // Check if responded
      const participated = await query(
        `SELECT 1 FROM feedback_participation WHERE campaign_id = $1 AND student_id = $2`,
        [id, req.user!.id]
      );
      campaign.hasResponded = participated.length > 0;
    }

    return sendSuccess(res, campaign, "Campaign details retrieved successfully");
  })
);

// Submit feedback response
router.post(
  "/feedback/campaigns/:id/responses",
  requireRole("STUDENT"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const studentId = req.user!.id;
    const body = submitResponseSchema.parse(req.body);

    const campaigns = await query<any>(
      `SELECT * FROM feedback_campaigns WHERE id = $1`,
      [id]
    );
    if (campaigns.length === 0) {
      throw new NotFoundError("Feedback campaign not found.");
    }
    const campaign = campaigns[0];

    // Check if open
    const now = new Date();
    if (now < new Date(campaign.opens_at) || now > new Date(campaign.closes_at)) {
      throw new BadRequestError("This feedback campaign is currently closed.");
    }

    // Verify enrolment
    const enrol = await query(
      `SELECT 1 FROM enrolments WHERE class_id = $1 AND student_id = $2 AND status = 'ACTIVE'`,
      [campaign.class_id, studentId]
    );
    if (enrol.length === 0) {
      throw new ForbiddenError("You are not enrolled in the class for this campaign.");
    }

    // Check duplicate
    const participated = await query(
      `SELECT 1 FROM feedback_participation WHERE campaign_id = $1 AND student_id = $2`,
      [id, studentId]
    );
    if (participated.length > 0 && campaign.one_response_per_student) {
      throw new BadRequestError("You have already submitted a response for this campaign.");
    }

    // Start transaction or separate queries
    // 1. Log participation
    await query(
      `INSERT INTO feedback_participation (campaign_id, student_id) VALUES ($1, $2)
       ON CONFLICT (campaign_id, student_id) DO NOTHING`,
      [id, studentId]
    );

    // 2. Insert feedback response
    const finalStudentId = campaign.anonymous ? null : studentId;
    const responseResult = await query<any>(
      `INSERT INTO feedback_responses (campaign_id, student_id, pace, clarity, confidence, materials_rating, lab_rating, had_issue, issue_severity, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, campaign_id as "campaignId", had_issue as "hadIssue", issue_severity as "issueSeverity", comments, created_at as "createdAt"`,
      [
        id,
        finalStudentId,
        body.pace || null,
        body.clarity || null,
        body.confidence || null,
        body.materialsRating || null,
        body.labRating || null,
        body.hadIssue,
        body.issueSeverity || null,
        body.comments || null
      ]
    );

    const response = responseResult[0];

    // 3. Optionally create support case if hadIssue is true
    let supportCaseCreated = false;
    let supportCaseId = null;

    if (body.hadIssue && (body.autoCreateSupportCase || body.issueSeverity === "HIGH" || body.issueSeverity === "CRITICAL")) {
      const caseId = crypto.randomUUID();
      const severity = body.issueSeverity === "HIGH" || body.issueSeverity === "CRITICAL" ? body.issueSeverity : "MEDIUM";
      const subject = `Feedback Campaign Issue - ${campaign.title}`;
      const description = body.comments || "Feedback response indicated an issue but provided no detailed comment.";
      
      await query(
        `INSERT INTO support_cases (id, student_id, class_id, source_feedback_id, category, severity, subject, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')`,
        [
          caseId,
          finalStudentId, // Will be null if campaign is anonymous, which protects identity!
          campaign.class_id,
          response.id,
          "Survey Feedback Issue",
          severity,
          subject,
          description
        ]
      );

      supportCaseCreated = true;
      supportCaseId = caseId;

      // Notify class instructors/admins of open support case
      const instructors = await query<any>(
        `SELECT instructor_id FROM class_instructors WHERE class_id = $1`,
        [campaign.class_id]
      );
      for (const instr of instructors) {
        await createNotification(
          instr.instructor_id,
          "SUPPORT_CASE_CREATED",
          "New Support Case Opened",
          `A new support case "${subject}" was generated from class feedback.`,
          `/instructor/support`
        );
      }
    }

    return sendSuccess(
      res, 
      { response, supportCaseCreated, supportCaseId }, 
      "Feedback response submitted successfully", 
      201
    );
  })
);

// Get campaign results (Admins and Instructors)
router.get(
  "/feedback/campaigns/:id/results",
  requireRole("ADMIN", "SUPER_ADMIN", "INSTRUCTOR"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const campaigns = await query<any>(
      `SELECT fc.*, c.name as "className" FROM feedback_campaigns fc
       JOIN classes c ON fc.class_id = c.id
       WHERE fc.id = $1`,
      [id]
    );

    if (campaigns.length === 0) {
      throw new NotFoundError("Feedback campaign not found.");
    }
    const campaign = campaigns[0];

    // Retrieve stats
    const statsResult = await query<any>(
      `SELECT 
         COUNT(*)::int as "totalResponses",
         AVG(pace)::float as "avgPace",
         AVG(clarity)::float as "avgClarity",
         AVG(confidence)::float as "avgConfidence",
         AVG(materials_rating)::float as "avgMaterials",
         AVG(lab_rating)::float as "avgLab",
         COUNT(CASE WHEN had_issue = TRUE THEN 1 END)::int as "issueCount"
       FROM feedback_responses
       WHERE campaign_id = $1`,
      [id]
    );

    const stats = statsResult[0] || {
      totalResponses: 0,
      avgPace: 0,
      avgClarity: 0,
      avgConfidence: 0,
      avgMaterials: 0,
      avgLab: 0,
      issueCount: 0,
    };

    // Retrieve responses
    let responses: any[] = [];
    if (campaign.anonymous) {
      // True anonymity: never return student_id, name, or email
      responses = await query(
        `SELECT id, pace, clarity, confidence, materials_rating as "materialsRating", lab_rating as "labRating",
                had_issue as "hadIssue", issue_severity as "issueSeverity", comments, created_at as "createdAt"
         FROM feedback_responses
         WHERE campaign_id = $1
         ORDER BY created_at DESC`,
        [id]
      );
    } else {
      // Non-anonymous: join users to return details
      responses = await query(
        `SELECT fr.id, fr.pace, fr.clarity, fr.confidence, fr.materials_rating as "materialsRating", fr.lab_rating as "labRating",
                fr.had_issue as "hadIssue", fr.issue_severity as "issueSeverity", fr.comments, fr.created_at as "createdAt",
                u.id as "studentId", u.first_name as "firstName", u.last_name as "lastName", u.email
         FROM feedback_responses fr
         LEFT JOIN users u ON fr.student_id = u.id
         WHERE fr.campaign_id = $1
         ORDER BY fr.created_at DESC`,
        [id]
      );
    }

    return sendSuccess(res, { campaign, stats, responses }, "Campaign results retrieved successfully");
  })
);

// ==========================================
// SUPPORT CASES ENDPOINTS
// ==========================================

// Create a support case manually
router.post(
  "/support/cases",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const body = createCaseSchema.parse(req.body);
    const id = crypto.randomUUID();

    // Verify class if provided
    if (body.classId) {
      const classes = await query("SELECT id FROM classes WHERE id = $1", [body.classId]);
      if (classes.length === 0) {
        throw new NotFoundError("Class not found.");
      }
    }

    // Determine student ID
    const studentId = req.user!.role === "STUDENT" ? req.user!.id : null;

    const result = await query<any>(
      `INSERT INTO support_cases (id, student_id, class_id, category, severity, subject, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
       RETURNING id, student_id as "studentId", class_id as "classId", category, severity, subject, description, status, created_at as "createdAt"`,
      [id, studentId, body.classId || null, body.category, body.severity, body.subject, body.description]
    );

    // Notify instructors of the class or admins
    if (body.classId) {
      const instructors = await query<any>(
        `SELECT instructor_id FROM class_instructors WHERE class_id = $1`,
        [body.classId]
      );
      for (const inst of instructors) {
        await createNotification(
          inst.instructor_id,
          "SUPPORT_CASE_CREATED",
          "New Support Case Opened",
          `A student opened a support case: "${body.subject}"`,
          `/instructor/support`
        );
      }
    }

    return sendSuccess(res, result[0], "Support case created successfully", 201);
  })
);

// Get support cases
router.get(
  "/support/cases",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    let cases: any[] = [];

    if (req.user!.role === "STUDENT") {
      // Students only see their own cases
      cases = await query(
        `SELECT sc.id, sc.student_id as "studentId", sc.class_id as "classId", sc.category, sc.severity, 
                sc.subject, sc.description, sc.status, sc.assigned_to as "assignedTo", sc.resolution_note as "resolutionNote",
                sc.resolved_at as "resolvedAt", sc.created_at as "createdAt", sc.updated_at as "updatedAt",
                c.name as "className",
                (u_ass.first_name || ' ' || u_ass.last_name) as "assignedToName"
         FROM support_cases sc
         LEFT JOIN classes c ON sc.class_id = c.id
         LEFT JOIN users u_ass ON sc.assigned_to = u_ass.id
         WHERE sc.student_id = $1
         ORDER BY sc.created_at DESC`,
        [req.user!.id]
      );
    } else {
      // Admins and Instructors see all cases
      cases = await query(
        `SELECT sc.id, sc.student_id as "studentId", sc.class_id as "classId", sc.category, sc.severity, 
                sc.subject, sc.description, sc.status, sc.assigned_to as "assignedTo", sc.resolution_note as "resolutionNote",
                sc.resolved_at as "resolvedAt", sc.created_at as "createdAt", sc.updated_at as "updatedAt",
                c.name as "className",
                (u_std.first_name || ' ' || u_std.last_name) as "studentName",
                u_std.email as "studentEmail",
                (u_ass.first_name || ' ' || u_ass.last_name) as "assignedToName"
         FROM support_cases sc
         LEFT JOIN classes c ON sc.class_id = c.id
         LEFT JOIN users u_std ON sc.student_id = u_std.id
         LEFT JOIN users u_ass ON sc.assigned_to = u_ass.id
         ORDER BY sc.created_at DESC`
      );
    }

    return sendSuccess(res, cases, "Support cases retrieved successfully");
  })
);

// Get specific support case details
router.get(
  "/support/cases/:id",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const cases = await query<any>(
      `SELECT sc.id, sc.student_id as "studentId", sc.class_id as "classId", sc.source_feedback_id as "sourceFeedbackId",
              sc.category, sc.severity, sc.subject, sc.description, sc.status, sc.assigned_to as "assignedTo", 
              sc.resolution_note as "resolutionNote", sc.resolved_at as "resolvedAt", sc.created_at as "createdAt", 
              sc.updated_at as "updatedAt",
              c.name as "className",
              (u_std.first_name || ' ' || u_std.last_name) as "studentName",
              u_std.email as "studentEmail",
              (u_ass.first_name || ' ' || u_ass.last_name) as "assignedToName"
       FROM support_cases sc
       LEFT JOIN classes c ON sc.class_id = c.id
       LEFT JOIN users u_std ON sc.student_id = u_std.id
       LEFT JOIN users u_ass ON sc.assigned_to = u_ass.id
       WHERE sc.id = $1`,
      [id]
    );

    if (cases.length === 0) {
      throw new NotFoundError("Support case not found.");
    }

    const scase = cases[0];

    if (req.user!.role === "STUDENT" && scase.studentId !== req.user!.id) {
      throw new ForbiddenError("You are not authorized to view this support case.");
    }

    return sendSuccess(res, scase, "Support case details retrieved successfully");
  })
);

// Update support case (Admin and Instructors update/assign/resolve)
router.put(
  "/support/cases/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "INSTRUCTOR"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = updateCaseSchema.parse(req.body);

    const cases = await query<any>(
      `SELECT * FROM support_cases WHERE id = $1`,
      [id]
    );

    if (cases.length === 0) {
      throw new NotFoundError("Support case not found.");
    }

    const currentCase = cases[0];
    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (body.status !== undefined) {
      updates.push(`status = $${pIdx++}`);
      params.push(body.status);

      if (body.status === "RESOLVED") {
        updates.push(`resolved_at = NOW()`);
      }
    }

    if (body.assignedTo !== undefined) {
      updates.push(`assigned_to = $${pIdx++}`);
      params.push(body.assignedTo);
    }

    if (body.resolutionNote !== undefined) {
      updates.push(`resolution_note = $${pIdx++}`);
      params.push(body.resolutionNote);
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const queryStr = `
      UPDATE support_cases
      SET ${updates.join(", ")}
      WHERE id = $${pIdx}
      RETURNING *
    `;

    const result = await query<any>(queryStr, params);
    const updatedCase = result[0];

    // Notification updates
    // 1. Notify the student (if exists) about support case update
    if (currentCase.student_id) {
      let msg = `Your support case regarding "${currentCase.subject}" has been updated.`;
      if (body.status) {
        msg = `Your support case regarding "${currentCase.subject}" status is now ${body.status}.`;
      }
      await createNotification(
        currentCase.student_id,
        "SUPPORT_CASE_UPDATE",
        "Support Case Updated",
        msg,
        `/student/support`
      );
    }

    // 2. Notify assigned user if assignee changed
    if (body.assignedTo && body.assignedTo !== currentCase.assigned_to) {
      await createNotification(
        body.assignedTo,
        "SUPPORT_CASE_ASSIGNED",
        "Support Case Assigned",
        `You have been assigned to support case "${currentCase.subject}".`,
        `/instructor/support`
      );
    }

    return sendSuccess(res, updatedCase, "Support case updated successfully");
  })
);

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

// Get user notifications
router.get(
  "/notifications",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const notifications = await query(
      `SELECT id, type, title, message, action_url as "actionUrl", read_at as "readAt", created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );

    return sendSuccess(res, notifications, "Notifications retrieved successfully");
  })
);

// Mark notification as read
router.post(
  "/notifications/:id/read",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query<any>(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, read_at as "readAt"`,
      [id, req.user!.id]
    );

    if (result.length === 0) {
      throw new NotFoundError("Notification not found or access denied.");
    }

    return sendSuccess(res, result[0], "Notification marked as read successfully");
  })
);

// Mark all notifications as read
router.post(
  "/notifications/read-all",
  requireActiveUser,
  asyncHandler(async (req: Request, res: Response) => {
    await query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user!.id]
    );

    return sendSuccess(res, { success: true }, "All notifications marked as read successfully");
  })
);

export default router;
