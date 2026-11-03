import { config } from 'dotenv';
import postgres from 'postgres';
import { assertLocalDatabaseUrl, assertNotCloudSql } from '@/lib/db/localOnly';

// Integration tests write to the database: load the local settings and refuse
// anything but the local Docker database, so they can never touch production.
config({ path: '.env.local', quiet: true });

const TASK = 'integration tests';
const sql = postgres(assertLocalDatabaseUrl(process.env.DATABASE_URL, TASK), { max: 1, onnotice: () => {} });
try {
  await assertNotCloudSql(sql, TASK);
} finally {
  await sql.end();
}
