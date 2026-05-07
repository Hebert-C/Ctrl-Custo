import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { BalanceCard } from "./BalanceCard";
import { SummaryCards } from "./SummaryCards";
import { RecentTransactions } from "./RecentTransactions";
import { TransactionForm } from "../Transactions/TransactionForm";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useCardStore } from "../../store/useCardStore";
import { useMonthReport, currentMonth } from "../../hooks/useReport";

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { transactions, load: loadTxs, add, addInstallments } = useTransactionStore();
  const { totalBalance, accounts, load: loadAccounts } = useAccountStore();
  const { categories, load: loadCategories } = useCategoryStore();
  const { cards, load: loadCards } = useCardStore();

  useEffect(() => {
    Promise.all([loadTxs(), loadAccounts(), loadCategories(), loadCards()]).then(() =>
      setLoading(false)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const month = currentMonth();
  const { totalIncome, totalExpense, balance } = useMonthReport(transactions, month);

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  async function handleSubmit(data: Parameters<typeof add>[0], installments: number) {
    if (installments > 1) {
      await addInstallments(data, installments);
    } else {
      await add(data);
    }
  }

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
        <RecentTransactions
          transactions={transactions}
          categoriesById={categoriesById}
          onAdd={() => setShowForm(true)}
        />
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
