import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from "react-native";
import { lightColors } from "../tokens/colors";
import { fontSizes, fontWeights } from "../tokens/typography";
import { spacing, borderRadius } from "../tokens/spacing";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled ?? loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? lightColors.textOnPrimary : lightColors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`], styles[`${size}Label`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.45 },

  // Variantes
  primary: {
    backgroundColor: lightColors.primary,
    borderColor: lightColors.primary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: lightColors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: lightColors.danger,
    borderColor: lightColors.danger,
  },

  // Tamanhos
  sm: { paddingVertical: spacing[1], paddingHorizontal: spacing[3] },
  md: { paddingVertical: spacing[2] + 2, paddingHorizontal: spacing[4] },
  lg: { paddingVertical: spacing[3], paddingHorizontal: spacing[6] },

  // Labels — cor
  label: { fontWeight: fontWeights.semibold },
  primaryLabel: { color: lightColors.textOnPrimary },
  secondaryLabel: { color: lightColors.primary },
  ghostLabel: { color: lightColors.primary },
  dangerLabel: { color: lightColors.textOnPrimary },

  // Labels — tamanho
  smLabel: { fontSize: fontSizes.sm },
  mdLabel: { fontSize: fontSizes.md },
  lgLabel: { fontSize: fontSizes.lg },
});
