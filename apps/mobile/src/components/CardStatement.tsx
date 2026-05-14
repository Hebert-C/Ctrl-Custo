import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Card, Transaction } from "@ctrl-custo/core";
import { formatCurrency } from "../hooks/useCurrency";
import { api } from "../lib/api";

interface StatementData {
  month: string;
  totalAmount: number;
  availableLimit: number;
  transactions: Transaction[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  card: Card;
  isDark: boolean;
}

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

export function CardStatement({ visible, onClose, card, isDark }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    load();
  }, [visible, year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const result = await api.cards.statement(card.id, monthStr);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.title}>{card.name}</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Navegação de mês */}
          <View style={s.monthNav}>
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
          ) : data ? (
            <>
              {/* Resumo */}
              <View style={s.summary}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryLabel}>Fatura</Text>
                  <Text style={[s.summaryValue, { color: colors.expense }]}>
                    {formatCurrency(data.totalAmount)}
                  </Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryLabel}>Disponível</Text>
                  <Text style={[s.summaryValue, { color: colors.income }]}>
                    {formatCurrency(data.availableLimit)}
                  </Text>
                </View>
              </View>

              {/* Transações */}
              <FlatList
                data={data.transactions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <Text style={s.emptyText}>Nenhuma transação neste mês</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={s.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.txDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={s.txDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={[s.txAmount, { color: colors.expense }]}>
                      -{formatCurrency(item.amount)}
                    </Text>
                  </View>
                )}
              />
            </>
          ) : (
            <View style={s.center}>
              <Text style={s.emptyText}>Não foi possível carregar a fatura</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    navBtn: { padding: 4 },
    monthLabel: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    center: { alignItems: "center", paddingVertical: 40 },
    summary: {
      flexDirection: "row",
      backgroundColor: colors.surfaceRaised,
      marginHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    summaryItem: { flex: 1, alignItems: "center", paddingVertical: 16 },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: "700" },
    summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 12 },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txDesc: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
    txDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: "700" },
    empty: { alignItems: "center", paddingVertical: 24 },
    emptyText: { fontSize: 14, color: colors.textDisabled },
  });
