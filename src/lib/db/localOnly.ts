import type { Sql } from 'postgres';

/**
 * Guards for code that writes test data (the seed script and the integration
 * tests): it may only ever touch the local Docker database.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Returns `url` if it points at a database on this machine, and throws otherwise. */
export function assertLocalDatabaseUrl(url: string | undefined, task: string): string {
  if (!url) throw new Error(`DATABASE_URL is not set (see .env.example); ${task} needs the local database.`);
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === 'production' || !LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run ${task} against "${host}": test data may only go into a local database.`);
  }
  return url;
}

/**
 * A local host name alone proves little: the Cloud SQL Auth Proxy listens on
 * localhost too. Every Cloud SQL instance has the `cloudsqlsuperuser` role, so
 * refuse when it exists.
 */
export async function assertNotCloudSql(sql: Sql, task: string): Promise<void> {
  const [{ cloudSql }] = await sql<{ cloudSql: boolean }[]>`
    select exists (select 1 from pg_roles where rolname = 'cloudsqlsuperuser') as "cloudSql"
  `;
  if (cloudSql) {
    throw new Error(`Refusing to run ${task} against Cloud SQL: test data may only go into the local Docker database.`);
  }
}
