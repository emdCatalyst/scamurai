import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Load tests: many staff submitting orders at once through the real route
 * handlers and the local PostgreSQL (npm run db:up && npm run db:migrate &&
 * npm run db:seed). Prints latency percentiles; see the test file for knobs.
 *
 *   npm run test:load
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.load.test.ts'],
    setupFiles: ['./src/test/integrationEnv.ts'],
    fileParallelism: false,
    testTimeout: 600_000,
  },
});
