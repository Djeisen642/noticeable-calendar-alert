import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ESLint 9+ flat config tailored for modern Vanilla TypeScript.
export default tseslint.config(
  // Never lint build artifacts, deps, or the Rust crate.
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'src-tauri/'],
  },

  // Baseline JS rules for any plain `.js` files (e.g. this config).
  js.configs.recommended,

  // Type-aware linting for all TypeScript sources.
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // Let typescript-eslint discover the right tsconfig automatically.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce explicit intent when ignoring a Promise.
      '@typescript-eslint/no-floating-promises': 'error',
      // Allow intentionally-unused args/vars when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Frontend code runs in the browser/webview.
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Tooling configs run in Node.
  {
    files: ['*.config.ts', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Keep ESLint out of Prettier's lane — must come last.
  prettier,
);
