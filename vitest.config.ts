import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/mcp-server/**/*.ts'],
      exclude: [
        'src/tests/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/bootstrap.ts',
        'src/main.ts',
        'src/preload.ts',
      ],
    },
  },
});
