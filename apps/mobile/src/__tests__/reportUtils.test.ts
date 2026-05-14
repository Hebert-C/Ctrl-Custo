import {
  lastNMonths,
  aggregateMonths,
  buildCumulativeLine,
  isCurrentMonth,
} from "../lib/reportUtils";
import type { Transaction } from "@ctrl-custo/core";

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    description: "Teste",
    amount: 10000,
    type: "expense",
    status: "confirmed",
    date: "2026-01-15",
    categoryId: "cat-1",
    accountId: "acc-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("lastNMonths", () => {
  it("retorna exatamente N meses", () => {
    expect(lastNMonths(3)).toHaveLength(3);
    expect(lastNMonths(6)).toHaveLength(6);
    expect(lastNMonths(12)).toHaveLength(12);
  });

  it("o último item é o mês atual", () => {
    const months = lastNMonths(3);
    const now = new Date();
    const last = months[months.length - 1];
    expect(last.month).toBe(now.getMonth() + 1);
    expect(last.year).toBe(now.getFullYear());
  });

  it("retorna meses em ordem cronológica crescente", () => {
    const months = lastNMonths(6);
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      const curr = months[i];
      expect(curr.year * 12 + curr.month).toBeGreaterThan(prev.year * 12 + prev.month);
    }
  });

  it("cada item tem label de 3 letras", () => {
    lastNMonths(12).forEach((m) => {
      expect(m.label).toMatch(/^[A-Z][a-z]{2}$/);
    });
  });
});

describe("aggregateMonths", () => {
  const jan2026 = [{ year: 2026, month: 1, label: "Jan" }];

  it("soma receitas e despesas separadamente", () => {
    const txs = [
      makeTx({ type: "income", amount: 50000, date: "2026-01-10" }),
      makeTx({ type: "expense", amount: 20000, date: "2026-01-20" }),
    ];
    const [result] = aggregateMonths(txs, jan2026);
    expect(result.income).toBe(50000);
    expect(result.expense).toBe(20000);
    expect(result.net).toBe(30000);
  });

  it("calcula net negativo quando despesa > receita", () => {
    const txs = [
      makeTx({ type: "income", amount: 10000, date: "2026-01-01" }),
      makeTx({ type: "expense", amount: 30000, date: "2026-01-01" }),
    ];
    const [result] = aggregateMonths(txs, jan2026);
    expect(result.net).toBe(-20000);
  });

  it("ignora transações com status 'pending'", () => {
    const txs = [makeTx({ status: "pending", amount: 50000, date: "2026-01-10" })];
    const [result] = aggregateMonths(txs, jan2026);
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
  });

  it("ignora transações fora do mês", () => {
    const txs = [makeTx({ type: "income", amount: 50000, date: "2026-02-10" })];
    const [result] = aggregateMonths(txs, jan2026);
    expect(result.income).toBe(0);
  });

  it("não contabiliza transferências em receita nem despesa", () => {
    const txs = [makeTx({ type: "transfer", amount: 10000, date: "2026-01-15" })];
    const [result] = aggregateMonths(txs, jan2026);
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
  });

  it("retorna zeros para mês sem transações", () => {
    const [result] = aggregateMonths([], jan2026);
    expect(result.income).toBe(0);
    expect(result.expense).toBe(0);
    expect(result.net).toBe(0);
  });

  it("processa múltiplos meses corretamente", () => {
    const months = [
      { year: 2026, month: 1, label: "Jan" },
      { year: 2026, month: 2, label: "Fev" },
    ];
    const txs = [
      makeTx({ type: "income", amount: 30000, date: "2026-01-10" }),
      makeTx({ type: "expense", amount: 10000, date: "2026-02-10" }),
    ];
    const results = aggregateMonths(txs, months);
    expect(results[0].income).toBe(30000);
    expect(results[0].expense).toBe(0);
    expect(results[1].income).toBe(0);
    expect(results[1].expense).toBe(10000);
  });
});

describe("buildCumulativeLine", () => {
  it("acumula net mês a mês", () => {
    const data = [
      { label: "Jan", year: 2026, month: 1, income: 50000, expense: 20000, net: 30000 },
      { label: "Fev", year: 2026, month: 2, income: 30000, expense: 40000, net: -10000 },
      { label: "Mar", year: 2026, month: 3, income: 20000, expense: 10000, net: 10000 },
    ];
    const result = buildCumulativeLine(data);
    expect(result[0]).toEqual({ x: "Jan", y: 30000 });
    expect(result[1]).toEqual({ x: "Fev", y: 20000 }); // 30000 - 10000
    expect(result[2]).toEqual({ x: "Mar", y: 30000 }); // 20000 + 10000
  });

  it("começa do zero — primeiro mês acumula apenas seu próprio net", () => {
    const data = [{ label: "Jan", year: 2026, month: 1, income: 0, expense: 10000, net: -10000 }];
    const result = buildCumulativeLine(data);
    expect(result[0].y).toBe(-10000);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(buildCumulativeLine([])).toEqual([]);
  });
});

describe("isCurrentMonth", () => {
  it("retorna true para o mês atual", () => {
    const now = new Date();
    expect(isCurrentMonth(now.getFullYear(), now.getMonth() + 1)).toBe(true);
  });

  it("retorna false para mês diferente", () => {
    expect(isCurrentMonth(2000, 1)).toBe(false);
  });
});
