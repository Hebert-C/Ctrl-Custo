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
import type { Account, AccountType, NewAccount } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../hooks/useCurrency";
import { useAccountStore } from "../store/useAccountStore";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "cash", label: "Dinheiro" },
  { value: "wallet", label: "Carteira" },
];

const PRESET_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#65A30D",
  "#059669",
  "#0891B2",
  "#475569",
];

const PRESET_ICONS = ["🏦", "💰", "💵", "💳", "🏧", "📊", "💹", "🪙", "💼", "🔐"];

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  account?: Account;
}

export function AccountForm({ visible, onClose, isDark, account }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const add = useAccountStore((s) => s.add);
  const update = useAccountStore((s) => s.update);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [bankName, setBankName] = useState("");
  const [balanceRaw, setBalanceRaw] = useState("");
  const [icon, setIcon] = useState("🏦");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Preenche o formulário quando abre em modo edição
  useEffect(() => {
    if (visible && account) {
      setName(account.name);
      setType(account.type);
      setBankName(account.bankName ?? "");
      setBalanceRaw(formatCurrencyInput(account.balance));
      setIcon(account.icon);
      setColor(account.color);
    } else if (visible && !account) {
      resetFields();
    }
  }, [visible, account]);

  function resetFields() {
    setName("");
    setType("checking");
    setBankName("");
    setBalanceRaw("");
    setIcon("🏦");
    setColor(PRESET_COLORS[0]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data: NewAccount = {
        name: name.trim(),
        type,
        balance: parseCurrencyInput(balanceRaw),
        icon,
        color,
        bankName: bankName.trim() || undefined,
        isArchived: false,
      };
      if (account) {
        await update(account.id, data);
      } else {
        await add(data);
      }
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    resetFields();
    onClose();
  }

  const isEditing = !!account;
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
            <Text style={s.sheetTitle}>{isEditing ? "Editar Conta" : "Nova Conta"}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={s.label}>Tipo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.chip, type === t.value && { backgroundColor: colors.primary }]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[s.chipText, type === t.value && { color: "#fff" }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Banco (opcional)</Text>
            <TextInput
              style={s.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Ex: Nubank"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={s.label}>{isEditing ? "Saldo atual" : "Saldo inicial"}</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={balanceRaw}
                onChangeText={(v) => setBalanceRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <Text style={s.label}>Ícone</Text>
            <View style={s.iconGrid}>
              {PRESET_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    s.iconBtn,
                    icon === ic && {
                      backgroundColor: colors.primary + "33",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIcon(ic)}
                >
                  <Text style={s.iconBtnText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Cor</Text>
            <View style={s.colorGrid}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorBtnSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>
                {saving ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
    iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBtnText: { fontSize: 22 },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    colorBtn: { width: 32, height: 32, borderRadius: 16 },
    colorBtnSelected: { borderWidth: 3, borderColor: colors.textPrimary },
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
