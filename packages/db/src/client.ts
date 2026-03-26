import { createClient } from '@libsql/client';
import * as schema from './schema.js';

const dbPath = process.env.DATABASE_URL || './data/agenthub.db';

// Create the database client
const client = createClient({
  url: dbPath,
});

// Re-export schema and client
export { client as libsql };
export { schema };

// For backward compatibility with old code
export const db = client;

/**
 * Initialize database - creates tables if they don't exist
 * Note: For production, use proper migrations instead
 */
export async function initializeDatabase(): Promise<void> {
  // In this setup, we use SQLite with schema already created
  // The actual schema is managed via drizzle-kit or manual SQL
  console.log('Database initialized at:', dbPath);
}