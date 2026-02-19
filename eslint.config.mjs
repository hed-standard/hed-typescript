import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/**/*'], 'Ignore Build Directory'),
  globalIgnores(['docs/**/*'], 'Ignore Documentation Directory'),
  globalIgnores(['tests/bidsDemoData/**/*'], 'Ignore BIDS Demo Data Directory'),
  globalIgnores(['tests/otherTestData/**/*'], 'Ignore Other Test Data Directory'),
  globalIgnores(['src/data/*'], 'Ignore Source Data Directory'),

  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: {
      js,
    },

    extends: ['js/recommended'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        __VITE_ENV__: 'readonly',
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
    },

    rules: {
      'no-console': [
        'error',
        {
          allow: ['warn'],
        },
      ],

      'linebreak-style': ['error', 'unix'],
      'guard-for-in': 'error',
      'max-len': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'array-callback-return': 'error',
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',

      'prefer-arrow-callback': [
        'error',
        {
          allowUnboundThis: false,
        },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    plugins: {
      js,
    },

    extends: ['js/recommended'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        __VITE_ENV__: 'readonly',
      },

      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },

    rules: {
      'no-console': [
        'error',
        {
          allow: ['warn'],
        },
      ],

      'linebreak-style': ['error', 'unix'],
      'guard-for-in': 'error',
      'max-len': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'array-callback-return': 'error',
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',

      'prefer-arrow-callback': [
        'error',
        {
          allowUnboundThis: false,
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    plugins: {
      js,
    },

    extends: [tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      'no-console': [
        'error',
        {
          allow: ['warn'],
        },
      ],

      'linebreak-style': ['error', 'unix'],
      'guard-for-in': 'error',
      'max-len': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'array-callback-return': 'error',
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      '@typescript-eslint/require-await': 'off',

      'prefer-arrow-callback': [
        'error',
        {
          allowUnboundThis: false,
        },
      ],
    },
  },
  prettier,
])
