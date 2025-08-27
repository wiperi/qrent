/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup/global-setup.ts'],
    testTimeout: 10000, // Timeout for HTTP requests
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.config.*'],
    },
    env: {
      DATABASE_URL: 'mysql://root:1234@localhost:3307/qrent',
    },
  },
  define: {
    'process.env.BACKEND_URL': JSON.stringify('http://localhost:3201'),
  },
});