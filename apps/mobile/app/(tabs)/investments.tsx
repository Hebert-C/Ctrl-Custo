import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useInvestmentStore } from "../../src/store/useInvestmentStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "../../src/hooks/useCurrency";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Investment, NewInvestment } from "@ctrl-custo/core";

const TYPE_LABELS: Record<Investment["type"], string> = {
  stock: "Ação",
  fund: "Fundo/ETF",
  crypto: "Cripto",
  fixed_income: "Renda Fixa",
  real_estate: "FII",
  other: "Outro",
};

const TYPE_COLORS: Record<Investment["type"], string> = {
  stock: "#3B82F6",
  fund: "#8B5CF6",
  crypto: "#F59E0B",
  fixed_income: "#10B981",
  real_estate: "#F97316",
  other: "#6B7280",
};

const TYPES: Investment["type"][] = [
  "stock",
  "fund",
  "crypto",
  "fixed_income",
  "real_estate",
  "other",
];

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function Investments() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const isHidden = useUiStore((s) => s.isHidden);

  const { investments, load, add, update, remove } = useInvestmentStore();
  const { accounts, load: loadAccounts } = useAccountStore();

  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const loadAll = useCallback(async () => {
    await Promise.all([load(), loadAccounts()]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function confirmDelete(inv: Investment) {
    Alert.alert("Excluir investimento", `"${inv.name}" será removido permanentemente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(inv.id);
          } catch {
            Alert.alert("Erro", "Não foi possível excluir.");
          }
        },
      },
    ]);
  }

  const totalValue = investments.reduce((sum, inv) => sum + inv.quantity * inv.currentPrice, 0);
  const totalCost = investments.reduce((sum, inv) => sum + inv.quantity * inv.purchasePrice, 0);
  const totalPnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Investimentos</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            setEditing(null);
            setFormVisible(true);
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary card */}
      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Valor atual</Text>
            <Text style={s.summaryValue}>{isHidden ? "••••••" : formatCurrency(totalValue)}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Custo total</Text>
            <Text style={s.summaryValue}>{isHidden ? "••••••" : formatCurrency(totalCost)}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Lucro/Perda</Text>
            <Text
              style={[s.summaryValue, { color: totalPnl >= 0 ? colors.income : colors.expense }]}
            >
              {isHidden ? "••••••" : `${totalPnl >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={investments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="trending-up-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyText}>Nenhum investimento ainda</Text>
            <Text style={s.emptySubText}>Toque em + para adicionar</Text>
          </View>
        }
        renderItem={({ item }) => {
          const value = item.quantity * item.currentPrice;
          const cost = item.quantity * item.purchasePrice;
          const pnl = value - cost;
          const pct = cost > 0 ? (pnl / cost) * 100 : 0;
          return (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={[s.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + "22" }]}>
                  <Text style={[s.typeBadgeText, { color: TYPE_COLORS[item.type] }]}>
                    {TYPE_LABELS[item.type]}
                  </Text>
                </View>
                <Text style={s.cardName} numberOfLines={1}>
                  {item.name}
                  {item.ticker ? ` · ${item.ticker}` : ""}
                </Text>
                <Text style={s.cardQty}>
                  {item.quantity % 1 === 0
                    ? `${item.quantity} cotas`
                    : `${item.quantity.toFixed(6)} cotas`}
                </Text>
              </View>
              <View style={s.cardRight}>
                <Text style={s.cardValue}>{isHidden ? "••••••" : formatCurrency(value)}</Text>
                <Text style={[s.cardPnl, { color: pnl >= 0 ? colors.income : colors.expense }]}>
                  {isHidden ? "••••" : `${pnl >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
                </Text>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditing(item);
                      setFormVisible(true);
                    }}
                    style={s.actionBtn}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Form modal */}
      <InvestmentForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        accounts={accounts}
        isDark={isDark}
        editing={editing ?? undefined}
        onSaved={async () => {
          setFormVisible(false);
          await load();
        }}
        add={add}
        update={update}
      />
    </View>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormProps {
  visible: boolean;
  onClose: () => void;
  accounts: import("@ctrl-custo/core").Account[];
  isDark: boolean;
  editing?: Investment;
  onSaved: () => void;
  add: (data: NewInvestment) => Promise<Investment>;
  update: (id: string, data: Partial<NewInvestment>) => Promise<void>;
}

function InvestmentForm({
  visible,
  onClose,
  accounts,
  isDark,
  editing,
  onSaved,
  add,
  update,
}: FormProps) {
  const colors = isDark ? darkColors : lightColors;

  const [name, setName] = useState("");
  const [type, setType] = useState<Investment["type"]>("stock");
  const [ticker, setTicker] = useState("");
  const [quantityRaw, setQuantityRaw] = useState("");
  const [purchasePriceRaw, setPurchasePriceRaw] = useState("");
  const [currentPriceRaw, setCurrentPriceRaw] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setTicker(editing.ticker ?? "");
      setQuantityRaw(String(editing.quantity));
      setPurchasePriceRaw(formatCurrencyInput(editing.purchasePrice));
      setCurrentPriceRaw(formatCurrencyInput(editing.currentPrice));
      setPurchaseDate(editing.purchaseDate);
      setAccountId(editing.accountId);
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setType("stock");
      setTicker("");
      setQuantityRaw("");
      setPurchasePriceRaw("");
      setCurrentPriceRaw("");
      setPurchaseDate(today());
      setAccountId(accounts[0]?.id ?? "");
      setNotes("");
    }
    setErrors({});
  }, [visible, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    const quantity = parseFloat(quantityRaw.replace(",", ".")) || 0;
    const purchasePrice = parseCurrencyInput(purchasePriceRaw);
    const currentPrice = parseCurrencyInput(currentPriceRaw);
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Nome é obrigatório.";
    if (quantity <= 0) newErrors.quantity = "Quantidade deve ser maior que zero.";
    if (purchasePrice <= 0) newErrors.purchasePrice = "Preço de compra obrigatório.";
    if (currentPrice <= 0) newErrors.currentPrice = "Preço atual obrigatório.";
    if (!accountId) newErrors.account = "Selecione uma conta.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const data: NewInvestment = {
        name: name.trim(),
        type,
        ticker: ticker.trim() || undefined,
        quantity,
        purchasePrice,
        currentPrice,
        purchaseDate,
        accountId,
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await update(editing.id, data);
      } else {
        await add(data);
      }
      onSaved();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {editing ? "Editar Investimento" : "Novo Investimento"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Nome */}
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={[s.input, !!errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Tesouro Direto 2029"
              placeholderTextColor={colors.textDisabled}
            />
            {!!errors.name && <Text style={s.errorText}>{errors.name}</Text>}

            {/* Tipo */}
            <Text style={s.label}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.chip,
                    type === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[s.chipText, type === t && { color: "#fff" }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ticker */}
            <Text style={s.label}>Ticker (opcional)</Text>
            <TextInput
              style={s.input}
              value={ticker}
              onChangeText={(v) => setTicker(v.toUpperCase())}
              placeholder="Ex: PETR4, BTC"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="characters"
            />

            {/* Quantidade */}
            <Text style={s.label}>Quantidade</Text>
            <TextInput
              style={[s.input, !!errors.quantity && s.inputError]}
              value={quantityRaw}
              onChangeText={setQuantityRaw}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
            />
            {!!errors.quantity && <Text style={s.errorText}>{errors.quantity}</Text>}

            {/* Preço de compra */}
            <Text style={s.label}>Preço de compra (R$)</Text>
            <View style={[s.amountRow, !!errors.purchasePrice && s.inputError]}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={purchasePriceRaw}
                onChangeText={(v) =>
                  setPurchasePriceRaw(formatCurrencyInput(parseCurrencyInput(v)))
                }
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            {!!errors.purchasePrice && <Text style={s.errorText}>{errors.purchasePrice}</Text>}

            {/* Preço atual */}
            <Text style={s.label}>Preço atual (R$)</Text>
            <View style={[s.amountRow, !!errors.currentPrice && s.inputError]}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={currentPriceRaw}
                onChangeText={(v) => setCurrentPriceRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            {!!errors.currentPrice && <Text style={s.errorText}>{errors.currentPrice}</Text>}

            {/* Data de compra */}
            <Text style={s.label}>Data de compra</Text>
            <TextInput
              style={s.input}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textDisabled}
            />

            {/* Conta */}
            <Text style={s.label}>Conta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[s.chip, accountId === a.id && { backgroundColor: colors.primary }]}
                  onPress={() => setAccountId(a.id)}
                >
                  <Text style={[s.chipText, accountId === a.id && { color: "#fff" }]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!!errors.account && <Text style={s.errorText}>{errors.account}</Text>}

            {/* Observações */}
            <Text style={s.label}>Observações (opcional)</Text>
            <TextInput
              style={[s.input, s.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Alguma observação..."
              placeholderTextColor={colors.textDisabled}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>
                {saving ? "Salvando..." : editing ? "Atualizar" : "Salvar"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryItem: { alignItems: "center", flex: 1 },
    summaryLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: "600" },
    emptySubText: { fontSize: 13, color: colors.textDisabled },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    cardLeft: { flex: 1, marginRight: 12 },
    cardRight: { alignItems: "flex-end" },
    typeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginBottom: 4,
    },
    typeBadgeText: { fontSize: 11, fontWeight: "600" },
    cardName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
    cardQty: { fontSize: 12, color: colors.textSecondary },
    cardValue: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    cardPnl: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    cardActions: { flexDirection: "row", gap: 8, marginTop: 8 },
    actionBtn: { padding: 4 },
    // Form
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      maxHeight: "92%",
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
    },
    notesInput: { height: 72 },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    currencyPrefix: { fontSize: 16, color: colors.textSecondary, marginRight: 4 },
    amountInput: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      paddingVertical: 10,
    },
    chipScroll: { marginBottom: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipText: { fontSize: 13, color: colors.textSecondary },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    inputError: { borderColor: colors.expense },
    errorText: { fontSize: 12, color: colors.expense, marginTop: 4 },
  });
