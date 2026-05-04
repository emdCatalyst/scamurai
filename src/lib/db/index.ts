import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Cache the database connection in development. This avoids creating a new connection on every HMR update.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Direct connection to Postgres (port 5432, host db.<ref>.supabase.co).
// We deliberately do not use Supavisor's transaction pooler (port 6543) —
// the `prepare:false` constraint plus stuck-socket bugs caused intermittent
// page hangs that did not surface as errors. With direct connection,
// prepared statements work normally and stuck queries are bounded by
// `statement_timeout`.
const client = globalForDb.conn ?? postgres(connectionString, {
  max: 3,
  ssl: 'require',
  connect_timeout: 30,
  idle_timeout: 20,
  onnotice: () => {},
  // Server-side timeout: if any single query takes longer than 10s, Postgres
  // cancels it and the connection returns to the pool. This is the safety net
  // that prevents a single hung query from pinning a connection forever.
  connection: {
    statement_timeout: 10_000,
  },
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = client;

export const db = drizzle(client, { schema });
