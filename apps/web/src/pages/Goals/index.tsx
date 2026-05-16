import { type FormEvent, useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useGoalStore } from "../../store/useGoalStore";
import { useAccountStore } from "../../store/useAccountStore";
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "../../hooks/useCurrency";
import { ApiError } from "../../lib/api";
import type { NewGoal } from "@ctrl-custo/core";

const DEPOSIT_ERROR_MESSAGES: Record<string, string> = {
  DEPOSIT_EXCEEDS_TARGET: "O valor excede o montante restante da meta.",
  ACCOUNT_ARCHIVED: "Esta conta está arquivada e não pode ser usada.",
  GOAL_NOT_ACTIVE: "Não é possível depositar em uma meta inativa.",
};

export function Goals() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositRaw, setDepositRaw] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositError, setDepositError] = useState("");
  const { goals, load, add, deposit } = useGoalStore();
  const { accounts, load: loadAccs } = useAccountStore();

  const [form, setForm] = useState<Partial<NewGoal>>({
    status: "active",
    color: "#22C55E",
    icon: "🎯",
    currentAmount: 0,
  });

  useEffect(() => {
    Promise.all([load(), loadAccs()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.targetAmount) return;
    await add(form as NewGoal);
    setShowForm(false);
    setForm({ status: "active", color: "#22C55E", icon: "🎯", currentAmount: 0 });
  }

  async function handleDeposit(goalId: string) {
    const cents = parseCurrencyInput(depositRaw);
    if (!cents || !depositAccountId) return;
    setDepositError("");
    try {
      await deposit(goalId, cents, depositAccountId);
      await loadAccs();
      setDepositGoalId(null);
      setDepositRaw("");
      setDepositAccountId("");
    } catch (err) {
      if (err instanceof ApiError && err.code && DEPOSIT_ERROR_MESSAGES[err.code]) {
        setDepositError(DEPOSIT_ERROR_MESSAGES[err.code]);
      } else {
        setDepositError("Erro ao realizar depósito. Tente novamente.");
      }
    }
  }

  return (
    <Layout title="Metas">
      <div className="space-y-4 max-w-4xl">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {goals.filter((g) => g.status === "active").length} ativa(s)
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Nova Meta
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const percent = Math.min(
                100,
                Math.round((goal.currentAmount / goal.targetAmount) * 100)
              );
              const isCompleted = goal.status === "completed";

              return (
                <div key={goal.id} className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{goal.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {goal.name}
                        </p>
                        {goal.deadline && (
                          <p className="text-xs text-gray-400">
                            Até {new Date(goal.deadline + "T12:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                        Concluída ✓
                      </span>
                    )}
                  </div>

                  {/* Progresso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      <span className="text-gray-400">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right">{percent}%</p>
                  </div>

                  {/* Ações */}
                  {!isCompleted && (
                    <div className="mt-4 flex gap-2">
                      {depositGoalId === goal.id ? (
                        <div className="flex flex-col gap-2 flex-1">
                          {depositError && <p className="text-xs text-red-500">{depositError}</p>}
                          <select
                            className="input-field text-sm"
                            value={depositAccountId}
                            onChange={(e) => setDepositAccountId(e.target.value)}
                            autoFocus
                          >
                            <option value="">Banco de origem…</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                R$
                              </span>
                              <input
                                className="input-field pl-7 text-sm"
                                placeholder="0,00"
                                inputMode="numeric"
                                value={depositRaw}
                                onChange={(e) =>
                                  setDepositRaw(
                                    formatCurrencyInput(parseCurrencyInput(e.target.value))
                                  )
                                }
                                onKeyDown={(e) => e.key === "Enter" && handleDeposit(goal.id)}
                              />
                            </div>
                            <button
                              onClick={() => handleDeposit(goal.id)}
                              className="btn-primary text-sm px-3"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setDepositGoalId(null);
                                setDepositRaw("");
                                setDepositAccountId("");
                                setDepositError("");
                              }}
                              className="btn-ghost text-sm px-2"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDepositGoalId(goal.id)}
                          className="btn-secondary text-xs flex-1"
                        >
                          + Depositar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {goals.length === 0 && (
              <p className="col-span-2 text-center text-sm text-gray-400 py-12 card">
                Nenhuma meta cadastrada.
              </p>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Nova Meta</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost p-1">
                ✕
              </button>
            </div>

            <div>
              <label className="label">Nome</label>
              <input
                className="input-field"
                placeholder="Ex: Reserva de Emergência"
                required
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor Alvo (R$)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10000"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      targetAmount: Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Prazo (opcional)</label>
                <input
                  type="date"
                  className="input-field"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deadline: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Emoji/Ícone</label>
                <input
                  className="input-field"
                  placeholder="🎯"
                  value={form.icon ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Cor</label>
                <input
                  type="color"
                  className="input-field h-10 cursor-pointer p-1"
                  value={form.color ?? "#22C55E"}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
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
                Criar Meta
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
