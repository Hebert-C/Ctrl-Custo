import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  SectionList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRecurringBillStore } from "../../src/store/useRecurringBillStore";
import { useToast } from "../../src/components/Toast";
import { useAccountStore } from "../../src/store/useAccountStore";
import { useCategoryStore } from "../../src/store/useCategoryStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "../../src/hooks/useCurrency";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
import {
  api,
  ApiError,
  type ApiRecurringBill,
  type ApiRecurringBillDue,
  type ApiRecurringPayment,
  type NewRecurringBill,
} from "../../src/lib/api";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const PAY_ERRORS: Record<string, string> = {
  BILL_INACTIVE: "Esta conta está inativa.",
  ALREADY_PAID: "Já paga neste mês.",
  AMOUNT_REQUIRED: "Informe o valor a pagar.",
  INSUFFICIENT_BALANCE: "Saldo insuficiente na conta.",
  ACCOUNT_ARCHIVED: "A conta de débito está arquivada.",
};

export default function Recurring() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;

  const toast = useToast();
  const { bills, dueBills, load, loadDue, update, remove, pay } = useRecurringBillStore();
  const { accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();

  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<ApiRecurringBill | null>(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payingBill, setPayingBill] = useState<ApiRecurringBillDue | null>(null);
  const [payAmountRaw, setPayAmountRaw] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  const [historyBill, setHistoryBill] = useState<ApiRecurringBill | null>(null);
  const [historyPayments, setHistoryPayments] = useState<ApiRecurringPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadAll = useCallback(async () => {
    await Promise.all([load(), loadDue(), loadAccounts(), loadCategories()]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function openHistory(bill: ApiRecurringBill) {
    setHistoryBill(bill);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    try {
      const payments = await api.recurringBills.payments(bill.id);
      setHistoryPayments(payments);
    } finally {
      setHistoryLoading(false);
    }
  }

  function openPay(bill: ApiRecurringBillDue) {
    setPayingBill(bill);
    setPayAmountRaw(bill.amountCents !== null ? formatCurrencyInput(bill.amountCents) : "");
    setPayError("");
    setPayModalVisible(true);
  }

  async function handlePay() {
    if (!payingBill) return;
    const amountCents = parseCurrencyInput(payAmountRaw);
    if (!amountCents) {
      setPayError("Informe o valor a pagar.");
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      await pay(payingBill.id, currentMonth(), amountCents);
      setPayModalVisible(false);
    } catch (err) {
      if (err instanceof ApiError && err.code && PAY_ERRORS[err.code]) {
        setPayError(PAY_ERRORS[err.code]);
      } else {
        setPayError("Erro ao registrar pagamento.");
      }
    } finally {
      setPaying(false);
    }
  }

  function confirmToggle(bill: ApiRecurringBill) {
    const action = bill.isActive ? "desativar" : "ativar";
    Alert.alert(`Confirmar`, `Deseja ${action} "${bill.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: bill.isActive ? "Desativar" : "Ativar",
        onPress: async () => {
          try {
            await update(bill.id, { isActive: !bill.isActive });
          } catch {
            toast.show("Não foi possível alterar.", "error");
          }
        },
      },
    ]);
  }

  function confirmDelete(bill: ApiRecurringBill) {
    Alert.alert("Excluir conta recorrente", `"${bill.name}" será removida permanentemente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(bill.id);
          } catch {
            toast.show("Não foi possível excluir.", "error");
          }
        },
      },
    ]);
  }

  const overdueCount = dueBills.filter((b) => b.status === "overdue").length;
  const s = styles(colors);

  const sections = [
    ...(dueBills.length > 0
      ? [{ title: "A Pagar", data: dueBills as (ApiRecurringBillDue | ApiRecurringBill)[] }]
      : []),
    ...(bills.filter((b) => b.isActive).length > 0
      ? [
          {
            title: "Todas as ativas",
            data: bills.filter((b) => b.isActive && !dueBills.find((d) => d.id === b.id)) as (
              | ApiRecurringBillDue
              | ApiRecurringBill
            )[],
          },
        ]
      : []),
    ...(bills.filter((b) => !b.isActive).length > 0
      ? [
          {
            title: "Inativas",
            data: bills.filter((b) => !b.isActive) as (ApiRecurringBillDue | ApiRecurringBill)[],
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Recorrentes</Text>
          {overdueCount > 0 && (
            <Text style={[s.overdueLabel, { color: colors.expense }]}>
              {overdueCount} em atraso
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            setEditingBill(null);
            setFormVisible(true);
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={s.sectionHeader}>{section.title}</Text>}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyText}>Nenhuma conta recorrente</Text>
            <Text style={s.emptySubText}>Toque em + para adicionar</Text>
          </View>
        }
        renderItem={({ item, section }) => {
          const isDue = section.title === "A Pagar";
          const dueBill = isDue ? (item as ApiRecurringBillDue) : undefined;
          const isOverdue = dueBill?.status === "overdue";

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openHistory(item)}
              style={[s.card, isOverdue && { borderColor: colors.expense + "55" }]}
            >
              <View style={s.cardLeft}>
                <Text
                  style={[
                    s.cardName,
                    isOverdue && { color: colors.expense },
                    !item.isActive && { color: colors.textDisabled },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={s.cardSub}>
                  Vence dia {item.dueDay}
                  {item.amountCents !== null
                    ? ` · ${formatCurrency(item.amountCents)}`
                    : " · Valor variável"}
                  {isOverdue ? " · Em atraso" : ""}
                </Text>
              </View>
              <View style={s.cardRight}>
                {isDue && dueBill ? (
                  <TouchableOpacity style={s.payBtn} onPress={() => openPay(dueBill)}>
                    <Text style={s.payBtnText}>Pagar</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.actions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingBill(item);
                        setFormVisible(true);
                      }}
                      style={s.actionBtn}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmToggle(item)} style={s.actionBtn}>
                      <Ionicons
                        name={item.isActive ? "pause-outline" : "play-outline"}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item)} style={s.actionBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.expense} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Pay modal */}
      <Modal
        visible={payModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPayModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.overlay}
        >
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Registrar Pagamento</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {payingBill && (
              <>
                <Text style={s.payBillName}>{payingBill.name}</Text>
                <Text style={s.payBillSub}>
                  Vence dia {payingBill.dueDay} · {currentMonth()}
                </Text>

                {!!payError && <Text style={[s.errorText, { marginBottom: 8 }]}>{payError}</Text>}

                <Text style={s.label}>
                  Valor pago{payingBill.amountCents === null ? " (obrigatório)" : ""}
                </Text>
                <View style={s.amountRow}>
                  <Text style={s.currencyPrefix}>R$</Text>
                  <TextInput
                    style={s.amountInput}
                    value={payAmountRaw}
                    onChangeText={(v) =>
                      setPayAmountRaw(formatCurrencyInput(parseCurrencyInput(v)))
                    }
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, paying && { opacity: 0.6 }]}
                  onPress={handlePay}
                  disabled={paying}
                >
                  <Text style={s.saveBtnText}>
                    {paying ? "Registrando..." : "Confirmar Pagamento"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: 32 }]}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle} numberOfLines={1}>
                  {historyBill?.name}
                </Text>
                {historyBill && (
                  <Text style={s.payBillSub}>
                    Vence dia {historyBill.dueDay} ·{" "}
                    {historyBill.amountCents !== null
                      ? formatCurrency(historyBill.amountCents)
                      : "Valor variável"}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : historyBill ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <PaymentTimeline
                  createdAt={historyBill.createdAt}
                  fixedAmount={historyBill.amountCents}
                  payments={historyPayments}
                  colors={colors}
                />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Form modal */}
      <BillForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        accounts={accounts}
        categories={categories}
        editing={editingBill ?? undefined}
        onSaved={async () => {
          setFormVisible(false);
          await Promise.all([load(), loadDue()]);
        }}
      />
    </View>
  );
}

// ─── PaymentTimeline ──────────────────────────────────────────────────────────

function generateMonths(
  createdAt: string,
  payments: ApiRecurringPayment[]
): { key: string; label: string; payment: ApiRecurringPayment | null; isCurrent: boolean }[] {
  const start = new Date(createdAt);
  start.setDate(1);
  const now = new Date();
  const currentKey = now.toISOString().slice(0, 7);
  const months = [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 7);
    months.push({
      key,
      label: cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      payment: payments.find((p) => p.dueDate === key) ?? null,
      isCurrent: key === currentKey,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.reverse();
}

function PaymentTimeline({
  createdAt,
  fixedAmount,
  payments,
  colors,
}: {
  createdAt: string;
  fixedAmount: number | null;
  payments: ApiRecurringPayment[];
  colors: Colors;
}) {
  const months = generateMonths(createdAt, payments);

  if (months.length === 0) {
    return (
      <Text style={{ color: colors.textDisabled, textAlign: "center", marginTop: 16 }}>
        Sem histórico.
      </Text>
    );
  }

  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {months.map(({ key, label, payment, isCurrent }) => (
        <View
          key={key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: isCurrent ? colors.primary + "15" : colors.surfaceRaised,
            borderWidth: isCurrent ? 1 : 0,
            borderColor: colors.primary + "55",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                width: 20,
                textAlign: "center",
                color: payment ? "#22C55E" : colors.border,
              }}
            >
              {payment ? "✓" : "—"}
            </Text>
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: payment ? colors.textPrimary : colors.textDisabled,
                  textTransform: "capitalize",
                }}
              >
                {label}
              </Text>
              {isCurrent && <Text style={{ fontSize: 11, color: colors.primary }}>mês atual</Text>}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {payment ? (
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#22C55E" }}>
                {formatCurrency(payment.amountCents)}
              </Text>
            ) : fixedAmount !== null ? (
              <Text style={{ fontSize: 13, color: colors.border }}>
                {formatCurrency(fixedAmount)}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── BillForm ─────────────────────────────────────────────────────────────────

interface FormProps {
  visible: boolean;
  onClose: () => void;
  accounts: import("@ctrl-custo/core").Account[];
  categories: import("@ctrl-custo/core").Category[];
  editing?: ApiRecurringBill;
  onSaved: () => void;
}

function BillForm({ visible, onClose, accounts, categories, editing, onSaved }: FormProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? darkColors : lightColors;
  const { add, update } = useRecurringBillStore();

  const [name, setName] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [isVariable, setIsVariable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setDueDay(String(editing.dueDay));
      setAccountId(editing.accountId);
      setCategoryId(editing.categoryId);
      const isVar = editing.amountCents === null;
      setIsVariable(isVar);
      setAmountRaw(isVar ? "" : formatCurrencyInput(editing.amountCents!));
    } else {
      setName("");
      setDueDay("");
      setAccountId(accounts.find((a) => !a.isArchived)?.id ?? "");
      setCategoryId("");
      setAmountRaw("");
      setIsVariable(false);
    }
    setErrors({});
  }, [visible, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    const day = parseInt(dueDay, 10);
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório.";
    if (!day || day < 1 || day > 28) newErrors.dueDay = "Dia entre 1 e 28.";
    if (!accountId) newErrors.account = "Selecione uma conta.";
    if (!categoryId) newErrors.category = "Selecione uma categoria.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const data: NewRecurringBill = {
        name: name.trim(),
        dueDay: day,
        amountCents: isVariable ? null : parseCurrencyInput(amountRaw) || null,
        accountId,
        categoryId,
      };
      if (editing) {
        await update(editing.id, data);
      } else {
        await add(data);
      }
      onSaved();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors);
  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? "Editar Conta" : "Nova Conta Recorrente"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={[s.input, !!errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Aluguel, Netflix, Academia…"
              placeholderTextColor={colors.textDisabled}
            />
            {!!errors.name && <Text style={s.errorText}>{errors.name}</Text>}

            <Text style={s.label}>Dia do vencimento (1–28)</Text>
            <TextInput
              style={[s.input, !!errors.dueDay && s.inputError]}
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.textDisabled}
            />
            {!!errors.dueDay && <Text style={s.errorText}>{errors.dueDay}</Text>}

            <Text style={s.label}>Conta de débito</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {accounts
                .filter((a) => !a.isArchived)
                .map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.chip, accountId === a.id && { backgroundColor: colors.primary }]}
                    onPress={() => setAccountId(a.id)}
                  >
                    <Text style={[s.chipText, accountId === a.id && { color: "#fff" }]}>
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            {!!errors.account && <Text style={s.errorText}>{errors.account}</Text>}

            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {expenseCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.chip, categoryId === cat.id && { backgroundColor: colors.primary }]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={[s.chipText, categoryId === cat.id && { color: "#fff" }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!!errors.category && <Text style={s.errorText}>{errors.category}</Text>}

            <View style={s.variableRow}>
              <TouchableOpacity
                style={[
                  s.checkbox,
                  isVariable && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setIsVariable((v) => !v)}
              >
                {isVariable && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
              <Text style={s.variableLabel}>Valor variável (definir ao pagar)</Text>
            </View>

            {!isVariable && (
              <>
                <Text style={s.label}>Valor fixo (R$)</Text>
                <View style={s.amountRow}>
                  <Text style={s.currencyPrefix}>R$</Text>
                  <TextInput
                    style={s.amountInput}
                    value={amountRaw}
                    onChangeText={(v) => setAmountRaw(formatCurrencyInput(parseCurrencyInput(v)))}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>
                {saving ? "Salvando..." : editing ? "Atualizar" : "Salvar"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    overdueLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
    },
    emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: "600" },
    emptySubText: { fontSize: 13, color: colors.textDisabled },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardLeft: { flex: 1, marginRight: 10 },
    cardRight: { alignItems: "flex-end" },
    cardName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
    cardSub: { fontSize: 12, color: colors.textSecondary },
    payBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    payBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 6 },
    actionBtn: { padding: 4 },
    // Modals
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
      maxHeight: "92%",
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
    payBillName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
    payBillSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
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
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    currencyPrefix: { fontSize: 16, color: colors.textSecondary, marginRight: 4 },
    amountInput: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      paddingVertical: 10,
    },
    chipScroll: { marginBottom: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipText: { fontSize: 13, color: colors.textSecondary },
    variableRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    variableLabel: { fontSize: 14, color: colors.textPrimary },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    inputError: { borderColor: colors.expense },
    errorText: { fontSize: 12, color: colors.expense, marginTop: 4 },
  });
