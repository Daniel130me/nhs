import { z } from "zod";

export const weeklyLogSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  weekNumber: z.number().min(1, "Week number is required"),
  hoursLogged: z.number().min(1, "Hours logged must be greater than 0"),
  modulesCoveredThisWeek: z.array(z.string()).optional().default([]),
  challenges: z.string().optional().default(""),
  instructorId: z.string().min(1, "Instructor ID is required"),
});
