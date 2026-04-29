import React from "react";
import type { TransactionFilters, Category, Account } from "@ctrl-custo/core";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  categories: Category[];
  accounts: Account[];
  onChange: (filters: TransactionFilters) => void;
  onClear: () => void;
}

export function TransactionFiltersBar({
  filters,
  categories,
  accounts,
  onChange,
  onClear,
}: TransactionFiltersProps) {
  const hasActiveFilters =
    filters.type ?? filters.categoryId ?? filters.accountId ?? filters.startDate ?? filters.search;

  return (
    <div className="card p-4 flex flex-wrap gap-3 items-end">
      {/* Busca */}
      <div className="flex-1 min-w-40">
        <label className="label">Buscar</label>
        <input
          className="input-field"
          placeholder="Descrição…"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="label">Tipo</label>
        <select
          className="input-field"
          value={filters.type ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              type: (e.target.value as TransactionFilters["type"]) || undefined,
            })
          }
        >
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
          <option value="transfer">Transferências</option>
        </select>
      </div>

      {/* Categoria */}
      <div>
        <label className="label">Categoria</label>
        <select
          className="input-field"
          value={filters.categoryId ?? ""}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Conta */}
      <div>
        <label className="label">Conta</label>
        <select
          className="input-field"
          value={filters.accountId ?? ""}
          onChange={(e) => onChange({ ...filters, accountId: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Período */}
      <div>
        <label className="label">De</label>
        <input
          type="date"
          className="input-field"
          value={filters.startDate ?? ""}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
        />
      </div>
      <div>
        <label className="label">Até</label>
        <input
          type="date"
          className="input-field"
          value={filters.endDate ?? ""}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
        />
      </div>

      {hasActiveFilters && (
        <button onClick={onClear} className="btn-ghost text-sm self-end">
          ✕ Limpar
        </button>
      )}
    </div>
  );
}
