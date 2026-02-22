/**
 * Drizzle database client
 * This file exports the database connection instance for use in server functions
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get connection string from process.env (server-side only)
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

// Create postgres client (disables prepared statements for serverless compatibility)
// Using lazy initialization to avoid issues during build
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const connectionString = getDatabaseUrl();
    const queryClient = postgres(connectionString, {
      prepare: false,
    });
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// For backwards compatibility - lazy getter
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Export schema for use in queries
export { schema };

