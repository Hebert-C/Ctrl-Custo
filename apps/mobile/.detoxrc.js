/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 600000,
    },
  },
  artifacts: {
    rootDir: "./artifacts",
    plugins: {
      screenshot: { keepOnlyFailingTestScreenshots: true },
      log: { keepOnlyFailingTestLogs: true },
    },
  },
  apps: {
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      testBinaryPath:
        "android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
    },
  },
  devices: {
    attached: {
      type: "android.attached",
      device: { adbName: "emulator-5554" },
    },
    emulator: {
      type: "android.emulator",
      device: { avdName: "Pixel_6_API_34" },
    },
  },
  configurations: {
    "android.ci": {
      device: "attached",
      app: "android.debug",
    },
    "android.local": {
      device: "emulator",
      app: "android.debug",
    },
  },
};
