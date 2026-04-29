import React, { useState } from "react";
import type { NewTransaction, Category, Account, Card } from "@ctrl-custo/core";
import { formatCurrencyInput, parseCurrencyInput } from "../../hooks/useCurrency";

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  onSubmit: (data: NewTransaction, installments: number) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM = {
  description: "",
  amountRaw: "",
  type: "expense" as NewTransaction["type"],
  status: "confirmed" as NewTransaction["status"],
  date: new Date().toISOString().split("T")[0],
  categoryId: "",
  accountId: "",
  cardId: "",
  installments: 1,
  notes: "",
};

export function TransactionForm({
  categories,
  accounts,
  cards,
  onSubmit,
  onClose,
}: TransactionFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amount = parseCurrencyInput(form.amountRaw);
    if (!amount) return setError("Informe um valor válido.");
    if (!form.categoryId) return setError("Selecione uma categoria.");
    if (!form.accountId) return setError("Selecione uma conta.");

    setLoading(true);
    try {
      await onSubmit(
        {
          description: form.description,
          amount,
          type: form.type,
          status: form.status,
          date: form.date,
          categoryId: form.categoryId,
          accountId: form.accountId,
          cardId: form.cardId || undefined,
          notes: form.notes || undefined,
        },
        form.installments
      );
      onClose();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter((c) => c.type === form.type || c.type === "both");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nova Transação</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  form.type === t
                    ? t === "income"
                      ? "bg-green-50 border-green-500 text-green-700"
                      : t === "expense"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t === "income" ? "Receita" : t === "expense" ? "Despesa" : "Transferência"}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição</label>
            <input
              className="input-field"
              placeholder="Ex: Supermercado"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
                <input
                  className="input-field pl-8"
                  placeholder="0,00"
                  inputMode="numeric"
                  value={form.amountRaw}
                  onChange={(e) =>
                    set("amountRaw", formatCurrencyInput(parseCurrencyInput(e.target.value)))
                  }
                />
              </div>
            </div>
            <div>
              <label className="label">Data</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Categoria + Conta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Selecionar…</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Conta</label>
              <select
                className="input-field"
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
              >
                <option value="">Selecionar…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cartão + Parcelas (apenas despesas) */}
          {form.type === "expense" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cartão (opcional)</label>
                <select
                  className="input-field"
                  value={form.cardId}
                  onChange={(e) => set("cardId", e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Parcelas</label>
                <select
                  className="input-field"
                  value={form.installments}
                  onChange={(e) => set("installments", Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x{n > 1 ? " (parcelado)" : " (à vista)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => set("status", e.target.value as NewTransaction["status"])}
            >
              <option value="confirmed">Confirmado</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="label">Observações (opcional)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Notas adicionais…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
