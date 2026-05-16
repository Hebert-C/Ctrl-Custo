import React from "react";
import { formatCurrency } from "../../hooks/useCurrency";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  month: string;
  onChartToggle: () => void;
  chartOpen: boolean;
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  month,
  onChartToggle,
  chartOpen,
}: SummaryCardsProps) {
  const [year, m] = month.split("-");
  const monthLabel = new Date(`${year}-${m}-01`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const cards = [
    {
      label: "Receitas",
      value: totalIncome,
      icon: "▲",
      valueClass: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-900",
      iconClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Despesas",
      value: totalExpense,
      icon: "▼",
      valueClass: "text-red-500 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900",
      iconClass: "text-red-500 dark:text-red-400",
    },
    {
      label: "Saldo do Mês",
      value: balance,
      icon: "=",
      valueClass:
        balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconClass: "text-gray-500 dark:text-gray-400",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide capitalize">
        {monthLabel}
      </p>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => {
          const isBalance = card.label === "Saldo do Mês";
          return (
            <div
              key={card.label}
              onClick={isBalance ? onChartToggle : undefined}
              className={`card p-3 md:p-5 ${isBalance ? "cursor-pointer hover:ring-2 hover:ring-brand-400 dark:hover:ring-brand-600 transition-shadow" : ""} ${isBalance && chartOpen ? "ring-2 ring-brand-500" : ""}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate pr-1">
                  {card.label}
                </p>
                <span
                  className={`text-xs font-bold w-6 h-6 md:w-7 md:h-7 flex-shrink-0 flex items-center justify-center rounded-full ${card.iconBg} ${card.iconClass}`}
                >
                  {card.icon}
                </span>
              </div>
              <p
                className={`text-base md:text-3xl font-bold tracking-tight truncate ${card.valueClass}`}
              >
                {formatCurrency(card.value)}
              </p>
              {isBalance && (
                <p className="hidden md:block text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {chartOpen ? "Clique para fechar ↑" : "Clique para detalhar ↓"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
