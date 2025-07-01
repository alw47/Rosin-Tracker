import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rosinPresses = pgTable("rosin_presses", {
  id: serial("id").primaryKey(),
  pressDate: timestamp("press_date").defaultNow().notNull(),
  strain: text("strain").array().notNull(), // Changed to support multiple strains
  startMaterial: text("start_material").notNull(),
  startAmount: real("start_amount").notNull(),
  yieldAmount: real("yield_amount").notNull(),
  yieldPercentage: real("yield_percentage").notNull(),
  temperature: real("temperature").default(180), // Optional with default
  pressure: real("pressure").default(1000), // Optional with default - stored in PSI
  pressSize: text("press_size").default("10"), // Optional with default
  micronBags: text("micron_bags"), // JSON string storing array of bag objects
  numberOfPresses: integer("number_of_presses").default(1), // Optional with default
  humidity: real("humidity").default(62), // Optional with default
  pressDuration: integer("press_duration").default(120), // Optional with default - in seconds
  preheatingTime: integer("preheating_time").default(300), // Optional with default - in seconds
  notes: text("notes"),
  pictures: text("pictures").array(),
});

export const curingLogs = pgTable("curing_logs", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => rosinPresses.id, { onDelete: "cascade" }),
  curingDate: timestamp("curing_date").defaultNow().notNull(),
  visualColor: text("visual_color").notNull(),
  aromaNotes: text("aroma_notes"),
  consistency: text("consistency").notNull(),
  curingNotes: text("curing_notes"),
  pictures: text("pictures").array(),
});

export const curingReminders = pgTable("curing_reminders", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => rosinPresses.id, { onDelete: "cascade" }),
  reminderName: text("reminder_name").notNull(),
  reminderType: text("reminder_type").notNull(), // 'agitation', 'temperature_check', 'moisture_check', 'harvest', 'custom'
  scheduledFor: timestamp("scheduled_for").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: integer("recurring_interval"), // in hours
  recurringEndDate: timestamp("recurring_end_date"),
  parentReminderId: integer("parent_reminder_id"), // for tracking recurring series
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rosinPressesRelations = relations(rosinPresses, ({ many }) => ({
  curingLogs: many(curingLogs),
  curingReminders: many(curingReminders),
}));

export const curingLogsRelations = relations(curingLogs, ({ one }) => ({
  batch: one(rosinPresses, {
    fields: [curingLogs.batchId],
    references: [rosinPresses.id],
  }),
}));

export const curingRemindersRelations = relations(curingReminders, ({ one }) => ({
  batch: one(rosinPresses, {
    fields: [curingReminders.batchId],
    references: [rosinPresses.id],
  }),
}));

// Micron bag type for validation
export const micronBagSchema = z.object({
  micron: z.number().min(1).max(500),
  size: z.string().min(1),
  layer: z.number().min(1),
});

export const insertRosinPressSchema = createInsertSchema(rosinPresses).omit({
  id: true,
  pressDate: true,
}).extend({
  strain: z.array(z.string().min(1)).min(1, "At least one strain is required"), // Multiple strains support
  micronBags: z.array(micronBagSchema).optional(),
  // Make optional fields truly optional with defaults - allow 0 as N/A indicator
  temperature: z.number().min(0).max(500).optional(),
  pressure: z.number().min(0).max(10000).optional(), // Allow 0 as N/A indicator
  pressSize: z.string().optional(),
  numberOfPresses: z.number().min(0).max(20).optional(), // Allow 0 as N/A indicator
  humidity: z.number().min(0).max(100).optional(),
  pressDuration: z.number().min(0).max(7200).optional(), // Allow 0 as N/A indicator - Max 2 hours
});

export const insertCuringLogSchema = createInsertSchema(curingLogs).omit({
  id: true,
  curingDate: true,
});

export const insertCuringReminderSchema = createInsertSchema(curingReminders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  parentReminderId: true,
}).extend({
  reminderType: z.enum(['agitation', 'temperature_check', 'moisture_check', 'harvest', 'custom']),
  recurringInterval: z.number().optional(),
  recurringEndDate: z.date().optional(),
});

export type InsertRosinPress = z.infer<typeof insertRosinPressSchema>;
export type RosinPress = typeof rosinPresses.$inferSelect;
export type InsertCuringLog = z.infer<typeof insertCuringLogSchema>;
export type CuringLog = typeof curingLogs.$inferSelect;
export type InsertCuringReminder = z.infer<typeof insertCuringReminderSchema>;
export type CuringReminder = typeof curingReminders.$inferSelect;

// Secure Authentication User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  
  // 2FA Support
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: text("backup_codes").array(), // Array of backup codes
  
  // Password Reset
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  
  // Security
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions table for secure session management
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(), // UUID
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  passwordHash: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginUserSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

export const registerUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const enable2FASchema = z.object({
  code: z.string().length(6, "2FA code must be 6 digits"),
});

export const verify2FASchema = z.object({
  code: z.string().length(6, "2FA code must be 6 digits"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
