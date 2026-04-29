import { useEffect, useState, useMemo } from "react";
import { Layout } from "../../components/Layout";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { getDatabase } from "../../db/index";
import { lastNMonths, formatMonthLabel } from "../../hooks/useReport";
import { formatCurrency } from "../../hooks/useCurrency";
import { createExportService } from "@ctrl-custo/core";

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(6);
  const { transactions, load } = useTransactionStore();
  const { categories, load: loadCats } = useCategoryStore();

  useEffect(() => {
    async function init() {
      const db = await getDatabase();
      await Promise.all([load(db), loadCats(db)]);
      setLoading(false);
    }
    init();
  }, []);

  const months = lastNMonths(selectedMonths);
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Evolução mensal calculada no client
  const evolution = useMemo(() => {
    return months.map((month) => {
      const monthTxs = transactions.filter(
        (t) => t.date.startsWith(month) && t.status === "confirmed"
      );
      const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      return { month, income, expense, balance: income - expense };
    });
  }, [transactions, months]);

  // Top categorias do período completo
  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    const start = months[0];
    const end = months[months.length - 1];
    transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.status === "confirmed" &&
          t.date >= start + "-01" &&
          t.date <= end + "-31"
      )
      .forEach((t) => {
        map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => ({ category: categoriesById[id], total }));
  }, [transactions, months, categoriesById]);

  function handleExportCSV() {
    const svc = createExportService();
    const csv = svc.toCSV(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctrl-custo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJSON() {
    const svc = createExportService();
    const data = svc.buildExportData(transactions, categories, []);
    const json = svc.toJSON(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctrl-custo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Relatórios">
      <div className="space-y-6 max-w-5xl">
        {/* Controles */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                onClick={() => setSelectedMonths(n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedMonths === n
                    ? "bg-brand-600 text-white"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n} meses
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="btn-secondary text-sm">
              ↓ Exportar CSV
            </button>
            <button onClick={handleExportJSON} className="btn-secondary text-sm">
              ↓ Exportar JSON
            </button>
          </div>
        </div>

        {/* Tabela de evolução mensal */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Evolução Mensal</h3>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-400">Carregando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-5 py-3 font-medium">Mês</th>
                    <th className="text-right px-5 py-3 font-medium">Receitas</th>
                    <th className="text-right px-5 py-3 font-medium">Despesas</th>
                    <th className="text-right px-5 py-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {evolution.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {formatMonthLabel(row.month)}
                      </td>
                      <td className="px-5 py-3 text-right text-income font-medium">
                        {formatCurrency(row.income)}
                      </td>
                      <td className="px-5 py-3 text-right text-expense font-medium">
                        {formatCurrency(row.expense)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${row.balance >= 0 ? "text-income" : "text-expense"}`}
                      >
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Categorias */}
        {topCategories.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Top Categorias (Despesas)
            </h3>
            <div className="space-y-3">
              {topCategories.map(({ category, total }, i) => {
                const maxTotal = topCategories[0].total;
                const percent = Math.round((total / maxTotal) * 100);
                return (
                  <div key={category?.id ?? i} className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category?.color ?? "#6B7280" }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">
                      {category?.name ?? "Sem categoria"}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: category?.color ?? "#6B7280",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 text-right">
                      {formatCurrency(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
