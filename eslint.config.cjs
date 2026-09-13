const js = require('@eslint/js');
const ts = require('typescript-eslint');
const globals = require('globals');
const hooks = require('eslint-plugin-react-hooks');
module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'archive/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mts',
    ],
  },
  {
    files: [
      '{utils,fsm,adapters,facade,test-utils,ui,react,react-time-gremlin,ui-react-utils,reference-react,reference-react-app,reference-console}/src/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        project: './tsconfig.maintained.json',
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
    plugins: { '@typescript-eslint': ts.plugin, 'react-hooks': hooks },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.plugin.configs['eslint-recommended'].overrides[0].rules,
      ...ts.plugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...{
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-argument': 'error',
        '@typescript-eslint/no-unsafe-call': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unsafe-return': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
        ],
      },
    },
  },
];
