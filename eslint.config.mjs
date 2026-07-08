import { FlatCompat } from "@eslint/eslintrc";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { dirname } from "path";
import { fileURLToPath } from "url";

const dFilename = fileURLToPath(import.meta.url);
const dDirname = dirname(dFilename);

const compat = new FlatCompat({
  baseDirectory: dDirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:prettier/recommended",
    "airbnb",
    "airbnb/hooks",
    "prettier"
  ),
  {
    files: ["*.js"],
    rules: {
      "no-underscore-dangle": ["off"],
    },
  },
  {
    ignores: [
      "commitlint.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      "next.config.js",
      ".next/**/*",
      "public/sw.js",
      "public/workbox-*",
      "*.mjs",
      "server.js",
      "public/firebase-messaging-sw.js",
      "scripts/**/*",
    ],
  },
  {
    plugins: {
      prettier: prettierPlugin,
      "@typescript-eslint": typescriptPlugin,
      "unused-imports": unusedImportsPlugin,
      "simple-import-sort": simpleImportSortPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
      },
    },
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/member-ordering": [
        "error",
        {
          default: [
            "public-static-field",
            "protected-static-field",
            "private-static-field",
            "public-decorated-field",
            "protected-decorated-field",
            "private-decorated-field",
            "public-instance-field",
            "protected-instance-field",
            "private-instance-field",
            "constructor",
            "public-decorated-method",
            "protected-decorated-method",
            "private-decorated-method",
            "public-method",
            "protected-method",
            "private-method",
          ],
        },
      ],
      "prettier/prettier": "error",
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/typedef": "off",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-restricted-imports": "off",
      quotes: ["error", "double", { avoidEscape: true }],
      eqeqeq: "error",
      curly: "error",
      "import/order": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/jsx-props-no-spreading": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-restricted-exports": "off",
      "no-unreachable": "error",
      "no-use-before-define": "error",
      strict: "error",
      "no-param-reassign": "off",
      "no-underscore-dangle": ["error", { allow: ["__filename", "__dirname"] }],
      "no-nested-ternary": "off",
      "arrow-body-style": [2, "as-needed"],
      "react/jsx-filename-extension": "off",
      "react/function-component-definition": "off",
      "react/require-default-props": "off",
      "react/react-in-jsx-scope": "off",
      "jsx-a11y/anchor-is-valid": "off",
      "import/prefer-default-export": "off",
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
          packageDir: "./",
        },
      ],
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          js: "never",
          jsx: "never",
          ts: "never",
          tsx: "never",
        },
      ],
    },
  },
];

export default eslintConfig;
