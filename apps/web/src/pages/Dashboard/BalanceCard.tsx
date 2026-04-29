import React from "react";
import { formatCurrency } from "../../hooks/useCurrency";

interface BalanceCardProps {
  totalBalance: number;
  monthBalance: number;
}

export function BalanceCard({ totalBalance, monthBalance }: BalanceCardProps) {
  const isPositive = monthBalance >= 0;

  return (
    <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-700 border-0 text-white">
      <p className="text-sm font-medium text-brand-100 mb-1">Saldo Total</p>
      <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
      <div className="mt-4 pt-4 border-t border-brand-500 flex items-center gap-2">
        <span className={`text-sm font-medium ${isPositive ? "text-green-200" : "text-red-200"}`}>
          {isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(monthBalance))}
        </span>
        <span className="text-brand-200 text-xs">no mês atual</span>
      </div>
    </div>
  );
}
