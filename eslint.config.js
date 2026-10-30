import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // Idiomatic React: async event handlers and `(x) => void fn(x)` are fine.
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      // Numbers are common and unambiguous in UI templates.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // noUncheckedIndexedAccess already forces explicit undefined handling;
      // `!` remains allowed for list element lookups guarded by context.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Tests may assert loosely about presence; keep type-aware rules but relax
    // style-only ones and allow pragmatic `any` in environment stubs.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // The local adapter is async to match the DataClient contract verbatim so a
    // Supabase-backed adapter is a drop-in replacement, even where no await is
    // needed today.
    files: ['src/lib/data/LocalDataClient.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // Node/config files run outside the DOM lib; relax DOM-aware strictness if needed.
    files: ['vite.config.ts', 'eslint.config.js', 'playwright.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
)
