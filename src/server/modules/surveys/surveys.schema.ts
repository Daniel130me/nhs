import { z } from "zod";

export const surveySchema = z.object({
  weekEnding: z.string().optional().nullable(),
  courseName: z.string().min(1, "Course name is required"),
  center: z.string().min(1, "Center is required"),
  studentName: z.string().optional().nullable(),
  anonymous: z.boolean().optional().default(false),
  pace: z.number().optional().default(3),
  clarity: z.number().optional().default(3),
  keepUp: z.number().optional().default(3),
  questionsAnswered: z.string().optional().nullable(),
  materialsClear: z.number().optional().default(3),
  materialsOnTime: z.string().optional().nullable(),
  exercisesMatched: z.string().optional().nullable(),
  labSufficient: z.number().nullable().optional(),
  toolsWorked: z.string().optional().nullable(),
  couldComplete: z.string().optional().nullable(),
  hadIssue: z.enum(["Yes", "No"]).optional().default("No"),
  issueCategories: z.array(z.string()).optional().default([]),
  severity: z.string().optional().nullable(),
  issueDescription: z.string().optional().nullable(),
  repeatIssue: z.string().optional().nullable(),
  overallSatisfaction: z.number().optional().default(3),
  confidence: z.number().optional().default(3),
  additionalComments: z.string().optional().nullable()
});
