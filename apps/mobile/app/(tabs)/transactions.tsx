import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { TransactionFilters, countActiveFilters } from "../../src/components/TransactionFilters";
import type { ActiveFilters } from "../../src/components/TransactionFilters";
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
  const [filterVisible, setFilterVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [loading, setLoading] = useState(true);

  const transactions = useTransactionStore((s) => s.transactions);
  const remove = useTransactionStore((s) => s.remove);
  const { accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const loadTransactions = useTransactionStore((s) => s.load);

  function dateRange(y: number, m: number) {
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    return { startDate, endDate };
  }

  const loadAll = useCallback(async () => {
    await Promise.all([loadAccounts(), loadCategories()]);
    await loadTransactions({ ...dateRange(year, month), ...activeFilters });
    setLoading(false);
  }, [year, month, activeFilters]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function openCreate() {
    setEditingTx(undefined);
    setFormVisible(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setFormVisible(true);
  }

  function confirmDelete(tx: Transaction) {
    Alert.alert("Excluir transação", `"${tx.description}" será removida permanentemente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await remove(tx.id);
          await loadAccounts();
        },
      },
    ]);
  }

  async function handleSaved() {
    await loadAccounts();
    await loadTransactions({ ...dateRange(year, month), ...activeFilters });
  }

  async function handleApplyFilters(filters: ActiveFilters) {
    setActiveFilters(filters);
    await loadTransactions({ ...dateRange(year, month), ...filters });
  }

  async function handleClearFilters() {
    setActiveFilters({});
    await loadTransactions(dateRange(year, month));
  }

  const filterCount = countActiveFilters(activeFilters);
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
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={[s.filterBtn, filterCount > 0 && { backgroundColor: colors.primary }]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filterCount > 0 ? "#fff" : colors.textSecondary}
          />
          {filterCount > 0 && <Text style={s.filterBadge}>{filterCount}</Text>}
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
              <Text style={s.emptyText}>
                {filterCount > 0
                  ? "Nenhuma transação com esses filtros"
                  : "Nenhuma transação neste mês"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TxItem
              tx={item}
              categoryName={categories.find((c) => c.id === item.categoryId)?.name ?? ""}
              isHidden={isHidden}
              colors={colors}
              onPress={() => openEdit(item)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { bottom: insets.bottom + 16 }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <TransactionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        accounts={accounts}
        categories={categories}
        isDark={isDark}
        editing={editingTx}
        onSaved={handleSaved}
      />

      <TransactionFilters
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        categories={categories}
        accounts={accounts}
        current={activeFilters}
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
  onPress,
  onLongPress,
}: {
  tx: Transaction;
  categoryName: string;
  isHidden: boolean;
  colors: Colors;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const s = styles(colors);
  const amountColor =
    tx.type === "income"
      ? colors.income
      : tx.type === "transfer"
        ? colors.transfer
        : colors.expense;
  const sign = tx.type === "income" ? "+" : tx.type === "transfer" ? "↔" : "-";
  const statusColor = tx.status === "pending" ? colors.pending : colors.textDisabled;

  return (
    <TouchableOpacity
      style={s.txRow}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
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
    monthLabel: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    filterBadge: { fontSize: 12, fontWeight: "700", color: "#fff" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 15, color: colors.textDisabled, textAlign: "center" },
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
