import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/src/**/*.{test,spec}.ts'],
    exclude: ['AI-DEV-SYSTEM/**', 'node_modules/**'],
  },
});
