import React from "react";
import { useThemeStore } from "../store/useThemeStore";
import { formatMonthLabel, currentMonth } from "../hooks/useReport";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isDark, toggle } = useThemeStore();
  const month = formatMonthLabel(currentMonth());

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{month}</p>
      </div>

      <button
        onClick={toggle}
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={isDark ? "Modo claro" : "Modo escuro"}
      >
        {isDark ? "☀" : "☽"}
      </button>
    </header>
  );
}
