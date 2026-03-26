import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'scripts/**/*.test.ts',
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
    ],
  },
});
