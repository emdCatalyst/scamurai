import { config } from 'dotenv';

// Integration tests write to the database: load the local settings and refuse
// anything that isn't a local database, so they can never touch production.
config({ path: '.env.local', quiet: true });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const url = process.env.DATABASE_URL;
if (!url || !LOCAL_HOSTS.has(new URL(url).hostname)) {
  throw new Error('Integration tests need DATABASE_URL to point at the local database (npm run db:up).');
}
