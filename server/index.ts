import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeAutomationSettings, sendDailyTaskReminders, checkExpiringDocuments, checkAndSendMissingPODReminders } from "./automation";
import { checkAndSendMaintenanceReminders } from "./notifications";
import { storage } from "./storage";
import { startGmailPoller } from "./gmailPoller";
import { startPaperworkPoller } from "./paperworkPoller";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize automation settings
  await initializeAutomationSettings();

  // Start Gmail poller (no-op if Gmail is not connected)
  startGmailPoller();

  // Start paperwork poller (checks Gmail for POD/BOL every 5 min)
  startPaperworkPoller();

  // Schedule daily checks — runs at 8 AM every day
  let lastDailyCheckDate = "";
  setInterval(async () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hour = now.getHours();
    if (hour >= 8 && lastDailyCheckDate !== dateStr) {
      lastDailyCheckDate = dateStr;
      // Task reminders
      await sendDailyTaskReminders();
      // CDL & medical card expiry — SMS + in-app notification
      await checkExpiringDocuments();
      // Maintenance due/overdue — SMS + email
      await checkAndSendMaintenanceReminders(
        () => storage.getAllMaintenance(),
        () => storage.getAllTrucks(),
        () => storage.getAllDrivers()
      );
      // Missing POD — SMS to assigned driver
      await checkAndSendMissingPODReminders();
    }
  }, 60 * 60 * 1000); // check every hour
  
  const server = await registerRoutes(app);

  // Mobile driver app preview — served at /m, /m/*
  // This is the exact same bundle that ships in the native iOS/Android app,
  // just running in a mobile browser. Lets the carrier preview the driver
  // experience before paying for app store accounts. Static assets live in
  // dist-mobile/, committed at build time.
  const mobileDist = path.resolve(import.meta.dirname, "..", "dist-mobile");
  if (fs.existsSync(mobileDist)) {
    app.use("/m", express.static(mobileDist));
    app.get(/^\/m(\/.*)?$/, (_req, res) => {
      res.sendFile(path.join(mobileDist, "index.html"));
    });
  } else {
    app.get("/m", (_req, res) => {
      res.status(503).send("Mobile preview not built. Run: npm run mobile:build");
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
