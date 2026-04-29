import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { useCardStore } from "../../store/useCardStore";
import { useAccountStore } from "../../store/useAccountStore";
import { getDatabase } from "../../db/index";
import { formatCurrency } from "../../hooks/useCurrency";
import type { NewCard } from "@ctrl-custo/core";

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  other: "Outro",
};

export function Cards() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { cards, load, add, remove } = useCardStore();
  const { accounts, load: loadAccs } = useAccountStore();

  const [form, setForm] = useState<Partial<NewCard>>({
    brand: "visa",
    billingDay: 1,
    dueDay: 10,
    creditLimit: 0,
    color: "#8A2BE2",
    isArchived: false,
  });

  useEffect(() => {
    async function init() {
      const db = await getDatabase();
      await Promise.all([load(db), loadAccs(db)]);
      setLoading(false);
    }
    init();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.accountId) return;
    const db = await getDatabase();
    await add(db, form as NewCard);
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

  async function handleRemove(id: string) {
    if (!confirm("Excluir este cartão?")) return;
    const db = await getDatabase();
    await remove(db, id);
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
            {cards.map((card) => {
              const usagePercent = 0; // calculado via transações futuras
              return (
                <div
                  key={card.id}
                  className="card p-5 relative group"
                  style={{ borderTop: `4px solid ${card.color}` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{card.name}</p>
                      <p className="text-xs text-gray-500">{BRAND_LABELS[card.brand]}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(card.id)}
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
                    {/* Barra de uso do limite */}
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {cards.length === 0 && (
              <p className="col-span-2 text-center text-sm text-gray-400 py-12 card">
                Nenhum cartão cadastrado.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de novo cartão */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
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
            <div>
              <label className="label">Conta para Pagamento</label>
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
