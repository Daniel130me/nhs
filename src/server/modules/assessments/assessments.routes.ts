import { Router } from "express";
import { query } from "../../config/database";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { aiService } from "../../services/ai.service";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";

const router = Router();

// ... existing code ...
// Let's keep existing code identical, but let's view more imports or do a surgical replace in /gemini/grade-exam


router.get("/exam-attempts", requireActiveUser, asyncHandler(async (req, res) => {
  const attempts = await query("SELECT * FROM exam_attempts ORDER BY taken_at DESC");
  const formatted = attempts.map(att => ({
    id: att.id,
    instructorId: att.instructor_id,
    courseName: att.course_name,
    trialNumber: att.trial_number,
    score: att.score,
    passed: att.passed,
    feedback: att.feedback,
    takenAt: att.taken_at
  }));
  return sendSuccess(res, formatted, "Exam attempts retrieved successfully");
}));

router.post("/exam-attempts", requireActiveUser, asyncHandler(async (req, res) => {
  const { id, instructorId, courseName, trialNumber, score, passed, feedback } = req.body;
  if (!instructorId || !courseName) {
    throw new BadRequestError("Missing required exam attempt fields (instructorId and courseName)");
  }

  const attId = id || `attempt-${Date.now()}`;
  const takenAt = new Date().toISOString();

  await query(
    `INSERT INTO exam_attempts (id, instructor_id, course_name, trial_number, score, passed, feedback, taken_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [attId, instructorId, courseName, trialNumber || 1, score || 0, !!passed, feedback || "", takenAt]
  );

  return sendSuccess(res, {
    id: attId,
    instructorId,
    courseName,
    trialNumber,
    score,
    passed,
    feedback,
    takenAt
  }, "Exam attempt recorded successfully", 201);
}));

router.post("/gemini/generate-exam", requireActiveUser, asyncHandler(async (req, res) => {
  const { courseName, lessons } = req.body;
  if (!courseName) {
    throw new BadRequestError("courseName is required");
  }

  const examData = await aiService.generateExam(courseName, lessons);
  return sendSuccess(res, examData, "Competency exam generated successfully by AI");
}));

router.post("/gemini/grade-exam", requireActiveUser, asyncHandler(async (req, res) => {
  const { questions, answers, courseName } = req.body;
  if (!questions || !answers) {
    throw new BadRequestError("questions and answers are required");
  }

  // Grade algorithmically first to guarantee 100% correct score arithmetic
  let correctCount = 0;
  const results = questions.map((q: any) => {
    const userAnswerIndex = answers[q.id];
    const isCorrect = userAnswerIndex === q.correctOptionIndex;
    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      questionText: q.questionText,
      correct: isCorrect,
      userAnswer: userAnswerIndex !== undefined ? q.options[userAnswerIndex] : "No Answer",
      correctAnswer: q.options[q.correctOptionIndex],
      explanation: q.explanation
    };
  });

  const totalQuestions = questions.length;
  const scorePct = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePct >= 70;

  let aiFeedback = `You scored ${scorePct}% (${correctCount}/${totalQuestions}). `;
  if (passed) {
    aiFeedback += `Excellent work! You have demonstrated the necessary competency to instruct this course. Your certification credentials have been updated.`;
  } else {
    aiFeedback += `You did not meet the 70% passing threshold. Please review the course slides, reading materials, and labs, and try again.`;
  }

  // Request optional personalized AI feedback
  const personalizedFeedback = await aiService.generateFeedback(
    courseName || "Course",
    scorePct,
    correctCount,
    totalQuestions,
    results
  );

  if (personalizedFeedback) {
    aiFeedback = personalizedFeedback;
  }

  await logAudit({
    req,
    action: "Grade modification",
    entityType: "exam_attempt",
    newValues: { score: scorePct, passed, courseName }
  });

  return sendSuccess(res, {
    score: scorePct,
    passed,
    feedback: aiFeedback,
    results
  }, "Exam graded successfully");
}));

export default router;
