import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AuthService } from "./auth-service";
import { insertRosinPressSchema, insertCuringLogSchema, insertCuringReminderSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// Session configuration
const MemoryStoreSession = MemoryStore(session);

// In-memory storage for authentication settings
let authSettings = {
  password: process.env.AUTH_PASSWORD || null,
  twoFactorSecret: null as string | null,
  twoFactorEnabled: false,
};

// Check if authentication is enabled (environment-based)
const isAuthEnabled = () => {
  return process.env.AUTH_PASSWORD !== undefined && process.env.AUTH_PASSWORD.length > 0;
};

// Authentication middleware using AuthService
const requireAuth = async (req: any, res: any, next: any) => {
  console.log(`Auth check for ${req.method} ${req.path} - Auth enabled: ${isAuthEnabled()}`);
  
  if (!isAuthEnabled()) {
    console.log("Authentication disabled, proceeding");
    return next(); // Skip auth if not enabled
  }
  
  if (!req.session.userId) {
    console.log("Authentication required but no user session");
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await AuthService.findUserById(req.session.userId);
    if (!user) {
      console.log("User not found for session");
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if account is locked
    if (await AuthService.isAccountLocked(user)) {
      console.log("Account is locked");
      return res.status(423).json({ message: "Account is locked" });
    }

    console.log("Authentication successful");
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'rosin-tracker-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes using AuthService
  app.get("/api/auth/status", (req, res) => {
    res.json({ enabled: isAuthEnabled() });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (!isAuthEnabled()) {
      return res.json({ authenticated: true, user: { id: "default", email: "default@localhost" } });
    }
    
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await AuthService.findUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ 
        authenticated: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          twoFactorEnabled: user.twoFactorEnabled 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    if (!isAuthEnabled()) {
      return res.status(400).json({ message: "Authentication is not enabled" });
    }
    
    const { emailOrUsername, password, twoFactorCode } = req.body;
    
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "Email/username and password are required" });
    }
    
    try {
      const user = await AuthService.findUserByEmailOrUsername(emailOrUsername);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (await AuthService.isAccountLocked(user)) {
        return res.status(423).json({ message: "Account is locked due to too many failed attempts" });
      }
      
      const validPassword = await AuthService.verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        await AuthService.incrementFailedAttempts(user.id);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          return res.status(400).json({ message: "Two-factor authentication code is required" });
        }
        
        const valid2FA = await AuthService.verify2FA(user.id, twoFactorCode);
        if (!valid2FA) {
          return res.status(401).json({ message: "Invalid two-factor authentication code" });
        }
      }
      
      await AuthService.resetFailedAttempts(user.id);
      await AuthService.updateLastLogin(user.id);
      
      req.session.userId = user.id;
      req.session.authenticated = true;
      
      res.json({ success: true, requiresTwoFactor: false });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: any, res) => {
    if (req.session.userId) {
      try {
        await AuthService.deleteAllUserSessions(req.session.userId);
      } catch (error) {
        console.error("Failed to delete user sessions:", error);
      }
    }
    
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Settings routes for authentication management using AuthService
  app.get("/api/settings/security", async (req: any, res) => {
    try {
      let twoFactorEnabled = false;
      
      if (isAuthEnabled() && req.session.userId) {
        const user = await AuthService.findUserById(req.session.userId);
        twoFactorEnabled = user?.twoFactorEnabled || false;
      }
      
      res.json({
        authEnabled: isAuthEnabled(),
        twoFactorEnabled,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.post("/api/settings/auth", async (req: any, res) => {
    const { enableAuth, password, currentPassword, email, username } = req.body;

    try {
      if (enableAuth) {
        // Enable authentication with new admin user
        if (!password || password.length < 8) {
          return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }
        
        if (!email || !username) {
          return res.status(400).json({ message: "Email and username are required" });
        }
        
        // Check if users already exist
        const existingUser = await AuthService.findUserByEmailOrUsername(email);
        if (existingUser) {
          return res.status(400).json({ message: "User with this email or username already exists" });
        }
        
        // Create the admin user
        const user = await AuthService.createUser(email, username, password);
        authSettings.password = "enabled"; // Flag that auth is enabled
        
        res.json({ success: true, message: "Authentication enabled and admin user created" });
      } else {
        // Disable authentication
        if (!isAuthEnabled()) {
          return res.status(400).json({ message: "Authentication is already disabled" });
        }
        
        if (!req.session.userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        
        const user = await AuthService.findUserById(req.session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        
        if (!currentPassword || !await AuthService.verifyPassword(currentPassword, user.passwordHash)) {
          return res.status(401).json({ message: "Invalid current password" });
        }
        
        authSettings.password = null;
        
        // Clear all sessions
        req.session.destroy(() => {});
        
        res.json({ success: true, message: "Authentication disabled" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update authentication settings" });
    }
  });

  // 2FA Setup Route using AuthService
  app.post("/api/settings/2fa/setup", async (req: any, res) => {
    if (!isAuthEnabled()) {
      return res.status(400).json({ message: "Authentication must be enabled first" });
    }

    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { secret, qrCodeUrl } = await AuthService.setup2FA(req.session.userId);
      res.json({ secret, qrCodeUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Enable 2FA Route using AuthService
  app.post("/api/settings/2fa/enable", async (req: any, res) => {
    const { code } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!code) {
      return res.status(400).json({ message: "Verification code is required" });
    }

    try {
      const verified = await AuthService.verify2FASetup(req.session.userId, code);
      if (!verified) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      res.json({ success: true, message: "Two-factor authentication enabled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // Disable 2FA Route using AuthService
  app.post("/api/settings/2fa/disable", async (req: any, res) => {
    const { code } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!code) {
      return res.status(400).json({ message: "Verification code is required" });
    }

    try {
      const disabled = await AuthService.disable2FA(req.session.userId, code);
      if (!disabled) {
        return res.status(401).json({ message: "Invalid verification code or 2FA not enabled" });
      }

      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Health check endpoint (no auth required)
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      await storage.getStatistics();
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Apply authentication middleware to all API routes except auth and settings routes
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/settings") || req.path.startsWith("/api/health")) {
      return next(); // Skip auth for auth, settings, and health routes
    }
    return requireAuth(req, res, next);
  });

  // Rosin Press routes
  app.get("/api/rosin-presses", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const presses = await storage.getAllRosinPresses(limit, offset);
      res.json(presses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rosin presses" });
    }
  });

  app.get("/api/rosin-presses/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const presses = await storage.getRecentBatches(limit);
      res.json(presses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent batches" });
    }
  });

  app.get("/api/rosin-presses/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const presses = await storage.searchRosinPresses(query);
      res.json(presses);
    } catch (error) {
      res.status(500).json({ message: "Failed to search rosin presses" });
    }
  });

  app.post("/api/rosin-presses/filter", async (req, res) => {
    try {
      const filters = req.body;
      const presses = await storage.filterRosinPresses(filters);
      res.json(presses);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter rosin presses" });
    }
  });

  app.get("/api/rosin-presses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const press = await storage.getRosinPress(id);
      if (!press) {
        return res.status(404).json({ message: "Rosin press not found" });
      }
      res.json(press);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rosin press" });
    }
  });

  app.post("/api/rosin-presses", async (req, res) => {
    try {
      const validatedData = insertRosinPressSchema.parse(req.body);
      const press = await storage.createRosinPress(validatedData);
      res.status(201).json(press);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create rosin press" });
    }
  });

  app.put("/api/rosin-presses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRosinPressSchema.partial().parse(req.body);
      const press = await storage.updateRosinPress(id, validatedData);
      if (!press) {
        return res.status(404).json({ message: "Rosin press not found" });
      }
      res.json(press);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update rosin press" });
    }
  });

  app.delete("/api/rosin-presses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRosinPress(id);
      if (!deleted) {
        return res.status(404).json({ message: "Rosin press not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rosin press" });
    }
  });

  // Curing Log routes
  app.get("/api/curing-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const logs = await storage.getAllCuringLogs(limit, offset);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curing logs" });
    }
  });

  app.get("/api/curing-logs/batch/:batchId", async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const logs = await storage.getCuringLogsByBatch(batchId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curing logs for batch" });
    }
  });

  app.get("/api/curing-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const log = await storage.getCuringLog(id);
      if (!log) {
        return res.status(404).json({ message: "Curing log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curing log" });
    }
  });

  app.post("/api/curing-logs", async (req, res) => {
    try {
      const validatedData = insertCuringLogSchema.parse(req.body);
      const log = await storage.createCuringLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create curing log" });
    }
  });

  app.put("/api/curing-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCuringLogSchema.partial().parse(req.body);
      const log = await storage.updateCuringLog(id, validatedData);
      if (!log) {
        return res.status(404).json({ message: "Curing log not found" });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update curing log" });
    }
  });

  app.delete("/api/curing-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCuringLog(id);
      if (!deleted) {
        return res.status(404).json({ message: "Curing log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete curing log" });
    }
  });

  // Curing Reminder routes
  app.post("/api/curing-reminders", requireAuth, async (req, res) => {
    try {
      // Convert string dates to Date objects before validation
      const bodyWithDate = {
        ...req.body,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        recurringEndDate: req.body.recurringEndDate ? new Date(req.body.recurringEndDate) : undefined,
      };
      
      const validatedData = insertCuringReminderSchema.parse(bodyWithDate);
      const reminder = await storage.createCuringReminder(validatedData);
      res.status(201).json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create curing reminder" });
    }
  });

  app.get("/api/curing-reminders", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const reminders = await storage.getAllCuringReminders(limit, offset);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curing reminders" });
    }
  });

  app.get("/api/curing-reminders/active", requireAuth, async (req, res) => {
    try {
      const reminders = await storage.getActiveCuringReminders();
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active reminders" });
    }
  });

  app.get("/api/curing-reminders/overdue", requireAuth, async (req, res) => {
    try {
      const reminders = await storage.getOverdueReminders();
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue reminders" });
    }
  });

  app.get("/api/curing-reminders/batch/:batchId", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const reminders = await storage.getCuringRemindersByBatch(batchId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch reminders" });
    }
  });

  app.get("/api/curing-reminders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reminder = await storage.getCuringReminder(id);
      if (!reminder) {
        return res.status(404).json({ message: "Curing reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curing reminder" });
    }
  });

  app.patch("/api/curing-reminders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCuringReminderSchema.partial().parse(req.body);
      const reminder = await storage.updateCuringReminder(id, validatedData);
      if (!reminder) {
        return res.status(404).json({ message: "Curing reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update curing reminder" });
    }
  });

  app.post("/api/curing-reminders/:id/complete", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notes = req.body.notes as string | undefined;
      const reminder = await storage.completeCuringReminder(id, notes);
      if (!reminder) {
        return res.status(404).json({ message: "Curing reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete curing reminder" });
    }
  });

  app.delete("/api/curing-reminders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCuringReminder(id);
      if (!deleted) {
        return res.status(404).json({ message: "Curing reminder not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete curing reminder" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/statistics", async (req, res) => {
    try {
      console.log("Analytics/statistics called");
      const startMaterial = req.query.startMaterial as string;
      const stats = await storage.getStatistics(startMaterial);
      console.log("Statistics result:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Analytics statistics error:", error);
      res.status(500).json({ message: "Failed to fetch statistics", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/analytics/yield-trends", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startMaterial = req.query.startMaterial as string;
      const trends = await storage.getYieldTrends(days, startMaterial);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch yield trends" });
    }
  });

  app.get("/api/analytics/environment-trends", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startMaterial = req.query.startMaterial as string;
      const trends = await storage.getEnvironmentTrends(days, startMaterial);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch environment trends" });
    }
  });

  // Advanced Analytics routes
  app.get("/api/analytics/strain-analytics", async (req, res) => {
    try {
      const startMaterial = req.query.startMaterial as string;
      const analytics = await storage.getStrainAnalytics(startMaterial);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strain analytics" });
    }
  });

  app.get("/api/analytics/temperature-correlation", async (req, res) => {
    try {
      const startMaterial = req.query.startMaterial as string;
      const correlation = await storage.getTemperatureYieldCorrelation(startMaterial);
      res.json(correlation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch temperature correlation" });
    }
  });

  app.get("/api/analytics/duration-analytics", async (req, res) => {
    try {
      const analytics = await storage.getDurationAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch duration analytics" });
    }
  });

  app.get("/api/analytics/strain-performance-ranking", async (req, res) => {
    try {
      const startMaterial = req.query.startMaterial as string;
      const rankings = await storage.getStrainPerformanceRanking(startMaterial);
      res.json(rankings);
    } catch (error) {
      console.error("Strain performance ranking error:", error);
      res.status(500).json({ message: "Failed to fetch strain performance rankings" });
    }
  });

  app.post("/api/analytics/batch-comparison", async (req, res) => {
    try {
      const { batchIds } = req.body;
      if (!Array.isArray(batchIds) || batchIds.length === 0) {
        return res.status(400).json({ message: "Batch IDs array is required" });
      }
      const comparison = await storage.getBatchComparison(batchIds);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch comparison" });
    }
  });

  // Backup routes
  app.get("/api/backup/export", requireAuth, async (req, res) => {
    try {
      console.log("Backup export requested");
      
      // Fetch all data (unlimited)
      const [rosinPresses, curingLogs, curingReminders] = await Promise.all([
        storage.getAllRosinPresses(10000, 0), // Large limit to get all records
        storage.getAllCuringLogs(10000, 0),    // Large limit to get all records
        storage.getAllCuringReminders(10000, 0) // Large limit to get all records
      ]);

      // Create backup object with metadata
      const backup = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.1",
          application: "Rosin Tracker",
          recordCounts: {
            rosinPresses: rosinPresses.length,
            curingLogs: curingLogs.length,
            curingReminders: curingReminders.length
          }
        },
        data: {
          rosinPresses,
          curingLogs,
          curingReminders
        }
      };

      // Set headers for file download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `rosin-tracker-backup-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backup);
    } catch (error) {
      console.error("Backup export error:", error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.post("/api/backup/import", requireAuth, async (req, res) => {
    try {
      console.log("Backup import requested");
      
      const { backup, clearExisting } = req.body;
      
      // Validate backup structure
      if (!backup || !backup.metadata || !backup.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }
      
      if (backup.metadata.application !== "Rosin Tracker") {
        return res.status(400).json({ message: "Backup file is not from Rosin Tracker" });
      }
      
      const { rosinPresses = [], curingLogs = [], curingReminders = [] } = backup.data;
      
      // Clear existing data if requested
      if (clearExisting) {
        console.log("Clearing existing data before import");
        // Note: In production with a real database, you'd want to use transactions here
        // For now, we'll rely on the cascade delete from rosin_presses to curing_logs and curing_reminders
        const existingPresses = await storage.getAllRosinPresses(10000, 0);
        for (const press of existingPresses) {
          await storage.deleteRosinPress(press.id);
        }
      }
      
      // Import rosin presses first (since curing logs depend on them)
      const importedPresses = [];
      for (const press of rosinPresses) {
        try {
          // Remove the ID to let the database generate a new one
          const { id, ...pressData } = press;
          const imported = await storage.createRosinPress(pressData);
          importedPresses.push({ oldId: id, newId: imported.id });
        } catch (error) {
          console.error("Failed to import rosin press:", error);
        }
      }
      
      // Import curing logs and map batch IDs
      const importedLogs = [];
      for (const log of curingLogs) {
        try {
          // Remove the ID and map the batchId to the new ID
          const { id, batchId, ...logData } = log;
          const mappedPress = importedPresses.find(p => p.oldId === batchId);
          
          if (mappedPress) {
            // Convert date strings to Date objects for database insertion
            const processedLogData = {
              ...logData,
              batchId: mappedPress.newId,
              curingDate: logData.curingDate ? new Date(logData.curingDate) : undefined,
            };
            
            // Remove any undefined fields
            Object.keys(processedLogData).forEach(key => {
              if (processedLogData[key] === undefined) {
                delete processedLogData[key];
              }
            });
            
            const imported = await storage.createCuringLog(processedLogData);
            importedLogs.push(imported);
          }
        } catch (error) {
          console.error("Failed to import curing log:", error);
        }
      }
      
      // Import curing reminders and map batch IDs
      const importedReminders = [];
      for (const reminder of curingReminders) {
        try {
          // Remove the ID and map the batchId to the new ID
          const { id, batchId, ...reminderData } = reminder;
          const mappedPress = importedPresses.find(p => p.oldId === batchId);
          
          if (mappedPress) {
            // Convert date strings to Date objects for database insertion
            const processedData = {
              ...reminderData,
              batchId: mappedPress.newId,
              scheduledFor: new Date(reminderData.scheduledFor),
              completedAt: reminderData.completedAt ? new Date(reminderData.completedAt) : undefined,
              recurringEndDate: reminderData.recurringEndDate ? new Date(reminderData.recurringEndDate) : undefined,
            };
            
            // Remove any undefined fields before database insertion
            Object.keys(processedData).forEach(key => {
              if (processedData[key] === undefined) {
                delete processedData[key];
              }
            });
            
            console.log("Processed reminder data:", processedData);
            const imported = await storage.createCuringReminder(processedData);
            importedReminders.push(imported);
          }
        } catch (error) {
          console.error("Failed to import curing reminder:", error);
        }
      }
      
      res.json({
        message: "Backup imported successfully",
        imported: {
          rosinPresses: importedPresses.length,
          curingLogs: importedLogs.length,
          curingReminders: importedReminders.length
        },
        cleared: clearExisting
      });
    } catch (error) {
      console.error("Backup import error:", error);
      res.status(500).json({ message: "Failed to import backup" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
