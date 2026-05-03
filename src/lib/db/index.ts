import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Cache the database connection in development. This avoids creating a new connection on every HMR update.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(connectionString, {
  max: 1,
  ssl: 'require',
  connect_timeout: 30,
  idle_timeout: 20,
  // Recycle connections before Supavisor's idle reaper closes them from its
  // side. Without this, the cached client holds a Sql instance whose underlying
  // socket has been killed by the pooler — next query either hangs forever or
  // surfaces as `error in input stream`.
  max_lifetime: 60 * 10,
  prepare: false,
  onnotice: () => {},
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = client;

export const db = drizzle(client, { schema });
