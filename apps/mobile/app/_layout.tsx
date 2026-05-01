import "../src/polyfills";
import React, { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().logout();
    });
    tryRestore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {!isAuthenticated && <Redirect href={"/login" as never} />}
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
