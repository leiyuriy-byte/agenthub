import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const dbPath = process.env.DATABASE_URL || 'file:./data/agenthub.db';

// Create the database client - libsql:// prefix for local file
const client = createClient({
  url: dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`,
});

// Create drizzle ORM instance
export const db = drizzle(client, { schema });

// Re-export schema and client
export { client as libsql };
export { schema };

/**
 * Initialize database - creates tables if they don't exist
 * Note: For production, use proper migrations instead
 */
export async function initializeDatabase(): Promise<void> {
  // In this setup, we use SQLite with schema already created
  // The actual schema is managed via drizzle-kit or manual SQL
  console.log('Database initialized at:', dbPath);
}