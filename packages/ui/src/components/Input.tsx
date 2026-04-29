import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { lightColors } from "../tokens/colors";
import { fontSizes, fontWeights } from "../tokens/typography";
import { spacing, borderRadius } from "../tokens/spacing";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  editable = true,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError
    ? lightColors.danger
    : focused
      ? lightColors.primary
      : lightColors.border;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputWrapper, { borderColor }, !editable && styles.disabled]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeftIcon : null]}
          placeholderTextColor={lightColors.textDisabled}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {hasError ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[1] },

  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: lightColors.textSecondary,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    backgroundColor: lightColors.surface,
    paddingHorizontal: spacing[3],
    minHeight: 48,
  },

  disabled: { backgroundColor: lightColors.background, opacity: 0.65 },

  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: lightColors.textPrimary,
    paddingVertical: spacing[2],
  },

  inputWithLeftIcon: { paddingLeft: spacing[2] },

  iconLeft: { marginRight: spacing[2] },
  iconRight: { marginLeft: spacing[2] },

  error: {
    fontSize: fontSizes.xs,
    color: lightColors.danger,
    fontWeight: fontWeights.medium,
  },

  hint: {
    fontSize: fontSizes.xs,
    color: lightColors.textSecondary,
  },
});
