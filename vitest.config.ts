import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    // Browser code opts in per file: `// @vitest-environment happy-dom`, and fake-indexeddb for IndexedDB.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Integration tests need the local database: npm run test:integration.
    exclude: [...configDefaults.exclude, 'src/**/*.int.test.{ts,tsx}', 'src/**/*.load.test.{ts,tsx}'],
  },
});
