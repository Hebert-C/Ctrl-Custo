import React from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/transactions", label: "Transações", icon: "↕" },
  { to: "/cards", label: "Cartões", icon: "▣" },
  { to: "/goals", label: "Metas", icon: "◎" },
  { to: "/reports", label: "Relatórios", icon: "≡" },
  { to: "/settings", label: "Configurações", icon: "⚙" },
] as const;

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <span className="text-lg font-bold text-brand-600 dark:text-brand-500 tracking-tight">
          Ctrl+Custo
        </span>
        <p className="text-xs text-gray-400 mt-0.5">Controle Financeiro</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400 text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
