/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    // Permite _ como prefixo para variáveis intencionalmente não usadas
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // Garante que hooks React sejam usados corretamente
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    // Evita any explícito — use unknown quando necessário
    "@typescript-eslint/no-explicit-any": "error",
  },
  overrides: [
    // Regras específicas para arquivos React (web + ui)
    {
      files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
      plugins: ["react"],
      extends: ["plugin:react/recommended", "plugin:react/jsx-runtime"],
      settings: { react: { version: "detect" } },
      rules: {
        // React 17+ com o novo JSX transform não precisa de "import React"
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_|^React$" },
        ],
      },
    },
    // Arquivos de config/ferramentas — menos restritivo
    {
      files: ["*.config.{js,cjs,mjs,ts}", "*.config.*.{js,ts}"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    // Arquivos de teste — pode usar variáveis de setup sem usar diretamente
    {
      files: ["**/__tests__/**/*.ts", "**/*.test.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
  ignorePatterns: [
    "node_modules",
    "dist",
    ".turbo",
    "*.d.ts",
    "pnpm-lock.yaml",
  ],
};
