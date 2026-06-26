import { defineConfig } from 'vitest/config';

// https://vitest.dev/config/
export default defineConfig({
  test: {
    // Utility logic is pure and environment-agnostic, so we run it in Node
    // for speed. Switch to 'jsdom' only for tests that touch the DOM.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts'],
    },
  },
});
