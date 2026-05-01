import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransactionStore } from "../../src/store/useTransactionStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Transaction } from "@ctrl-custo/core";

const HIDDEN_TEXT = "R$ ••••••";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const { isHidden, toggleHidden } = useUiStore();

  const transactions = useTransactionStore((s) => s.transactions);
  const { accounts, totalBalance, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const loadTransactions = useTransactionStore((s) => s.load);

  const [loading, setLoading] = React.useState(true);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadAccounts(),
      loadCategories(),
      loadTransactions({ startDate: currentMonthStart(), endDate: currentMonthEnd() }),
    ]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totalIncome = transactions
    .filter((t) => t.type === "income" && t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>Olá! 👋</Text>
        <TouchableOpacity onPress={toggleHidden} style={s.hideBtn}>
          <Ionicons name={isHidden ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Saldo total */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Saldo total</Text>
        <Text style={s.balanceAmount}>{isHidden ? HIDDEN_TEXT : formatCurrency(totalBalance)}</Text>
        <Text style={s.accountCount}>
          {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
        </Text>
      </View>

      {/* Resumo do mês */}
      <Text style={s.sectionTitle}>Este mês</Text>
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: colors.income }]}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryAmount, { color: colors.income }]}>
            {isHidden ? HIDDEN_TEXT : formatCurrency(totalIncome)}
          </Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: colors.expense }]}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryAmount, { color: colors.expense }]}>
            {isHidden ? HIDDEN_TEXT : formatCurrency(totalExpense)}
          </Text>
        </View>
      </View>

      {/* Últimas transações */}
      <Text style={s.sectionTitle}>Últimas transações</Text>
      {recentTransactions.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="receipt-outline" size={32} color={colors.textDisabled} />
          <Text style={s.emptyText}>Nenhuma transação este mês</Text>
        </View>
      ) : (
        recentTransactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            categoryName={categories.find((c) => c.id === tx.categoryId)?.name ?? ""}
            isHidden={isHidden}
            colors={colors}
          />
        ))
      )}
    </ScrollView>
  );
}

function TransactionRow({
  tx,
  categoryName,
  isHidden,
  colors,
}: {
  tx: Transaction;
  categoryName: string;
  isHidden: boolean;
  colors: Colors;
}) {
  const s = styles(colors);
  const amountColor = tx.type === "income" ? colors.income : colors.expense;
  const sign = tx.type === "income" ? "+" : "-";

  return (
    <View style={s.txRow}>
      <View style={s.txLeft}>
        <Text style={s.txDesc} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={s.txMeta}>
          {categoryName} · {formatDate(tx.date)}
        </Text>
      </View>
      <Text style={[s.txAmount, { color: amountColor }]}>
        {isHidden ? "••••" : `${sign}${formatCurrency(tx.amount)}`}
      </Text>
    </View>
  );
}

function currentMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthEnd() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
}

function formatDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    greeting: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    hideBtn: { padding: 4 },
    balanceCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
    balanceAmount: { fontSize: 32, fontWeight: "800", color: "#fff", marginBottom: 4 },
    accountCount: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, marginBottom: 10 },
    summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 3,
    },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    summaryAmount: { fontSize: 16, fontWeight: "700" },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    txLeft: { flex: 1, marginRight: 8 },
    txDesc: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
    txMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: "700" },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      alignItems: "center",
      gap: 8,
    },
    emptyText: { fontSize: 14, color: colors.textDisabled },
  });
