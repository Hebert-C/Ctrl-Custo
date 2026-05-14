import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import type { Transaction, Category, Account } from "@ctrl-custo/core";

const TYPE_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmada",
  pending: "Pendente",
  cancelled: "Cancelada",
};

interface MonthRow {
  label: string;
  year: number;
  income: number;
  expense: number;
  net: number;
}

function buildTxRows(txs: Transaction[], categories: Category[], accounts: Account[]) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  return txs.map((tx) => ({
    Data: tx.date,
    Descrição: tx.description,
    Tipo: TYPE_LABEL[tx.type] ?? tx.type,
    "Valor (R$)": (tx.amount / 100).toFixed(2).replace(".", ","),
    Categoria: catById[tx.categoryId] ?? "",
    Banco: accById[tx.accountId] ?? "",
    Status: STATUS_LABEL[tx.status] ?? tx.status,
    Notas: tx.notes ?? "",
  }));
}

function buildMonthRows(months: MonthRow[]) {
  return months.map((m) => ({
    Mês: `${m.label} ${m.year}`,
    "Receitas (R$)": (m.income / 100).toFixed(2).replace(".", ","),
    "Despesas (R$)": (m.expense / 100).toFixed(2).replace(".", ","),
    "Saldo (R$)": (m.net / 100).toFixed(2).replace(".", ","),
  }));
}

export async function exportCSV(
  txs: Transaction[],
  categories: Category[],
  accounts: Account[]
): Promise<void> {
  const rows = buildTxRows(txs, categories, accounts);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]) as (keyof (typeof rows)[0])[];
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => r[h]).join(";"))];

  const path = FileSystem.cacheDirectory + "ctrl-custo-transacoes.csv";
  await FileSystem.writeAsStringAsync(path, lines.join("\n"), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(path, {
    mimeType: "text/csv",
    dialogTitle: "Exportar CSV",
    UTI: "public.comma-separated-values-text",
  });
}

export async function exportXLSX(
  txs: Transaction[],
  categories: Category[],
  accounts: Account[],
  months: MonthRow[]
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const txSheet = XLSX.utils.json_to_sheet(buildTxRows(txs, categories, accounts));
  XLSX.utils.book_append_sheet(wb, txSheet, "Transações");

  if (months.length > 0) {
    const sumSheet = XLSX.utils.json_to_sheet(buildMonthRows(months));
    XLSX.utils.book_append_sheet(wb, sumSheet, "Resumo Mensal");
  }

  const wbout: string = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const path = FileSystem.cacheDirectory + "ctrl-custo.xlsx";
  await FileSystem.writeAsStringAsync(path, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(path, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Exportar Excel",
    UTI: "com.microsoft.excel.xlsx",
  });
}
