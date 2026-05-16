import React from "react";
import { render, screen } from "@testing-library/react-native";
import { GoalForm } from "../components/GoalForm";

jest.mock("../store/useGoalStore", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGoalStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ add: jest.fn().mockResolvedValue(undefined) }),
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  isDark: false,
};

describe("GoalForm", () => {
  it("renderiza o título 'Nova Meta' quando visível", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByText("Nova Meta")).toBeTruthy();
  });

  it("exibe campo para nome da meta", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByPlaceholderText("Ex: Viagem para Europa")).toBeTruthy();
  });

  it("exibe campo para valor alvo", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByPlaceholderText("0,00")).toBeTruthy();
  });

  it("exibe campo para prazo", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByPlaceholderText("DD-MM-AAAA")).toBeTruthy();
  });

  it("exibe botão Salvar", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByText("Salvar")).toBeTruthy();
  });

  it("exibe grid de ícones pré-definidos", () => {
    render(<GoalForm {...defaultProps} />);
    expect(screen.getByText("🎯")).toBeTruthy();
  });
});
