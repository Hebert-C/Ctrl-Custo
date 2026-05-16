import React from "react";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../hooks/useAuth";
import { formatMonthLabel, currentMonth } from "../hooks/useReport";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isDark, toggle } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const month = formatMonthLabel(currentMonth());

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div>
        <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{month}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isDark ? "Modo claro" : "Modo escuro"}
        >
          {isDark ? "☀" : "☽"}
        </button>
        <button
          onClick={() => logout()}
          className="md:hidden p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title="Sair"
        >
          ⏻
        </button>
      </div>
    </header>
  );
}
