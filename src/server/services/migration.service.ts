import { query } from "../config/database";
import { logger } from "../utils/logger";

interface MigrationReport {
  centresMigrated: number;
  instructorProfilesCreated: number;
  studentProfilesCreated: number;
  coursesMigrated: number;
  courseVersionsCreated: number;
  courseModulesCreated: number;
  classesMigrated: number;
  classInstructorsAssigned: number;
  errors: string[];
}

export async function runDataMigration(): Promise<MigrationReport> {
  logger.info("[DataMigration] Starting academic model data normalization...");
  const report: MigrationReport = {
    centresMigrated: 0,
    instructorProfilesCreated: 0,
    studentProfilesCreated: 0,
    coursesMigrated: 0,
    courseVersionsCreated: 0,
    courseModulesCreated: 0,
    classesMigrated: 0,
    classInstructorsAssigned: 0,
    errors: [],
  };

  try {
    // 1. Get an administrator user to be the owner/creator of migrated records
    const admins = await query<any>(
      "SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND deleted_at IS NULL LIMIT 1"
    );
    if (admins.length === 0) {
      throw new Error("No administrator user found in users table. Please ensure an Admin user exists before running academic model data migration.");
    }
    const adminUserId = admins[0].id;
    logger.info(`[DataMigration] Using Administrator UUID ${adminUserId} for academic record creation ownership.`);

    // 2. Migrate Centres
    // Standard centers list from default config
    const standardCenters = [
      { name: 'Ikeja', code: 'IKJ' },
      { name: 'Akoka', code: 'AKK' },
      { name: 'Ajah', code: 'AJH' },
      { name: 'Lekki', code: 'LKI' },
      { name: 'Festac', code: 'FTC' },
      { name: 'Surulere', code: 'SRL' },
      { name: 'Egbeda', code: 'EGB' },
      { name: 'Ikorodu', code: 'IKR' },
      { name: 'Abeokuta', code: 'ABK' },
      { name: 'Akure 1', code: 'AK1' },
      { name: 'Akure 2', code: 'AK2' },
      { name: 'Ado-Ekiti', code: 'ADE' },
      { name: 'Akute', code: 'AKT' }
    ];

    // Read any centers used by instructors or users
    const userCenters = await query<{ center: string }>(
      "SELECT DISTINCT center FROM users WHERE center IS NOT NULL AND center <> ''"
    );
    
    const allCenterNames = new Set(standardCenters.map(c => c.name));
    userCenters.forEach(u => allCenterNames.add(u.center));

    const finalCenters = Array.from(allCenterNames).map(name => {
      const found = standardCenters.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
      // Generate code for custom center
      const cleanName = name.replace(/[^a-zA-Z]/g, '');
      const code = cleanName.substring(0, 3).toUpperCase() || "CTR";
      return { name, code };
    });

    // Insert centers
    for (const c of finalCenters) {
      const existing = await query<any>("SELECT id FROM centres WHERE name = $1 OR code = $2", [c.name, c.code]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO centres (name, code, address, city, state, country, timezone, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [c.name, c.code, `${c.name} Center Campus`, c.name, "Lagos State", "Nigeria", "Africa/Lagos", "ACTIVE"]
        );
        report.centresMigrated++;
      }
    }

    // Load centers in-memory map (Name -> UUID)
    const centersList = await query<{ id: string; name: string }>("SELECT id, name FROM centres");
    const centerMap = new Map<string, string>();
    centersList.forEach(c => centerMap.set(c.name.toLowerCase(), c.id));

    // 3. Migrate Instructor Profiles
    const instructors = await query<any>(
      "SELECT id, center, gender FROM users WHERE role IN ('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN') AND deleted_at IS NULL"
    );
    for (const inst of instructors) {
      const profileExists = await query<any>("SELECT user_id FROM instructor_profiles WHERE user_id = $1", [inst.id]);
      if (profileExists.length === 0) {
        const centreId = inst.center ? centerMap.get(inst.center.toLowerCase()) || null : null;
        await query(
          `INSERT INTO instructor_profiles (user_id, centre_id, phone, bio, qualification, approved_by, approved_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [inst.id, centreId, null, `Certified educator at New Horizons`, "Professional IT Certification", adminUserId]
        );
        report.instructorProfilesCreated++;
      }
    }

    // 4. Migrate Student Profiles
    const students = await query<any>(
      "SELECT id, center, gender FROM users WHERE role = 'STUDENT' AND deleted_at IS NULL"
    );
    for (const stu of students) {
      const profileExists = await query<any>("SELECT user_id FROM student_profiles WHERE user_id = $1", [stu.id]);
      if (profileExists.length === 0) {
        const centreId = stu.center ? centerMap.get(stu.center.toLowerCase()) || null : null;
        const studentNumber = `NH-STU-${Math.floor(100000 + Math.random() * 900000)}`;
        await query(
          `INSERT INTO student_profiles (user_id, student_number, centre_id, phone, admission_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
          [stu.id, studentNumber, centreId, null]
        );
        report.studentProfilesCreated++;
      }
    }

    // 5. Migrate Courses from courses_old
    const oldCoursesTableExists = await query<any>(
      "SELECT 1 FROM pg_tables WHERE tablename = 'courses_old'"
    );

    if (oldCoursesTableExists.length > 0) {
      const oldCourses = await query<any>("SELECT * FROM courses_old");
      for (const oldC of oldCourses) {
        const mapping = await query<any>(
          "SELECT new_id FROM migration_id_mappings WHERE entity_type = 'course' AND old_id = $1",
          [oldC.id]
        );

        let courseUuid: string;
        let versionUuid: string;

        if (mapping.length === 0) {
          // Generate new UUIDs
          const courseRes = await query<{ id: string }>(
            `INSERT INTO courses (code, title, short_description, full_description, status, created_by, published_at)
             VALUES ($1, $2, $3, $4, 'PUBLISHED', $5, NOW())
             RETURNING id`,
            [
              oldC.id.substring(0, 100),
              oldC.name,
              oldC.description || `Syllabus for ${oldC.name}`,
              oldC.description || `Syllabus for ${oldC.name}`,
              adminUserId
            ]
          );
          courseUuid = courseRes[0].id;
          report.coursesMigrated++;

          // Create Course Version
          const versionRes = await query<{ id: string }>(
            `INSERT INTO course_versions (course_id, version_number, title, description, status, created_by, published_at)
             VALUES ($1, 1, $2, $3, 'PUBLISHED', $4, NOW())
             RETURNING id`,
            [courseUuid, `${oldC.name} - Version 1`, oldC.description || `Syllabus Version 1`, adminUserId]
          );
          versionUuid = versionRes[0].id;
          report.courseVersionsCreated++;

          // Save Mappings
          await query(
            "INSERT INTO migration_id_mappings (entity_type, old_id, new_id) VALUES ('course', $1, $2)",
            [oldC.id, courseUuid]
          );
          await query(
            "INSERT INTO migration_id_mappings (entity_type, old_id, new_id) VALUES ('course_version', $1, $2)",
            [oldC.id, versionUuid]
          );

          // Migrate JSONB Lessons to course_modules and lessons tables
          const lessonsJson = typeof oldC.lessons === 'string' ? JSON.parse(oldC.lessons) : oldC.lessons;
          if (Array.isArray(lessonsJson)) {
            // Create a general module
            const moduleRes = await query<{ id: string }>(
              `INSERT INTO course_modules (course_version_id, title, description, position, estimated_minutes)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [versionUuid, "Main Curriculum Module", "Core lesson plans and curriculum roadmap", 1, 120]
            );
            const moduleId = moduleRes[0].id;
            report.courseModulesCreated++;

            let lessonPos = 1;
            for (const les of lessonsJson) {
              await query(
                `INSERT INTO lessons (module_id, title, description, content, lesson_type, position, estimated_minutes, is_preview, is_required, status)
                 VALUES ($1, $2, $3, $4, 'TEXT', $5, $6, FALSE, TRUE, 'PUBLISHED')`,
                [
                  moduleId,
                  les.title || `Lesson ${lessonPos}`,
                  les.description || "",
                  JSON.stringify(les.resources || []),
                  lessonPos++,
                  45
                ]
              );
            }
          }
        }
      }
    }

    // 6. Migrate Classes from classes_old
    const oldClassesTableExists = await query<any>(
      "SELECT 1 FROM pg_tables WHERE tablename = 'classes_old'"
    );

    if (oldClassesTableExists.length > 0) {
      const oldClasses = await query<any>("SELECT * FROM classes_old");
      for (const oldCl of oldClasses) {
        const mapping = await query<any>(
          "SELECT new_id FROM migration_id_mappings WHERE entity_type = 'class' AND old_id = $1",
          [oldCl.id]
        );

        if (mapping.length === 0) {
          // Resolve course version
          // Let's check if we have a mapped course or course_version by matching oldCourse.id
          // We can guess course_old id by using lower-case clean form of oldCl.course_name
          const courseOldIdGuess = `course-${oldCl.course_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          let versionUuid = "";

          const cvMapping = await query<any>(
            "SELECT new_id FROM migration_id_mappings WHERE entity_type = 'course_version' AND old_id = $1",
            [courseOldIdGuess]
          );

          if (cvMapping.length > 0) {
            versionUuid = cvMapping[0].new_id;
          } else {
            // If no existing course version, let's create a Course and Course Version for this class!
            const courseRes = await query<{ id: string }>(
              `INSERT INTO courses (code, title, short_description, full_description, status, created_by, published_at)
               VALUES ($1, $2, $3, $4, 'PUBLISHED', $5, NOW())
               RETURNING id`,
              [
                courseOldIdGuess.substring(0, 100),
                oldCl.course_name,
                `Migrated syllabus for ${oldCl.course_name}`,
                `Migrated syllabus for ${oldCl.course_name}`,
                adminUserId
              ]
            );
            const courseUuid = courseRes[0].id;
            report.coursesMigrated++;

            const versionRes = await query<{ id: string }>(
              `INSERT INTO course_versions (course_id, version_number, title, description, status, created_by, published_at)
               VALUES ($1, 1, $2, $3, 'PUBLISHED', $4, NOW())
               RETURNING id`,
              [courseUuid, `${oldCl.course_name} - Version 1`, `Migrated syllabus version 1`, adminUserId]
            );
            versionUuid = versionRes[0].id;
            report.courseVersionsCreated++;

            await query(
              "INSERT INTO migration_id_mappings (entity_type, old_id, new_id) VALUES ('course', $1, $2)",
              [courseOldIdGuess, courseUuid]
            );
            await query(
              "INSERT INTO migration_id_mappings (entity_type, old_id, new_id) VALUES ('course_version', $1, $2)",
              [courseOldIdGuess, versionUuid]
            );
          }

          // Convert class JSONB modules into course_modules for this version!
          const classModulesJson = typeof oldCl.modules === 'string' ? JSON.parse(oldCl.modules) : oldCl.modules;
          if (Array.isArray(classModulesJson)) {
            let pos = 1;
            for (const mod of classModulesJson) {
              const modName = mod.name || mod.title || `Module ${pos}`;
              const modExists = await query<any>(
                "SELECT id FROM course_modules WHERE course_version_id = $1 AND title = $2",
                [versionUuid, modName]
              );
              if (modExists.length === 0) {
                await query(
                  `INSERT INTO course_modules (course_version_id, title, description, position, estimated_minutes)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [versionUuid, modName, `Syllabus unit: ${modName}`, pos, 120]
                );
                report.courseModulesCreated++;
              }
              pos++;
            }
          }

          // Resolve Center ID
          // Find instructor user center or first center
          let resolvedCentreId: string | null = null;
          const instUser = await query<any>("SELECT center FROM users WHERE id::text = $1 OR email = $1", [oldCl.instructor_id]);
          if (instUser.length > 0 && instUser[0].center) {
            resolvedCentreId = centerMap.get(instUser[0].center.toLowerCase()) || null;
          }
          if (!resolvedCentreId) {
            // Get first center
            const firstCenter = await query<any>("SELECT id FROM centres LIMIT 1");
            if (firstCenter.length > 0) {
              resolvedCentreId = firstCenter[0].id;
            }
          }

          // Parse start and end dates
          const startDate = oldCl.start_date || new Date().toISOString().split('T')[0];
          const endDate = oldCl.end_date || new Date().toISOString().split('T')[0];

          // Map Class Status
          let finalStatus = 'ACTIVE';
          if (oldCl.status) {
            const upStatus = oldCl.status.toUpperCase();
            if (['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(upStatus)) {
              finalStatus = upStatus;
            }
          }

          // Create normalized Class record
          const classRes = await query<{ id: string }>(
            `INSERT INTO classes (course_version_id, centre_id, code, name, delivery_mode, capacity, start_date, end_date, timezone, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
              versionUuid,
              resolvedCentreId,
              oldCl.id.substring(0, 100), // Use old id as unique code
              oldCl.course_name,
              oldCl.schedule_type || 'Weekday',
              50,
              startDate,
              endDate,
              'Africa/Lagos',
              finalStatus,
              adminUserId
            ]
          );
          const classUuid = classRes[0].id;
          report.classesMigrated++;

          // Save ID Mapping
          await query(
            "INSERT INTO migration_id_mappings (entity_type, old_id, new_id) VALUES ('class', $1, $2)",
            [oldCl.id, classUuid]
          );

          // Create class-instructor relationship
          let instructorUuid: string | null = null;
          // Look up corresponding user UUID
          const resolvedUser = await query<any>(
            "SELECT id FROM users WHERE id::text = $1 OR email = $1",
            [oldCl.instructor_id]
          );
          if (resolvedUser.length > 0) {
            instructorUuid = resolvedUser[0].id;
          } else {
            // Fallback to first instructor or admin
            const firstInst = await query<any>("SELECT id FROM users WHERE role = 'INSTRUCTOR' LIMIT 1");
            if (firstInst.length > 0) {
              instructorUuid = firstInst[0].id;
            } else {
              instructorUuid = adminUserId;
            }
          }

          await query(
            `INSERT INTO class_instructors (class_id, instructor_id, role, assigned_by)
             VALUES ($1, $2, 'PRIMARY', $3)`,
            [classUuid, instructorUuid, adminUserId]
          );
          report.classInstructorsAssigned++;
        }
      }
    }

    logger.info("[DataMigration] Normalized academic data migration completed successfully!", report);
  } catch (err: any) {
    logger.error("[DataMigration] Error running data normalization migration", err);
    report.errors.push(err.message || String(err));
  }

  return report;
}
