import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";
import nodePlugin from "eslint-plugin-node";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        NodeJS: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": typescript,
      prettier: prettierPlugin,
      import: importPlugin,
      node: nodePlugin
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unused-vars": "off", // Use TypeScript version instead
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions when needed
      "@typescript-eslint/no-var-requires": "off", // Allow require in Node.js
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description" }],

      // Import rules
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ],
      "import/no-unresolved": "off", // TypeScript handles this
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          ts: "never",
          js: "always"
        }
      ],

      // Node.js specific rules
      "node/no-missing-import": "off", // TypeScript handles this
      "node/no-unsupported-features/es-syntax": "off", // We're using modern ES syntax
      "node/no-unpublished-import": "off",

      // General ESLint rules
      "no-console": "off", // Allow console in Node.js environment
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "off", // Allow both styles for flexibility
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "template-curly-spacing": "error",
      "arrow-spacing": "error",
      "no-multiple-empty-lines": ["error", { max: 2 }],
      "no-trailing-spaces": "error",
      "comma-dangle": ["error", "never"],
      quotes: ["error", "double"],
      semi: ["error", "always"],

      // Prettier integration
      "prettier/prettier": [
        "error",
        {
          semi: true,
          singleQuote: false,
          tabWidth: 2,
          trailingComma: "none",
          printWidth: 120,
          endOfLine: "auto"
        }
      ]
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json"
        }
      }
    }
  },
  {
    files: ["*.js", "*.mjs"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest"
    },
    rules: {
      "no-undef": "off" // Node.js globals are fine
    }
  },
  {
    ignores: ["dist/**/*", "node_modules/**/*", "coverage/**/*", "*.config.js", "*.config.mjs"]
  }
];
