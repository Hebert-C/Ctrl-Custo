import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Colors } from "@ctrl-custo/ui";

interface Props {
  hasAccounts: boolean;
  hasCategories: boolean;
  hasTransactions: boolean;
  onAddTransaction: () => void;
  colors: Colors;
}

const STORAGE_KEY = "ctrl-custo-onboarding-dismissed";

export function OnboardingChecklist({
  hasAccounts,
  hasCategories,
  hasTransactions,
  onAddTransaction,
  colors,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setDismissed(val === "true");
      setLoaded(true);
    });
  }, []);

  if (!loaded || dismissed || (hasAccounts && hasCategories && hasTransactions)) return null;

  async function dismiss() {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  const steps = [
    {
      label: "Cadastrar seu primeiro banco",
      detail: "Necessário para registrar transações",
      done: hasAccounts,
      onAction: () => router.push("/(tabs)/settings"),
      actionLabel: "Ir para Configurações →",
    },
    {
      label: "Verificar suas categorias",
      detail: "Categorias padrão já foram criadas para você",
      done: hasCategories,
      onAction: () => router.push("/(tabs)/settings"),
      actionLabel: "Ver categorias →",
    },
    {
      label: "Adicionar sua primeira transação",
      detail: "Registre uma receita ou despesa",
      done: hasTransactions,
      onAction: onAddTransaction,
      actionLabel: "Adicionar agora →",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const s = styles(colors);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Primeiros passos</Text>
          <Text style={s.subtitle}>{completedCount} de 3 concluídos</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.skip}>Pular</Text>
        </TouchableOpacity>
      </View>

      <View style={s.steps}>
        {steps.map((step, i) => (
          <View key={i} style={[s.step, step.done && s.stepDone]}>
            <View style={[s.circle, step.done && s.circleDone]}>
              {step.done && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <View style={s.stepContent}>
              <Text style={[s.stepLabel, step.done && s.stepLabelDone]}>{step.label}</Text>
              <Text style={s.stepDetail}>{step.detail}</Text>
              {!step.done && (
                <TouchableOpacity onPress={step.onAction}>
                  <Text style={s.actionLink}>{step.actionLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 14,
    },
    title: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    skip: { fontSize: 12, color: colors.textSecondary },
    steps: { gap: 12 },
    step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    stepDone: { opacity: 0.5 },
    circle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 1,
      flexShrink: 0,
    },
    circleDone: { backgroundColor: "#10B981", borderColor: "#10B981" },
    stepContent: { flex: 1 },
    stepLabel: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
    stepLabelDone: {
      textDecorationLine: "line-through",
      color: colors.textSecondary,
    },
    stepDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    actionLink: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      marginTop: 4,
    },
  });
