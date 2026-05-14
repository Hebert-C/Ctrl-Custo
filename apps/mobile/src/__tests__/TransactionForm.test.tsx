import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { TransactionForm } from "../components/TransactionForm";
import type { Transaction, Account, Category } from "@ctrl-custo/core";

const mockAdd = jest.fn().mockResolvedValue({ id: "tx-new" });
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockAddInstallments = jest.fn().mockResolvedValue([]);

jest.mock("../store/useTransactionStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useTransactionStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      add: mockAdd,
      addInstallments: mockAddInstallments,
      update: mockUpdate,
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

const mockCategory: Category = {
  id: "cat-1",
  name: "Alimentação",
  type: "expense",
  color: "#EF4444",
  icon: "🍔",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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

beforeEach(() => {
  jest.clearAllMocks();
});

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

describe("TransactionForm — validação de campos obrigatórios", () => {
  it("exibe erro de valor ao salvar sem preencher o valor", async () => {
    render(<TransactionForm {...defaultProps} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(screen.getByText("Informe um valor maior que zero.")).toBeTruthy();
  });

  it("exibe erro de descrição ao salvar sem preencher a descrição", async () => {
    render(<TransactionForm {...defaultProps} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(screen.getByText("Descrição é obrigatória.")).toBeTruthy();
  });

  it("exibe erro de categoria ao salvar sem selecionar categoria", async () => {
    render(<TransactionForm {...defaultProps} categories={[mockCategory]} />);
    // preenche valor e descrição mas não seleciona categoria
    fireEvent.changeText(screen.getByPlaceholderText("Ex: Supermercado"), "Teste");
    fireEvent.changeText(screen.getByPlaceholderText("0,00"), "50");
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(screen.getByText("Selecione uma categoria.")).toBeTruthy();
  });

  it("exibe erro de banco de destino ao salvar transferência sem banco destino", async () => {
    render(<TransactionForm {...defaultProps} />);
    fireEvent.press(screen.getByText("Transf."));
    fireEvent.changeText(screen.getByPlaceholderText("Ex: Supermercado"), "Transferência");
    fireEvent.changeText(screen.getByPlaceholderText("0,00"), "100");
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(screen.getByText("Selecione o banco de destino.")).toBeTruthy();
  });

  it("não chama add() quando há erros de validação", async () => {
    render(<TransactionForm {...defaultProps} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("limpa os erros após corrigir e salvar com sucesso", async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    render(
      <TransactionForm
        {...defaultProps}
        categories={[mockCategory]}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    // tentativa falha — sem preencher nada
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });
    expect(screen.getByText("Informe um valor maior que zero.")).toBeTruthy();

    // preenche todos os campos obrigatórios
    fireEvent.changeText(screen.getByPlaceholderText("0,00"), "100");
    fireEvent.changeText(screen.getByPlaceholderText("Ex: Supermercado"), "Almoço");
    fireEvent.press(screen.getByText("Alimentação")); // chip sem emoji

    // salva com sucesso
    await act(async () => {
      fireEvent.press(screen.getByText("Salvar"));
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Informe um valor maior que zero.")).toBeNull();
  });
});
