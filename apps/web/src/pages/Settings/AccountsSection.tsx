import { type FormEvent, useState } from "react";
import { useAccountStore } from "../../store/useAccountStore";
import { getDatabase } from "../../db/index";
import type { Account, AccountType } from "@ctrl-custo/core";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
  { value: "cash", label: "Dinheiro" },
  { value: "wallet", label: "Carteira Digital" },
];

const PRESET_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const DEFAULT_FORM = {
  name: "",
  type: "checking" as AccountType,
  balance: "",
  color: "#3B82F6",
  icon: "bank",
  bankName: "",
};

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function brlToCents(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits.replace(/^0+/, "") || "0", 10);
}

export function AccountsSection() {
  const { accounts, add, update, remove, archive } = useAccountStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      balance: centsToBRL(account.balance),
      color: account.color,
      icon: account.icon,
      bankName: account.bankName ?? "",
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
        balance: brlToCents(form.balance),
        color: form.color,
        icon: form.icon || "bank",
        bankName: form.bankName.trim() || undefined,
        isArchived: false,
      };
      if (editing) {
        await update(db, editing.id, data);
        setEditing(null);
      } else {
        await add(db, data);
      }
      setForm(DEFAULT_FORM);
    } catch {
      setError("Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover esta conta? Esta ação não pode ser desfeita.")) return;
    const db = await getDatabase();
    await remove(db, id);
  }

  async function handleArchive(id: string) {
    const db = await getDatabase();
    await archive(db, id);
  }

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {editing ? "Editar Conta" : "Nova Conta"}
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
                placeholder="Ex: Nubank, Bradesco..."
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
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Saldo inicial */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Saldo inicial
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.balance}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const cents = parseInt(digits || "0", 10);
                  setForm((f) => ({
                    ...f,
                    balance: cents > 0 ? centsToBRL(cents) : "",
                  }));
                }}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Banco */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Banco (opcional)
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="Ex: Nubank, Itaú..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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

      {/* Lista */}
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma conta cadastrada ainda.</p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
            >
              <div
                className="w-3 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: account.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {account.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label}
                  {account.bankName ? ` · ${account.bankName}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                R$ {centsToBRL(account.balance)}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(account)}
                  className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleArchive(account.id)}
                  className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Arquivar
                </button>
                <button
                  onClick={() => handleRemove(account.id)}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
