import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AccountForm } from "../components/AccountForm";
import type { Account } from "@ctrl-custo/core";

jest.mock("../store/useAccountStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAccountStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      add: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    }),
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isDark: false,
};

const mockAccount: Account = {
  id: "acc-1",
  userId: "user-1",
  name: "Nubank",
  type: "checking",
  balance: 50000,
  icon: "🏦",
  color: "#2563EB",
  bankName: "Nubank",
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("AccountForm — modo criação", () => {
  it("renderiza o título 'Nova Conta'", () => {
    render(<AccountForm {...defaultProps} />);
    expect(screen.getByText("Nova Conta")).toBeTruthy();
  });

  it("exibe chips de tipo de conta", () => {
    render(<AccountForm {...defaultProps} />);
    expect(screen.getByText("Corrente")).toBeTruthy();
    expect(screen.getByText("Poupança")).toBeTruthy();
    expect(screen.getByText("Investimento")).toBeTruthy();
  });

  it("exibe label de saldo inicial", () => {
    render(<AccountForm {...defaultProps} />);
    expect(screen.getByText("Saldo inicial")).toBeTruthy();
  });

  it("exibe botão Salvar", () => {
    render(<AccountForm {...defaultProps} />);
    expect(screen.getByText("Salvar")).toBeTruthy();
  });
});

describe("AccountForm — modo edição", () => {
  it("renderiza o título 'Editar Conta'", () => {
    render(<AccountForm {...defaultProps} account={mockAccount} />);
    expect(screen.getByText("Editar Conta")).toBeTruthy();
  });

  it("exibe label de saldo atual", () => {
    render(<AccountForm {...defaultProps} account={mockAccount} />);
    expect(screen.getByText("Saldo atual")).toBeTruthy();
  });

  it("exibe botão Atualizar", () => {
    render(<AccountForm {...defaultProps} account={mockAccount} />);
    expect(screen.getByText("Atualizar")).toBeTruthy();
  });
});
