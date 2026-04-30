import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { getDatabase } from "../../src/db/index";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Account, Category } from "@ctrl-custo/core";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const colors = isDark ? darkColors : lightColors;

  const { isHidden, toggleHidden, isBiometricEnabled, setBiometricEnabled } = useUiStore();
  const { accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const loadAll = useCallback(async () => {
    const db = getDatabase();
    await Promise.all([loadAccounts(db), loadCategories(db)]);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleBiometricToggle(value: boolean) {
    if (!value) {
      setBiometricEnabled(false);
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme sua identidade para ativar a biometria",
      fallbackLabel: "Usar PIN",
    });
    if (result.success) {
      setBiometricEnabled(true);
    }
  }

  const s = styles(colors);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
    >
      <Text style={s.pageTitle}>Configurações</Text>

      {/* Aparência */}
      <Text style={s.sectionLabel}>APARÊNCIA</Text>
      <View style={s.section}>
        <SettingRow
          label="Tema escuro"
          icon="moon"
          colors={colors}
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: colors.primary }}
            />
          }
        />
        <View style={s.divider} />
        <SettingRow
          label="Ocultar valores"
          icon="eye-off"
          colors={colors}
          right={
            <Switch
              value={isHidden}
              onValueChange={toggleHidden}
              trackColor={{ true: colors.primary }}
            />
          }
        />
      </View>

      {/* Segurança */}
      <Text style={s.sectionLabel}>SEGURANÇA</Text>
      <View style={s.section}>
        <SettingRow
          label="Biometria / Face ID"
          icon="finger-print"
          colors={colors}
          subtitle={biometricAvailable ? undefined : "Não disponível neste dispositivo"}
          right={
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ true: colors.primary }}
            />
          }
        />
      </View>

      {/* Contas */}
      <Text style={s.sectionLabel}>CONTAS ({accounts.length})</Text>
      <View style={s.section}>
        {accounts.length === 0 ? (
          <Text style={s.emptySection}>Nenhuma conta cadastrada</Text>
        ) : (
          accounts.map((acc, i) => (
            <React.Fragment key={acc.id}>
              {i > 0 && <View style={s.divider} />}
              <AccountRow account={acc} colors={colors} />
            </React.Fragment>
          ))
        )}
      </View>

      {/* Categorias */}
      <Text style={s.sectionLabel}>CATEGORIAS ({categories.length})</Text>
      <View style={s.section}>
        {categories.length === 0 ? (
          <Text style={s.emptySection}>Nenhuma categoria cadastrada</Text>
        ) : (
          categories.map((cat, i) => (
            <React.Fragment key={cat.id}>
              {i > 0 && <View style={s.divider} />}
              <CategoryRow category={cat} colors={colors} />
            </React.Fragment>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  icon,
  subtitle,
  colors,
  right,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  subtitle?: string;
  colors: Colors;
  right: React.ReactNode;
}) {
  const s = styles(colors);
  return (
    <View style={s.settingRow}>
      <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={s.settingText}>
        <Text style={s.settingLabel}>{label}</Text>
        {subtitle && <Text style={s.settingSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function AccountRow({ account, colors }: { account: Account; colors: Colors }) {
  const s = styles(colors);
  return (
    <View style={s.settingRow}>
      <View style={[s.iconBox, { backgroundColor: account.color + "22" }]}>
        <Text style={{ fontSize: 16 }}>{account.icon}</Text>
      </View>
      <View style={s.settingText}>
        <Text style={s.settingLabel}>{account.name}</Text>
        <Text style={s.settingSubtitle}>{account.bankName ?? account.type}</Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        {formatCurrency(account.balance)}
      </Text>
    </View>
  );
}

function CategoryRow({ category, colors }: { category: Category; colors: Colors }) {
  const s = styles(colors);
  const typeLabel =
    category.type === "income" ? "receita" : category.type === "expense" ? "despesa" : "ambos";

  return (
    <View style={s.settingRow}>
      <View style={[s.iconBox, { backgroundColor: category.color + "22" }]}>
        <Text style={{ fontSize: 16 }}>{category.icon}</Text>
      </View>
      <View style={s.settingText}>
        <Text style={s.settingLabel}>{category.name}</Text>
        <Text style={s.settingSubtitle}>{typeLabel}</Text>
      </View>
    </View>
  );
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingText: { flex: 1 },
    settingLabel: { fontSize: 15, color: colors.textPrimary },
    settingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    emptySection: {
      fontSize: 13,
      color: colors.textDisabled,
      textAlign: "center",
      padding: 16,
    },
  });
