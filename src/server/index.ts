import { app } from "./app";
import { env } from "./config/env";
import { migrate } from "./db/migrate";
import { logger } from "./utils/logger";
import { pool } from "./config/database";
import path from "path";
import express from "express";

async function start() {
  try {
    logger.info("Starting New Horizons System backend server...");

    // 1. Run migrations and database seeding checks
    await migrate();

    // 2. Setup SPA dev / production server integrations on app
    if (env.NODE_ENV !== "production") {
      logger.info("Configuring development Vite asset middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      logger.info("Serving compiled production assets from /dist...");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // 3. Listen on Host & Port
    const server = app.listen(env.PORT, "0.0.0.0", () => {
      logger.info(`Server successfully started on http://0.0.0.0:${env.PORT} [ENV: ${env.NODE_ENV}]`);
    });

    // 4. Graceful Shutdown Management
    const shutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info("Express server closed.");
        try {
          await pool.end();
          logger.info("Database pool closed. Shutdown complete.");
          process.exit(0);
        } catch (dbErr) {
          logger.error("Failed to cleanly end database pool:", dbErr);
          process.exit(1);
        }
      });

      // Force close if graceful shutdown hangs
      setTimeout(() => {
        logger.error("Graceful shutdown timed out. Forcing termination.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    logger.error("Server startup fatal failure:", error);
    process.exit(1);
  }
}

start();
