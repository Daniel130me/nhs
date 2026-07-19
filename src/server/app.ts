import express from "express";
import path from "path";
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

const app = express();

// 1. Basic configuration and request tracking
app.use(express.json({ limit: "25mb" }));
app.use(requestIdMiddleware);

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
app.use("/api/auth", authRouter);
app.use("/api/instructors", instructorsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/logs", weeklyLogsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/config", configRouter);

// Routes nested at top-level /api (like /api/exam-attempts, /api/gemini/*, /api/upload)
app.use("/api", assessmentsRouter);
app.use("/api", filesRouter);

// 5. Unmatched Routes (NOT FOUND)
app.use(notFoundMiddleware);

// 6. Central Error Handler (MUST BE LAST)
app.use(errorHandlerMiddleware);

export { app };
