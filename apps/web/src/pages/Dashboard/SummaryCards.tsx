import React from "react";
import { formatCurrency } from "../../hooks/useCurrency";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function SummaryCards({ totalIncome, totalExpense, balance }: SummaryCardsProps) {
  const cards = [
    {
      label: "Receitas",
      value: totalIncome,
      icon: "▲",
      className: "text-income",
      bg: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Despesas",
      value: totalExpense,
      icon: "▼",
      className: "text-expense",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      label: "Saldo do Mês",
      value: balance,
      icon: "=",
      className: balance >= 0 ? "text-income" : "text-expense",
      bg: "bg-gray-50 dark:bg-gray-800",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <span className={`text-xs font-bold p-1.5 rounded-md ${card.bg} ${card.className}`}>
              {card.icon}
            </span>
          </div>
          <p className={`text-2xl font-bold ${card.className}`}>{formatCurrency(card.value)}</p>
        </div>
      ))}
    </div>
  );
}
