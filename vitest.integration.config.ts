import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests: real server actions and queries against the local
 * PostgreSQL (npm run db:up && npm run db:migrate). Framework edges (Clerk,
 * email, request headers) are mocked inside each test file.
 *
 *   npm run test:integration
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['./src/test/integrationEnv.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
