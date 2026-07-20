import { query } from "../config/database";
import { logger } from "../utils/logger";
import { DEFAULT_CONFIG, SEED_INSTRUCTORS, SEED_CLASSES, SEED_LOGS, SEED_SURVEYS } from "../../data/seedData";
import { Course } from "../../types";

interface Migration {
  id: string;
  queries: string[];
}

const MIGRATIONS: Migration[] = [
  {
    id: "001_create_system_config_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        centers JSONB NOT NULL,
        courses JSONB NOT NULL,
        time_slots JSONB NOT NULL
      );`
    ]
  },
  {
    id: "002_create_instructors_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS instructors (
        id VARCHAR(100) PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        gender TEXT,
        center TEXT,
        courses JSONB NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]
  },
  {
    id: "003_add_instructor_password_and_status",
    queries: [
      `ALTER TABLE instructors ADD COLUMN IF NOT EXISTS password TEXT;`,
      `UPDATE instructors SET password = 'password123' WHERE password IS NULL;`,
      `ALTER TABLE instructors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';`,
      `UPDATE instructors SET status = 'Active' WHERE status IS NULL;`
    ]
  },
  {
    id: "004_create_courses_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        lessons JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]
  },
  {
    id: "005_create_classes_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(100) PRIMARY KEY,
        course_name TEXT NOT NULL,
        instructor_id VARCHAR(100) NOT NULL,
        instructor_name TEXT NOT NULL,
        total_duration_hours INT NOT NULL,
        classroom TEXT,
        schedule_type TEXT NOT NULL,
        days JSONB NOT NULL,
        time_slot TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        modules JSONB NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]
  },
  {
    id: "006_create_weekly_logs_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS weekly_logs (
        id VARCHAR(100) PRIMARY KEY,
        class_id VARCHAR(100) NOT NULL,
        week_number INT NOT NULL,
        hours_logged INT NOT NULL,
        modules_covered_this_week JSONB NOT NULL,
        challenges TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        instructor_id VARCHAR(100) NOT NULL
      );`
    ]
  },
  {
    id: "007_create_student_surveys_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS student_surveys (
        id VARCHAR(100) PRIMARY KEY,
        week_ending TEXT NOT NULL,
        course_name TEXT NOT NULL,
        center TEXT NOT NULL,
        student_name TEXT,
        anonymous BOOLEAN NOT NULL,
        pace INT NOT NULL,
        clarity INT NOT NULL,
        keep_up INT NOT NULL,
        questions_answered TEXT NOT NULL,
        materials_clear INT NOT NULL,
        materials_on_time TEXT NOT NULL,
        exercises_matched TEXT NOT NULL,
        lab_sufficient INT,
        tools_worked TEXT NOT NULL,
        could_complete TEXT NOT NULL,
        had_issue TEXT NOT NULL,
        issue_categories JSONB NOT NULL,
        severity TEXT,
        issue_description TEXT,
        repeat_issue TEXT,
        overall_satisfaction INT NOT NULL,
        confidence INT NOT NULL,
        additional_comments TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]
  },
  {
    id: "008_create_exam_attempts_table",
    queries: [
      `CREATE TABLE IF NOT EXISTS exam_attempts (
        id VARCHAR(100) PRIMARY KEY,
        instructor_id VARCHAR(100) NOT NULL,
        course_name TEXT NOT NULL,
        trial_number INT NOT NULL,
        score INT NOT NULL,
        passed BOOLEAN NOT NULL,
        feedback TEXT NOT NULL,
        taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]
  },
  {
    id: "009_create_unified_users_and_sessions",
    queries: [
      `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
          CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
        END IF;
      END$$;`,
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL,
        status user_status NOT NULL DEFAULT 'PENDING',
        email_verified_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        password_changed_at TIMESTAMPTZ,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        gender TEXT,
        center TEXT,
        courses JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_password_migrated BOOLEAN NOT NULL DEFAULT FALSE
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email)) WHERE deleted_at IS NULL;`,
      `CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE);`,
      `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`,
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, gender, center, courses, is_password_migrated, created_at, updated_at)
       SELECT 
         gen_random_uuid(), 
         first_name, 
         last_name, 
         email, 
         password,
         CASE 
           WHEN LOWER(role) = 'admin' THEN 'ADMIN'::user_role
           WHEN LOWER(role) = 'super_admin' THEN 'SUPER_ADMIN'::user_role
           ELSE 'INSTRUCTOR'::user_role
         END,
         CASE 
           WHEN LOWER(status) = 'active' THEN 'ACTIVE'::user_status
           WHEN LOWER(status) = 'deactivated' THEN 'SUSPENDED'::user_status
           ELSE 'ACTIVE'::user_status
         END,
         gender,
         center,
         courses,
         FALSE,
         created_at,
         NOW()
       FROM instructors
       WHERE NOT EXISTS (
         SELECT 1 FROM users WHERE LOWER(users.email) = LOWER(instructors.email)
       );`
    ]
  }
];

export async function migrate(): Promise<void> {
  logger.info("[Migration] Checking / executing database migrations...");

  // 1. Ensure the schema_migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 2. Fetch applied migrations
  const appliedRows = await query<{ id: string }>("SELECT id FROM schema_migrations");
  const appliedIds = new Set(appliedRows.map((r) => r.id));

  // 3. Apply missing migrations sequentially
  for (const m of MIGRATIONS) {
    if (!appliedIds.has(m.id)) {
      logger.info(`[Migration] Applying migration: ${m.id}`);
      
      // Execute each query in this migration step
      for (const q of m.queries) {
        try {
          await query(q);
        } catch (err: any) {
          logger.error(`[Migration Error] Failed on query inside ${m.id}: "${q}"`, err);
          throw err;
        }
      }

      // Record migration success
      await query("INSERT INTO schema_migrations (id) VALUES ($1)", [m.id]);
      logger.info(`[Migration] Successfully applied migration: ${m.id}`);
    }
  }

  logger.info("[Migration] Database schema migrations completed successfully.");

  // 4. Run seeding checks inside the same flow
  await seedDatabase();
}

async function seedDatabase(): Promise<void> {
  logger.info("[Seed] Checking / executing database seeds...");

  // Seed System Config if missing
  const configs = await query("SELECT * FROM system_config WHERE key = 'default'");
  if (configs.length === 0) {
    logger.info("[Seed] Seeding system_config...");
    await query(
      `INSERT INTO system_config (key, centers, courses, time_slots) 
       VALUES ('default', $1, $2, $3)`,
      [
        JSON.stringify(DEFAULT_CONFIG.centers),
        JSON.stringify(DEFAULT_CONFIG.courses),
        JSON.stringify(DEFAULT_CONFIG.timeSlots)
      ]
    );
  }

  // Seed Instructors if missing
  const instCount = await query("SELECT COUNT(*) FROM instructors");
  if (parseInt(instCount[0].count) === 0) {
    logger.info("[Seed] Seeding instructors...");
    for (const inst of SEED_INSTRUCTORS) {
      await query(
        `INSERT INTO instructors (id, first_name, last_name, email, password, gender, center, courses, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          inst.id,
          inst.firstName,
          inst.lastName,
          inst.email,
          inst.password || 'password123',
          inst.gender,
          inst.center,
          JSON.stringify(inst.courses),
          inst.role,
          inst.createdAt
        ]
      );
    }
  }

  // Seed Classes if missing
  const classCount = await query("SELECT COUNT(*) FROM classes");
  if (parseInt(classCount[0].count) === 0) {
    logger.info("[Seed] Seeding classes...");
    for (const cls of SEED_CLASSES) {
      await query(
        `INSERT INTO classes (id, course_name, instructor_id, instructor_name, total_duration_hours, classroom, schedule_type, days, time_slot, start_date, end_date, modules, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          cls.id,
          cls.courseName,
          cls.instructorId,
          cls.instructorName,
          cls.totalDurationHours,
          cls.classroom,
          cls.scheduleType,
          JSON.stringify(cls.days),
          cls.timeSlot,
          cls.startDate,
          cls.endDate,
          JSON.stringify(cls.modules),
          cls.status,
          cls.createdAt
        ]
      );
    }
  }

  // Seed Logs if missing
  const logCount = await query("SELECT COUNT(*) FROM weekly_logs");
  if (parseInt(logCount[0].count) === 0) {
    logger.info("[Seed] Seeding weekly logs...");
    for (const log of SEED_LOGS) {
      await query(
        `INSERT INTO weekly_logs (id, class_id, week_number, hours_logged, modules_covered_this_week, challenges, submitted_at, instructor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          log.id,
          log.classId,
          log.weekNumber,
          log.hoursLogged,
          JSON.stringify(log.modulesCoveredThisWeek),
          log.challenges,
          log.submittedAt,
          log.instructorId
        ]
      );
    }
  }

  // Seed Surveys if missing
  const surveyCount = await query("SELECT COUNT(*) FROM student_surveys");
  if (parseInt(surveyCount[0].count) === 0) {
    logger.info("[Seed] Seeding student surveys...");
    for (const srv of SEED_SURVEYS) {
      await query(
        `INSERT INTO student_surveys (
          id, week_ending, course_name, center, student_name, anonymous, pace, clarity, keep_up,
          questions_answered, materials_clear, materials_on_time, exercises_matched, lab_sufficient,
          tools_worked, could_complete, had_issue, issue_categories, severity, issue_description,
          repeat_issue, overall_satisfaction, confidence, additional_comments, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [
          srv.id,
          srv.weekEnding,
          srv.courseName,
          srv.center,
          srv.studentName,
          srv.anonymous,
          srv.pace,
          srv.clarity,
          srv.keepUp,
          srv.questionsAnswered,
          srv.materialsClear,
          srv.materialsOnTime,
          srv.exercisesMatched,
          srv.labSufficient,
          srv.toolsWorked,
          srv.couldComplete,
          srv.hadIssue,
          JSON.stringify(srv.issueCategories),
          srv.severity,
          srv.issueDescription,
          srv.repeatIssue,
          srv.overallSatisfaction,
          srv.confidence,
          srv.additionalComments,
          srv.submittedAt
        ]
      );
    }
  }

  // Seed Courses if missing
  const courseCountDb = await query("SELECT COUNT(*) FROM courses");
  if (parseInt(courseCountDb[0].count) === 0) {
    logger.info("[Seed] Seeding rich courses list...");
    
    const initialRich: Course[] = [];
    DEFAULT_CONFIG.courses.forEach((cat) => {
      cat.items.forEach((itemName) => {
        initialRich.push({
          id: `course-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: itemName,
          category: cat.category,
          description: `Comprehensive operations and technical syllabus for New Horizons ${itemName} training curriculum.`,
          lessons: [
            {
              id: `lesson-1-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title: 'Lesson 1: Introduction and Core Fundamentals',
              description: 'Setting up the environment, exploring basic syntax, terminology, and foundational design parameters.',
              resources: [
                {
                  id: `res-1-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `Slides: ${itemName} Core Concepts`,
                  type: 'slides',
                  url: '#',
                  content: `Slide 1: Welcome to ${itemName} Training\nSlide 2: Core Learning Paths and Objectives\nSlide 3: Technical Architecture & Sandbox Setups\nSlide 4: Common Configuration Commands`
                },
                {
                  id: `res-2-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `PDF: Reference Study Manual`,
                  type: 'pdf',
                  url: '#',
                  content: `Official study reference manual for ${itemName} curriculum. Designed for training staff and system instructors. Understand structural patterns, compile dependencies, and environment pathways before executing sandbox laboratory exercises.`
                }
              ]
            },
            {
              id: `lesson-2-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title: 'Lesson 2: Practical Implementation and Troubleshooting Labs',
              description: 'Executing complex scenarios, diagnosing script/compilation errors, and verifying environment integrity.',
              resources: [
                {
                  id: `res-3-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  name: `Video: Lab Workspace Setup Tutorial`,
                  type: 'video',
                  url: '#',
                  content: `Walkthrough of the student laboratory manual for ${itemName}. Check core path allocations, adjust host server memory configurations, and preview typical log errors encountered by student cohorts.`
                }
              ]
            }
          ],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      });
    });

    for (const crs of initialRich) {
      await query(
        `INSERT INTO courses (id, name, category, description, lessons, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crs.id,
          crs.name,
          crs.category,
          crs.description,
          JSON.stringify(crs.lessons),
          crs.createdAt
        ]
      );
    }
  }

  logger.info("[Seed] Database seeding check completed successfully.");
}
