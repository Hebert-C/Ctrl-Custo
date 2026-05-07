import React from "react";
import { formatCurrency } from "../../hooks/useCurrency";

interface BalanceCardProps {
  totalBalance: number;
  monthBalance: number;
}

export function BalanceCard({ totalBalance, monthBalance }: BalanceCardProps) {
  const isPositive = monthBalance >= 0;
  const totalNegative = totalBalance < 0;

  return (
    <div
      className={`card p-6 border-0 text-white bg-gradient-to-br ${totalNegative ? "from-red-600 to-red-700" : "from-brand-600 to-brand-700"}`}
    >
      <p
        className={`text-sm font-medium mb-1 ${totalNegative ? "text-red-100" : "text-brand-100"}`}
      >
        Saldo Total
      </p>
      <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
      <div
        className={`mt-4 pt-4 border-t flex items-center gap-2 ${totalNegative ? "border-red-500" : "border-brand-500"}`}
      >
        <span className={`text-sm font-medium ${isPositive ? "text-green-200" : "text-red-200"}`}>
          {isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(monthBalance))}
        </span>
        <span className={`text-xs ${totalNegative ? "text-red-200" : "text-brand-200"}`}>
          no mês atual
        </span>
      </div>
    </div>
  );
}
