import typescriptEslint from "@typescript-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["**/*.cjs", "types/*", "eslint.config.mjs", "rollup.config.mjs"],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "prettier"
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "@stylistic": stylistic,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "commonjs",

      parserOptions: {
        project: true,
        tsconfigRootDir: "src",
      },
    },

    rules: {
      "@stylistic/arrow-spacing": ["warn"],
      "@stylistic/comma-dangle": ["warn", "always-multiline"],
      "@stylistic/indent": [
        "warn",
        2,
        {
          SwitchCase: 1,
        },
      ],
      "@stylistic/object-curly-newline": ["warn"],
      "@stylistic/space-infix-ops": ["warn"],
      "@stylistic/semi": ["warn", "always"],

      "sort-imports": [
        "warn",
        {
          allowSeparatedGroups: true,
        },
      ],

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
      ]
    },
  },
];
