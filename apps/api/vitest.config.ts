import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./src/__tests__/global-setup.ts",
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
