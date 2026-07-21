import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./config/database";
import { requestIdMiddleware } from "./middleware/request-id";
import { notFoundMiddleware } from "./middleware/not-found";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { query } from "./config/database";
import { sendSuccess, sendError } from "./utils/api-response";

// Import modular routers
import authRouter from "./modules/auth/auth.routes";
import instructorsRouter from "./modules/instructors/instructors.routes";
import classesRouter from "./modules/classes/classes.routes";
import weeklyLogsRouter from "./modules/weekly-logs/weekly-logs.routes";
import surveysRouter from "./modules/surveys/surveys.routes";
import coursesRouter from "./modules/courses/courses.routes";
import configRouter from "./modules/config/config.routes";
import assessmentsRouter from "./modules/assessments/assessments.routes";
import filesRouter from "./modules/files/files.routes";
import adminRouter from "./modules/admin/admin.routes";
import feedbackSupportRouter from "./modules/feedback-support/feedback-support.routes";
import reportsRouter from "./modules/admin/reports.routes";
import certificatesRouter from "./modules/certificates/certificates.routes";

const app = express();

// Set trust proxy (behind Cloud Run/reverse proxies)
app.set("trust proxy", 1);

// 1. Security & Body parsing
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false, // Permit loading in AI Studio preview iframe
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith("http://localhost:") || 
        origin.startsWith("https://localhost:") ||
        origin.includes("run.app") ||
        origin.includes("google.com")) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());
app.use(requestIdMiddleware);

// Initialize session store
const PgSessionStore = connectPgSimple(session);
const sessionStore = new PgSessionStore({
  pool: pool,
  tableName: "session",
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "nhs-super-secret-key-123456",
  resave: false,
  saveUninitialized: false,
  name: "nhs_sid",
  cookie: {
    httpOnly: true,
    secure: true, // true since AI Studio runs fully on HTTPS
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  }
}));

import { bearerTokenMiddleware } from "./middleware/auth";
app.use(bearerTokenMiddleware);

// 2. Serve static upload assets locally if required
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// 3. Health check endpoints
app.get("/api/health", (req, res) => {
  return sendSuccess(res, { status: "UP", timestamp: new Date().toISOString() }, "Health check passed");
});

app.get("/api/ready", async (req, res) => {
  try {
    // Run a fast ping query on Neon PostgreSQL to check connectivity
    await query("SELECT 1");
    return sendSuccess(res, { status: "READY", database: "connected" }, "Database connectivity verified");
  } catch (err: any) {
    return sendError(res, "Database connection failed", "DATABASE_UNREACHABLE", 503);
  }
});

// 4. Mount API Routes
app.use("/api/v1/admin/reports", reportsRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/instructors", instructorsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/logs", weeklyLogsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/config", configRouter);
app.use("/api", feedbackSupportRouter);

// Routes nested at top-level /api (like /api/exam-attempts, /api/gemini/*, /api/upload)
app.use("/api", assessmentsRouter);
app.use("/api", filesRouter);

// 5. Unmatched Routes (NOT FOUND)
app.use(notFoundMiddleware);

// 6. Central Error Handler (MUST BE LAST)
app.use(errorHandlerMiddleware);

export { app };
