import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

app.use(express.json({ limit: "10mb" }));

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
