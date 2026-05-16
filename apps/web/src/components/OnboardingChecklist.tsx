import React, { useState } from "react";
import { Link } from "react-router-dom";

interface Props {
  hasAccounts: boolean;
  hasCategories: boolean;
  hasTransactions: boolean;
  onAddTransaction: () => void;
}

const STORAGE_KEY = "ctrl-custo-onboarding-dismissed";

export function OnboardingChecklist({
  hasAccounts,
  hasCategories,
  hasTransactions,
  onAddTransaction,
}: Props) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  if (dismissed || (hasAccounts && hasCategories && hasTransactions)) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  const steps = [
    {
      label: "Cadastrar seu primeiro banco",
      detail: "Necessário para registrar transações",
      done: hasAccounts,
      action: (
        <Link
          to="/settings"
          className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
        >
          Ir para Configurações →
        </Link>
      ),
    },
    {
      label: "Verificar suas categorias",
      detail: "Categorias padrão já foram criadas para você",
      done: hasCategories,
      action: (
        <Link
          to="/settings"
          className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
        >
          Ver categorias →
        </Link>
      ),
    },
    {
      label: "Adicionar sua primeira transação",
      detail: "Registre uma receita ou despesa",
      done: hasTransactions,
      action: (
        <button
          onClick={onAddTransaction}
          className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
        >
          Adicionar agora →
        </button>
      ),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="card p-5 border-l-4 border-brand-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Primeiros passos</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {completedCount} de 3 concluídos
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Pular
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-start gap-3 ${step.done ? "opacity-50" : ""}`}>
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                step.done ? "bg-green-500" : "border-2 border-gray-300 dark:border-gray-600"
              }`}
            >
              {step.done && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.done ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{step.detail}</p>
              {!step.done && <div className="mt-1">{step.action}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
