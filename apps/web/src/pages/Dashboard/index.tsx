import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { BalanceCard } from "./BalanceCard";
import { SummaryCards } from "./SummaryCards";
import { RecentTransactions } from "./RecentTransactions";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useMonthReport, currentMonth } from "../../hooks/useReport";
import { getDatabase } from "../../db/index";

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { transactions, load: loadTxs } = useTransactionStore();
  const { totalBalance, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();

  useEffect(() => {
    async function init() {
      const db = await getDatabase();
      await Promise.all([loadTxs(db), loadAccounts(db), loadCategories(db)]);
      setLoading(false);
    }
    init();
  }, []);

  const month = currentMonth();
  const { totalIncome, totalExpense, balance } = useMonthReport(transactions, month);

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Carregando dados…
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-6 max-w-5xl">
        {/* Linha 1: Saldo + Resumo do mês */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <BalanceCard totalBalance={totalBalance} monthBalance={balance} />
          </div>
          <div className="lg:col-span-3">
            <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />
          </div>
        </div>

        {/* Linha 2: Últimas transações */}
        <RecentTransactions transactions={transactions} categoriesById={categoriesById} />
      </div>
    </Layout>
  );
}
