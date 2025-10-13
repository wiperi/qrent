import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Next.js recommended configs for frontend packages
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Custom configuration for all TypeScript files in src/
  {
    files: ['**/src/**/*.ts', '**/src/**/*.tsx'],
    rules: {
      // Custom rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Backend specific rules (no React rules)
  {
    files: ['packages/backend/src/**/*.ts'],
    rules: {
      'no-console': 'off', // Allow console in backend
    },
  },

  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.vercel/**',
      'coverage/**',
      '*.min.js',
      '**/docker/**',
      '**/scripts/**',
      'packages/shared/prisma/migrations/**',
      'packages/frontend/test/**',
      'packages/backend/test/**',
      '**/test/**',
    ],
  },
];
