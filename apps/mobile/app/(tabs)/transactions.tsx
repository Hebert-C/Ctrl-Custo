import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
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
import { TransactionForm } from "../../src/components/TransactionForm";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Transaction } from "@ctrl-custo/core";

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

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const isHidden = useUiStore((s) => s.isHidden);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [formVisible, setFormVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const transactions = useTransactionStore((s) => s.transactions);
  const { accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const loadTransactions = useTransactionStore((s) => s.load);

  const loadAll = useCallback(async () => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    await Promise.all([loadAccounts(), loadCategories(), loadTransactions({ startDate, endDate })]);
    setLoading(false);
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

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

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>
          {MONTHS[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={40} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhuma transação neste mês</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TxItem
              tx={item}
              categoryName={categories.find((c) => c.id === item.categoryId)?.name ?? ""}
              isHidden={isHidden}
              colors={colors}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => setFormVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <TransactionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        accounts={accounts}
        categories={categories}
        isDark={isDark}
      />
    </View>
  );
}

function TxItem({
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
  const statusColor = tx.status === "pending" ? colors.pending : colors.textDisabled;

  return (
    <View style={s.txRow}>
      <View style={s.txLeft}>
        <Text style={s.txDesc} numberOfLines={1}>
          {tx.description}
        </Text>
        <View style={s.txMetaRow}>
          <Text style={s.txMeta}>{categoryName}</Text>
          {tx.status === "pending" && (
            <Text style={[s.txStatus, { color: statusColor }]}> · pendente</Text>
          )}
          {tx.installment && (
            <Text style={s.txMeta}>
              {" "}
              · {tx.installment.current}/{tx.installment.total}x
            </Text>
          )}
        </View>
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, { color: amountColor }]}>
          {isHidden ? "••••" : `${sign}${formatCurrency(tx.amount)}`}
        </Text>
        <Text style={s.txDate}>{formatDate(tx.date)}</Text>
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    navBtn: { padding: 4 },
    monthLabel: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 15, color: colors.textDisabled },
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
    txMetaRow: { flexDirection: "row", marginTop: 2 },
    txMeta: { fontSize: 12, color: colors.textSecondary },
    txStatus: { fontSize: 12 },
    txRight: { alignItems: "flex-end" },
    txAmount: { fontSize: 14, fontWeight: "700" },
    txDate: { fontSize: 11, color: colors.textDisabled, marginTop: 2 },
    fab: {
      position: "absolute",
      right: 16,
      backgroundColor: colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
