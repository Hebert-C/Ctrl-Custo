import type { Transaction } from "../types/transaction";
import type { Category } from "../types/category";
import type { Account } from "../types/account";

export interface ExportData {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  exportedAt: string;
  version: string;
}

// Converte centavos para reais formatado (ex: 150000 → "1500.00")
function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Escapa campo para CSV (envolve em aspas se contiver vírgula ou quebra de linha)
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function createExportService() {
  return {
    // Exporta transações como string CSV com cabeçalho em português
    toCSV(transactions: Transaction[]): string {
      const headers = [
        "ID",
        "Descrição",
        "Valor (R$)",
        "Tipo",
        "Status",
        "Data",
        "Categoria",
        "Conta",
        "Cartão",
        "Parcela Atual",
        "Total Parcelas",
        "Observações",
      ];

      const rows = transactions.map((t) => [
        t.id,
        t.description,
        centsToDecimal(t.amount),
        t.type === "income" ? "Receita" : t.type === "expense" ? "Despesa" : "Transferência",
        t.status === "confirmed" ? "Confirmado" : t.status === "pending" ? "Pendente" : "Cancelado",
        t.date,
        t.categoryId,
        t.accountId,
        t.cardId ?? "",
        t.installment?.current?.toString() ?? "",
        t.installment?.total?.toString() ?? "",
        t.notes ?? "",
      ]);

      const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));

      return lines.join("\n");
    },

    // Exporta backup completo do banco em JSON estruturado
    toJSON(data: ExportData): string {
      return JSON.stringify(data, null, 2);
    },

    // Monta o objeto de backup completo
    buildExportData(
      transactions: Transaction[],
      categories: Category[],
      accounts: Account[]
    ): ExportData {
      return {
        transactions,
        categories,
        accounts,
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      };
    },

    // Valida e faz parse de um JSON de backup
    parseJSON(raw: string): ExportData {
      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("version" in parsed) ||
        !("transactions" in parsed) ||
        !("categories" in parsed) ||
        !("accounts" in parsed)
      ) {
        throw new Error("Formato de backup inválido");
      }

      return parsed as ExportData;
    },
  };
}

export type ExportService = ReturnType<typeof createExportService>;
