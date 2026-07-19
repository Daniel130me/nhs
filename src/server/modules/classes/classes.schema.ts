import { z } from "zod";

export const classSchema = z.object({
  courseName: z.string().min(1, "Course syllabus is required"),
  instructorId: z.string().min(1, "Instructor ID is required"),
  instructorName: z.string().min(1, "Instructor name is required"),
  classroom: z.string().min(1, "Classroom/Lab ID is required"),
  totalDurationHours: z.number().min(1, "Total duration must be greater than zero"),
  scheduleType: z.enum(["Weekday", "Weekend", "Fast-track", "Online"]),
  timeSlot: z.enum(["Morning", "Afternoon"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  days: z.array(z.string()).optional().default([]),
  modules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    done: z.boolean()
  })).optional().default([]),
  status: z.enum(["Active", "Completed", "Paused"]).optional().default("Active")
});
