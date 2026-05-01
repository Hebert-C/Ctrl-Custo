import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { TransactionFiltersBar } from "./TransactionFilters";
import { TransactionForm } from "./TransactionForm";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCardStore } from "../../store/useCardStore";
import { formatCurrency } from "../../hooks/useCurrency";
import type { TransactionFilters } from "@ctrl-custo/core";

export function Transactions() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { transactions, filters, load, setFilters, clearFilters, add, addInstallments, remove } =
    useTransactionStore();
  const { categories, load: loadCats } = useCategoryStore();
  const { accounts, load: loadAccs } = useAccountStore();
  const { cards, load: loadCards } = useCardStore();

  useEffect(() => {
    Promise.all([load(), loadCats(), loadAccs(), loadCards()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  async function handleFilterChange(f: TransactionFilters) {
    await setFilters(f);
  }

  async function handleClearFilters() {
    await clearFilters();
  }

  async function handleSubmit(data: Parameters<typeof add>[0], installments: number) {
    if (installments > 1) {
      await addInstallments(data, installments);
    } else {
      await add(data);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await remove(id);
  }

  return (
    <Layout title="Transações">
      <div className="space-y-4 max-w-5xl">
        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {transactions.length} transação(ões)
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Nova Transação
          </button>
        </div>

        {/* Filtros */}
        <TransactionFiltersBar
          filters={filters}
          categories={categories}
          accounts={accounts}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        {/* Lista */}
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Carregando…</p>
          ) : transactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">Nenhuma transação encontrada.</p>
          ) : (
            transactions.map((tx) => {
              const category = categoriesById[tx.categoryId];
              const account = accountsById[tx.accountId];
              const isIncome = tx.type === "income";
              const dateLabel = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR");

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                >
                  {/* Ícone */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: `${category?.color ?? "#6B7280"}20` }}
                  >
                    <span style={{ color: category?.color ?? "#6B7280" }}>
                      {category?.icon?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {tx.description}
                      </p>
                      {tx.installment && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                          {tx.installment.current}/{tx.installment.total}
                        </span>
                      )}
                      {tx.status === "pending" && (
                        <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {category?.name ?? "—"} · {account?.name ?? "—"} · {dateLabel}
                    </p>
                  </div>

                  {/* Valor */}
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ${isIncome ? "text-income" : "text-expense"}`}
                  >
                    {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                  </span>

                  {/* Ações */}
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                    title="Excluir"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          categories={categories}
          accounts={accounts}
          cards={cards}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
}
