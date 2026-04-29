import React from "react";
import { Link } from "react-router-dom";
import type { Transaction, Category } from "@ctrl-custo/core";
import { formatCurrency } from "../../hooks/useCurrency";

interface RecentTransactionsProps {
  transactions: Transaction[];
  categoriesById: Record<string, Category>;
}

export function RecentTransactions({ transactions, categoriesById }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Últimas Transações</h3>
        <Link
          to="/transactions"
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
        >
          Ver todas →
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          Nenhuma transação ainda.{" "}
          <Link to="/transactions" className="text-brand-600 hover:underline">
            Adicionar
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {recent.map((tx) => {
            const category = categoriesById[tx.categoryId];
            const isIncome = tx.type === "income";
            const dateLabel = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            });

            return (
              <li key={tx.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: `${category?.color ?? "#6B7280"}20` }}
                >
                  <span style={{ color: category?.color ?? "#6B7280" }}>
                    {category?.icon?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {category?.name ?? "—"} · {dateLabel}
                  </p>
                </div>

                <span
                  className={`text-sm font-semibold flex-shrink-0 ${isIncome ? "text-income" : "text-expense"}`}
                >
                  {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
