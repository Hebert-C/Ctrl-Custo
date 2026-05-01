import React, { useState } from "react";
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
import type { Account, Category, NewTransaction } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../hooks/useCurrency";
import { useTransactionStore } from "../store/useTransactionStore";

interface Props {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  isDark: boolean;
}

type TxType = "income" | "expense";

export function TransactionForm({ visible, onClose, accounts, categories, isDark }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const add = useTransactionStore((s) => s.add);
  const addInstallments = useTransactionStore((s) => s.addInstallments);

  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type || c.type === "both");

  async function handleSave() {
    const amount = parseCurrencyInput(amountRaw);
    if (!description.trim() || amount === 0 || !selectedAccountId || !selectedCategoryId) return;

    setSaving(true);
    try {
      const data: Omit<NewTransaction, "installment"> = {
        description: description.trim(),
        amount,
        type,
        status: "confirmed",
        date,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
      };

      const total = parseInt(installments, 10) || 1;
      if (total > 1) {
        await addInstallments(data, total);
      } else {
        await add({ ...data });
      }
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setDescription("");
    setAmountRaw("");
    setInstallments("1");
    setSelectedCategoryId("");
    onClose();
  }

  const s = styles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Nova Transação</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo */}
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeBtn, type === "expense" && { backgroundColor: colors.expense }]}
                onPress={() => setType("expense")}
              >
                <Text style={[s.typeBtnText, type === "expense" && { color: "#fff" }]}>
                  Despesa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, type === "income" && { backgroundColor: colors.income }]}
                onPress={() => setType("income")}
              >
                <Text style={[s.typeBtnText, type === "income" && { color: "#fff" }]}>Receita</Text>
              </TouchableOpacity>
            </View>

            {/* Valor */}
            <Text style={s.label}>Valor</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={amountRaw}
                onChangeText={(v) => setAmountRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            {/* Descrição */}
            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Supermercado"
              placeholderTextColor={colors.textDisabled}
            />

            {/* Data */}
            <Text style={s.label}>Data</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textDisabled}
            />

            {/* Conta */}
            <Text style={s.label}>Conta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    s.chip,
                    selectedAccountId === a.id && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedAccountId(a.id)}
                >
                  <Text style={[s.chipText, selectedAccountId === a.id && { color: "#fff" }]}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Categoria */}
            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {filteredCategories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    s.chip,
                    selectedCategoryId === c.id && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedCategoryId(c.id)}
                >
                  <Text style={[s.chipText, selectedCategoryId === c.id && { color: "#fff" }]}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Parcelas (só para despesa) */}
            {type === "expense" && (
              <>
                <Text style={s.label}>Parcelas</Text>
                <TextInput
                  style={s.input}
                  value={installments}
                  onChangeText={setInstallments}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textDisabled}
                />
              </>
            )}

            {/* Botão salvar */}
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>{saving ? "Salvando..." : "Salvar"}</Text>
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
      maxHeight: "90%",
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
    typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    typeBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtnText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
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
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
      paddingVertical: 10,
    },
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
  });
