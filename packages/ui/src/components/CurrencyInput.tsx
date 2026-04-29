import { useCallback } from "react";
import { Input } from "./Input";
import type { TextInputProps } from "react-native";

interface CurrencyInputProps extends Omit<
  TextInputProps,
  "value" | "onChangeText" | "keyboardType"
> {
  label?: string;
  error?: string;
  hint?: string;
  // Valor em centavos (ex: 150000 = R$ 1.500,00)
  valueCents: number;
  onChangeCents: (cents: number) => void;
}

// Converte centavos para string formatada: 150000 → "R$ 1.500,00"
function centsToDisplay(cents: number): string {
  if (cents === 0) return "";
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// Extrai apenas os dígitos e converte para centavos: "R$ 1.500,00" → 150000
function displayToCents(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits === "0") return 0;
  // Remove zeros à esquerda e interpreta como centavos
  return parseInt(digits.replace(/^0+/, "") || "0", 10);
}

export function CurrencyInput({
  label,
  error,
  hint,
  valueCents,
  onChangeCents,
  placeholder = "R$ 0,00",
  ...rest
}: CurrencyInputProps) {
  const displayValue = valueCents > 0 ? centsToDisplay(valueCents) : "";

  const handleChange = useCallback(
    (text: string) => {
      const cents = displayToCents(text);
      onChangeCents(cents);
    },
    [onChangeCents]
  );

  return (
    <Input
      label={label}
      error={error}
      hint={hint}
      value={displayValue}
      onChangeText={handleChange}
      keyboardType="numeric"
      placeholder={placeholder}
      textAlign="right"
      {...rest}
    />
  );
}
