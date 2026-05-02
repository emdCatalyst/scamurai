import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Cache the database connection in development. This avoids creating a new connection on every HMR update.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(connectionString, {
  max: 10, // increased from 1 for better parallel query performance
  ssl: 'require',
  connect_timeout: 30,
  idle_timeout: 60 * 5,
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = client;

export const db = drizzle(client, { schema });
