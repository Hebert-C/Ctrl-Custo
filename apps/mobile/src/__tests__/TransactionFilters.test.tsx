import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TransactionFilters, countActiveFilters } from "../components/TransactionFilters";
import type { Category, Account } from "@ctrl-custo/core";

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onApply: jest.fn(),
  onClear: jest.fn(),
  categories: [] as Category[],
  accounts: [] as Account[],
  current: {},
  isDark: false,
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

describe("TransactionFilters — renderização", () => {
  it("exibe o título 'Filtros'", () => {
    render(<TransactionFilters {...defaultProps} />);
    expect(screen.getByText("Filtros")).toBeTruthy();
  });

  it("exibe os três chips de tipo", () => {
    render(<TransactionFilters {...defaultProps} />);
    expect(screen.getByText("Receita")).toBeTruthy();
    expect(screen.getByText("Despesa")).toBeTruthy();
    expect(screen.getByText("Transferência")).toBeTruthy();
  });

  it("exibe botão 'Aplicar filtros'", () => {
    render(<TransactionFilters {...defaultProps} />);
    expect(screen.getByText("Aplicar filtros")).toBeTruthy();
  });

  it("não exibe 'Limpar tudo' quando não há filtros ativos", () => {
    render(<TransactionFilters {...defaultProps} current={{}} />);
    expect(screen.queryByText("Limpar tudo")).toBeNull();
  });

  it("exibe 'Limpar tudo' quando há filtro de tipo ativo", () => {
    render(<TransactionFilters {...defaultProps} current={{ type: "expense" }} />);
    expect(screen.getByText("Limpar tudo")).toBeTruthy();
  });

  it("exibe 'Limpar tudo' quando há filtro de busca ativo", () => {
    render(<TransactionFilters {...defaultProps} current={{ search: "mercado" }} />);
    expect(screen.getByText("Limpar tudo")).toBeTruthy();
  });

  it("exibe chips de categorias quando passadas via prop", () => {
    render(<TransactionFilters {...defaultProps} categories={[mockCategory]} />);
    expect(screen.getByText("Alimentação")).toBeTruthy();
  });

  it("não exibe seção de categorias quando lista vazia", () => {
    render(<TransactionFilters {...defaultProps} categories={[]} />);
    expect(screen.queryByText("Categoria")).toBeNull();
  });

  it("exibe chips de bancos quando passados via prop", () => {
    render(<TransactionFilters {...defaultProps} accounts={[mockAccount]} />);
    expect(screen.getByText("Nubank")).toBeTruthy();
  });

  it("não exibe seção de bancos quando lista vazia", () => {
    render(<TransactionFilters {...defaultProps} accounts={[]} />);
    expect(screen.queryByText("Banco")).toBeNull();
  });
});

describe("TransactionFilters — interação", () => {
  it("chama onApply ao tocar em 'Aplicar filtros'", () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(<TransactionFilters {...defaultProps} onApply={onApply} onClose={onClose} />);
    fireEvent.press(screen.getByText("Aplicar filtros"));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chama onClear ao tocar em 'Limpar tudo'", () => {
    const onClear = jest.fn();
    const onClose = jest.fn();
    render(
      <TransactionFilters
        {...defaultProps}
        current={{ type: "income" }}
        onClear={onClear}
        onClose={onClose}
      />
    );
    fireEvent.press(screen.getByText("Limpar tudo"));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("countActiveFilters", () => {
  it("retorna 0 para objeto vazio", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("conta cada filtro individualmente", () => {
    expect(countActiveFilters({ type: "expense" })).toBe(1);
    expect(countActiveFilters({ type: "expense", categoryId: "cat-1" })).toBe(2);
    expect(countActiveFilters({ type: "expense", categoryId: "cat-1", accountId: "acc-1" })).toBe(
      3
    );
    expect(
      countActiveFilters({
        type: "expense",
        categoryId: "cat-1",
        accountId: "acc-1",
        search: "mercado",
      })
    ).toBe(4);
  });

  it("não conta search vazio ou só espaços", () => {
    expect(countActiveFilters({ search: "" })).toBe(0);
    expect(countActiveFilters({ search: "   " })).toBe(0);
  });
});
