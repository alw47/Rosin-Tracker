import { rosinPresses, curingLogs, curingReminders, type RosinPress, type InsertRosinPress, type CuringLog, type InsertCuringLog, type CuringReminder, type InsertCuringReminder } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, ilike, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Rosin Press operations
  createRosinPress(press: InsertRosinPress): Promise<RosinPress>;
  getRosinPress(id: number): Promise<RosinPress | undefined>;
  getAllRosinPresses(limit?: number, offset?: number): Promise<RosinPress[]>;
  updateRosinPress(id: number, press: Partial<InsertRosinPress>): Promise<RosinPress | undefined>;
  deleteRosinPress(id: number): Promise<boolean>;
  
  // Curing Log operations
  createCuringLog(log: InsertCuringLog): Promise<CuringLog>;
  getCuringLog(id: number): Promise<CuringLog | undefined>;
  getCuringLogsByBatch(batchId: number): Promise<CuringLog[]>;
  getAllCuringLogs(limit?: number, offset?: number): Promise<CuringLog[]>;
  updateCuringLog(id: number, log: Partial<InsertCuringLog>): Promise<CuringLog | undefined>;
  deleteCuringLog(id: number): Promise<boolean>;
  
  // Curing Reminder operations
  createCuringReminder(reminder: InsertCuringReminder): Promise<CuringReminder>;
  getCuringReminder(id: number): Promise<CuringReminder | undefined>;
  getCuringRemindersByBatch(batchId: number): Promise<CuringReminder[]>;
  getAllCuringReminders(limit?: number, offset?: number): Promise<CuringReminder[]>;
  getActiveCuringReminders(): Promise<CuringReminder[]>;
  getOverdueReminders(): Promise<CuringReminder[]>;
  updateCuringReminder(id: number, reminder: Partial<InsertCuringReminder>): Promise<CuringReminder | undefined>;
  completeCuringReminder(id: number, notes?: string): Promise<CuringReminder | undefined>;
  deleteCuringReminder(id: number): Promise<boolean>;
  
  // Analytics operations
  getRecentBatches(limit?: number): Promise<RosinPress[]>;
  getYieldTrends(days?: number, startMaterial?: string): Promise<any[]>;
  getEnvironmentTrends(days?: number, startMaterial?: string): Promise<any[]>;
  getStatistics(startMaterial?: string): Promise<{
    totalBatches: number;
    avgYield: number;
    activeCuring: number;
    totalYield: number;
  }>;
  
  // Search and filter operations
  searchRosinPresses(query: string): Promise<RosinPress[]>;
  filterRosinPresses(filters: {
    strain?: string;
    startDate?: Date;
    endDate?: Date;
    minYield?: number;
    maxYield?: number;
    pressSize?: string;
  }): Promise<RosinPress[]>;
  
  // Advanced Analytics operations
  getStrainAnalytics(startMaterial?: string): Promise<{
    strain: string;
    totalBatches: number;
    avgYield: number;
    bestYield: number;
    avgTemperature: number;
    avgPressure: number;
    totalOutput: number;
  }[]>;
  getTemperatureYieldCorrelation(startMaterial?: string): Promise<{
    temperature: number;
    avgYield: number;
    batchCount: number;
  }[]>;
  getBatchComparison(batchIds: number[]): Promise<RosinPress[]>;
  getDurationAnalytics(): Promise<{
    avgDuration: number;
    avgPreheatingTime: number;
    durationVsYield: { duration: number; yield: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async createRosinPress(press: InsertRosinPress): Promise<RosinPress> {
    const { micronBags, ...restPress } = press;
    const processedPress = {
      ...restPress,
      micronBags: micronBags ? JSON.stringify(micronBags) : null,
    };
    const [rosinPress] = await db
      .insert(rosinPresses)
      .values(processedPress)
      .returning();
    return {
      ...rosinPress,
      micronBags: rosinPress.micronBags ? JSON.parse(rosinPress.micronBags) : null,
    } as RosinPress;
  }

  async getRosinPress(id: number): Promise<RosinPress | undefined> {
    const [rosinPress] = await db.select().from(rosinPresses).where(eq(rosinPresses.id, id));
    if (!rosinPress) return undefined;
    return {
      ...rosinPress,
      micronBags: rosinPress.micronBags ? JSON.parse(rosinPress.micronBags) : null,
    } as RosinPress;
  }

  async getAllRosinPresses(limit = 50, offset = 0): Promise<RosinPress[]> {
    const results = await db
      .select()
      .from(rosinPresses)
      .orderBy(desc(rosinPresses.pressDate))
      .limit(limit)
      .offset(offset);
    
    return results.map(press => ({
      ...press,
      micronBags: press.micronBags ? JSON.parse(press.micronBags) : null,
    })) as RosinPress[];
  }

  async updateRosinPress(id: number, press: Partial<InsertRosinPress>): Promise<RosinPress | undefined> {
    const { micronBags, ...restPress } = press;
    const processedPress = {
      ...restPress,
      ...(micronBags !== undefined && { micronBags: micronBags ? JSON.stringify(micronBags) : null }),
    };
    const [updated] = await db
      .update(rosinPresses)
      .set(processedPress)
      .where(eq(rosinPresses.id, id))
      .returning();
    return updated ? {
      ...updated,
      micronBags: updated.micronBags ? JSON.parse(updated.micronBags) : null,
    } as RosinPress : undefined;
  }

  async deleteRosinPress(id: number): Promise<boolean> {
    const result = await db.delete(rosinPresses).where(eq(rosinPresses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createCuringLog(log: InsertCuringLog): Promise<CuringLog> {
    const [curingLog] = await db
      .insert(curingLogs)
      .values(log)
      .returning();
    return curingLog;
  }

  async getCuringLog(id: number): Promise<CuringLog | undefined> {
    const [curingLog] = await db.select().from(curingLogs).where(eq(curingLogs.id, id));
    return curingLog || undefined;
  }

  async getCuringLogsByBatch(batchId: number): Promise<CuringLog[]> {
    return await db
      .select()
      .from(curingLogs)
      .where(eq(curingLogs.batchId, batchId))
      .orderBy(desc(curingLogs.curingDate));
  }

  async getAllCuringLogs(limit = 50, offset = 0): Promise<CuringLog[]> {
    return await db
      .select()
      .from(curingLogs)
      .orderBy(desc(curingLogs.curingDate))
      .limit(limit)
      .offset(offset);
  }

  async updateCuringLog(id: number, log: Partial<InsertCuringLog>): Promise<CuringLog | undefined> {
    const [updated] = await db
      .update(curingLogs)
      .set(log)
      .where(eq(curingLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCuringLog(id: number): Promise<boolean> {
    const result = await db.delete(curingLogs).where(eq(curingLogs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getRecentBatches(limit = 10): Promise<RosinPress[]> {
    const results = await db
      .select()
      .from(rosinPresses)
      .orderBy(desc(rosinPresses.pressDate))
      .limit(limit);
    
    return results.map(press => ({
      ...press,
      micronBags: press.micronBags ? JSON.parse(press.micronBags) : null,
    })) as RosinPress[];
  }

  async getYieldTrends(days = 30, startMaterial?: string): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const conditions = [gte(rosinPresses.pressDate, startDate)];
    
    if (startMaterial && startMaterial !== "all") {
      conditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }

    return await db
      .select({
        date: sql<string>`DATE(${rosinPresses.pressDate})`,
        avgYield: sql<number>`AVG(${rosinPresses.yieldPercentage})`,
        totalBatches: sql<number>`COUNT(*)`,
      })
      .from(rosinPresses)
      .where(and(...conditions))
      .groupBy(sql`DATE(${rosinPresses.pressDate})`)
      .orderBy(sql`DATE(${rosinPresses.pressDate})`);
  }

  async getEnvironmentTrends(days = 30, startMaterial?: string): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const conditions = [gte(rosinPresses.pressDate, startDate)];
    
    if (startMaterial && startMaterial !== "all") {
      conditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }
    
    return await db
      .select({
        date: sql<string>`DATE(${rosinPresses.pressDate})`,
        avgTemperature: sql<number>`AVG(${rosinPresses.temperature})`,
        avgHumidity: sql<number>`AVG(${rosinPresses.humidity})`,
      })
      .from(rosinPresses)
      .where(and(...conditions))
      .groupBy(sql`DATE(${rosinPresses.pressDate})`)
      .orderBy(sql`DATE(${rosinPresses.pressDate})`);
  }

  async getStatistics(startMaterial?: string): Promise<{
    totalBatches: number;
    avgYield: number;
    activeCuring: number;
    totalYield: number;
  }> {
    const statsConditions = [];
    if (startMaterial && startMaterial !== "all") {
      statsConditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }

    const [stats] = await db
      .select({
        totalBatches: sql<number>`COUNT(*)`,
        avgYield: sql<number>`AVG(${rosinPresses.yieldPercentage})`,
        totalYield: sql<number>`SUM(${rosinPresses.yieldAmount})`,
      })
      .from(rosinPresses)
      .where(statsConditions.length > 0 ? and(...statsConditions) : undefined);

    let curingStats;
    if (startMaterial && startMaterial !== "all") {
      [curingStats] = await db
        .select({
          activeCuring: sql<number>`COUNT(DISTINCT ${curingLogs.batchId})`,
        })
        .from(curingLogs)
        .innerJoin(rosinPresses, eq(curingLogs.batchId, rosinPresses.id))
        .where(eq(rosinPresses.startMaterial, startMaterial));
    } else {
      [curingStats] = await db
        .select({
          activeCuring: sql<number>`COUNT(DISTINCT ${curingLogs.batchId})`,
        })
        .from(curingLogs);
    }

    return {
      totalBatches: Number(stats.totalBatches) || 0,
      avgYield: Number(stats.avgYield) || 0,
      activeCuring: Number(curingStats.activeCuring) || 0,
      totalYield: Number(stats.totalYield) || 0,
    };
  }

  async searchRosinPresses(query: string): Promise<RosinPress[]> {
    return await db
      .select()
      .from(rosinPresses)
      .where(ilike(rosinPresses.strain, `%${query}%`))
      .orderBy(desc(rosinPresses.pressDate));
  }

  async filterRosinPresses(filters: {
    strain?: string;
    startDate?: Date;
    endDate?: Date;
    minYield?: number;
    maxYield?: number;
    pressSize?: string;
  }): Promise<RosinPress[]> {
    let query = db.select().from(rosinPresses);
    const conditions = [];

    if (filters.strain) {
      conditions.push(ilike(rosinPresses.strain, `%${filters.strain}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(rosinPresses.pressDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(rosinPresses.pressDate, filters.endDate));
    }
    if (filters.minYield) {
      conditions.push(gte(rosinPresses.yieldPercentage, filters.minYield));
    }
    if (filters.maxYield) {
      conditions.push(lte(rosinPresses.yieldPercentage, filters.maxYield));
    }
    if (filters.pressSize) {
      conditions.push(eq(rosinPresses.pressSize, filters.pressSize));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(rosinPresses.pressDate));
  }

  // Advanced Analytics implementations
  async getStrainAnalytics(startMaterial?: string): Promise<{
    strain: string;
    totalBatches: number;
    avgYield: number;
    bestYield: number;
    avgTemperature: number;
    avgPressure: number;
    totalOutput: number;
  }[]> {
    const conditions = [];
    if (startMaterial && startMaterial !== "all") {
      conditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }

    const results = await db
      .select({
        strain: rosinPresses.strain,
        totalBatches: sql<number>`count(*)`,
        avgYield: sql<number>`avg(${rosinPresses.yieldPercentage})`,
        bestYield: sql<number>`max(${rosinPresses.yieldPercentage})`,
        avgTemperature: sql<number>`avg(${rosinPresses.temperature})`,
        avgPressure: sql<number>`avg(${rosinPresses.pressure})`,
        totalOutput: sql<number>`sum(${rosinPresses.yieldAmount})`,
      })
      .from(rosinPresses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(rosinPresses.strain)
      .orderBy(desc(sql`avg(${rosinPresses.yieldPercentage})`));

    return results.map(result => ({
      strain: result.strain,
      totalBatches: Number(result.totalBatches),
      avgYield: Number(result.avgYield) || 0,
      bestYield: Number(result.bestYield) || 0,
      avgTemperature: Number(result.avgTemperature) || 0,
      avgPressure: Number(result.avgPressure) || 0,
      totalOutput: Number(result.totalOutput) || 0,
    }));
  }

  async getTemperatureYieldCorrelation(startMaterial?: string): Promise<{
    temperature: number;
    avgYield: number;
    batchCount: number;
  }[]> {
    const conditions = [isNotNull(rosinPresses.temperature)];
    if (startMaterial && startMaterial !== "all") {
      conditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }

    const results = await db
      .select({
        temperature: sql<number>`round(${rosinPresses.temperature} / 5) * 5`,
        avgYield: sql<number>`avg(${rosinPresses.yieldPercentage})`,
        batchCount: sql<number>`count(*)`,
      })
      .from(rosinPresses)
      .where(and(...conditions))
      .groupBy(sql`round(${rosinPresses.temperature} / 5) * 5`)
      .orderBy(sql`round(${rosinPresses.temperature} / 5) * 5`);

    return results.map(result => ({
      temperature: Number(result.temperature),
      avgYield: Number(result.avgYield) || 0,
      batchCount: Number(result.batchCount),
    }));
  }

  async getBatchComparison(batchIds: number[]): Promise<RosinPress[]> {
    const results = await db
      .select()
      .from(rosinPresses)
      .where(sql`${rosinPresses.id} = ANY(${batchIds})`);

    return results.map(rosinPress => ({
      ...rosinPress,
      micronBags: rosinPress.micronBags ? JSON.parse(rosinPress.micronBags) : null,
    })) as RosinPress[];
  }

  async getDurationAnalytics(): Promise<{
    avgDuration: number;
    avgPreheatingTime: number;
    durationVsYield: { duration: number; yield: number }[];
  }> {
    const durationStats = await db
      .select({
        avgDuration: sql<number>`avg(${rosinPresses.pressDuration})`,
        avgPreheatingTime: sql<number>`avg(${rosinPresses.preheatingTime})`,
      })
      .from(rosinPresses)
      .where(and(
        isNotNull(rosinPresses.pressDuration),
        isNotNull(rosinPresses.preheatingTime)
      ));

    const durationVsYield = await db
      .select({
        duration: rosinPresses.pressDuration,
        yield: rosinPresses.yieldPercentage,
      })
      .from(rosinPresses)
      .where(and(
        isNotNull(rosinPresses.pressDuration),
        isNotNull(rosinPresses.yieldPercentage)
      ))
      .orderBy(rosinPresses.pressDuration);

    return {
      avgDuration: Number(durationStats[0]?.avgDuration) || 0,
      avgPreheatingTime: Number(durationStats[0]?.avgPreheatingTime) || 0,
      durationVsYield: durationVsYield.map(item => ({
        duration: Number(item.duration) || 0,
        yield: Number(item.yield) || 0,
      })),
    };
  }

  // Curing Reminder operations
  async createCuringReminder(reminder: InsertCuringReminder): Promise<CuringReminder> {
    const [result] = await db.insert(curingReminders).values(reminder).returning();
    return result;
  }

  async getCuringReminder(id: number): Promise<CuringReminder | undefined> {
    const [result] = await db.select().from(curingReminders).where(eq(curingReminders.id, id));
    return result;
  }

  async getCuringRemindersByBatch(batchId: number): Promise<CuringReminder[]> {
    return await db.select().from(curingReminders)
      .where(eq(curingReminders.batchId, batchId))
      .orderBy(asc(curingReminders.scheduledFor));
  }

  async getAllCuringReminders(limit = 50, offset = 0): Promise<CuringReminder[]> {
    return await db.select().from(curingReminders)
      .orderBy(desc(curingReminders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getActiveCuringReminders(): Promise<CuringReminder[]> {
    return await db.select().from(curingReminders)
      .where(eq(curingReminders.completed, false))
      .orderBy(asc(curingReminders.scheduledFor));
  }

  async getOverdueReminders(): Promise<CuringReminder[]> {
    const now = new Date();
    return await db.select().from(curingReminders)
      .where(and(
        eq(curingReminders.completed, false),
        lte(curingReminders.scheduledFor, now)
      ))
      .orderBy(asc(curingReminders.scheduledFor));
  }

  async updateCuringReminder(id: number, reminder: Partial<InsertCuringReminder>): Promise<CuringReminder | undefined> {
    const [result] = await db.update(curingReminders)
      .set(reminder)
      .where(eq(curingReminders.id, id))
      .returning();
    return result;
  }

  async completeCuringReminder(id: number, notes?: string): Promise<CuringReminder | undefined> {
    const [result] = await db.update(curingReminders)
      .set({ 
        completed: true, 
        completedAt: new Date(),
        notes: notes || undefined
      })
      .where(eq(curingReminders.id, id))
      .returning();
    return result;
  }

  async deleteCuringReminder(id: number): Promise<boolean> {
    const result = await db.delete(curingReminders).where(eq(curingReminders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
