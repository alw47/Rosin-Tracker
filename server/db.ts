import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔌 Initializing database connection...');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('📊 DATABASE_URL found, creating connection pool...');

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local PostgreSQL
});

console.log('✅ Database connection pool created');

export const db = drizzle({ client: pool, schema });

console.log('✅ Drizzle ORM initialized');