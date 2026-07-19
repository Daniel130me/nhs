import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const apiKey = env.GEMINI_API_KEY;

// Lazy initialization of Google GenAI SDK
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY_IF_NOT_SET",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export const aiService = {
  /**
   * Authors a syllabus outline for a given course using Gemini
   */
  async authorCourse(courseName: string, category: string): Promise<any> {
    if (!apiKey || apiKey === "MOCK_KEY_IF_NOT_SET") {
      logger.warn("GEMINI_API_KEY is not configured, returning mock authoring content");
      return getMockCourseSyllabus(courseName, category);
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
                description: "A detailed description of the course and its instructor goals.",
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

      return JSON.parse(text.trim());
    } catch (err: any) {
      logger.error("Gemini course authoring failed, running local fallback:", err);
      return getMockCourseSyllabus(courseName, category);
    }
  },

  /**
   * Generates a 10-question MCQ exam based on a course outline using Gemini
   */
  async generateExam(courseName: string, lessons: any[]): Promise<any> {
    if (!apiKey || apiKey === "MOCK_KEY_IF_NOT_SET") {
      logger.warn("GEMINI_API_KEY is not configured, returning mock exam questions");
      return getMockExam(courseName);
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

      return JSON.parse(text.trim());
    } catch (err: any) {
      logger.error("Gemini exam generation failed, running local fallback:", err);
      return getMockExam(courseName);
    }
  },

  /**
   * Generates feedback on a graded exam based on the results
   */
  async generateFeedback(courseName: string, scorePct: number, correctCount: number, totalQuestions: number, results: any[]): Promise<string> {
    if (!apiKey || apiKey === "MOCK_KEY_IF_NOT_SET") {
      return "";
    }

    try {
      const feedbackPrompt = `An instructor took a competence evaluation for the course "${courseName}" and scored ${scorePct}% (${correctCount}/${totalQuestions}). 
Here are the grading results: ${JSON.stringify(results)}.
Write a supportive, highly constructive, and short paragraph (3-4 sentences max) of mentoring feedback. Highlight specific key areas they should focus on or praise their achievement.`;
      
      const feedbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: feedbackPrompt
      });
      return feedbackResponse.text ? feedbackResponse.text.trim() : "";
    } catch (e) {
      logger.warn("Failed to generate custom AI feedback, fallback to algorithmic response:", e);
      return "";
    }
  }
};

// --- FALLBACK MOCK DATA GENERATORS ---

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
