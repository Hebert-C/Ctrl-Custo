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
import { useGoalStore } from "../../src/store/useGoalStore";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useUiStore } from "../../src/store/useUiStore";
import { formatCurrency } from "../../src/hooks/useCurrency";
import { GoalForm } from "../../src/components/GoalForm";
import { DepositForm } from "../../src/components/DepositForm";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import type { Goal } from "@ctrl-custo/core";

export default function Goals() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const isHidden = useUiStore((s) => s.isHidden);

  const { goals, load: loadGoals } = useGoalStore();
  const { accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();

  const [loading, setLoading] = useState(true);
  const [goalFormVisible, setGoalFormVisible] = useState(false);
  const [depositingGoal, setDepositingGoal] = useState<Goal | undefined>(undefined);

  const loadAll = useCallback(async () => {
    const db = getDatabase();
    await Promise.all([loadGoals(db), loadAccounts(db), loadCategories(db)]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const s = styles(colors);
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Text style={s.pageTitle}>Metas</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[...active, ...completed]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="trophy-outline" size={40} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhuma meta cadastrada</Text>
            </View>
          }
          renderItem={({ item }) => (
            <GoalItem
              goal={item}
              isHidden={isHidden}
              colors={colors}
              onDeposit={() => setDepositingGoal(item)}
            />
          )}
        />
      )}

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => setGoalFormVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <GoalForm
        visible={goalFormVisible}
        onClose={() => setGoalFormVisible(false)}
        db={getDatabase()}
        isDark={isDark}
      />

      <DepositForm
        visible={depositingGoal !== undefined}
        onClose={() => setDepositingGoal(undefined)}
        db={getDatabase()}
        isDark={isDark}
        goal={depositingGoal}
        accounts={accounts}
        categories={categories}
      />
    </View>
  );
}

function GoalItem({
  goal,
  isHidden,
  colors,
  onDeposit,
}: {
  goal: Goal;
  isHidden: boolean;
  colors: Colors;
  onDeposit: () => void;
}) {
  const s = styles(colors);
  const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
  const isCompleted = goal.status === "completed";

  return (
    <View style={s.goalCard}>
      <View style={s.goalHeader}>
        <Text style={s.goalIcon}>{goal.icon}</Text>
        <View style={s.goalInfo}>
          <Text style={s.goalName}>{goal.name}</Text>
          {goal.deadline && <Text style={s.goalDeadline}>Prazo: {formatDate(goal.deadline)}</Text>}
        </View>
        {isCompleted ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        ) : (
          <TouchableOpacity
            style={[s.depositBtn, { borderColor: colors.primary }]}
            onPress={onDeposit}
          >
            <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
            <Text style={[s.depositBtnText, { color: colors.primary }]}>Depositar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.progressBg}>
        <View
          style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: goal.color }]}
        />
      </View>

      <View style={s.goalAmounts}>
        <Text style={s.goalCurrent}>
          {isHidden ? "R$ ••••" : formatCurrency(goal.currentAmount)}
        </Text>
        <Text style={s.goalTarget}>
          de {isHidden ? "R$ ••••" : formatCurrency(goal.targetAmount)}
        </Text>
        <Text style={s.goalPercent}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
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
    goalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    goalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    goalIcon: { fontSize: 24, marginRight: 10 },
    goalInfo: { flex: 1 },
    goalName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
    goalDeadline: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    depositBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    depositBtnText: { fontSize: 12, fontWeight: "600" },
    progressBg: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 10,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 4 },
    goalAmounts: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    goalCurrent: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    goalTarget: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    goalPercent: { fontSize: 12, color: colors.textSecondary },
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
