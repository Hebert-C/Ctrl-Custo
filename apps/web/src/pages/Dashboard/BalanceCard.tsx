import React, { useState } from "react";
import { formatCurrency } from "../../hooks/useCurrency";
import type { Account } from "@ctrl-custo/core";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  investment: "Investimento",
  cash: "Dinheiro",
  wallet: "Carteira",
};

interface BalanceCardProps {
  totalBalance: number;
  accounts: Account[];
}

export function BalanceCard({ totalBalance, accounts }: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const isNegative = totalBalance < 0;

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="text-left">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
            Saldo nos Bancos
          </p>
          <p
            className={`text-2xl font-bold tracking-tight ${isNegative ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
          >
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl ${isNegative ? "text-red-300 dark:text-red-700" : "text-gray-200 dark:text-gray-700"}`}
          >
            🏦
          </span>
          <span className="text-xs text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 space-y-2">
          {accounts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Nenhum banco cadastrado.</p>
          ) : (
            accounts.map((acc) => {
              const neg = acc.balance < 0;
              return (
                <div key={acc.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-gray-400">
                        {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${neg ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
