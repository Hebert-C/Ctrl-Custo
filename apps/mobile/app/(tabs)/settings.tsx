import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { getDatabase } from "../../src/db/index";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { AccountForm } from "../../src/components/AccountForm";
import { CategoryForm } from "../../src/components/CategoryForm";
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
  const [accountFormVisible, setAccountFormVisible] = useState(false);
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

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

  function openNewAccount() {
    setEditingAccount(undefined);
    setAccountFormVisible(true);
  }

  function openEditAccount(account: Account) {
    setEditingAccount(account);
    setAccountFormVisible(true);
  }

  function openNewCategory() {
    setEditingCategory(undefined);
    setCategoryFormVisible(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);
    setCategoryFormVisible(true);
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
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>CONTAS ({accounts.length})</Text>
        <TouchableOpacity style={s.addBtn} onPress={openNewAccount}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={s.addBtnText}>Nova conta</Text>
        </TouchableOpacity>
      </View>
      <View style={s.section}>
        {accounts.length === 0 ? (
          <Text style={s.emptySection}>Nenhuma conta cadastrada</Text>
        ) : (
          accounts.map((acc, i) => (
            <React.Fragment key={acc.id}>
              {i > 0 && <View style={s.divider} />}
              <AccountRow account={acc} colors={colors} onEdit={() => openEditAccount(acc)} />
            </React.Fragment>
          ))
        )}
      </View>

      {/* Categorias */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>CATEGORIAS ({categories.length})</Text>
        <TouchableOpacity style={s.addBtn} onPress={openNewCategory}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={s.addBtnText}>Nova categoria</Text>
        </TouchableOpacity>
      </View>
      <View style={s.section}>
        {categories.length === 0 ? (
          <Text style={s.emptySection}>Nenhuma categoria cadastrada</Text>
        ) : (
          categories.map((cat, i) => (
            <React.Fragment key={cat.id}>
              {i > 0 && <View style={s.divider} />}
              <CategoryRow category={cat} colors={colors} onEdit={() => openEditCategory(cat)} />
            </React.Fragment>
          ))
        )}
      </View>

      <AccountForm
        visible={accountFormVisible}
        onClose={() => setAccountFormVisible(false)}
        db={getDatabase()}
        isDark={isDark}
        account={editingAccount}
      />
      <CategoryForm
        visible={categoryFormVisible}
        onClose={() => setCategoryFormVisible(false)}
        db={getDatabase()}
        isDark={isDark}
        category={editingCategory}
      />
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

function AccountRow({
  account,
  colors,
  onEdit,
}: {
  account: Account;
  colors: Colors;
  onEdit: () => void;
}) {
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
      <Text style={s.rowBalance}>{formatCurrency(account.balance)}</Text>
      <TouchableOpacity style={s.editBtn} onPress={onEdit}>
        <Ionicons name="pencil" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function CategoryRow({
  category,
  colors,
  onEdit,
}: {
  category: Category;
  colors: Colors;
  onEdit: () => void;
}) {
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
      <TouchableOpacity style={s.editBtn} onPress={onEdit}>
        <Ionicons name="pencil" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
      marginBottom: 6,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: colors.primarySurface,
    },
    addBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
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
    rowBalance: { fontSize: 13, color: colors.textSecondary, marginRight: 8 },
    editBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.primarySurface,
    },
    emptySection: {
      fontSize: 13,
      color: colors.textDisabled,
      textAlign: "center",
      padding: 16,
    },
  });
