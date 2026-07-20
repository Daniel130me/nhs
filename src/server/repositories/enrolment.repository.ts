import { query } from "../config/database";
import { BadRequestError } from "../utils/errors";

export interface DBEnrolment {
  id: string;
  classId: string;
  studentId: string;
  status: string;
  enrolledBy?: string | null;
  enrolledAt: string;
  completedAt?: string | null;
  className?: string;
  studentName?: string;
  studentEmail?: string;
}

export class EnrolmentRepository {
  static async getAll(): Promise<DBEnrolment[]> {
    const rows = await query<any>(
      `SELECT e.id, e.class_id as "classId", e.student_id as "studentId", 
              e.status, e.enrolled_by as "enrolledBy", e.enrolled_at as "enrolledAt", 
              e.completed_at as "completedAt",
              c.name as "className",
              CONCAT(u.first_name, ' ', u.last_name) as "studentName",
              u.email as "studentEmail"
       FROM enrolments e
       JOIN classes c ON e.class_id = c.id
       JOIN users u ON e.student_id = u.id
       ORDER BY e.enrolled_at DESC`
    );
    return rows;
  }

  static async getByClassId(classId: string): Promise<DBEnrolment[]> {
    const rows = await query<any>(
      `SELECT e.id, e.class_id as "classId", e.student_id as "studentId", 
              e.status, e.enrolled_by as "enrolledBy", e.enrolled_at as "enrolledAt", 
              e.completed_at as "completedAt",
              CONCAT(u.first_name, ' ', u.last_name) as "studentName",
              u.email as "studentEmail"
       FROM enrolments e
       JOIN users u ON e.student_id = u.id
       WHERE e.class_id = $1
       ORDER BY e.enrolled_at DESC`,
      [classId]
    );
    return rows;
  }

  static async enrol(
    classId: string,
    studentId: string,
    enrolledBy: string
  ): Promise<DBEnrolment> {
    // 1. Check for duplicates (duplicate class enrolments are rejected)
    const existing = await query<any>(
      "SELECT id FROM enrolments WHERE class_id = $1 AND student_id = $2",
      [classId, studentId]
    );
    if (existing.length > 0) {
      throw new BadRequestError("Student is already enrolled in this class cohort");
    }

    // 2. Perform the enrollment
    const rows = await query<any>(
      `INSERT INTO enrolments (class_id, student_id, status, enrolled_by)
       VALUES ($1, $2, 'ACTIVE', $3)
       RETURNING id, class_id as "classId", student_id as "studentId", 
                 status, enrolled_by as "enrolledBy", enrolled_at as "enrolledAt", 
                 completed_at as "completedAt"`,
      [classId, studentId, enrolledBy]
    );

    return rows[0];
  }

  static async updateStatus(id: string, status: string): Promise<boolean> {
    const completedAt = status === "COMPLETED" ? new Date().toISOString() : null;
    
    await query(
      `UPDATE enrolments 
       SET status = $1, completed_at = COALESCE($2, completed_at), enrolled_at = enrolled_at
       WHERE id = $3`,
      [status, completedAt, id]
    );
    return true;
  }

  static async remove(id: string): Promise<boolean> {
    await query("DELETE FROM enrolments WHERE id = $1", [id]);
    return true;
  }
}
