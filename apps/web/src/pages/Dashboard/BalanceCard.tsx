import React from "react";
import { formatCurrency } from "../../hooks/useCurrency";

interface BalanceCardProps {
  totalBalance: number;
}

export function BalanceCard({ totalBalance }: BalanceCardProps) {
  const isNegative = totalBalance < 0;

  return (
    <div className="card px-5 py-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
          Saldo nos Bancos
        </p>
        <p
          className={`text-2xl font-bold tracking-tight ${isNegative ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
        >
          {formatCurrency(totalBalance)}
        </p>
      </div>
      <span
        className={`text-2xl ${isNegative ? "text-red-300 dark:text-red-700" : "text-gray-200 dark:text-gray-700"}`}
      >
        🏦
      </span>
    </div>
  );
}
