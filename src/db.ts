import pg from "pg";
import { DEFAULT_CONFIG, SEED_INSTRUCTORS, SEED_CLASSES, SEED_LOGS, SEED_SURVEYS } from "./data/seedData";
import { Instructor, Class, WeeklyLog, StudentSurvey, Course, ExamAttempt, SystemConfig } from "./types";

const { Pool } = pg;

// Instantiate Postgres client pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set in environment. Database connection will fail.");
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon secure SSL connections
  }
});

// Helper to query Postgres with typed responses
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

// Ensure database tables exist and are seeded
export async function initDb() {
  console.log("[DB] Verifying Neon Postgres database initialization...");
  
  try {
    // 1. Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(50) PRIMARY KEY,
        centers JSONB NOT NULL,
        courses JSONB NOT NULL,
        time_slots JSONB NOT NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS instructors (
        id VARCHAR(100) PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        gender TEXT,
        center TEXT,
        courses JSONB NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        lessons JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS classes (
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
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS weekly_logs (
        id VARCHAR(100) PRIMARY KEY,
        class_id VARCHAR(100) NOT NULL,
        week_number INT NOT NULL,
        hours_logged INT NOT NULL,
        modules_covered_this_week JSONB NOT NULL,
        challenges TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        instructor_id VARCHAR(100) NOT NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS student_surveys (
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
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id VARCHAR(100) PRIMARY KEY,
        instructor_id VARCHAR(100) NOT NULL,
        course_name TEXT NOT NULL,
        trial_number INT NOT NULL,
        score INT NOT NULL,
        passed BOOLEAN NOT NULL,
        feedback TEXT NOT NULL,
        taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("[DB] Tables verified successfully. Running automatic migrations/seeding checks...");

    // 2. Seed System Config if missing
    const configs = await query("SELECT * FROM system_config WHERE key = 'default'");
    if (configs.length === 0) {
      console.log("[DB Seeding] Seeding system_config...");
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

    // 3. Seed Instructors if missing
    const instCount = await query("SELECT COUNT(*) FROM instructors");
    if (parseInt(instCount[0].count) === 0) {
      console.log("[DB Seeding] Seeding instructors...");
      for (const inst of SEED_INSTRUCTORS) {
        await query(
          `INSERT INTO instructors (id, first_name, last_name, email, gender, center, courses, role, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            inst.id,
            inst.firstName,
            inst.lastName,
            inst.email,
            inst.gender,
            inst.center,
            JSON.stringify(inst.courses),
            inst.role,
            inst.createdAt
          ]
        );
      }
    }

    // 4. Seed Classes if missing
    const classCount = await query("SELECT COUNT(*) FROM classes");
    if (parseInt(classCount[0].count) === 0) {
      console.log("[DB Seeding] Seeding classes...");
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

    // 5. Seed Logs if missing
    const logCount = await query("SELECT COUNT(*) FROM weekly_logs");
    if (parseInt(logCount[0].count) === 0) {
      console.log("[DB Seeding] Seeding weekly logs...");
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

    // 6. Seed Surveys if missing
    const surveyCount = await query("SELECT COUNT(*) FROM student_surveys");
    if (parseInt(surveyCount[0].count) === 0) {
      console.log("[DB Seeding] Seeding student surveys...");
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

    // 7. Seed Courses if missing
    const courseCountDb = await query("SELECT COUNT(*) FROM courses");
    if (parseInt(courseCountDb[0].count) === 0) {
      console.log("[DB Seeding] Seeding rich courses list...");
      
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

    console.log("[DB] Neon Postgres database tables successfully instantiated and populated.");
  } catch (error) {
    console.error("[DB Error] Database verification / seeding failed:", error);
  }
}
