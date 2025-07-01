import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Configure neon to use ws
neonConfig.webSocketConstructor = ws;

async function migrateStrainToArray() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Starting strain migration...");

    // First, get all existing strain data
    const result = await client.query(`
      SELECT id, strain FROM rosin_presses WHERE strain IS NOT NULL
    `);

    console.log(`Found ${result.rows.length} records to migrate`);

    // Add a temporary column for the array data
    await client.query(`
      ALTER TABLE rosin_presses ADD COLUMN strain_temp text[]
    `);

    // Convert each existing strain to an array with a single element
    for (const row of result.rows) {
      await client.query(`
        UPDATE rosin_presses 
        SET strain_temp = ARRAY[$1] 
        WHERE id = $2
      `, [row.strain, row.id]);
    }

    // Drop the old strain column
    await client.query(`
      ALTER TABLE rosin_presses DROP COLUMN strain
    `);

    // Rename the temporary column to strain
    await client.query(`
      ALTER TABLE rosin_presses RENAME COLUMN strain_temp TO strain
    `);

    // Make the column NOT NULL
    await client.query(`
      ALTER TABLE rosin_presses ALTER COLUMN strain SET NOT NULL
    `);

    console.log("Migration completed successfully!");
    console.log("All existing strain data has been converted to arrays");

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateStrainToArray().catch(console.error);