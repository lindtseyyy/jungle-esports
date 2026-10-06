import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
export default ts.config(
  {
    ignores: ['dist/**', 'public/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        ResizeObserver: 'readonly',
        devicePixelRatio: 'readonly',
        clearTimeout: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        KeyboardEvent: 'readonly',
        setTimeout: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
      },
    },
    rules: {
      'svelte/require-each-key': 'off',
      'svelte/no-at-html-tags': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['**/*.svelte'], languageOptions: { parserOptions: { parser: ts.parser } } },
);
