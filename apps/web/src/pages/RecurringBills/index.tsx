import { type FormEvent, useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useRecurringBillStore } from "../../store/useRecurringBillStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "../../hooks/useCurrency";
import {
  ApiError,
  type ApiRecurringBill,
  type ApiRecurringBillDue,
  type NewRecurringBill,
} from "../../lib/api";

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

export function RecurringBills() {
  const [tab, setTab] = useState<"all" | "due">("due");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<ApiRecurringBill | null>(null);
  const [payingBill, setPayingBill] = useState<ApiRecurringBillDue | null>(null);
  const [payAmountRaw, setPayAmountRaw] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  const { bills, dueBills, load, loadDue, add, update, remove, pay } = useRecurringBillStore();
  const { accounts, load: loadAccs } = useAccountStore();
  const { categories, load: loadCats } = useCategoryStore();

  const [form, setForm] = useState<Partial<NewRecurringBill>>({});
  const [formAmountRaw, setFormAmountRaw] = useState("");
  const [isVariable, setIsVariable] = useState(false);

  useEffect(() => {
    Promise.all([load(), loadDue(), loadAccs(), loadCats()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditingBill(null);
    setForm({});
    setFormAmountRaw("");
    setIsVariable(false);
    setShowForm(true);
  }

  function openEdit(bill: ApiRecurringBill) {
    setEditingBill(bill);
    setForm({
      name: bill.name,
      dueDay: bill.dueDay,
      accountId: bill.accountId,
      categoryId: bill.categoryId,
    });
    const isVar = bill.amountCents === null;
    setIsVariable(isVar);
    setFormAmountRaw(
      isVar || bill.amountCents === null ? "" : formatCurrencyInput(bill.amountCents)
    );
    setShowForm(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.dueDay || !form.accountId || !form.categoryId) return;
    const amountCents = isVariable ? null : parseCurrencyInput(formAmountRaw) || null;
    const data: NewRecurringBill = {
      name: form.name,
      dueDay: form.dueDay,
      amountCents,
      accountId: form.accountId,
      categoryId: form.categoryId,
    };
    if (editingBill) {
      await update(editingBill.id, data);
    } else {
      await add(data);
    }
    setShowForm(false);
  }

  async function handleToggleActive(bill: ApiRecurringBill) {
    await update(bill.id, { isActive: !bill.isActive });
  }

  async function handleDelete(bill: ApiRecurringBill) {
    if (!confirm(`Excluir "${bill.name}"? Os registros de pagamento serão removidos.`)) return;
    await remove(bill.id);
  }

  function openPay(bill: ApiRecurringBillDue) {
    setPayingBill(bill);
    setPayAmountRaw(bill.amountCents !== null ? formatCurrencyInput(bill.amountCents) : "");
    setPayError("");
  }

  async function handlePay() {
    if (!payingBill) return;
    setPaying(true);
    setPayError("");
    try {
      const amountCents =
        payingBill.amountCents !== null
          ? parseCurrencyInput(payAmountRaw)
          : parseCurrencyInput(payAmountRaw);
      if (!amountCents) {
        setPayError("Informe o valor a pagar.");
        return;
      }
      await pay(payingBill.id, currentMonth(), amountCents);
      setPayingBill(null);
    } catch (err) {
      if (err instanceof ApiError && err.code && PAY_ERRORS[err.code]) {
        setPayError(PAY_ERRORS[err.code]);
      } else {
        setPayError("Erro ao registrar pagamento. Tente novamente.");
      }
    } finally {
      setPaying(false);
    }
  }

  const activeCount = bills.filter((b) => b.isActive).length;
  const overdueCount = dueBills.filter((b) => b.status === "overdue").length;

  return (
    <Layout title="Contas Recorrentes">
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">{activeCount} ativa(s)</p>
            {overdueCount > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {overdueCount} em atraso
              </span>
            )}
          </div>
          <button onClick={openCreate} className="btn-primary text-sm">
            + Nova Conta
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {(["due", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-brand-600 text-brand-700 dark:text-brand-400 dark:border-brand-500"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "due" ? "A Pagar" : "Todas"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Carregando…</p>
        ) : tab === "due" ? (
          <DueTab dueBills={dueBills} onPay={openPay} />
        ) : (
          <AllTab
            bills={bills}
            onEdit={openEdit}
            onToggle={handleToggleActive}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {editingBill ? "Editar Conta" : "Nova Conta Recorrente"}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost p-1">
                ✕
              </button>
            </div>

            <div>
              <label className="label">Nome</label>
              <input
                className="input-field"
                placeholder="Ex: Aluguel, Netflix, Academia…"
                required
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Dia do vencimento</label>
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  max={28}
                  required
                  placeholder="10"
                  value={form.dueDay ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDay: Number(e.target.value) || undefined }))
                  }
                />
              </div>
              <div>
                <label className="label">Conta de débito</label>
                <select
                  className="input-field"
                  required
                  value={form.accountId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {accounts
                    .filter((a) => !a.isArchived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Categoria</label>
              <select
                className="input-field"
                required
                value={form.categoryId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Selecione…</option>
                {categories
                  .filter((cat) => cat.type === "expense" || cat.type === "both")
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">Valor</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVariable}
                    onChange={(e) => setIsVariable(e.target.checked)}
                    className="rounded"
                  />
                  Valor variável (definir ao pagar)
                </label>
              </div>
              {!isVariable && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    R$
                  </span>
                  <input
                    className="input-field pl-8"
                    placeholder="0,00"
                    inputMode="numeric"
                    value={formAmountRaw}
                    onChange={(e) =>
                      setFormAmountRaw(formatCurrencyInput(parseCurrencyInput(e.target.value)))
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1">
                {editingBill ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registrar Pagamento</h2>
              <button onClick={() => setPayingBill(null)} className="btn-ghost p-1">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{payingBill.name}</strong> — vence dia {payingBill.dueDay}
            </p>

            {payError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                {payError}
              </p>
            )}

            <div>
              <label className="label">
                Valor pago{" "}
                {payingBill.amountCents === null ? "(obrigatório)" : "(edite se necessário)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
                <input
                  className="input-field pl-8 text-lg font-semibold"
                  placeholder="0,00"
                  inputMode="numeric"
                  autoFocus
                  value={payAmountRaw}
                  onChange={(e) =>
                    setPayAmountRaw(formatCurrencyInput(parseCurrencyInput(e.target.value)))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Mês: {currentMonth()}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPayingBill(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {paying ? "Registrando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Due tab ──────────────────────────────────────────────────────────────────

function DueTab({
  dueBills,
  onPay,
}: {
  dueBills: ApiRecurringBillDue[];
  onPay: (bill: ApiRecurringBillDue) => void;
}) {
  if (dueBills.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-sm text-gray-500">Tudo em dia! Nenhuma conta pendente.</p>
      </div>
    );
  }

  const overdue = dueBills.filter((b) => b.status === "overdue");
  const upcoming = dueBills.filter((b) => b.status === "upcoming");

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
            Em atraso
          </p>
          <div className="space-y-2">
            {overdue.map((b) => (
              <DueBillCard key={b.id} bill={b} onPay={onPay} />
            ))}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Próximos
          </p>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <DueBillCard key={b.id} bill={b} onPay={onPay} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DueBillCard({
  bill,
  onPay,
}: {
  bill: ApiRecurringBillDue;
  onPay: (bill: ApiRecurringBillDue) => void;
}) {
  const isOverdue = bill.status === "overdue";
  return (
    <div
      className={`card p-4 flex items-center justify-between gap-3 ${
        isOverdue ? "border-red-200 dark:border-red-800" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm truncate ${
            isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {bill.name}
        </p>
        <p className="text-xs text-gray-400">
          Vence dia {bill.dueDay}
          {isOverdue ? " — Em atraso" : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {bill.amountCents !== null && (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(bill.amountCents)}
          </span>
        )}
        <button onClick={() => onPay(bill)} className="btn-primary text-xs px-3 py-1.5">
          Pagar
        </button>
      </div>
    </div>
  );
}

// ─── All tab ──────────────────────────────────────────────────────────────────

function AllTab({
  bills,
  onEdit,
  onToggle,
  onDelete,
}: {
  bills: ApiRecurringBill[];
  onEdit: (bill: ApiRecurringBill) => void;
  onToggle: (bill: ApiRecurringBill) => void;
  onDelete: (bill: ApiRecurringBill) => void;
}) {
  if (bills.length === 0) {
    return (
      <p className="card p-12 text-center text-sm text-gray-400">
        Nenhuma conta recorrente cadastrada.
      </p>
    );
  }

  const active = bills.filter((b) => b.isActive);
  const inactive = bills.filter((b) => !b.isActive);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {active.map((b) => (
          <BillCard key={b.id} bill={b} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Inativas
          </p>
          <div className="space-y-2">
            {inactive.map((b) => (
              <BillCard
                key={b.id}
                bill={b}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BillCard({
  bill,
  onEdit,
  onToggle,
  onDelete,
}: {
  bill: ApiRecurringBill;
  onEdit: (bill: ApiRecurringBill) => void;
  onToggle: (bill: ApiRecurringBill) => void;
  onDelete: (bill: ApiRecurringBill) => void;
}) {
  return (
    <div
      className={`card p-4 flex items-center justify-between gap-3 ${
        !bill.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {bill.name}
          </p>
          {!bill.isActive && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
              Inativa
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Vence dia {bill.dueDay}
          {bill.amountCents !== null
            ? ` · ${formatCurrency(bill.amountCents)}`
            : " · Valor variável"}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(bill)} className="btn-ghost text-xs p-1.5" title="Editar">
          ✏
        </button>
        <button
          onClick={() => onToggle(bill)}
          className="btn-ghost text-xs p-1.5"
          title={bill.isActive ? "Desativar" : "Ativar"}
        >
          {bill.isActive ? "⏸" : "▶"}
        </button>
        <button
          onClick={() => onDelete(bill)}
          className="btn-ghost text-xs p-1.5 text-red-500 hover:text-red-700"
          title="Excluir"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
