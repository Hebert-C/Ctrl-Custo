import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Account, Category, Goal } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../hooks/useCurrency";
import { useGoalStore } from "../store/useGoalStore";
import { useTransactionStore } from "../store/useTransactionStore";
import { useAccountStore } from "../store/useAccountStore";

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  goal: Goal | undefined;
  accounts: Account[];
  categories: Category[];
}

export function DepositForm({ visible, onClose, isDark, goal, accounts, categories }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const deposit = useGoalStore((s) => s.deposit);
  const addTransaction = useTransactionStore((s) => s.add);
  const loadAccounts = useAccountStore((s) => s.load);

  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");

  const [amountRaw, setAmountRaw] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  // Sincroniza seleções default quando os dados chegam
  useEffect(() => {
    if (visible) {
      setAmountRaw("");
      setAccountId(accounts[0]?.id ?? "");
      setCategoryId(expenseCategories[0]?.id ?? "");
    }
  }, [visible]);

  async function handleSave() {
    if (!goal) return;
    const amount = parseCurrencyInput(amountRaw);
    if (amount === 0 || !accountId || !categoryId) return;

    setSaving(true);
    try {
      await deposit(goal.id, amount);

      await addTransaction({
        description: `Aporte: ${goal.name}`,
        amount,
        type: "expense",
        status: "confirmed",
        date: today(),
        categoryId,
        accountId,
      });

      await loadAccounts();

      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setAmountRaw("");
    onClose();
  }

  const remaining = goal ? goal.targetAmount - goal.currentAmount : 0;
  const s = styles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={s.sheetTitleBlock}>
              <Text style={s.sheetTitle}>Depositar na Meta</Text>
              {goal && (
                <Text style={s.sheetSubtitle}>
                  {goal.icon} {goal.name}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Falta para completar */}
          {goal && remaining > 0 && (
            <View style={s.remainingBadge}>
              <Ionicons name="flag-outline" size={14} color={colors.primary} />
              <Text style={s.remainingText}>
                Faltam{" "}
                {(remaining / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Valor do aporte</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={amountRaw}
                onChangeText={(v) => setAmountRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
                autoFocus
              />
            </View>

            <Text style={s.label}>Debitar da conta</Text>
            {accounts.length === 0 ? (
              <Text style={s.hint}>Cadastre uma conta primeiro</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.chip, accountId === a.id && { backgroundColor: colors.primary }]}
                    onPress={() => setAccountId(a.id)}
                  >
                    <Text style={[s.chipText, accountId === a.id && { color: "#fff" }]}>
                      {a.icon} {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={s.label}>Categoria da despesa</Text>
            {expenseCategories.length === 0 ? (
              <Text style={s.hint}>Cadastre uma categoria de despesa primeiro</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                {expenseCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.chip, categoryId === c.id && { backgroundColor: colors.primary }]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[s.chipText, categoryId === c.id && { color: "#fff" }]}>
                      {c.icon} {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={s.infoText}>
                O valor será lançado como despesa na conta selecionada e somado ao progresso da
                meta.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, (saving || !accountId || !categoryId) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving || !accountId || !categoryId}
            >
              <Text style={s.saveBtnText}>{saving ? "Salvando..." : "Confirmar Depósito"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      maxHeight: "85%",
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
      alignItems: "flex-start",
      marginBottom: 8,
    },
    sheetTitleBlock: { flex: 1 },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    sheetSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    remainingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primarySurface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: "flex-start",
      marginBottom: 8,
    },
    remainingText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    currencyPrefix: { fontSize: 18, color: colors.textSecondary, marginRight: 4 },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      paddingVertical: 12,
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
    hint: { fontSize: 13, color: colors.textDisabled, fontStyle: "italic", marginTop: 4 },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      padding: 10,
      marginTop: 16,
    },
    infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      marginTop: 16,
      marginBottom: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
