import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TransactionForm } from "../components/TransactionForm";
import type { Transaction, Account } from "@ctrl-custo/core";

jest.mock("../store/useTransactionStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useTransactionStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      add: jest.fn().mockResolvedValue(undefined),
      addInstallments: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    }),
}));

const mockAccount: Account = {
  id: "acc-1",
  name: "Nubank",
  type: "checking",
  balance: 50000,
  color: "#8B5CF6",
  icon: "🏦",
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAccount2: Account = {
  ...mockAccount,
  id: "acc-2",
  name: "Itaú",
};

const mockTransaction: Transaction = {
  id: "tx-1",
  description: "Supermercado",
  amount: 15000,
  type: "expense",
  status: "confirmed",
  date: "2026-05-01",
  categoryId: "cat-1",
  accountId: "acc-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  accounts: [mockAccount, mockAccount2],
  categories: [],
  isDark: false,
};

describe("TransactionForm — modo criação", () => {
  it("exibe título 'Nova Transação'", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.getByText("Nova Transação")).toBeTruthy();
  });

  it("exibe botão 'Salvar'", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.getByText("Salvar")).toBeTruthy();
  });

  it("exibe os três toggles de tipo", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.getByText("Despesa")).toBeTruthy();
    expect(screen.getByText("Receita")).toBeTruthy();
    expect(screen.getByText("Transf.")).toBeTruthy();
  });

  it("exibe campo 'Observações (opcional)'", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.getByText("Observações (opcional)")).toBeTruthy();
  });

  it("não exibe 'Banco de destino' no estado inicial (despesa)", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.queryByText("Banco de destino")).toBeNull();
  });

  it("exibe 'Banco de destino' ao selecionar tipo Transferência", () => {
    render(<TransactionForm {...defaultProps} />);
    fireEvent.press(screen.getByText("Transf."));
    expect(screen.getByText("Banco de destino")).toBeTruthy();
  });

  it("exibe campo 'Parcelas' na criação de despesa", () => {
    render(<TransactionForm {...defaultProps} />);
    expect(screen.getByText("Parcelas")).toBeTruthy();
  });

  it("não exibe 'Parcelas' ao selecionar tipo Receita", () => {
    render(<TransactionForm {...defaultProps} />);
    fireEvent.press(screen.getByText("Receita"));
    expect(screen.queryByText("Parcelas")).toBeNull();
  });

  it("não exibe 'Parcelas' ao selecionar tipo Transferência", () => {
    render(<TransactionForm {...defaultProps} />);
    fireEvent.press(screen.getByText("Transf."));
    expect(screen.queryByText("Parcelas")).toBeNull();
  });
});

describe("TransactionForm — modo edição", () => {
  it("exibe título 'Editar Transação'", () => {
    render(<TransactionForm {...defaultProps} editing={mockTransaction} />);
    expect(screen.getByText("Editar Transação")).toBeTruthy();
  });

  it("exibe botão 'Atualizar'", () => {
    render(<TransactionForm {...defaultProps} editing={mockTransaction} />);
    expect(screen.getByText("Atualizar")).toBeTruthy();
  });

  it("não exibe campo 'Parcelas' em modo edição", () => {
    render(<TransactionForm {...defaultProps} editing={mockTransaction} />);
    expect(screen.queryByText("Parcelas")).toBeNull();
  });

  it("exibe campo 'Observações' em modo edição", () => {
    render(<TransactionForm {...defaultProps} editing={mockTransaction} />);
    expect(screen.getByText("Observações (opcional)")).toBeTruthy();
  });
});
