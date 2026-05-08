module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "setup\\.ts$"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@ctrl-custo/.*|victory-native|d3-.*)",
  ],
};
