import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useAuthStore } from "../../src/hooks/useAuth";
import { lightColors, darkColors } from "@ctrl-custo/ui";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
}) {
  return (
    <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={24} color={color} />
  );
}

export default function TabLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login" as never);
    }
  }, [isLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transações",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="swap-horizontal" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: "Cartões",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="card" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Metas",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="trophy" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="investments"
        options={{
          title: "Investimentos",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="trending-up" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recurring"
        options={{
          title: "Recorrentes",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calendar" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="bar-chart" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
