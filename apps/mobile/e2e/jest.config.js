/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  maxWorkers: 1,
  testTimeout: 120000,
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/tests/**/*.test.ts"],
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
  reporters: ["detox/runners/jest/reporter"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
};
