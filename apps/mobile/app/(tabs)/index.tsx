import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTransactionStore } from "../../src/store/useTransactionStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { TransactionForm } from "../../src/components/TransactionForm";
import { OnboardingChecklist } from "../../src/components/OnboardingChecklist";
import { lightColors, darkColors, categoryColors, PieChart } from "@ctrl-custo/ui";
import type { Colors, PieChartData } from "@ctrl-custo/ui";
import type { Transaction, Category } from "@ctrl-custo/core";

type ChartView = null | "main" | "income" | "expense";

const HIDDEN_TEXT = "R$ ••••••";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function monthStart(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function monthEnd(y: number, m: number) {
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors: Colors = isDark ? darkColors : lightColors;
  const { isHidden, toggleHidden } = useUiStore();

  const transactions = useTransactionStore((s) => s.transactions);
  const { accounts, totalBalance, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const loadTransactions = useTransactionStore((s) => s.load);

  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartView>(null);
  const [banksExpanded, setBanksExpanded] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadAccounts(),
      loadCategories(),
      loadTransactions({ startDate: monthStart(year, month), endDate: monthEnd(year, month) }),
    ]);
    setLoading(false);
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const confirmed = transactions.filter((t) => t.status === "confirmed");
  const totalIncome = confirmed
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = confirmed
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthNet = totalIncome - totalExpense;
  const isNegativeNet = monthNet < 0;

  const recentTransactions = transactions.slice(0, 5);

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const mainChartData: PieChartData[] = [
    { label: "Receitas", value: totalIncome, color: colors.income },
    { label: "Despesas", value: totalExpense, color: colors.expense },
  ].filter((d) => d.value > 0);

  const incomeChartData = groupByCategory(confirmed, "income", categories);
  const expenseChartData = groupByCategory(confirmed, "expense", categories);

  function toggleChart() {
    setChartView((v) => (v === null ? "main" : null));
  }

  function drillIncome() {
    setChartView("income");
  }

  function drillExpense() {
    setChartView("expense");
  }

  function backToMain() {
    setChartView("main");
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

      {/* Hero — Fluxo do Mês */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleChart}
        style={[s.heroCard, isNegativeNet && { backgroundColor: colors.expense }]}
      >
        <View style={s.heroTop}>
          <Text style={s.heroLabel}>Fluxo do Mês</Text>
          <Ionicons
            name={chartView !== null ? "chevron-up" : "chevron-down"}
            size={16}
            color="rgba(255,255,255,0.7)"
          />
        </View>
        <View style={s.heroMonthRow}>
          <TouchableOpacity
            onPress={prevMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <Text style={s.heroMonthText}>
            {MONTHS[month - 1]} {year}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
        <Text style={s.heroNet}>
          {isHidden
            ? HIDDEN_TEXT
            : `${isNegativeNet ? "-" : "+"}${formatCurrency(Math.abs(monthNet))}`}
        </Text>
        <View style={s.heroRow}>
          <View style={s.heroItem}>
            <Ionicons name="arrow-up-circle" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={s.heroItemLabel}>Receitas</Text>
            <Text style={s.heroItemValue}>{isHidden ? "••••" : formatCurrency(totalIncome)}</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroItem}>
            <Ionicons name="arrow-down-circle" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={s.heroItemLabel}>Despesas</Text>
            <Text style={s.heroItemValue}>{isHidden ? "••••" : formatCurrency(totalExpense)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Donut — Nível 1: Receitas vs Despesas */}
      {chartView === "main" && mainChartData.length > 0 && (
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Receitas vs Despesas</Text>
          <PieChart data={mainChartData} height={200} />
          <View style={s.drillRow}>
            {totalIncome > 0 && (
              <TouchableOpacity
                style={[
                  s.drillBtn,
                  { backgroundColor: `${colors.income}20`, borderColor: colors.income },
                ]}
                onPress={drillIncome}
              >
                <Text style={[s.drillBtnText, { color: colors.income }]}>
                  Ver Receitas por categoria
                </Text>
              </TouchableOpacity>
            )}
            {totalExpense > 0 && (
              <TouchableOpacity
                style={[
                  s.drillBtn,
                  { backgroundColor: `${colors.expense}20`, borderColor: colors.expense },
                ]}
                onPress={drillExpense}
              >
                <Text style={[s.drillBtnText, { color: colors.expense }]}>
                  Ver Despesas por categoria
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Donut — Nível 2: por categoria */}
      {(chartView === "income" || chartView === "expense") && (
        <View style={s.chartCard}>
          <View style={s.chartTitleRow}>
            <TouchableOpacity onPress={backToMain} style={s.backBtn}>
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
              <Text style={[s.backBtnText, { color: colors.primary }]}>Voltar</Text>
            </TouchableOpacity>
            <Text style={s.chartTitle}>
              {chartView === "income" ? "Receitas" : "Despesas"} por Categoria
            </Text>
          </View>
          {(chartView === "income" ? incomeChartData : expenseChartData).length > 0 ? (
            <PieChart
              data={chartView === "income" ? incomeChartData : expenseChartData}
              height={200}
            />
          ) : (
            <Text style={s.noData}>Nenhuma transação confirmada neste mês</Text>
          )}
        </View>
      )}

      {/* Onboarding — primeiros passos */}
      <OnboardingChecklist
        hasAccounts={accounts.length > 0}
        hasCategories={categories.length > 0}
        hasTransactions={transactions.length > 0}
        onAddTransaction={() => setFormVisible(true)}
        colors={colors}
      />

      {/* Saldo nos Bancos */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[s.banksCard, { backgroundColor: colors.surface }]}
        onPress={() => setBanksExpanded((e) => !e)}
      >
        <View style={s.banksHeader}>
          <View>
            <Text style={s.banksLabel}>Saldo nos Bancos</Text>
            <Text
              style={[
                s.banksTotal,
                { color: totalBalance < 0 ? colors.expense : colors.textPrimary },
              ]}
            >
              {isHidden ? HIDDEN_TEXT : formatCurrency(totalBalance)}
            </Text>
          </View>
          <Ionicons
            name={banksExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </View>

        {banksExpanded && (
          <View style={s.banksList}>
            <View style={s.banksDivider} />
            {accounts.length === 0 ? (
              <Text style={s.banksEmpty}>Nenhum banco cadastrado</Text>
            ) : (
              accounts.map((acc) => (
                <View key={acc.id} style={s.bankRow}>
                  <View style={s.bankLeft}>
                    <View style={[s.bankDot, { backgroundColor: acc.color }]} />
                    <View>
                      <Text style={s.bankName}>{acc.name}</Text>
                      <Text style={s.bankType}>{accountTypeLabel(acc.type)}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      s.bankBalance,
                      { color: acc.balance < 0 ? colors.expense : colors.textPrimary },
                    ]}
                  >
                    {isHidden ? "••••" : formatCurrency(acc.balance)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Últimas transações */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Últimas transações</Text>
        <TouchableOpacity
          onPress={() => setFormVisible(true)}
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel="Adicionar transação"
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
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

      <TransactionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        accounts={accounts}
        categories={categories}
        isDark={isDark}
        onSaved={async () => {
          await Promise.all([
            loadAccounts(),
            loadTransactions({
              startDate: monthStart(year, month),
              endDate: monthEnd(year, month),
            }),
          ]);
        }}
      />
    </ScrollView>
  );
}

function groupByCategory(
  txs: Transaction[],
  type: "income" | "expense",
  categories: Category[]
): PieChartData[] {
  const groups: Record<string, number> = {};
  txs
    .filter((t) => t.type === type)
    .forEach((t) => {
      groups[t.categoryId] = (groups[t.categoryId] ?? 0) + t.amount;
    });
  return Object.entries(groups)
    .map(([catId, value], index) => ({
      label: categories.find((c) => c.id === catId)?.name ?? "Outro",
      value,
      color: categoryColors[index % categoryColors.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function accountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    checking: "Conta corrente",
    savings: "Poupança",
    investment: "Investimento",
    wallet: "Carteira",
    other: "Outro",
  };
  return map[type] ?? type;
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
  const amountColor =
    tx.type === "income"
      ? colors.income
      : tx.type === "transfer"
        ? colors.transfer
        : colors.expense;
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "↔" : "-";

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

    // Hero card
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    heroLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
    heroMonthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
      marginBottom: 14,
    },
    heroMonthText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.95)" },
    heroNet: { fontSize: 34, fontWeight: "800", color: "#fff", marginBottom: 16 },
    heroRow: { flexDirection: "row", alignItems: "center" },
    heroItem: { flex: 1, flexDirection: "column", alignItems: "center", gap: 2 },
    heroItemLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
    heroItemValue: { fontSize: 14, fontWeight: "700", color: "#fff" },
    heroDivider: {
      width: 1,
      height: 32,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginHorizontal: 12,
    },

    // Chart card
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    chartTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
    chartTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 },
    drillRow: { gap: 8, marginTop: 12 },
    drillBtn: {
      borderRadius: 10,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    drillBtnText: { fontSize: 13, fontWeight: "600" },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    backBtnText: { fontSize: 13, fontWeight: "600" },
    noData: { fontSize: 13, color: colors.textDisabled, textAlign: "center", paddingVertical: 20 },

    // Bancos card
    banksCard: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    banksHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    banksLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
    banksTotal: { fontSize: 22, fontWeight: "700" },
    banksList: { marginTop: 4 },
    banksDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    bankRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    bankLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    bankDot: { width: 10, height: 10, borderRadius: 5 },
    bankName: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
    bankType: { fontSize: 11, color: colors.textSecondary },
    bankBalance: { fontSize: 14, fontWeight: "700" },
    banksEmpty: { fontSize: 13, color: colors.textDisabled, paddingVertical: 8 },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
    addBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
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
