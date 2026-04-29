import { describe, it, expect } from "vitest";
import { createExportService } from "../services/ExportService";
import type { Transaction } from "../types/transaction";
import type { Category } from "../types/category";
import type { Account } from "../types/account";

const mockTransaction: Transaction = {
  id: "tx-1",
  description: "Supermercado",
  amount: 25000,
  type: "expense",
  status: "confirmed",
  date: "2024-01-15",
  categoryId: "cat-1",
  accountId: "acc-1",
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
};

const mockCategory: Category = {
  id: "cat-1",
  name: "Alimentação",
  type: "expense",
  color: "#FF5733",
  icon: "food",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockAccount: Account = {
  id: "acc-1",
  name: "Nubank",
  type: "checking",
  balance: 0,
  color: "#8A2BE2",
  icon: "bank",
  isArchived: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("ExportService", () => {
  const service = createExportService();

  it("gera CSV com cabeçalho e linha de dados", () => {
    const csv = service.toCSV([mockTransaction]);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("Descrição");
    expect(lines[0]).toContain("Valor (R$)");
    expect(lines[1]).toContain("Supermercado");
    expect(lines[1]).toContain("250.00"); // 25000 centavos → 250.00
  });

  it("escapa vírgulas no CSV corretamente", () => {
    const txWithComma: Transaction = {
      ...mockTransaction,
      description: "Mercado, padaria e açougue",
    };

    const csv = service.toCSV([txWithComma]);
    expect(csv).toContain('"Mercado, padaria e açougue"');
  });

  it("gera CSV vazio com apenas cabeçalho", () => {
    const csv = service.toCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("ID");
  });

  it("exporta JSON válido com todos os campos", () => {
    const data = service.buildExportData([mockTransaction], [mockCategory], [mockAccount]);
    const json = service.toJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.categories).toHaveLength(1);
    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.exportedAt).toBeDefined();
  });

  it("faz parse de JSON válido", () => {
    const data = service.buildExportData([mockTransaction], [mockCategory], [mockAccount]);
    const json = service.toJSON(data);

    const parsed = service.parseJSON(json);
    expect(parsed.transactions[0].id).toBe("tx-1");
  });

  it("lança erro em JSON inválido", () => {
    expect(() => service.parseJSON('{"invalido": true}')).toThrow("Formato de backup inválido");
  });

  it("formata parcelas no CSV", () => {
    const txWithInstallment: Transaction = {
      ...mockTransaction,
      installment: { total: 12, current: 3, groupId: "group-1" },
    };

    const csv = service.toCSV([txWithInstallment]);
    expect(csv).toContain("3");
    expect(csv).toContain("12");
  });
});
