import { type ReactNode } from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { lightColors } from "../tokens/colors";
import { spacing, borderRadius, shadows } from "../tokens/spacing";

type CardPadding = "none" | "sm" | "md" | "lg";
type CardShadow = "none" | "sm" | "md" | "lg";

interface CardProps extends ViewProps {
  padding?: CardPadding;
  shadow?: CardShadow;
  border?: boolean;
  children: ReactNode;
}

export function Card({
  padding = "md",
  shadow = "sm",
  border = true,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        border && styles.bordered,
        paddingStyles[padding],
        shadows[shadow],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: lightColors.surface,
    borderRadius: borderRadius.lg,
  },
  bordered: {
    borderWidth: 1,
    borderColor: lightColors.border,
  },
});

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: spacing[3] },
  md: { padding: spacing[4] },
  lg: { padding: spacing[6] },
});
