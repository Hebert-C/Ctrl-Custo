import { View, Text, StyleSheet } from "react-native";
import { lightColors } from "../tokens/colors";
import { fontSizes, fontWeights } from "../tokens/typography";
import { spacing, borderRadius } from "../tokens/spacing";

type BadgeVariant = "income" | "expense" | "transfer" | "pending" | "investment" | "neutral";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  // Permite sobrescrever as cores para categorias customizadas
  color?: string;
  backgroundColor?: string;
}

const variantStyles: Record<BadgeVariant, { color: string; backgroundColor: string }> = {
  income: { color: lightColors.income, backgroundColor: lightColors.successSurface },
  expense: { color: lightColors.expense, backgroundColor: lightColors.dangerSurface },
  transfer: { color: lightColors.transfer, backgroundColor: lightColors.infoSurface },
  pending: { color: lightColors.pending, backgroundColor: lightColors.warningSurface },
  investment: { color: lightColors.investment, backgroundColor: "#F5F3FF" },
  neutral: { color: lightColors.textSecondary, backgroundColor: lightColors.background },
};

export function Badge({
  label,
  variant = "neutral",
  size = "md",
  color,
  backgroundColor,
}: BadgeProps) {
  const resolved = variantStyles[variant];
  const textColor = color ?? resolved.color;
  const bgColor = backgroundColor ?? resolved.backgroundColor;

  return (
    <View style={[styles.base, styles[size], { backgroundColor: bgColor }]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.label, styles[`${size}Label`], { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },

  sm: { paddingVertical: spacing[0] + 2, paddingHorizontal: spacing[2] },
  md: { paddingVertical: spacing[1], paddingHorizontal: spacing[2] + 2 },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[1],
  },

  label: { fontWeight: fontWeights.medium },
  smLabel: { fontSize: fontSizes.xs },
  mdLabel: { fontSize: fontSizes.sm },
});
