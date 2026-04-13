import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve, isAbsolute } from 'path';
import * as schema from './schema.js';

// Database path: absolute or relative to where the API process runs (apps/api/)
const dbUrl = process.env.DATABASE_URL;
const dbPath = dbUrl && isAbsolute(dbUrl) ? dbUrl : resolve(process.cwd(), dbUrl || 'data/agenthub.db');

// Create better-sqlite3 client
const client: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrency
client.pragma('journal_mode = WAL');

// Create drizzle ORM instance
export const db = drizzle(client, { schema });

// Re-export for backwards compatibility
export { client as libsql, client as sqlite };
export { schema };

/**
 * Initialize database
 */
export async function initializeDatabase(): Promise<void> {
  console.log('Database initialized at:', dbPath);
}
