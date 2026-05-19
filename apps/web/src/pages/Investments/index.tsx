import { type FormEvent, useEffect, useRef, useState } from "react";
import { Layout } from "../../components/Layout";
import { DonutChart, type DonutSlice } from "../../components/DonutChart";
import { useInvestmentStore } from "../../store/useInvestmentStore";
import { useAccountStore } from "../../store/useAccountStore";
import { formatCurrency } from "../../hooks/useCurrency";
import type { Investment, NewInvestment } from "@ctrl-custo/core";
import tickers from "../../data/b3-tickers.json";

type Ticker = { ticker: string; name: string; type: string };

const TYPE_LABELS: Record<string, string> = {
  stock: "Ação",
  fund: "Fundo/ETF",
  crypto: "Cripto",
  fixed_income: "Renda Fixa",
  real_estate: "FII",
  other: "Outro",
};

const TYPE_COLORS: Record<string, string> = {
  stock: "#3B82F6",
  fund: "#8B5CF6",
  crypto: "#F59E0B",
  fixed_income: "#10B981",
  real_estate: "#F97316",
  other: "#6B7280",
};

const INVESTMENT_TYPES = Object.keys(TYPE_LABELS) as Investment["type"][];

const EMPTY_FORM: Partial<NewInvestment> = {
  type: "stock",
  quantity: undefined,
  purchasePrice: undefined,
  currentPrice: undefined,
};

function totalValue(inv: Investment) {
  return Math.round(inv.currentPrice * inv.quantity);
}

function totalCost(inv: Investment) {
  return Math.round(inv.purchasePrice * inv.quantity);
}

export function Investments() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [form, setForm] = useState<Partial<NewInvestment>>(EMPTY_FORM);
  const [tickerQuery, setTickerQuery] = useState("");
  const [tickerSuggestions, setTickerSuggestions] = useState<Ticker[]>([]);
  const [showChart, setShowChart] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const { investments, load, add, update, remove } = useInvestmentStore();
  const { accounts, load: loadAccs } = useAccountStore();

  useEffect(() => {
    Promise.all([load(), loadAccs()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tickerRef.current && !tickerRef.current.contains(e.target as Node)) {
        setTickerSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Computed totals
  const grandCurrentValue = investments.reduce((s, i) => s + totalValue(i), 0);
  const grandCost = investments.reduce((s, i) => s + totalCost(i), 0);
  const profitCents = grandCurrentValue - grandCost;
  const profitPct = grandCost > 0 ? ((profitCents / grandCost) * 100).toFixed(2) : "0.00";

  // Donut slices by type
  const slicesMap: Record<string, number> = {};
  investments.forEach((i) => {
    slicesMap[i.type] = (slicesMap[i.type] ?? 0) + totalValue(i);
  });
  const donutSlices: DonutSlice[] = Object.entries(slicesMap)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      label: TYPE_LABELS[type] ?? type,
      value,
      color: TYPE_COLORS[type] ?? "#6B7280",
    }));

  function handleTickerInput(q: string) {
    setTickerQuery(q);
    setForm((f) => ({ ...f, ticker: q || undefined }));
    if (q.length >= 2) {
      const matches = (tickers as Ticker[])
        .filter(
          (t) =>
            t.ticker.toLowerCase().startsWith(q.toLowerCase()) ||
            t.name.toLowerCase().includes(q.toLowerCase())
        )
        .slice(0, 8);
      setTickerSuggestions(matches);
    } else {
      setTickerSuggestions([]);
    }
  }

  function selectTicker(t: Ticker) {
    setTickerQuery(t.ticker);
    setTickerSuggestions([]);
    setForm((f) => ({
      ...f,
      ticker: t.ticker,
      name: f.name ?? t.name,
      type: t.type as Investment["type"],
    }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTickerQuery("");
    setShowForm(true);
  }

  function openEdit(inv: Investment) {
    setEditing(inv);
    setForm({
      name: inv.name,
      type: inv.type,
      ticker: inv.ticker,
      quantity: inv.quantity,
      purchasePrice: inv.purchasePrice,
      currentPrice: inv.currentPrice,
      purchaseDate: inv.purchaseDate,
      accountId: inv.accountId,
      notes: inv.notes,
    });
    setTickerQuery(inv.ticker ?? "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setTickerQuery("");
    setTickerSuggestions([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (
      !form.name ||
      !form.type ||
      !form.quantity ||
      !form.purchasePrice ||
      !form.currentPrice ||
      !form.purchaseDate ||
      !form.accountId
    )
      return;

    const payload = form as NewInvestment;
    if (editing) {
      await update(editing.id, payload);
    } else {
      await add(payload);
    }
    closeForm();
  }

  async function handleRemove(id: string) {
    if (!confirm("Excluir este investimento?")) return;
    await remove(id);
  }

  return (
    <Layout title="Carteira">
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{investments.length} ativo(s)</p>
          <button onClick={openCreate} className="btn-primary text-sm">
            + Adicionar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Carregando…</p>
        ) : (
          <>
            {/* Summary card */}
            {investments.length > 0 && (
              <div
                className={`card p-5 cursor-pointer hover:ring-2 hover:ring-brand-400 dark:hover:ring-brand-600 transition-shadow ${showChart ? "ring-2 ring-brand-500" : ""}`}
                onClick={() => setShowChart((v) => !v)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Carteira Total
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(grandCurrentValue)}
                    </p>
                    <p className="text-xs text-gray-400">Investido: {formatCurrency(grandCost)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${profitCents >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {profitCents >= 0 ? "+" : ""}
                      {formatCurrency(profitCents)}
                    </p>
                    <p
                      className={`text-sm font-medium ${profitCents >= 0 ? "text-green-500" : "text-red-400"}`}
                    >
                      {profitCents >= 0 ? "+" : ""}
                      {profitPct}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {showChart ? "Fechar gráfico ▲" : "Ver distribuição ▼"}
                    </p>
                  </div>
                </div>

                {showChart && donutSlices.length > 0 && (
                  <div
                    className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DonutChart data={donutSlices} />
                  </div>
                )}
              </div>
            )}

            {/* Investment list */}
            <div className="space-y-3">
              {investments.map((inv) => {
                const val = totalValue(inv);
                const cost = totalCost(inv);
                const diff = val - cost;
                const diffPct = cost > 0 ? ((diff / cost) * 100).toFixed(2) : "0.00";

                return (
                  <div key={inv.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: TYPE_COLORS[inv.type] ?? "#6B7280" }}
                        >
                          {inv.ticker ? inv.ticker.slice(0, 4) : TYPE_LABELS[inv.type]?.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {inv.ticker ? `${inv.ticker} — ${inv.name}` : inv.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {TYPE_LABELS[inv.type]} · {inv.quantity}x ·{" "}
                            {new Date(inv.purchaseDate + "T12:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(val)}
                        </p>
                        <p
                          className={`text-xs font-medium ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                        >
                          {diff >= 0 ? "+" : ""}
                          {formatCurrency(diff)} ({diff >= 0 ? "+" : ""}
                          {diffPct}%)
                        </p>
                        <p className="text-xs text-gray-400">
                          pm {formatCurrency(inv.purchasePrice)}/un
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => openEdit(inv)} className="btn-ghost text-xs flex-1">
                        Editar
                      </button>
                      <button
                        onClick={() => handleRemove(inv.id)}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}

              {investments.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="text-gray-400 text-sm">Nenhum investimento cadastrado.</p>
                  <button onClick={openCreate} className="btn-primary text-sm mt-4">
                    + Adicionar primeiro ativo
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {editing ? "Editar Investimento" : "Novo Investimento"}
              </h2>
              <button type="button" onClick={closeForm} className="btn-ghost p-1">
                ✕
              </button>
            </div>

            {/* Ticker com autocomplete */}
            <div ref={tickerRef} className="relative">
              <label className="label">Ticker (opcional)</label>
              <input
                className="input-field uppercase"
                placeholder="Ex: PETR4, BTC"
                value={tickerQuery}
                onChange={(e) => handleTickerInput(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              {tickerSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {tickerSuggestions.map((t) => (
                    <li
                      key={t.ticker}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      onMouseDown={() => selectTicker(t)}
                    >
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100 w-16 flex-shrink-0">
                        {t.ticker}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 truncate">{t.name}</span>
                      <span
                        className="ml-auto text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          backgroundColor: TYPE_COLORS[t.type] + "33",
                          color: TYPE_COLORS[t.type],
                        }}
                      >
                        {TYPE_LABELS[t.type]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="label">Nome *</label>
              <input
                className="input-field"
                placeholder="Ex: Petrobras PN"
                required
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo *</label>
                <select
                  className="input-field"
                  required
                  value={form.type ?? "stock"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as Investment["type"] }))
                  }
                >
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantidade *</label>
                <input
                  className="input-field"
                  type="number"
                  min="0.000001"
                  step="any"
                  placeholder="10"
                  required
                  value={form.quantity ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: Number(e.target.value) || undefined }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Preço Médio (R$) *</label>
                <input
                  className="input-field"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="25.50"
                  required
                  value={form.purchasePrice ? (form.purchasePrice / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      purchasePrice: Math.round(Number(e.target.value) * 100) || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Preço Atual (R$) *</label>
                <input
                  className="input-field"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="30.00"
                  required
                  value={form.currentPrice ? (form.currentPrice / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentPrice: Math.round(Number(e.target.value) * 100) || undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data da Compra *</label>
                <input
                  type="date"
                  className="input-field"
                  required
                  value={form.purchaseDate ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Banco *</label>
                <select
                  className="input-field"
                  required
                  value={form.accountId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                >
                  <option value="">Selecionar…</option>
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
              <label className="label">Observações</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Opcional…"
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1">
                {editing ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
