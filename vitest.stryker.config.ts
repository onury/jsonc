import { defineConfig } from 'vitest/config';

// Config used only by Stryker mutation runs: the same suite, without coverage.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    include: ['test/**/*.{test,spec}.ts']
  }
});
