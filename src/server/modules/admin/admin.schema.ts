import { z } from "zod";

export const createStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email format").max(255),
  studentNumber: z.string().optional(),
  phone: z.string().optional().nullable(),
  centerId: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
});

export const importStudentsSchema = z.object({
  students: z.array(
    z.object({
      firstName: z.string().min(1, "First name is required").max(100),
      lastName: z.string().min(1, "Last name is required").max(100),
      email: z.string().email("Invalid email format").max(255),
      studentNumber: z.string().optional(),
      phone: z.string().optional().nullable(),
      centerId: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
    })
  ).min(1, "At least one student is required for import"),
});

export const enrolmentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID format"),
});
