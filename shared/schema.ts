import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rosinPresses = pgTable("rosin_presses", {
  id: serial("id").primaryKey(),
  pressDate: timestamp("press_date").defaultNow().notNull(),
  strain: text("strain").notNull(),
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

// Remove old user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
