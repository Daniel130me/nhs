import { z } from "zod";

export const createAssignmentSchema = z.object({
  classId: z.string().uuid("Class ID must be a valid UUID"),
  lessonId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required").max(255),
  instructions: z.string().min(1, "Instructions are required"),
  totalMarks: z.number().positive("Total marks must be positive"),
  dueAt: z.string().optional().nullable(),
  allowLateSubmission: z.boolean().optional().default(true),
  maxAttempts: z.number().int().positive("Max attempts must be at least 1").optional().default(1),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional().default("DRAFT"),
  resources: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).optional().default([])
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export const submitAssignmentSchema = z.object({
  textContent: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional().default("SUBMITTED"),
  fileIds: z.array(z.string().uuid()).optional().default([])
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0, "Score must be non-negative"),
  feedback: z.string().optional().nullable(),
  status: z.enum(["RETURNED", "GRADED"]).optional().default("GRADED")
});
