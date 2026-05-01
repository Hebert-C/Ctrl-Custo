import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { AccountsSection } from "./AccountsSection";
import { CategoriesSection } from "./CategoriesSection";
import { useAccountStore } from "../../store/useAccountStore";
import { useCategoryStore } from "../../store/useCategoryStore";

type Tab = "accounts" | "categories";

const TABS: { id: Tab; label: string }[] = [
  { id: "accounts", label: "Contas" },
  { id: "categories", label: "Categorias" },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");
  const [loading, setLoading] = useState(true);
  const { load: loadAccounts } = useAccountStore();
  const { load: loadCategories } = useCategoryStore();

  useEffect(() => {
    Promise.all([loadAccounts(), loadCategories()]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout title="Configurações">
      <div className="max-w-3xl space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Carregando…
          </div>
        ) : (
          <>
            {activeTab === "accounts" && <AccountsSection />}
            {activeTab === "categories" && <CategoriesSection />}
          </>
        )}
      </div>
    </Layout>
  );
}
