import "../src/polyfills";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { useThemeStore } from "../src/store/useThemeStore";
import { useAuthStore } from "../src/hooks/useAuth";
import { setUnauthorizedHandler } from "../src/lib/api";
import { lightColors, darkColors } from "@ctrl-custo/ui";

export default function RootLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const { isLoading, isAuthenticated, tryRestore } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().logout();
    });
    tryRestore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth guard: navigate imperatively once loading resolves.
  // <Redirect> inside a root layout is unreliable in Expo Router v5 —
  // useEffect + router.replace is the documented pattern.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login" as never);
    }
  }, [isLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
