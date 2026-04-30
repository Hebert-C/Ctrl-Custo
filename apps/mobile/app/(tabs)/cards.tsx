import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDatabase } from "../../src/db/index";
import { useCardStore } from "../../src/store/useCardStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { CardForm } from "../../src/components/CardForm";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Card } from "@ctrl-custo/core";

const BRAND_ICONS: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  elo: "💳",
  amex: "💳",
  hipercard: "💳",
  other: "💳",
};

export default function Cards() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const isHidden = useUiStore((s) => s.isHidden);

  const { cards, load: loadCards } = useCardStore();
  const { accounts, load: loadAccounts } = useAccountStore();
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);

  const loadAll = useCallback(async () => {
    const db = getDatabase();
    await Promise.all([loadCards(db), loadAccounts(db)]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={s.pageTitle}>Cartões</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="card-outline" size={40} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhum cartão cadastrado</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CardItem
              card={item}
              accountName={accounts.find((a) => a.id === item.accountId)?.name ?? ""}
              isHidden={isHidden}
              colors={colors}
            />
          )}
        />
      )}

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setFormVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CardForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        db={getDatabase()}
        accounts={accounts}
        isDark={isDark}
      />
    </View>
  );
}

function CardItem({
  card,
  accountName,
  isHidden,
  colors,
}: {
  card: Card;
  accountName: string;
  isHidden: boolean;
  colors: Colors;
}) {
  const s = styles(colors);
  return (
    <View style={[s.cardItem, { backgroundColor: card.color }]}>
      <View style={s.cardHeader}>
        <Text style={s.cardBrand}>
          {BRAND_ICONS[card.brand]} {card.brand.toUpperCase()}
        </Text>
        {card.lastFourDigits && <Text style={s.cardDigits}>•••• {card.lastFourDigits}</Text>}
      </View>
      <Text style={s.cardName}>{card.name}</Text>
      <View style={s.cardFooter}>
        <View>
          <Text style={s.cardMetaLabel}>Limite</Text>
          <Text style={s.cardMeta}>
            {isHidden ? "R$ ••••••" : formatCurrency(card.creditLimit)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.cardMetaLabel}>Conta</Text>
          <Text style={s.cardMeta}>{accountName}</Text>
        </View>
      </View>
      <View style={s.cardDates}>
        <Text style={s.cardDateText}>Fechamento: dia {card.billingDay}</Text>
        <Text style={s.cardDateText}>Vencimento: dia {card.dueDay}</Text>
      </View>
    </View>
  );
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.textPrimary,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 15, color: colors.textDisabled },
    cardItem: {
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    cardBrand: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
    cardDigits: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
    cardName: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 16 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    cardMetaLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
    cardMeta: { fontSize: 14, fontWeight: "600", color: "#fff" },
    cardDates: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.2)",
      paddingTop: 8,
    },
    cardDateText: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
