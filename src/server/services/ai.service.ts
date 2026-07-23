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
