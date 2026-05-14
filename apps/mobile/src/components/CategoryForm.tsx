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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Category, CategoryType, NewCategory } from "@ctrl-custo/core";
import { useCategoryStore } from "../store/useCategoryStore";

const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "both", label: "Ambos" },
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

const PRESET_ICONS = [
  "",
  "🍔",
  "🚗",
  "🏠",
  "💊",
  "🎮",
  "📚",
  "✈️",
  "👗",
  "🐾",
  "⚽",
  "🎵",
  "💻",
  "📱",
  "🎁",
  "⚡",
  "💧",
  "🌿",
  "💰",
  "🏋️",
  "🎬",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  category?: Category;
}

export function CategoryForm({ visible, onClose, isDark, category }: Props) {
  const colors = isDark ? darkColors : lightColors;
  const allCategories = useCategoryStore((s) => s.categories);
  const add = useCategoryStore((s) => s.add);
  const update = useCategoryStore((s) => s.update);
  const remove = useCategoryStore((s) => s.remove);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[3]);
  const [saving, setSaving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  // Preenche o formulário quando abre em modo edição
  useEffect(() => {
    if (visible && category) {
      setName(category.name);
      setType(category.type);
      setIcon(category.icon);
      setColor(category.color);
    } else if (visible && !category) {
      resetFields();
    }
  }, [visible, category]);

  function resetFields() {
    setName("");
    setType("expense");
    setIcon("");
    setColor(PRESET_COLORS[3]);
    setShowTransfer(false);
    setTransferTargetId(null);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data: NewCategory = {
        name: name.trim(),
        type,
        icon,
        color,
      };
      if (category) {
        await update(category.id, data);
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

  function handleDelete() {
    if (!category) return;
    Alert.alert("Excluir categoria", `"${category.name}" será removida permanentemente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(category.id);
            handleClose();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("vinculadas")) {
              setShowTransfer(true);
            } else {
              Alert.alert("Erro", "Não foi possível excluir a categoria.");
            }
          }
        },
      },
    ]);
  }

  async function handleTransferAndDelete() {
    if (!category || !transferTargetId) return;
    setSaving(true);
    try {
      await remove(category.id, transferTargetId);
      handleClose();
    } catch {
      Alert.alert("Erro", "Não foi possível transferir as transações.");
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!category;
  const otherCategories = allCategories.filter((c) => c.id !== category?.id);
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
            <Text style={s.sheetTitle}>{isEditing ? "Editar Categoria" : "Nova Categoria"}</Text>
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
              placeholder="Ex: Alimentação"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={s.label}>Tipo</Text>
            <View style={s.typeRow}>
              {CATEGORY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.typeBtn, type === t.value && { backgroundColor: colors.primary }]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[s.typeBtnText, type === t.value && { color: "#fff" }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Ícone</Text>
            <View style={s.iconGrid}>
              {PRESET_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic === "" ? "__blank__" : ic}
                  style={[
                    s.iconBtn,
                    icon === ic && {
                      backgroundColor: colors.primary + "33",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIcon(ic)}
                >
                  {ic === "" ? (
                    <Ionicons name="close" size={18} color={colors.textDisabled} />
                  ) : (
                    <Text style={s.iconBtnText}>{ic}</Text>
                  )}
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

            {isEditing && !showTransfer && (
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                <Text style={s.deleteBtnText}>Excluir categoria</Text>
              </TouchableOpacity>
            )}

            {isEditing && showTransfer && (
              <View style={s.transferSection}>
                <Text style={s.transferTitle}>Categoria com transações vinculadas</Text>
                <Text style={s.transferSubtitle}>
                  Selecione uma categoria para receber as transações antes de excluir:
                </Text>
                {otherCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      s.transferOption,
                      transferTargetId === cat.id && s.transferOptionSelected,
                    ]}
                    onPress={() => setTransferTargetId(cat.id)}
                  >
                    <View style={[s.transferDot, { backgroundColor: cat.color }]} />
                    {cat.icon ? <Text style={s.transferIcon}>{cat.icon}</Text> : null}
                    <Text style={s.transferOptionText}>{cat.name}</Text>
                    {transferTargetId === cat.id && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.saveBtn, (!transferTargetId || saving) && { opacity: 0.5 }]}
                  onPress={handleTransferAndDelete}
                  disabled={!transferTargetId || saving}
                >
                  <Text style={s.saveBtnText}>
                    {saving ? "Transferindo..." : "Transferir e excluir"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelTransferBtn}
                  onPress={() => setShowTransfer(false)}
                >
                  <Text style={s.cancelTransferText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
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
    typeRow: { flexDirection: "row", gap: 8 },
    typeBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
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
    deleteBtn: {
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    deleteBtnText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
    transferSection: { marginTop: 8 },
    transferTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
    transferSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
    transferOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      marginBottom: 6,
    },
    transferOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "18",
    },
    transferDot: { width: 12, height: 12, borderRadius: 6 },
    transferIcon: { fontSize: 16 },
    transferOptionText: { flex: 1, fontSize: 14, color: colors.textPrimary },
    cancelTransferBtn: { padding: 14, alignItems: "center", marginBottom: 8 },
    cancelTransferText: { fontSize: 15, color: colors.textSecondary },
  });
