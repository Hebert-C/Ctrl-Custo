import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useCardStore } from "../../store/useCardStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { formatCurrency } from "../../hooks/useCurrency";
import { api, ApiError } from "../../lib/api";
import type { CardStatement } from "../../lib/api";
import type { Card, NewCard } from "@ctrl-custo/core";

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  other: "Outro",
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatBillingPeriod(start: string, end: string) {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
  return `${fmt(parse(start))} – ${fmt(parse(end))}`;
}

export function Cards() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { cards, load, add, remove } = useCardStore();
  const { accounts, load: loadAccs } = useAccountStore();
  const { categories, load: loadCats } = useCategoryStore();

  const [form, setForm] = useState<Partial<NewCard>>({
    brand: "visa",
    billingDay: 1,
    dueDay: 10,
    creditLimit: 0,
    color: "#8A2BE2",
    isArchived: false,
  });

  // Detail modal state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [statement, setStatement] = useState<CardStatement | null>(null);
  const [stmtMonth, setStmtMonth] = useState(currentMonth());
  const [stmtLoading, setStmtLoading] = useState(false);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payCategoryId, setPayCategoryId] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    Promise.all([load(), loadAccs(), loadCats()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(card: Card) {
    setSelectedCard(card);
    setStmtMonth(currentMonth());
    setStatement(null);
    setStmtLoading(true);
    const data = await api.cards.statement(card.id, currentMonth());
    setStatement(data);
    setStmtLoading(false);
  }

  async function changeMonth(month: string) {
    if (!selectedCard) return;
    setStmtMonth(month);
    setStmtLoading(true);
    const data = await api.cards.statement(selectedCard.id, month);
    setStatement(data);
    setStmtLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.accountId) return;
    await add(form as NewCard);
    setShowForm(false);
    setForm({
      brand: "visa",
      billingDay: 1,
      dueDay: 10,
      creditLimit: 0,
      color: "#8A2BE2",
      isArchived: false,
    });
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCard || !payCategoryId) return;
    setPayLoading(true);
    setPayError("");
    try {
      await api.cards.pay(selectedCard.id, stmtMonth, payCategoryId);
      setShowPayModal(false);
      setPayCategoryId("");
      // Reload statement and accounts to reflect new balance
      const [newStmt] = await Promise.all([
        api.cards.statement(selectedCard.id, stmtMonth),
        loadAccs(),
      ]);
      setStatement(newStmt);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Erro ao pagar fatura.");
    } finally {
      setPayLoading(false);
    }
  }

  async function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Excluir este cartão?")) return;
    await remove(id);
  }

  return (
    <Layout title="Cartões">
      <div className="space-y-4 max-w-4xl">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{cards.length} cartão(ões)</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Novo Cartão
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="card p-5 relative group cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderTop: `4px solid ${card.color}` }}
                onClick={() => openDetail(card)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{card.name}</p>
                    <p className="text-xs text-gray-500">{BRAND_LABELS[card.brand]}</p>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, card.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Limite</span>
                    <span className="font-medium">{formatCurrency(card.creditLimit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Fecha dia {card.billingDay}</span>
                    <span>Vence dia {card.dueDay}</span>
                  </div>
                  <p className="text-xs text-gray-400 text-right">Clique para ver fatura</p>
                </div>
              </div>
            ))}

            {cards.length === 0 && (
              <p className="col-span-2 text-center text-sm text-gray-400 py-12 card">
                Nenhum cartão cadastrado.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-5 rounded-t-2xl"
              style={{ borderTop: `4px solid ${selectedCard.color}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedCard.name}</h2>
                  <p className="text-xs text-gray-500">{BRAND_LABELS[selectedCard.brand]}</p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Limite</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(selectedCard.creditLimit)}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Fatura</p>
                  <p className="text-sm font-semibold text-red-600">
                    {stmtLoading ? "…" : formatCurrency(statement?.totalSpent ?? 0)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Disponível</p>
                  <p className="text-sm font-semibold text-green-600">
                    {stmtLoading
                      ? "…"
                      : formatCurrency(statement?.availableLimit ?? selectedCard.creditLimit)}
                  </p>
                </div>
              </div>

              {/* Barra de uso do limite */}
              {statement && selectedCard.creditLimit > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Uso do limite</span>
                    <span>
                      {Math.min(
                        100,
                        Math.round((statement.totalSpent / selectedCard.creditLimit) * 100)
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((statement.totalSpent / selectedCard.creditLimit) * 100))}%`,
                        backgroundColor:
                          statement.totalSpent / selectedCard.creditLimit > 0.8
                            ? "#EF4444"
                            : selectedCard.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Pagar Fatura */}
              {statement && statement.totalSpent > 0 && stmtMonth <= currentMonth() && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setPayCategoryId("");
                      setPayError("");
                      setShowPayModal(true);
                    }}
                    className="w-full btn-primary text-sm py-2"
                  >
                    Pagar Fatura — {formatCurrency(statement.totalSpent)}
                  </button>
                </div>
              )}

              {/* Month navigation */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => changeMonth(prevMonth(stmtMonth))}
                  className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                >
                  ‹
                </button>
                <div className="text-center">
                  <span className="text-sm font-medium capitalize block">
                    {formatMonthLabel(stmtMonth)}
                  </span>
                  {statement && (
                    <span className="text-xs text-gray-400">
                      {formatBillingPeriod(statement.billingStart, statement.billingEnd)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => changeMonth(nextMonth(stmtMonth))}
                  disabled={stmtMonth >= currentMonth()}
                  className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Transactions list */}
            <div className="overflow-y-auto flex-1 p-5">
              {stmtLoading ? (
                <p className="text-center text-sm text-gray-400 py-8">Carregando…</p>
              ) : !statement || statement.transactions.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">
                  Nenhuma transação neste mês.
                </p>
              ) : (
                <ul className="space-y-2">
                  {statement.transactions.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          {tx.installment && (
                            <span className="ml-1 text-gray-400">
                              ({tx.installment.current}/{tx.installment.total}x)
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-500">
                        -{formatCurrency(tx.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment confirmation modal */}
      {showPayModal && selectedCard && statement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <form
            onSubmit={handlePay}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <h3 className="text-base font-semibold">Pagar Fatura</h3>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{formatMonthLabel(stmtMonth)}</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(statement.totalSpent)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Débito em: {accounts.find((a) => a.id === selectedCard.accountId)?.name ?? "—"}
              </p>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select
                className="input-field"
                value={payCategoryId}
                required
                onChange={(e) => setPayCategoryId(e.target.value)}
              >
                <option value="">Selecionar…</option>
                {categories
                  .filter((c) => c.type === "expense" || c.type === "both")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
              </select>
            </div>
            {payError && <p className="text-sm text-red-500">{payError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="btn-secondary flex-1"
                disabled={payLoading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={payLoading}>
                {payLoading ? "Pagando…" : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New card form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Novo Cartão</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost p-1">
                ✕
              </button>
            </div>

            <div>
              <label className="label">Nome do Cartão</label>
              <input
                className="input-field"
                placeholder="Ex: Nubank Roxinho"
                required
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bandeira</label>
                <select
                  className="input-field"
                  value={form.brand}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brand: e.target.value as NewCard["brand"] }))
                  }
                >
                  {Object.entries(BRAND_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Limite (R$)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  placeholder="5000"
                  value={form.creditLimit ? form.creditLimit / 100 : ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      creditLimit: Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Dia do Fechamento</label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  max="31"
                  value={form.billingDay}
                  onChange={(e) => setForm((f) => ({ ...f, billingDay: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Dia do Vencimento</label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  max="31"
                  value={form.dueDay}
                  onChange={(e) => setForm((f) => ({ ...f, dueDay: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Banco para Pagamento</label>
                <select
                  className="input-field"
                  value={form.accountId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                >
                  <option value="">Selecionar…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cor</label>
                <input
                  className="input-field h-10 p-1 cursor-pointer"
                  type="color"
                  value={form.color ?? "#8A2BE2"}
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
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
