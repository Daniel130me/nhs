import { query } from "../config/database";
import { BadRequestError, NotFoundError } from "../utils/errors";

export interface DBClass {
  id: string;
  courseVersionId: string;
  centreId?: string | null;
  code: string;
  name: string;
  deliveryMode: string;
  capacity?: number | null;
  startDate: string;
  endDate: string;
  timezone: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  courseName?: string;
  instructorId?: string;
  instructorName?: string;
}

export class ClassRepository {
  static async getAll(): Promise<DBClass[]> {
    // Left joins to get the Course Name (via course_version -> course) and Primary Instructor
    const rows = await query<any>(
      `SELECT c.id, c.course_version_id as "courseVersionId", c.centre_id as "centreId", 
              c.code, c.name, c.delivery_mode as "deliveryMode", c.capacity, 
              c.start_date::text as "startDate", c.end_date::text as "endDate", 
              c.timezone, c.status, c.created_by as "createdBy", 
              c.created_at as "createdAt", c.updated_at as "updatedAt",
              co.title as "courseName",
              u.id as "instructorId",
              CONCAT(u.first_name, ' ', u.last_name) as "instructorName"
       FROM classes c
       JOIN course_versions cv ON c.course_version_id = cv.id
       JOIN courses co ON cv.course_id = co.id
       LEFT JOIN class_instructors ci ON c.id = ci.class_id AND ci.role = 'PRIMARY'
       LEFT JOIN users u ON ci.instructor_id = u.id
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async getById(id: string): Promise<DBClass | null> {
    const rows = await query<any>(
      `SELECT c.id, c.course_version_id as "courseVersionId", c.centre_id as "centreId", 
              c.code, c.name, c.delivery_mode as "deliveryMode", c.capacity, 
              c.start_date::text as "startDate", c.end_date::text as "endDate", 
              c.timezone, c.status, c.created_by as "createdBy", 
              c.created_at as "createdAt", c.updated_at as "updatedAt",
              co.title as "courseName",
              u.id as "instructorId",
              CONCAT(u.first_name, ' ', u.last_name) as "instructorName"
       FROM classes c
       JOIN course_versions cv ON c.course_version_id = cv.id
       JOIN courses co ON cv.course_id = co.id
       LEFT JOIN class_instructors ci ON c.id = ci.class_id AND ci.role = 'PRIMARY'
       LEFT JOIN users u ON ci.instructor_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async create(cls: Omit<DBClass, "id" | "createdAt" | "updatedAt">): Promise<DBClass> {
    // 1. Validation: End Date cannot precede Start Date
    if (new Date(cls.endDate) < new Date(cls.startDate)) {
      throw new BadRequestError("Class end date cannot precede start date");
    }

    // 2. Validation: Capacity must be > 0 if specified
    if (cls.capacity !== undefined && cls.capacity !== null && cls.capacity <= 0) {
      throw new BadRequestError("Class capacity must be a positive integer greater than zero");
    }

    // 3. Validation: Verify that the Course Version actually exists
    const cv = await query<any>("SELECT id FROM course_versions WHERE id = $1", [cls.courseVersionId]);
    if (cv.length === 0) {
      throw new NotFoundError(`Course version with ID ${cls.courseVersionId} not found`);
    }

    // Insert class
    const rows = await query<any>(
      `INSERT INTO classes (course_version_id, centre_id, code, name, delivery_mode, capacity, start_date, end_date, timezone, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, course_version_id as "courseVersionId", centre_id as "centreId", 
                 code, name, delivery_mode as "deliveryMode", capacity, 
                 start_date::text as "startDate", end_date::text as "endDate", 
                 timezone, status, created_by as "createdBy", 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        cls.courseVersionId,
        cls.centreId || null,
        cls.code,
        cls.name,
        cls.deliveryMode,
        cls.capacity || null,
        cls.startDate,
        cls.endDate,
        cls.timezone || "Africa/Lagos",
        cls.status || "DRAFT",
        cls.createdBy,
      ]
    );

    const newClass = rows[0];

    // If an instructor is specified, assign them
    if (cls.instructorId) {
      await query(
        `INSERT INTO class_instructors (class_id, instructor_id, role, assigned_by)
         VALUES ($1, $2, 'PRIMARY', $3)
         ON CONFLICT (class_id, instructor_id) DO UPDATE SET role = 'PRIMARY'`,
        [newClass.id, cls.instructorId, cls.createdBy]
      );
      newClass.instructorId = cls.instructorId;
      newClass.instructorName = cls.instructorName;
    }

    return newClass;
  }

  static async update(
    id: string,
    updates: Partial<Omit<DBClass, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> {
    // 1. Fetch existing record to check validation
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError(`Class with ID ${id} not found`);
    }

    const start = updates.startDate || existing.startDate;
    const end = updates.endDate || existing.endDate;
    if (new Date(end) < new Date(start)) {
      throw new BadRequestError("Class end date cannot precede start date");
    }

    if (updates.capacity !== undefined && updates.capacity !== null && updates.capacity <= 0) {
      throw new BadRequestError("Class capacity must be a positive integer greater than zero");
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.courseVersionId !== undefined) {
      // Verify course version
      const cv = await query<any>("SELECT id FROM course_versions WHERE id = $1", [updates.courseVersionId]);
      if (cv.length === 0) {
        throw new NotFoundError(`Course version with ID ${updates.courseVersionId} not found`);
      }
      fields.push(`course_version_id = $${paramIndex++}`);
      values.push(updates.courseVersionId);
    }
    if (updates.centreId !== undefined) {
      fields.push(`centre_id = $${paramIndex++}`);
      values.push(updates.centreId);
    }
    if (updates.code !== undefined) {
      fields.push(`code = $${paramIndex++}`);
      values.push(updates.code);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.deliveryMode !== undefined) {
      fields.push(`delivery_mode = $${paramIndex++}`);
      values.push(updates.deliveryMode);
    }
    if (updates.capacity !== undefined) {
      fields.push(`capacity = $${paramIndex++}`);
      values.push(updates.capacity);
    }
    if (updates.startDate !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(updates.endDate);
    }
    if (updates.timezone !== undefined) {
      fields.push(`timezone = $${paramIndex++}`);
      values.push(updates.timezone);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(id);
      await query(
        `UPDATE classes SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Update instructor assignment if provided
    if (updates.instructorId) {
      // Delete existing primary assignment
      await query(
        `DELETE FROM class_instructors WHERE class_id = $1 AND role = 'PRIMARY'`,
        [id]
      );
      // Insert new primary assignment
      await query(
        `INSERT INTO class_instructors (class_id, instructor_id, role, assigned_by)
         VALUES ($1, $2, 'PRIMARY', $3)
         ON CONFLICT (class_id, instructor_id) DO UPDATE SET role = 'PRIMARY'`,
        [id, updates.instructorId, updates.createdBy || existing.createdBy]
      );
    }

    return true;
  }

  static async delete(id: string): Promise<boolean> {
    await query("DELETE FROM classes WHERE id = $1", [id]);
    return true;
  }
}
