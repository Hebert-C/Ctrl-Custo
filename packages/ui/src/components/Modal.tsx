import { type ReactNode } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ModalProps as RNModalProps,
} from "react-native";
import { lightColors } from "../tokens/colors";
import { fontSizes, fontWeights } from "../tokens/typography";
import { spacing, borderRadius, shadows } from "../tokens/spacing";

interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
}

interface ModalProps extends Pick<RNModalProps, "visible" | "animationType"> {
  title: string;
  children: ReactNode;
  actions?: ModalAction[];
  onClose?: () => void;
}

export function Modal({
  visible,
  title,
  children,
  actions = [],
  onClose,
  animationType = "fade",
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop com pressão para fechar */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        {/* Impede que toque no conteúdo feche o modal */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.sheet}>
            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {onClose ? (
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Conteúdo */}
            <View style={styles.body}>{children}</View>

            {/* Ações */}
            {actions.length > 0 ? (
              <View style={styles.footer}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={[styles.actionButton, actionVariantStyle(action.variant ?? "ghost")]}
                    onPress={action.onPress}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.actionLabel,
                        actionLabelVariantStyle(action.variant ?? "ghost"),
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

function actionVariantStyle(variant: ModalAction["variant"]): object {
  switch (variant) {
    case "primary":
      return { backgroundColor: lightColors.primary };
    case "danger":
      return { backgroundColor: lightColors.danger };
    default:
      return { backgroundColor: "transparent", borderWidth: 1, borderColor: lightColors.border };
  }
}

function actionLabelVariantStyle(variant: ModalAction["variant"]): object {
  switch (variant) {
    case "primary":
    case "danger":
      return { color: lightColors.textOnPrimary };
    default:
      return { color: lightColors.textPrimary };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: lightColors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },

  sheet: {
    backgroundColor: lightColors.surface,
    borderRadius: borderRadius.xl,
    width: "100%",
    maxWidth: 480,
    ...shadows.lg,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },

  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: lightColors.textPrimary,
  },

  closeButton: {
    fontSize: fontSizes.md,
    color: lightColors.textSecondary,
    padding: spacing[1],
  },

  body: {
    padding: spacing[4],
  },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[2],
    padding: spacing[4],
    paddingTop: 0,
  },

  actionButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },

  actionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
});
