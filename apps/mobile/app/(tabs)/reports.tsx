import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/store/useThemeStore";
import { lightColors, darkColors, BarChart, LineChart } from "@ctrl-custo/ui";
import type { Colors, BarChartData, LineChartData } from "@ctrl-custo/ui";
import { api } from "../../src/lib/api";
import type { Transaction } from "@ctrl-custo/core";

type Period = 3 | 6 | 12;

const MONTHS_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface MonthData {
  label: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
}

export default function Reports() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;

  const [period, setPeriod] = useState<Period>(6);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const txs = await api.transactions.list();
    setAllTxs(txs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const months = lastNMonths(period);
  const monthData = aggregateMonths(allTxs, months);

  const incomeBarData: BarChartData[] = monthData.map((m) => ({ x: m.label, y: m.income }));
  const expenseBarData: BarChartData[] = monthData.map((m) => ({ x: m.label, y: m.expense }));
  const netLineData: LineChartData[] = buildCumulativeLine(monthData);

  const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthData.reduce((s, m) => s + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  async function handleExport() {
    const header = "Mês;Receitas;Despesas;Saldo";
    const rows = monthData.map(
      (m) =>
        `${m.label} ${m.year};${(m.income / 100).toFixed(2)};${(m.expense / 100).toFixed(2)};${(m.net / 100).toFixed(2)}`
    );
    const csv = [header, ...rows].join("\n");
    await Share.share({ message: csv, title: "Relatório Ctrl+Custo" });
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Relatórios</Text>
        <TouchableOpacity onPress={handleExport} style={s.exportBtn}>
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={[s.exportText, { color: colors.primary }]}>CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de período */}
      <View style={s.periodRow}>
        {([3, 6, 12] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              s.periodBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              period === p && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodText, { color: period === p ? "#fff" : colors.textSecondary }]}>
              {p}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        >
          {/* Cards resumo */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderLeftColor: colors.income }]}>
              <Text style={s.summaryLabel}>Receitas</Text>
              <Text style={[s.summaryValue, { color: colors.income }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={[s.summaryCard, { borderLeftColor: colors.expense }]}>
              <Text style={s.summaryLabel}>Despesas</Text>
              <Text style={[s.summaryValue, { color: colors.expense }]}>
                {formatCurrency(totalExpense)}
              </Text>
            </View>
            <View
              style={[
                s.summaryCard,
                { borderLeftColor: totalNet >= 0 ? colors.income : colors.expense },
              ]}
            >
              <Text style={s.summaryLabel}>Saldo</Text>
              <Text
                style={[s.summaryValue, { color: totalNet >= 0 ? colors.income : colors.expense }]}
              >
                {totalNet >= 0 ? "+" : ""}
                {formatCurrency(totalNet)}
              </Text>
            </View>
          </View>

          {/* Gráfico — Receitas */}
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Receitas por mês</Text>
            {incomeBarData.some((d) => d.y > 0) ? (
              <BarChart data={incomeBarData} color={colors.income} height={200} />
            ) : (
              <Text style={s.noData}>Nenhuma receita no período</Text>
            )}
          </View>

          {/* Gráfico — Despesas */}
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Despesas por mês</Text>
            {expenseBarData.some((d) => d.y > 0) ? (
              <BarChart data={expenseBarData} color={colors.expense} height={200} />
            ) : (
              <Text style={s.noData}>Nenhuma despesa no período</Text>
            )}
          </View>

          {/* Gráfico — Evolução do saldo */}
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Evolução do saldo acumulado</Text>
            {netLineData.some((d) => d.y !== 0) ? (
              <LineChart data={netLineData} color={colors.primary} height={200} />
            ) : (
              <Text style={s.noData}>Sem dados no período</Text>
            )}
          </View>

          {/* Tabela mensal */}
          <View style={s.tableCard}>
            <Text style={s.chartTitle}>Detalhamento mensal</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableCell, s.tableHeadText, { flex: 1.2 }]}>Mês</Text>
              <Text style={[s.tableCell, s.tableHeadText, { color: colors.income }]}>Receitas</Text>
              <Text style={[s.tableCell, s.tableHeadText, { color: colors.expense }]}>
                Despesas
              </Text>
              <Text style={[s.tableCell, s.tableHeadText]}>Saldo</Text>
            </View>
            {monthData.map((m, i) => {
              const isCurrentMonth = isCurrentMonthFn(m.year, m.month);
              return (
                <View
                  key={i}
                  style={[
                    s.tableRow,
                    { borderTopColor: colors.border },
                    isCurrentMonth && { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <View
                    style={[
                      s.tableCell,
                      { flex: 1.2, flexDirection: "row", alignItems: "center", gap: 4 },
                    ]}
                  >
                    <Text style={s.tableCellText}>{m.label}</Text>
                    {isCurrentMonth && (
                      <View style={[s.currentBadge, { backgroundColor: colors.primary }]}>
                        <Text style={s.currentBadgeText}>atual</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.tableCell, s.tableCellText, { color: colors.income }]}>
                    {formatCurrency(m.income)}
                  </Text>
                  <Text style={[s.tableCell, s.tableCellText, { color: colors.expense }]}>
                    {formatCurrency(m.expense)}
                  </Text>
                  <Text
                    style={[
                      s.tableCell,
                      s.tableCellText,
                      { color: m.net >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    {m.net >= 0 ? "+" : ""}
                    {formatCurrency(m.net)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function lastNMonths(n: number): { year: number; month: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS_LABELS[d.getMonth()] };
  });
}

function aggregateMonths(
  txs: Transaction[],
  months: { year: number; month: number; label: string }[]
): MonthData[] {
  return months.map(({ year, month, label }) => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    const monthTxs = txs.filter(
      (t) => t.date >= start && t.date <= end && t.status === "confirmed"
    );
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { label, year, month, income, expense, net: income - expense };
  });
}

function buildCumulativeLine(monthData: MonthData[]): LineChartData[] {
  let cumulative = 0;
  return monthData.map((m) => {
    cumulative += m.net;
    return { x: m.label, y: cumulative };
  });
}

function isCurrentMonthFn(year: number, month: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function formatCurrency(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    exportBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    exportText: { fontSize: 14, fontWeight: "600" },
    periodRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    periodBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    periodText: { fontSize: 14, fontWeight: "600" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 3,
    },
    summaryLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
    summaryValue: { fontSize: 12, fontWeight: "700" },

    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    chartTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 8 },
    noData: { fontSize: 13, color: colors.textDisabled, paddingVertical: 20, textAlign: "center" },

    tableCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: "row",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1 },
    tableCell: { flex: 1, paddingHorizontal: 2 },
    tableHeadText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    tableCellText: { fontSize: 12, color: colors.textPrimary },
    currentBadge: {
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    currentBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  });
