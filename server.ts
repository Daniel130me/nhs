import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initDb, query } from "./src/db";
import { uploadFile } from "./src/storage";

dotenv.config();

// Initialize the Gemini SDK server-side
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY_IF_NOT_SET",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Serve uploaded static files if locally stored
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// ----------------------------------------------------
// DATABASE API ENDPOINTS
// ----------------------------------------------------

// --- Auth Endpoints ---
app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const instructors = await query(
      "SELECT * FROM instructors WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    if (instructors.length > 0) {
      // Return with frontend-expected camelCase names
      const inst = instructors[0];
      return res.json({
        id: inst.id,
        firstName: inst.first_name,
        lastName: inst.last_name,
        email: inst.email,
        gender: inst.gender,
        center: inst.center,
        courses: inst.courses,
        role: inst.role,
        createdAt: inst.created_at
      });
    }
    return res.status(404).json({ error: "Instructor not found with this email" });
  } catch (err: any) {
    console.error("Login endpoint failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { firstName, lastName, email, gender, center, courses, role } = req.body;
  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({ error: "Required fields missing for registration" });
  }

  try {
    const id = `inst-${Date.now()}`;
    const createdAt = new Date().toISOString();
    
    await query(
      `INSERT INTO instructors (id, first_name, last_name, email, gender, center, courses, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        firstName,
        lastName,
        email.trim(),
        gender || "",
        center || "",
        JSON.stringify(courses || []),
        role,
        createdAt
      ]
    );

    res.status(201).json({
      id,
      firstName,
      lastName,
      email,
      gender,
      center,
      courses,
      role,
      createdAt
    });
  } catch (err: any) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Instructors Endpoints ---
app.get("/api/instructors", async (req, res) => {
  try {
    const instructors = await query("SELECT * FROM instructors ORDER BY created_at DESC");
    const formatted = instructors.map(inst => ({
      id: inst.id,
      firstName: inst.first_name,
      lastName: inst.last_name,
      email: inst.email,
      gender: inst.gender,
      center: inst.center,
      courses: inst.courses,
      role: inst.role,
      createdAt: inst.created_at
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Classes Endpoints ---
app.get("/api/classes", async (req, res) => {
  try {
    const classes = await query("SELECT * FROM classes ORDER BY created_at DESC");
    const formatted = classes.map(c => ({
      id: c.id,
      courseName: c.course_name,
      instructorId: c.instructor_id,
      instructorName: c.instructor_name,
      totalDurationHours: c.total_duration_hours,
      classroom: c.classroom,
      scheduleType: c.schedule_type,
      days: c.days,
      timeSlot: c.time_slot,
      startDate: c.start_date,
      endDate: c.end_date,
      modules: c.modules,
      status: c.status,
      createdAt: c.created_at
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/classes", async (req, res) => {
  const {
    id,
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
    status
  } = req.body;

  if (!courseName || !instructorId || !instructorName) {
    return res.status(400).json({ error: "Missing key parameters for class creation" });
  }

  const classId = id || `class-${Date.now()}`;
  const createdAt = new Date().toISOString();

  try {
    await query(
      `INSERT INTO classes (id, course_name, instructor_id, instructor_name, total_duration_hours, classroom, schedule_type, days, time_slot, start_date, end_date, modules, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        classId,
        courseName,
        instructorId,
        instructorName,
        totalDurationHours || 0,
        classroom || "",
        scheduleType || "Weekday",
        JSON.stringify(days || []),
        timeSlot || "Morning",
        startDate || "",
        endDate || "",
        JSON.stringify(modules || []),
        status || "Active",
        createdAt
      ]
    );

    res.status(201).json({
      id: classId,
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
      createdAt
    });
  } catch (err: any) {
    console.error("Class creation failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  const {
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
    status
  } = req.body;

  try {
    await query(
      `UPDATE classes 
       SET course_name = $1, instructor_id = $2, instructor_name = $3, total_duration_hours = $4, 
           classroom = $5, schedule_type = $6, days = $7, time_slot = $8, start_date = $9, 
           end_date = $10, modules = $11, status = $12
       WHERE id = $13`,
      [
        courseName,
        instructorId,
        instructorName,
        totalDurationHours,
        classroom,
        scheduleType,
        JSON.stringify(days),
        timeSlot,
        startDate,
        endDate,
        JSON.stringify(modules),
        status,
        id
      ]
    );
    res.json({ message: "Class updated successfully" });
  } catch (err: any) {
    console.error("Class update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM classes WHERE id = $1", [id]);
    res.json({ message: "Class deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Weekly Logs Endpoints ---
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await query("SELECT * FROM weekly_logs ORDER BY submitted_at DESC");
    const formatted = logs.map(log => ({
      id: log.id,
      classId: log.class_id,
      weekNumber: log.week_number,
      hoursLogged: log.hours_logged,
      modulesCoveredThisWeek: log.modules_covered_this_week,
      challenges: log.challenges,
      submittedAt: log.submitted_at,
      instructorId: log.instructor_id
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/logs", async (req, res) => {
  const { id, classId, weekNumber, hoursLogged, modulesCoveredThisWeek, challenges, instructorId } = req.body;
  if (!classId || !weekNumber || !instructorId) {
    return res.status(400).json({ error: "Required fields missing for log submission" });
  }

  const logId = id || `log-${Date.now()}`;
  const submittedAt = new Date().toISOString();

  try {
    await query(
      `INSERT INTO weekly_logs (id, class_id, week_number, hours_logged, modules_covered_this_week, challenges, submitted_at, instructor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        logId,
        classId,
        weekNumber,
        hoursLogged || 0,
        JSON.stringify(modulesCoveredThisWeek || []),
        challenges || "",
        submittedAt,
        instructorId
      ]
    );

    res.status(201).json({
      id: logId,
      classId,
      weekNumber,
      hoursLogged,
      modulesCoveredThisWeek,
      challenges,
      submittedAt,
      instructorId
    });
  } catch (err: any) {
    console.error("Log submission failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Student Surveys Endpoints ---
app.get("/api/surveys", async (req, res) => {
  try {
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
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/surveys", async (req, res) => {
  const {
    id, weekEnding, courseName, center, studentName, anonymous, pace, clarity, keepUp,
    questionsAnswered, materialsClear, materialsOnTime, exercisesMatched, labSufficient,
    toolsWorked, couldComplete, hadIssue, issueCategories, severity, issueDescription,
    repeatIssue, overallSatisfaction, confidence, additionalComments
  } = req.body;

  if (!courseName || !center) {
    return res.status(400).json({ error: "courseName and center are required" });
  }

  const srvId = id || `survey-${Date.now()}`;
  const submittedAt = new Date().toISOString();

  try {
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

    res.status(201).json({
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
    });
  } catch (err: any) {
    console.error("Survey submission failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Courses Endpoints ---
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await query("SELECT * FROM courses ORDER BY created_at DESC");
    res.json(courses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/courses", async (req, res) => {
  const { id, name, category, description, lessons } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "Name and Category are required" });
  }

  const crsId = id || `course-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const createdAt = new Date().toISOString();

  try {
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
    res.json({ id: crsId, name, category, description, lessons, createdAt });
  } catch (err: any) {
    console.error("Course save/update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM courses WHERE id = $1", [id]);
    res.json({ message: "Course deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Exam Attempts Endpoints ---
app.get("/api/exam-attempts", async (req, res) => {
  try {
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
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/exam-attempts", async (req, res) => {
  const { id, instructorId, courseName, trialNumber, score, passed, feedback } = req.body;
  if (!instructorId || !courseName) {
    return res.status(400).json({ error: "Missing required exam attempt variables" });
  }

  const attId = id || `attempt-${Date.now()}`;
  const takenAt = new Date().toISOString();

  try {
    await query(
      `INSERT INTO exam_attempts (id, instructor_id, course_name, trial_number, score, passed, feedback, taken_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [attId, instructorId, courseName, trialNumber || 1, score || 0, !!passed, feedback || "", takenAt]
    );

    res.status(201).json({
      id: attId,
      instructorId,
      courseName,
      trialNumber,
      score,
      passed,
      feedback,
      takenAt
    });
  } catch (err: any) {
    console.error("Exam attempt save failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- System Config Endpoints ---
app.get("/api/config", async (req, res) => {
  try {
    const config = await query("SELECT * FROM system_config WHERE key = 'default'");
    if (config.length > 0) {
      res.json({
        centers: config[0].centers,
        courses: config[0].courses,
        timeSlots: config[0].time_slots
      });
    } else {
      res.status(404).json({ error: "Config not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/config", async (req, res) => {
  const { centers, courses, timeSlots } = req.body;
  try {
    await query(
      `UPDATE system_config 
       SET centers = $1, courses = $2, time_slots = $3
       WHERE key = 'default'`,
      [JSON.stringify(centers), JSON.stringify(courses), JSON.stringify(timeSlots)]
    );
    res.json({ message: "Config updated successfully" });
  } catch (err: any) {
    console.error("Config update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- R2 / Local File Upload Endpoint ---
app.post("/api/upload", async (req, res) => {
  const { fileName, mimeType, fileData } = req.body;
  if (!fileName || !mimeType || !fileData) {
    return res.status(400).json({ error: "fileName, mimeType, and fileData are required" });
  }

  try {
    // Decode base64 fileData payload
    const buffer = Buffer.from(fileData, "base64");
    const uploadedUrl = await uploadFile(fileName, mimeType, buffer);
    res.json({ url: uploadedUrl });
  } catch (err: any) {
    console.error("File upload failed:", err);
    res.status(500).json({ error: "Failed to upload file: " + err.message });
  }
});

// ----------------------------------------------------
// API ROUTES: COURSE AUTHORING (GEMINI)
// ----------------------------------------------------
app.post("/api/gemini/author-course", async (req, res) => {
  const { courseName, category } = req.body;
  if (!courseName) {
    return res.status(400).json({ error: "courseName is required" });
  }

  // Graceful fallback if API key is not configured yet
  if (!apiKey || apiKey === "MOCK_KEY_IF_NOT_SET") {
    console.warn("GEMINI_API_KEY is not configured in environment, returning mock authoring content");
    return res.json(getMockCourseSyllabus(courseName, category));
  }

  try {
    const prompt = `Create a professional syllabus and outline for a course named "${courseName}" under the category "${category || "General IT"}". 
Include a comprehensive course description and exactly 3 detailed lessons/modules. 
For each lesson, add at least 2 resources: one 'slides' or 'pdf' and one 'video'.
Generate realistic mock content for the slides text (Slide 1... Slide 2...), pdf reading (at least 2 paragraphs of detailed study material), and video (a short video script or detailed description). 
Ensure all contents are highly professional and designed for instructors to prepare.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "A detailed description of the course and its instructor goals."
            },
            lessons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Title of the lesson/module." },
                  description: { type: Type.STRING, description: "Short description of what is taught." },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Resource name, e.g., 'Slides: Advanced Concepts' or 'PDF: Study Guide'." },
                        type: { 
                          type: Type.STRING, 
                          description: "Must be exactly one of: 'slides', 'pdf', 'video'." 
                        },
                        content: { 
                          type: Type.STRING, 
                          description: "Detailed study content. For slides, outline slides separated by newlines. For pdf, an in-depth reading document. For video, a video transcript summary." 
                        }
                      },
                      required: ["name", "type", "content"]
                    }
                  }
                },
                required: ["title", "description", "resources"]
              }
            }
          },
          required: ["description", "lessons"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text returned from Gemini");
    }

    const courseData = JSON.parse(text.trim());
    res.json(courseData);
  } catch (err: any) {
    console.error("Gemini course authoring failed:", err);
    res.status(500).json({ error: "Failed to generate course with AI: " + err.message, fallback: getMockCourseSyllabus(courseName, category) });
  }
});

// ----------------------------------------------------
// API ROUTES: GENERATE EXAM (GEMINI)
// ----------------------------------------------------
app.post("/api/gemini/generate-exam", async (req, res) => {
  const { courseName, lessons } = req.body;
  if (!courseName) {
    return res.status(400).json({ error: "courseName is required" });
  }

  // Graceful fallback if API key is not configured yet
  if (!apiKey || apiKey === "MOCK_KEY_IF_NOT_SET") {
    console.warn("GEMINI_API_KEY is not configured in environment, returning mock exam questions");
    return res.json(getMockExam(courseName));
  }

  try {
    const lessonsText = lessons ? JSON.stringify(lessons) : "";
    const prompt = `Generate an objective competence evaluation exam for an instructor who is seeking to teach the course "${courseName}".
The course outline is: ${lessonsText}.
Generate exactly 10 high-quality multiple choice questions (MCQs) that evaluate deep subject matter mastery, teaching methodology, and lab troubleshooting competencies.
Each question must have exactly 4 choices and a 0-indexed correct option index (0 for option A, 1 for option B, etc.). Add a helpful explanation for each.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique question ID, e.g. 'q-1', 'q-2'." },
                  questionText: { type: Type.STRING, description: "Detailed multiple choice question." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 clear answer choices."
                  },
                  correctOptionIndex: { 
                    type: Type.INTEGER, 
                    description: "Correct answer index (0 to 3)." 
                  },
                  explanation: { type: Type.STRING, description: "Detailed explanation of why this is the correct choice." }
                },
                required: ["id", "questionText", "options", "correctOptionIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text returned from Gemini");
    }

    const examData = JSON.parse(text.trim());
    res.json(examData);
  } catch (err: any) {
    console.error("Gemini exam generation failed:", err);
    res.status(500).json({ error: "Failed to generate exam questions with AI: " + err.message, fallback: getMockExam(courseName) });
  }
});

// ----------------------------------------------------
// API ROUTES: GRADE EXAM (GEMINI)
// ----------------------------------------------------
app.post("/api/gemini/grade-exam", async (req, res) => {
  const { questions, answers, courseName } = req.body;
  if (!questions || !answers) {
    return res.status(400).json({ error: "questions and answers are required" });
  }

  try {
    // Grade algorithmically to guarantee 100% correct score arithmetic
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

    // Attempt to get personalized AI feedback if key is available
    if (apiKey && apiKey !== "MOCK_KEY_IF_NOT_SET") {
      try {
        const feedbackPrompt = `An instructor took a competence evaluation for the course "${courseName}" and scored ${scorePct}% (${correctCount}/${totalQuestions}). 
Here are the grading results: ${JSON.stringify(results)}.
Write a supportive, highly constructive, and short paragraph (3-4 sentences max) of mentoring feedback. Highlight specific key areas they should focus on or praise their achievement.`;
        
        const feedbackResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: feedbackPrompt
        });
        if (feedbackResponse.text) {
          aiFeedback = feedbackResponse.text.trim();
        }
      } catch (e) {
        console.warn("Failed to generate custom AI feedback, using algorithmic feedback:", e);
      }
    }

    res.json({
      score: scorePct,
      passed,
      feedback: aiFeedback,
      results
    });
  } catch (err: any) {
    console.error("Exam grading failed:", err);
    res.status(500).json({ error: "Failed to grade exam: " + err.message });
  }
});


// ----------------------------------------------------
// VITE OR STATIC FILE MIDDLEWARE MOUNTING
// ----------------------------------------------------
async function startServer() {
  // Initialize Database schemas and seed before booting server
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    // Mounting Vite in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serving built files in production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`New Horizons Server listening on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

// ----------------------------------------------------
// LOCAL FALLBACK DATA GENERATORS (IF GEMINI FAILS/NOT CONFIGURED)
// ----------------------------------------------------
function getMockCourseSyllabus(courseName: string, category: string) {
  return {
    description: `This course covers state-of-the-art topics in ${courseName}. Designed specifically for modern professionals seeking comprehensive expertise, it bridges foundational theory with intensive laboratory experiences.`,
    lessons: [
      {
        title: "Lesson 1: Foundations and Technical Overview",
        description: "Understanding core terminology, system installations, and foundational operations.",
        resources: [
          {
            name: "Slides: Introduction & Core Syntax",
            type: "slides",
            content: "Slide 1: Welcome to " + courseName + "\nSlide 2: Course Agenda and Outline\nSlide 3: Installation & Configuration\nSlide 4: Verification Labs & Basic Troubleshooting"
          },
          {
            name: "PDF: Study Guide - Architectural Mechanics",
            type: "pdf",
            content: "This study manual contains essential theoretical descriptions of the structural models within " + courseName + ". Instructors are expected to familiarize themselves with data routing structures, pipeline setups, and environment variables. Be sure to check PATH parameters before launching any VM in the laboratories."
          }
        ]
      },
      {
        title: "Lesson 2: Practical Implementation and Configuration",
        description: "Executing complex exercises, script modeling, and validating data integrity.",
        resources: [
          {
            name: "Video: Advanced Scripting & Debugging",
            type: "video",
            content: "Video Transcript Walkthrough: Today, we walk through configuring advanced routing parameters in " + courseName + ". We'll highlight common syntax issues, correct loop policies, and explore optimizing resource usage in heavy workloads."
          }
        ]
      },
      {
        title: "Lesson 3: Advanced Optimizations & Security Practices",
        description: "Reviewing best-in-class security controls, deployment automation, and final audits.",
        resources: [
          {
            name: "PDF: Advanced Security Hardening",
            type: "pdf",
            content: "Security is a critical constraint for " + courseName + " architectures. This document details access control list configurations, secure session variables, audit logs, and how to configure automatic vulnerability alerts."
          }
        ]
      }
    ]
  };
}

function getMockExam(courseName: string) {
  return {
    questions: [
      {
        id: "mock-q-1",
        questionText: `When preparing the laboratory machines for a course in "${courseName}", which pre-requisite configuration is most critical to avoid compilation failures?`,
        options: [
          "Updating the display settings to full HD resolution",
          "Ensuring the software's binary executables are correctly added to the system PATH variable",
          "Disabling all local firewalls and security rules completely",
          "Increasing the mouse double-click sensitivity speed"
        ],
        correctOptionIndex: 1,
        explanation: "Correctly setting the system PATH variable ensures that compile and run utilities can locate the underlying compilers, SDKs, or interpreters without throwing command-not-found errors."
      },
      {
        id: "mock-q-2",
        questionText: "Which of the following is considered the most effective pedagogical approach when a student struggles with a highly abstract concept?",
        options: [
          "Telling the student to read the manual overnight",
          "Moving onto the next chapter to keep up with the syllabus timeline",
          "Connecting the abstract topic to a concrete real-world analogy and running a quick hands-on demo",
          "Skipping the topic entirely as it is rarely tested in exams"
        ],
        correctOptionIndex: 2,
        explanation: "Pedagogical research shows that real-world analogies combined with instant visual demonstration are highly effective for learning abstract technical structures."
      },
      {
        id: "mock-q-3",
        questionText: `During a live laboratory session on "${courseName}", a student encounters an unexpected 'RAM allocation limit exceeded' error. What is your immediate diagnostic step?`,
        options: [
          "Re-install the operating system from scratch",
          "Check active processes, close redundant background applications, and check virtualization container memory limits",
          "Advise the student to buy a more powerful laptop",
          "Skip the practical exercise and do written theory instead"
        ],
        correctOptionIndex: 1,
        explanation: "Optimizing the current workspace memory by auditing active processes and checking container/virtualization configs is the fastest, standard troubleshooting path."
      },
      {
        id: "mock-q-4",
        questionText: "What is the recommended pass mark for New Horizons instructor competency examinations, and how many attempts are allowed?",
        options: [
          "50% pass mark, unlimited attempts",
          "60% pass mark, 3 attempts allowed",
          "70% pass mark, strictly 2 attempts allowed",
          "80% pass mark, 1 attempt allowed"
        ],
        correctOptionIndex: 2,
        explanation: "Per strict New Horizons training standards, instructors must achieve a score of 70% or higher, with a maximum of 2 attempts allowed."
      },
      {
        id: "mock-q-5",
        questionText: `To maintain high ratings in the Weekly Student Pulse Surveys, an instructor should prioritize which of the following?`,
        options: [
          "Sharing slides and lab guides late in the week to avoid spoiling the content",
          "Presenting slides in a monotonous lecture format to maintain serious decorum",
          "Ensuring materials are shared on time, adjusting delivery pace dynamically, and verifying lab tools are functional prior to class",
          "Allowing students to leave 2 hours early every day"
        ],
        correctOptionIndex: 2,
        explanation: "Survey analysis shows student satisfaction correlates highly with timely materials, active pacing adjustment, and thoroughly verified lab tools."
      }
    ]
  };
}

startServer();
