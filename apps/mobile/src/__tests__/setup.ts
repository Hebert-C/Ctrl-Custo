jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  FontAwesome: "FontAwesome",
  AntDesign: "AntDesign",
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// Mock @ctrl-custo/ui to avoid pulling in victory-native's ES-module tree
jest.mock("@ctrl-custo/ui", () => {
  const colors = {
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textDisabled: "#D1D5DB",
    primary: "#2563EB",
    surface: "#FFFFFF",
    surfaceRaised: "#F9FAFB",
    border: "#E5E7EB",
    overlay: "rgba(0,0,0,0.5)",
  };
  return {
    lightColors: colors,
    darkColors: {
      ...colors,
      surface: "#111827",
      surfaceRaised: "#1F2937",
      border: "#374151",
      textPrimary: "#F9FAFB",
    },
  };
});
