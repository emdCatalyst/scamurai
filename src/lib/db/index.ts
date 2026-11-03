import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Cache the database connection in development. This avoids creating a new connection on every HMR update.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Direct (session) connection to Postgres, so prepared statements work and
// stuck queries are bounded by `statement_timeout`. Avoid transaction-mode
// poolers: they need `prepare: false` and caused hangs in the past.
//
// TLS is required by default. Set DATABASE_SSL=disable only where the hop is
// already private: the local Docker database, or the Cloud SQL Auth Proxy,
// which encrypts the connection itself.
const ssl = process.env.DATABASE_SSL === 'disable' ? false : 'require';

const client = globalForDb.conn ?? postgres(connectionString, {
  max: 3,
  ssl,
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
