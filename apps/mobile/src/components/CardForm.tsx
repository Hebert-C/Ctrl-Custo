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
import type { Account, CardBrand, CoreDatabase, NewCard } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../hooks/useCurrency";
import { useCardStore } from "../store/useCardStore";

const CARD_BRANDS: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
  { value: "hipercard", label: "Hipercard" },
  { value: "other", label: "Outro" },
];

const PRESET_COLORS = [
  "#1A1A2E",
  "#16213E",
  "#0F3460",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#059669",
  "#D97706",
  "#475569",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  db: CoreDatabase;
  accounts: Account[];
  isDark: boolean;
}

export function CardForm({ visible, onClose, db, accounts, isDark }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const add = useCardStore((s) => s.add);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [limitRaw, setLimitRaw] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [dueDay, setDueDay] = useState("10");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !accountId) return;
    const billing = Math.min(Math.max(parseInt(billingDay, 10) || 1, 1), 31);
    const due = Math.min(Math.max(parseInt(dueDay, 10) || 10, 1), 31);
    setSaving(true);
    try {
      const data: NewCard = {
        name: name.trim(),
        brand,
        lastFourDigits: lastFourDigits.trim() || undefined,
        creditLimit: parseCurrencyInput(limitRaw),
        billingDay: billing,
        dueDay: due,
        accountId,
        color,
        isArchived: false,
      };
      await add(db, data);
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName("");
    setBrand("visa");
    setLastFourDigits("");
    setLimitRaw("");
    setBillingDay("1");
    setDueDay("10");
    setAccountId(accounts[0]?.id ?? "");
    setColor(PRESET_COLORS[0]);
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
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Novo Cartão</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Nome do cartão</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank Gold"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={s.label}>Bandeira</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {CARD_BRANDS.map((b) => (
                <TouchableOpacity
                  key={b.value}
                  style={[s.chip, brand === b.value && { backgroundColor: colors.primary }]}
                  onPress={() => setBrand(b.value)}
                >
                  <Text style={[s.chipText, brand === b.value && { color: "#fff" }]}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Últimos 4 dígitos (opcional)</Text>
            <TextInput
              style={s.input}
              value={lastFourDigits}
              onChangeText={(v) => setLastFourDigits(v.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              placeholder="1234"
              placeholderTextColor={colors.textDisabled}
              maxLength={4}
            />

            <Text style={s.label}>Limite de crédito</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={limitRaw}
                onChangeText={(v) => setLimitRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.label}>Dia fechamento</Text>
                <TextInput
                  style={s.input}
                  value={billingDay}
                  onChangeText={setBillingDay}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
              <View style={s.halfField}>
                <Text style={s.label}>Dia vencimento</Text>
                <TextInput
                  style={s.input}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            </View>

            {accounts.length > 0 && (
              <>
                <Text style={s.label}>Conta para pagamento</Text>
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
              </>
            )}

            <Text style={s.label}>Cor do cartão</Text>
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
              <Text style={s.saveBtnText}>{saving ? "Salvando..." : "Salvar"}</Text>
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
    row: { flexDirection: "row", gap: 12 },
    halfField: { flex: 1 },
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
