import { rosinPresses, curingLogs, curingReminders, users, type RosinPress, type InsertRosinPress, type CuringLog, type InsertCuringLog, type CuringReminder, type InsertCuringReminder, type User } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, ilike, sql, isNotNull, inArray } from "drizzle-orm";

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
  
  // Strain Performance Ranking
  getStrainPerformanceRanking(startMaterial?: string): Promise<{
    strain: string;
    overallScore: number;
    rank: number;
    totalBatches: number;
    avgYield: number;
    yieldConsistency: number; // Lower is better (standard deviation)
    bestYield: number;
    recentPerformance: number; // Yield trend over last 5 batches
    qualityScore: number; // Based on curing data
  }[]>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
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

  async getStrainPerformanceRanking(startMaterial?: string): Promise<{
    strain: string;
    overallScore: number;
    rank: number;
    totalBatches: number;
    avgYield: number;
    yieldConsistency: number;
    bestYield: number;
    recentPerformance: number;
    qualityScore: number;
  }[]> {
    // Build base query with start material filtering
    const conditions = [];
    if (startMaterial && startMaterial !== "all") {
      conditions.push(eq(rosinPresses.startMaterial, startMaterial));
    }

    // Get all matching batches first
    const filteredBatches = await db.select().from(rosinPresses)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Process strain data from filtered batches
    const strainData: Array<{
      strain: string;
      yieldPercentage: number | null;
      yieldAmount: number | null;
      startAmount: number | null;
      pressDate: Date;
      batchId: number;
    }> = [];

    // Expand strain arrays for each filtered batch
    filteredBatches.forEach(batch => {
      if (batch.strain && Array.isArray(batch.strain)) {
        batch.strain.forEach(strainName => {
          strainData.push({
            strain: strainName,
            yieldPercentage: batch.yieldPercentage,
            yieldAmount: batch.yieldAmount,
            startAmount: batch.startAmount,
            pressDate: batch.pressDate,
            batchId: batch.id
          });
        });
      }
    });

    // Group by strain and calculate metrics
    const strainMetrics = new Map<string, {
      yields: number[];
      batchCount: number;
      recentYields: number[];
      batchIds: number[];
    }>();

    // Process batch data by strain
    strainData.forEach(batch => {
      if (!strainMetrics.has(batch.strain)) {
        strainMetrics.set(batch.strain, {
          yields: [],
          batchCount: 0,
          recentYields: [],
          batchIds: []
        });
      }
      
      const metrics = strainMetrics.get(batch.strain)!;
      if (batch.yieldPercentage !== null) {
        metrics.yields.push(batch.yieldPercentage);
        metrics.batchCount++;
        metrics.batchIds.push(batch.batchId);
      }
    });

    // Calculate quality scores from curing data
    const qualityScores = new Map<string, number>();
    
    for (const strainEntry of Array.from(strainMetrics.entries())) {
      const [strain, metrics] = strainEntry;
      if (metrics.batchIds.length > 0) {
        // Get curing logs for this strain's batches
        const curingData = await db
          .select({
            consistency: curingLogs.consistency,
            aromaNotes: curingLogs.aromaNotes
          })
          .from(curingLogs)
          .where(inArray(curingLogs.batchId, metrics.batchIds));

        // Calculate quality score (1-10 scale)
        let qualitySum = 0;
        let qualityCount = 0;
        
        curingData.forEach(curing => {
          // Consistency score (Crumbly=1, Sticky=2, Stable=3, Butter=4, Shatter=5)
          const consistencyScore = {
            'crumbly': 1,
            'sticky': 2, 
            'stable': 3,
            'butter': 4,
            'shatter': 5
          }[curing.consistency?.toLowerCase() || ''] || 3;
          
          // Aroma quality score based on notes length and content (simple heuristic)
          const aromaScore = curing.aromaNotes ? 
            Math.min(Math.max(curing.aromaNotes.length / 20, 3), 8) : 5;
          
          qualitySum += (consistencyScore * 2 + aromaScore) / 3; // Weighted average
          qualityCount++;
        });
        
        qualityScores.set(strain, qualityCount > 0 ? qualitySum / qualityCount : 5.0);
      } else {
        qualityScores.set(strain, 5.0); // Default quality score
      }
    }

    // Calculate performance metrics for each strain
    const rankings = Array.from(strainMetrics.entries()).map(([strain, metrics]) => {
      const yields = metrics.yields;
      const avgYield = yields.reduce((sum, y) => sum + y, 0) / yields.length;
      const bestYield = Math.max(...yields);
      
      // Calculate yield consistency (lower standard deviation = more consistent)
      const variance = yields.reduce((sum, y) => sum + Math.pow(y - avgYield, 2), 0) / yields.length;
      const yieldConsistency = Math.sqrt(variance);
      
      // Recent performance (last 5 batches trend)
      const sortedBatches = strainData
        .filter(b => b.strain === strain && b.yieldPercentage !== null)
        .sort((a, b) => new Date(b.pressDate).getTime() - new Date(a.pressDate).getTime())
        .slice(0, 5);
      
      const recentPerformance = sortedBatches.length > 0 
        ? sortedBatches.reduce((sum, b) => sum + b.yieldPercentage!, 0) / sortedBatches.length
        : avgYield;

      const qualityScore = qualityScores.get(strain) || 5.0;

      // Calculate overall score (weighted combination)
      const yieldScore = Math.min(avgYield / 30 * 10, 10); // Normalize to 0-10 scale (30% = max)
      const consistencyScore = Math.max(0, 10 - yieldConsistency); // Lower deviation = higher score
      const recentScore = Math.min(recentPerformance / 30 * 10, 10);
      const batchCountScore = Math.min(metrics.batchCount / 10 * 5, 5); // More batches = higher confidence

      const overallScore = (
        yieldScore * 0.3 +           // 30% yield
        consistencyScore * 0.25 +    // 25% consistency
        recentScore * 0.20 +         // 20% recent performance
        qualityScore * 0.15 +        // 15% quality
        batchCountScore * 0.10       // 10% sample size
      );

      return {
        strain,
        overallScore: Math.round(overallScore * 10) / 10,
        rank: 0, // Will be set after sorting
        totalBatches: metrics.batchCount,
        avgYield: Math.round(avgYield * 10) / 10,
        yieldConsistency: Math.round(yieldConsistency * 10) / 10,
        bestYield: Math.round(bestYield * 10) / 10,
        recentPerformance: Math.round(recentPerformance * 10) / 10,
        qualityScore: Math.round(qualityScore * 10) / 10
      };
    });

    // Sort by overall score and assign ranks
    rankings.sort((a, b) => b.overallScore - a.overallScore);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
}

export const storage = new DatabaseStorage();
