import React from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: "⊞" },
  { to: "/transactions", label: "Transações", icon: "↕" },
  { to: "/cards", label: "Cartões", icon: "▣" },
  { to: "/goals", label: "Metas", icon: "◎" },
  { to: "/reports", label: "Relatórios", icon: "≡" },
  { to: "/settings", label: "Config.", icon: "⚙" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-bottom">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"
            }`
          }
        >
          <span className="text-base leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
