import type {
  Transaction,
  NewTransaction,
  Account,
  NewAccount,
  Category,
  NewCategory,
  Card,
  NewCard,
  Goal,
  NewGoal,
} from "@ctrl-custo/core";
import type { InstallmentInfo } from "@ctrl-custo/core";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let _token: string | null = null;
let _refreshing: Promise<boolean> | null = null;

export function setToken(t: string) {
  _token = t;
}
export function clearToken() {
  _token = null;
}
export function hasToken() {
  return _token !== null;
}

async function refreshTokenOnce(): Promise<boolean> {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r) => {
      if (!r.ok) {
        clearToken();
        return false;
      }
      const { accessToken } = (await r.json()) as { accessToken: string };
      setToken(accessToken);
      return true;
    })
    .catch(() => {
      clearToken();
      return false;
    })
    .finally(() => {
      _refreshing = null;
    });
  return _refreshing;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hdrs: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) hdrs["Authorization"] = `Bearer ${_token}`;

  let res = await fetch(`${BASE}${path}`, { ...init, headers: hdrs, credentials: "include" });

  if (res.status === 401 && _token) {
    const ok = await refreshTokenOnce();
    if (ok) {
      hdrs["Authorization"] = `Bearer ${_token!}`;
      res = await fetch(`${BASE}${path}`, { ...init, headers: hdrs, credentials: "include" });
    }
  }

  if (res.status === 401) {
    clearToken();
    window.location.replace("/login");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// --- Raw API shapes (include nullable fields and userId) ---

interface ApiRow {
  createdAt: string;
  updatedAt: string;
}

interface ApiTransaction extends ApiRow {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  status: "confirmed" | "pending" | "cancelled";
  date: string;
  categoryId: string;
  accountId: string;
  cardId: string | null;
  installmentTotal: number | null;
  installmentCurrent: number | null;
  installmentGroupId: string | null;
  notes: string | null;
}

interface ApiAccount extends ApiRow {
  id: string;
  name: string;
  type: Account["type"];
  balance: number;
  color: string;
  icon: string;
  bankName: string | null;
  isArchived: boolean;
}

interface ApiCategory extends ApiRow {
  id: string;
  name: string;
  type: Category["type"];
  color: string;
  icon: string;
  parentId: string | null;
}

interface ApiCard extends ApiRow {
  id: string;
  name: string;
  brand: Card["brand"];
  lastFourDigits: string | null;
  creditLimit: number;
  billingDay: number;
  dueDay: number;
  accountId: string;
  color: string;
  isArchived: boolean;
}

interface ApiGoal extends ApiRow {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  status: Goal["status"];
  color: string;
  icon: string;
  notes: string | null;
}

// --- Mappers: null → undefined ---

function mapTransaction(row: ApiTransaction): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    type: row.type,
    status: row.status,
    date: row.date,
    categoryId: row.categoryId,
    accountId: row.accountId,
    cardId: row.cardId ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    installment:
      row.installmentTotal && row.installmentCurrent && row.installmentGroupId
        ? {
            total: row.installmentTotal,
            current: row.installmentCurrent,
            groupId: row.installmentGroupId,
          }
        : undefined,
  };
}

function mapAccount(row: ApiAccount): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    color: row.color,
    icon: row.icon,
    bankName: row.bankName ?? undefined,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCategory(row: ApiCategory): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    parentId: row.parentId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCard(row: ApiCard): Card {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    lastFourDigits: row.lastFourDigits ?? undefined,
    creditLimit: row.creditLimit,
    billingDay: row.billingDay,
    dueDay: row.dueDay,
    accountId: row.accountId,
    color: row.color,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapGoal(row: ApiGoal): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    deadline: row.deadline ?? undefined,
    status: row.status,
    color: row.color,
    icon: row.icon,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Converts core NewTransaction (with nested installment) to flat API body
function toApiTx(data: Partial<NewTransaction>): Record<string, unknown> {
  const { installment, ...rest } = data as { installment?: InstallmentInfo } & Record<
    string,
    unknown
  >;
  return {
    ...rest,
    ...(installment && {
      installmentTotal: installment.total,
      installmentCurrent: installment.current,
      installmentGroupId: installment.groupId,
    }),
  };
}

// --- Public API ---

export const api = {
  auth: {
    login: (email: string, password: string) =>
      req<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      req<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    refresh: () =>
      fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" }).then((r) =>
        r.ok
          ? (r.json() as Promise<{ accessToken: string }>)
          : Promise.reject(new Error("refresh failed"))
      ),
    logout: () => fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" }),
  },

  transactions: {
    list: () => req<ApiTransaction[]>("/transactions").then((rows) => rows.map(mapTransaction)),
    create: (data: NewTransaction) =>
      req<ApiTransaction>("/transactions", {
        method: "POST",
        body: JSON.stringify(toApiTx(data)),
      }).then(mapTransaction),
    update: (id: string, data: Partial<NewTransaction>) =>
      req<ApiTransaction>(`/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(toApiTx(data)),
      }).then(mapTransaction),
    remove: (id: string) => req<{ ok: boolean }>(`/transactions/${id}`, { method: "DELETE" }),
  },

  accounts: {
    list: () => req<ApiAccount[]>("/accounts").then((rows) => rows.map(mapAccount)),
    create: (data: NewAccount) =>
      req<ApiAccount>("/accounts", {
        method: "POST",
        body: JSON.stringify(data),
      }).then(mapAccount),
    update: (id: string, data: Partial<NewAccount>) =>
      req<ApiAccount>(`/accounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(mapAccount),
    remove: (id: string) => req<{ ok: boolean }>(`/accounts/${id}`, { method: "DELETE" }),
  },

  categories: {
    list: () => req<ApiCategory[]>("/categories").then((rows) => rows.map(mapCategory)),
    create: (data: NewCategory) =>
      req<ApiCategory>("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }).then(mapCategory),
    update: (id: string, data: Partial<NewCategory>) =>
      req<ApiCategory>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(mapCategory),
    remove: (id: string) => req<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),
  },

  cards: {
    list: () => req<ApiCard[]>("/cards").then((rows) => rows.map(mapCard)),
    create: (data: NewCard) =>
      req<ApiCard>("/cards", {
        method: "POST",
        body: JSON.stringify(data),
      }).then(mapCard),
    update: (id: string, data: Partial<NewCard>) =>
      req<ApiCard>(`/cards/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(mapCard),
    remove: (id: string) => req<{ ok: boolean }>(`/cards/${id}`, { method: "DELETE" }),
  },

  goals: {
    list: () => req<ApiGoal[]>("/goals").then((rows) => rows.map(mapGoal)),
    create: (data: NewGoal) =>
      req<ApiGoal>("/goals", {
        method: "POST",
        body: JSON.stringify(data),
      }).then(mapGoal),
    update: (id: string, data: Partial<NewGoal>) =>
      req<ApiGoal>(`/goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(mapGoal),
    remove: (id: string) => req<{ ok: boolean }>(`/goals/${id}`, { method: "DELETE" }),
    deposit: (id: string, amount: number) =>
      req<ApiGoal>(`/goals/${id}/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }).then(mapGoal),
  },
};
