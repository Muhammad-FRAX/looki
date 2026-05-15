import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
    env: {
      SKIP_AUTH: 'true',
    },
    coverage: {
      provider: 'v8',
      include: ['src/lookup/**', 'src/auth/**'],
      thresholds: {
        lines: 80,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
