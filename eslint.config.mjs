import ts from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import eslintPluginImportX from 'eslint-plugin-import-x'
import js from "@eslint/js";

export default ts.config(
  {
    ignores: ["**/*.cjs", "types/*", "eslint.config.mjs", "rollup.config.mjs"],
  },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  stylistic.configs.customize({
    arrowParens: true,
    indent: 2,
    semi: true,
  }),
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@stylistic/arrow-spacing": ["warn"],
      "@stylistic/comma-dangle": ["warn"],
      "@stylistic/comma-spacing": ["warn"],
      "@stylistic/indent": [
        "warn",
        2,
        {
          SwitchCase: 1,
        },
      ],
      "@stylistic/key-spacing": ["warn"],
      "@stylistic/object-curly-newline": ["warn"],
      "@stylistic/space-infix-ops": ["warn"],
      "@stylistic/semi": ["warn"],

      "sort-imports": 'off',

      "@typescript-eslint/restrict-template-expressions": ["off"],
      "no-unused-vars": ["off"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],

      'import-x/order': ['warn', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'unknown',
          'type',
        ],
        'newlines-between': 'always',
        'alphabetize': {
          order: 'asc',
        },
      }],
    },
  });
