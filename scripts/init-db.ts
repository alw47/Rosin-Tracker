#!/usr/bin/env tsx

/**
 * Database Initialization Script
 * Resets all auto-increment sequences to start from 1
 * Run after database schema setup for fresh installations
 */

import { pool } from "../server/db.js";

async function initializeDatabase() {
  console.log("🌿 Initializing Rosin Tracker database...");
  
  try {
    // Reset all sequences to start from 1
    await pool.query("SELECT setval('rosin_presses_id_seq', 1, false);");
    await pool.query("SELECT setval('curing_logs_id_seq', 1, false);");
    await pool.query("SELECT setval('curing_reminders_id_seq', 1, false);");
    
    console.log("✅ Database sequences reset to start from ID 1");
    console.log("✅ Database initialization complete");
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };