import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { assertNotCloudSql } from './localOnly';

const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
afterAll(() => sql.end());

describe('assertNotCloudSql', () => {
  it('accepts the local Docker database', async () => {
    await expect(assertNotCloudSql(sql, 'integration tests')).resolves.toBeUndefined();
  });

  it('refuses a database with the role every Cloud SQL instance has', async () => {
    await sql`create role cloudsqlsuperuser nologin`;
    try {
      await expect(assertNotCloudSql(sql, 'integration tests')).rejects.toThrow(/Cloud SQL/);
    } finally {
      await sql`drop role cloudsqlsuperuser`;
    }
  });
});
