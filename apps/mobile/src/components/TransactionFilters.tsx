import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Category, Account } from "@ctrl-custo/core";

type TxType = "income" | "expense" | "transfer";

export interface ActiveFilters {
  type?: TxType;
  categoryId?: string;
  accountId?: string;
  search?: string;
}

export function countActiveFilters(f: ActiveFilters): number {
  return [f.type, f.categoryId, f.accountId, f.search?.trim()].filter(Boolean).length;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ActiveFilters) => void;
  onClear: () => void;
  categories: Category[];
  accounts: Account[];
  current: ActiveFilters;
  isDark: boolean;
}

const TYPE_OPTIONS: { label: string; value: TxType }[] = [
  { label: "Receita", value: "income" },
  { label: "Despesa", value: "expense" },
  { label: "Transferência", value: "transfer" },
];

export function TransactionFilters({
  visible,
  onClose,
  onApply,
  onClear,
  categories,
  accounts,
  current,
  isDark,
}: Props) {
  const colors = isDark ? darkColors : lightColors;
  const [type, setType] = useState<TxType | undefined>(current.type);
  const [categoryId, setCategoryId] = useState<string | undefined>(current.categoryId);
  const [accountId, setAccountId] = useState<string | undefined>(current.accountId);
  const [search, setSearch] = useState(current.search ?? "");

  useEffect(() => {
    if (visible) {
      setType(current.type);
      setCategoryId(current.categoryId);
      setAccountId(current.accountId);
      setSearch(current.search ?? "");
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    onApply({ type, categoryId, accountId, search: search.trim() || undefined });
    onClose();
  }

  function handleClear() {
    setType(undefined);
    setCategoryId(undefined);
    setAccountId(undefined);
    setSearch("");
    onClear();
    onClose();
  }

  const s = styles(colors);
  const hasActive = !!(type || categoryId || accountId || search.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.title}>Filtros</Text>
          {hasActive && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={[s.clearText, { color: colors.primary }]}>Limpar tudo</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <Text style={s.sectionLabel}>Busca</Text>
          <View style={[s.searchRow, { backgroundColor: colors.surface }]}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.textPrimary }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Descrição..."
              placeholderTextColor={colors.textDisabled}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={s.sectionLabel}>Tipo</Text>
          <View style={s.chips}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setType(active ? undefined : opt.value)}
                >
                  <Text style={[s.chipText, { color: active ? "#fff" : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {categories.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Categoria</Text>
              <View style={s.chips}>
                {categories.map((cat) => {
                  const active = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        s.chip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setCategoryId(active ? undefined : cat.id)}
                    >
                      <Text style={[s.chipText, { color: active ? "#fff" : colors.textSecondary }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {accounts.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Banco</Text>
              <View style={s.chips}>
                {accounts.map((acc) => {
                  const active = accountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        s.chip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setAccountId(active ? undefined : acc.id)}
                    >
                      <Text style={[s.chipText, { color: active ? "#fff" : colors.textSecondary }]}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[s.applyBtn, { backgroundColor: colors.primary }]}
          onPress={handleApply}
        >
          <Text style={s.applyText}>Aplicar filtros</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxHeight: "80%",
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    clearText: { fontSize: 14 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 18,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipText: { fontSize: 13 },
    applyBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    applyText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
