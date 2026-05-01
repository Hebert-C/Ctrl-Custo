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
import type { NewGoal } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../hooks/useCurrency";
import { useGoalStore } from "../store/useGoalStore";

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

const PRESET_ICONS = ["🏠", "🚗", "✈️", "📱", "💻", "🎓", "👶", "💍", "🏖️", "🎯", "💰", "⌚"];

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function GoalForm({ visible, onClose, isDark }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const add = useGoalStore((s) => s.add);

  const [name, setName] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const target = parseCurrencyInput(targetRaw);
    if (!name.trim() || target === 0) return;
    setSaving(true);
    try {
      const data: NewGoal = {
        name: name.trim(),
        targetAmount: target,
        currentAmount: 0,
        deadline: deadline.trim() || undefined,
        status: "active",
        color,
        icon,
        notes: notes.trim() || undefined,
      };
      await add(data);
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName("");
    setTargetRaw("");
    setDeadline("");
    setNotes("");
    setIcon("🎯");
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
            <Text style={s.sheetTitle}>Nova Meta</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Nome da meta</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Viagem para Europa"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={s.label}>Valor alvo</Text>
            <View style={s.amountRow}>
              <Text style={s.currencyPrefix}>R$</Text>
              <TextInput
                style={s.amountInput}
                value={targetRaw}
                onChangeText={(v) => setTargetRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <Text style={s.label}>Prazo (opcional)</Text>
            <TextInput
              style={s.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textDisabled}
            />

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

            <Text style={s.label}>Observações (opcional)</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas sobre a meta..."
              placeholderTextColor={colors.textDisabled}
              multiline
            />

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
    textArea: { minHeight: 60, textAlignVertical: "top" },
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
