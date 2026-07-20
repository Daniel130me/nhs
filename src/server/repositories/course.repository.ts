import { query } from "../config/database";

export interface DBReviewCourse {
  id: string;
  code: string;
  title: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  thumbnailFileId?: string | null;
  status: string;
  createdBy: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: CourseVersion[];
}

export interface CourseVersion {
  id: string;
  courseId: string;
  versionNumber: number;
  title: string;
  description?: string | null;
  status: string;
  createdBy: string;
  publishedAt?: string | null;
  createdAt: string;
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  courseVersionId: string;
  title: string;
  description?: string | null;
  position: number;
  estimatedMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  content?: string | null;
  lessonType: string;
  position: number;
  estimatedMinutes?: number | null;
  isPreview: boolean;
  isRequired: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class CourseRepository {
  static async getAll(): Promise<DBReviewCourse[]> {
    const courses = await query<any>(
      `SELECT id, code, title, short_description as "shortDescription", 
              full_description as "fullDescription", thumbnail_file_id as "thumbnailFileId", 
              status, created_by as "createdBy", published_at as "publishedAt", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM courses 
       WHERE deleted_at IS NULL 
       ORDER BY created_at DESC`
    );

    // Fetch versions for each course
    for (const crs of courses) {
      crs.versions = await query<any>(
        `SELECT id, course_id as "courseId", version_number as "versionNumber", 
                title, description, status, created_by as "createdBy", 
                published_at as "publishedAt", created_at as "createdAt"
         FROM course_versions 
         WHERE course_id = $1 
         ORDER BY version_number DESC`,
        [crs.id]
      );
    }

    return courses;
  }

  static async getById(id: string): Promise<DBReviewCourse | null> {
    const courses = await query<any>(
      `SELECT id, code, title, short_description as "shortDescription", 
              full_description as "fullDescription", thumbnail_file_id as "thumbnailFileId", 
              status, created_by as "createdBy", published_at as "publishedAt", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM courses 
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (courses.length === 0) return null;
    const crs = courses[0];

    // Fetch versions
    const versions = await query<any>(
      `SELECT id, course_id as "courseId", version_number as "versionNumber", 
              title, description, status, created_by as "createdBy", 
              published_at as "publishedAt", created_at as "createdAt"
       FROM course_versions 
       WHERE course_id = $1 
       ORDER BY version_number DESC`,
      [crs.id]
    );

    // For each version, fetch modules and lessons
    for (const ver of versions) {
      const modules = await query<any>(
        `SELECT id, course_version_id as "courseVersionId", title, description, 
                position, estimated_minutes as "estimatedMinutes", 
                created_at as "createdAt", updated_at as "updatedAt"
         FROM course_modules 
         WHERE course_version_id = $1 
         ORDER BY position ASC`,
        [ver.id]
      );

      for (const mod of modules) {
        mod.lessons = await query<any>(
          `SELECT id, module_id as "moduleId", title, description, content, 
                  lesson_type as "lessonType", position, estimated_minutes as "estimatedMinutes", 
                  is_preview as "isPreview", is_required as "isRequired", status, 
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM lessons 
           WHERE module_id = $1 
           ORDER BY position ASC`,
          [mod.id]
        );
      }
      ver.modules = modules;
    }

    crs.versions = versions;
    return crs;
  }

  static async create(
    crs: Omit<DBReviewCourse, "id" | "createdAt" | "updatedAt" | "versions">,
    modules?: { title: string; description?: string; position: number; lessons?: Omit<Lesson, "id" | "moduleId" | "createdAt" | "updatedAt">[] }[]
  ): Promise<DBReviewCourse> {
    const courseRes = await query<any>(
      `INSERT INTO courses (code, title, short_description, full_description, thumbnail_file_id, status, created_by, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, title, short_description as "shortDescription", 
                 full_description as "fullDescription", thumbnail_file_id as "thumbnailFileId", 
                 status, created_by as "createdBy", published_at as "publishedAt", 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        crs.code,
        crs.title,
        crs.shortDescription || null,
        crs.fullDescription || null,
        crs.thumbnailFileId || null,
        crs.status || "DRAFT",
        crs.createdBy,
        crs.status === "PUBLISHED" ? new Date().toISOString() : null,
      ]
    );

    const course = courseRes[0];

    // Create default Course Version 1
    const versionRes = await query<any>(
      `INSERT INTO course_versions (course_id, version_number, title, description, status, created_by, published_at)
       VALUES ($1, 1, $2, $3, $4, $5, $6)
       RETURNING id, course_id as "courseId", version_number as "versionNumber", 
                 title, description, status, created_by as "createdBy", 
                 published_at as "publishedAt", created_at as "createdAt"`,
      [
        course.id,
        `${course.title} - Version 1`,
        course.shortDescription || "Initial version",
        course.status || "DRAFT",
        course.createdBy,
        course.status === "PUBLISHED" ? new Date().toISOString() : null,
      ]
    );

    const version = versionRes[0];

    // Create modules and lessons if provided
    if (modules && modules.length > 0) {
      version.modules = [];
      for (const m of modules) {
        const moduleRes = await query<any>(
          `INSERT INTO course_modules (course_version_id, title, description, position, estimated_minutes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, course_version_id as "courseVersionId", title, description, 
                     position, estimated_minutes as "estimatedMinutes", 
                     created_at as "createdAt", updated_at as "updatedAt"`,
          [version.id, m.title, m.description || null, m.position, 60]
        );
        const mod = moduleRes[0];
        mod.lessons = [];

        if (m.lessons && m.lessons.length > 0) {
          for (const les of m.lessons) {
            const lessonRes = await query<any>(
              `INSERT INTO lessons (module_id, title, description, content, lesson_type, position, estimated_minutes, is_preview, is_required, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id, module_id as "moduleId", title, description, content, 
                         lesson_type as "lessonType", position, estimated_minutes as "estimatedMinutes", 
                         is_preview as "isPreview", is_required as "isRequired", status, 
                         created_at as "createdAt", updated_at as "updatedAt"`,
              [
                mod.id,
                les.title,
                les.description || null,
                les.content || null,
                les.lessonType || "TEXT",
                les.position,
                les.estimatedMinutes || 45,
                les.isPreview !== undefined ? les.isPreview : false,
                les.isRequired !== undefined ? les.isRequired : true,
                les.status || "DRAFT",
              ]
            );
            mod.lessons.push(lessonRes[0]);
          }
        }
        version.modules.push(mod);
      }
    }

    course.versions = [version];
    return course;
  }

  static async update(
    id: string,
    updates: Partial<Omit<DBReviewCourse, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.code !== undefined) {
      fields.push(`code = $${paramIndex++}`);
      values.push(updates.code);
    }
    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.shortDescription !== undefined) {
      fields.push(`short_description = $${paramIndex++}`);
      values.push(updates.shortDescription);
    }
    if (updates.fullDescription !== undefined) {
      fields.push(`full_description = $${paramIndex++}`);
      values.push(updates.fullDescription);
    }
    if (updates.thumbnailFileId !== undefined) {
      fields.push(`thumbnail_file_id = $${paramIndex++}`);
      values.push(updates.thumbnailFileId);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) return false;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE courses SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
    return true;
  }

  static async delete(id: string): Promise<boolean> {
    await query(
      `UPDATE courses SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return true;
  }
}
