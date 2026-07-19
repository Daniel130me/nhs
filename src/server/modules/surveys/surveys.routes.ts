import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { surveySchema } from "./surveys.schema";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const surveys = await query("SELECT * FROM student_surveys ORDER BY submitted_at DESC");
  const formatted = surveys.map(s => ({
    id: s.id,
    weekEnding: s.week_ending,
    courseName: s.course_name,
    center: s.center,
    studentName: s.student_name,
    anonymous: s.anonymous,
    pace: s.pace,
    clarity: s.clarity,
    keepUp: s.keep_up,
    questionsAnswered: s.questions_answered,
    materialsClear: s.materials_clear,
    materialsOnTime: s.materials_on_time,
    exercisesMatched: s.exercises_matched,
    labSufficient: s.lab_sufficient,
    toolsWorked: s.tools_worked,
    couldComplete: s.could_complete,
    hadIssue: s.had_issue,
    issueCategories: s.issue_categories,
    severity: s.severity,
    issueDescription: s.issue_description,
    repeatIssue: s.repeat_issue,
    overallSatisfaction: s.overall_satisfaction,
    confidence: s.confidence,
    additionalComments: s.additional_comments,
    submittedAt: s.submitted_at
  }));
  return sendSuccess(res, formatted, "Surveys retrieved successfully");
}));

router.post("/", asyncHandler(async (req, res) => {
  const payload = surveySchema.parse(req.body);
  const {
    weekEnding, courseName, center, studentName, anonymous, pace, clarity, keepUp,
    questionsAnswered, materialsClear, materialsOnTime, exercisesMatched, labSufficient,
    toolsWorked, couldComplete, hadIssue, issueCategories, severity, issueDescription,
    repeatIssue, overallSatisfaction, confidence, additionalComments
  } = payload;

  const srvId = req.body.id || `survey-${Date.now()}`;
  const submittedAt = new Date().toISOString();

  await query(
    `INSERT INTO student_surveys (
      id, week_ending, course_name, center, student_name, anonymous, pace, clarity, keep_up,
      questions_answered, materials_clear, materials_on_time, exercises_matched, lab_sufficient,
      tools_worked, could_complete, had_issue, issue_categories, severity, issue_description,
      repeat_issue, overall_satisfaction, confidence, additional_comments, submitted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
    [
      srvId,
      weekEnding || new Date().toISOString().split('T')[0],
      courseName,
      center,
      studentName || "",
      !!anonymous,
      pace || 3,
      clarity || 3,
      keepUp || 3,
      questionsAnswered || "Usually",
      materialsClear || 3,
      materialsOnTime || "Yes",
      exercisesMatched || "Yes",
      labSufficient,
      toolsWorked || "Yes",
      couldComplete || "Yes",
      hadIssue || "No",
      JSON.stringify(issueCategories || []),
      severity || "",
      issueDescription || "",
      repeatIssue || "",
      overallSatisfaction || 3,
      confidence || 3,
      additionalComments || "",
      submittedAt
    ]
  );

  return sendSuccess(res, {
    id: srvId,
    weekEnding,
    courseName,
    center,
    studentName,
    anonymous,
    pace,
    clarity,
    keepUp,
    questionsAnswered,
    materialsClear,
    materialsOnTime,
    exercisesMatched,
    labSufficient,
    toolsWorked,
    couldComplete,
    hadIssue,
    issueCategories,
    severity,
    issueDescription,
    repeatIssue,
    overallSatisfaction,
    confidence,
    additionalComments,
    submittedAt
  }, "Survey submitted successfully", 201);
}));

export default router;
