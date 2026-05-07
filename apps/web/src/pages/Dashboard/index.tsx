import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { BalanceCard } from "./BalanceCard";
import { SummaryCards } from "./SummaryCards";
import { RecentTransactions } from "./RecentTransactions";
import { TransactionForm } from "../Transactions/TransactionForm";
import { DonutChart, type DonutSlice } from "../../components/DonutChart";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useCardStore } from "../../store/useCardStore";
import { useMonthReport, currentMonth } from "../../hooks/useReport";

type ChartView = null | "overview" | "income" | "expense";

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chartView, setChartView] = useState<ChartView>(null);
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
  const { totalIncome, totalExpense, balance, byCategory, byCategoryIncome } = useMonthReport(
    transactions,
    month
  );

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const overviewSlices: DonutSlice[] = [
    { label: "Receitas", value: totalIncome, color: "#10B981" },
    { label: "Despesas", value: totalExpense, color: "#EF4444" },
  ];

  const expenseSlices: DonutSlice[] = Object.entries(byCategory)
    .map(([catId, value]) => ({
      label: categoriesById[catId]?.name ?? "Outros",
      value,
      color: categoriesById[catId]?.color ?? "#6B7280",
    }))
    .sort((a, b) => b.value - a.value);

  const incomeSlices: DonutSlice[] = Object.entries(byCategoryIncome)
    .map(([catId, value]) => ({
      label: categoriesById[catId]?.name ?? "Outros",
      value,
      color: categoriesById[catId]?.color ?? "#6B7280",
    }))
    .sort((a, b) => b.value - a.value);

  function handleOverviewSliceClick(index: number) {
    setChartView(index === 0 ? "income" : "expense");
  }

  function handleChartToggle() {
    setChartView((prev) => (prev === null ? "overview" : null));
  }

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
        {/* Linha 1: Fluxo mensal — hero */}
        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
          month={month}
          onChartToggle={handleChartToggle}
          chartOpen={chartView !== null}
        />

        {/* Gráfico interativo — visível ao clicar no Saldo do Mês */}
        {chartView !== null && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {chartView !== "overview" && (
                  <button
                    onClick={() => setChartView("overview")}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ← Voltar
                  </button>
                )}
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {chartView === "overview" && "Entradas vs Saídas — mês atual"}
                  {chartView === "income" && "Receitas por categoria"}
                  {chartView === "expense" && "Despesas por categoria"}
                </h4>
              </div>
              <button
                onClick={() => setChartView(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
              >
                ✕
              </button>
            </div>
            {chartView === "overview" && (
              <DonutChart data={overviewSlices} onSliceClick={handleOverviewSliceClick} />
            )}
            {chartView === "income" && <DonutChart data={incomeSlices} />}
            {chartView === "expense" && <DonutChart data={expenseSlices} />}
          </div>
        )}

        {/* Linha 2: Saldo nos bancos (secundário) + Últimas transações */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <BalanceCard totalBalance={totalBalance} />
          </div>
          <div className="lg:col-span-3">
            <RecentTransactions
              transactions={transactions}
              categoriesById={categoriesById}
              onAdd={() => setShowForm(true)}
            />
          </div>
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
