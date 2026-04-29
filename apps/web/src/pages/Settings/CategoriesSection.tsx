import { type FormEvent, useState } from "react";
import { useCategoryStore } from "../../store/useCategoryStore";
import { getDatabase } from "../../db/index";
import type { Category, CategoryType } from "@ctrl-custo/core";

const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "both", label: "Ambos" },
];

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

const PRESET_ICONS = [
  "food",
  "transport",
  "housing",
  "health",
  "education",
  "entertainment",
  "shopping",
  "salary",
  "investment",
  "other",
];

const DEFAULT_FORM = {
  name: "",
  type: "expense" as CategoryType,
  color: "#EF4444",
  icon: "other",
};

export function CategoriesSection() {
  const { categories, add, update, remove } = useCategoryStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    });
    setError("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const db = await getDatabase();
      const data = {
        name: form.name.trim(),
        type: form.type,
        color: form.color,
        icon: form.icon,
      };
      if (editing) {
        await update(db, editing.id, data);
        setEditing(null);
      } else {
        await add(db, data);
      }
      setForm(DEFAULT_FORM);
    } catch {
      setError("Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover esta categoria?")) return;
    const db = await getDatabase();
    await remove(db, id);
  }

  const byType = (type: CategoryType) =>
    categories.filter((c) => c.type === type || c.type === "both");

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {editing ? "Editar Categoria" : "Nova Categoria"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Alimentação, Transporte..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tipo *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CategoryType }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Ícone
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    form.icon === icon
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? "#1D4ED8" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60"
            >
              {saving ? "Salvando…" : editing ? "Atualizar" : "Adicionar"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista por tipo */}
      {(["expense", "income"] as CategoryType[]).map((type) => {
        const list = byType(type);
        const label = type === "expense" ? "Despesas" : "Receitas";
        return (
          <div key={type}>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {label}
            </h4>
            {list.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Nenhuma categoria de {label.toLowerCase()} cadastrada.
              </p>
            ) : (
              <div className="space-y-2">
                {list.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {cat.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {CATEGORY_TYPES.find((t) => t.value === cat.type)?.label} · {cat.icon}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(cat)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleRemove(cat.id)}
                        className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {categories.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma categoria cadastrada ainda.
        </p>
      )}
    </div>
  );
}
