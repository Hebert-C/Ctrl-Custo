import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "../hooks/useCurrency";

describe("parseCurrencyInput", () => {
  it("retorna 0 para string vazia", () => {
    expect(parseCurrencyInput("")).toBe(0);
  });

  it("converte '100,00' em 10000 centavos", () => {
    expect(parseCurrencyInput("100,00")).toBe(10000);
  });

  it("converte '1.234,56' em 123456 centavos", () => {
    expect(parseCurrencyInput("1.234,56")).toBe(123456);
  });

  it("retorna 0 para string sem dígitos", () => {
    expect(parseCurrencyInput("R$ ")).toBe(0);
  });

  it("remove zeros à esquerda", () => {
    expect(parseCurrencyInput("050")).toBe(50);
  });
});

describe("formatCurrencyInput", () => {
  it("retorna string vazia para zero", () => {
    expect(formatCurrencyInput(0)).toBe("");
  });

  it("formata 100 centavos → '1,00'", () => {
    expect(formatCurrencyInput(100)).toBe("1,00");
  });

  it("formata 10000 centavos → '100,00'", () => {
    expect(formatCurrencyInput(10000)).toBe("100,00");
  });

  it("formata 1234567 centavos → '12.345,67'", () => {
    expect(formatCurrencyInput(1234567)).toBe("12.345,67");
  });

  it("formata 1000000 centavos → '10.000,00'", () => {
    expect(formatCurrencyInput(1000000)).toBe("10.000,00");
  });
});

describe("formatCurrency", () => {
  it("retorna uma string com o valor numérico", () => {
    const result = formatCurrency(10000);
    expect(result).toMatch(/100/);
  });

  it("formata zero como valor com decimais", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0/);
  });

  it("modo compact não afeta valores abaixo de 1000", () => {
    const normal = formatCurrency(50000);
    const compact = formatCurrency(50000, true);
    expect(compact).toBe(normal);
  });

  it("modo compact aplica notação reduzida para valores ≥ 1000", () => {
    const result = formatCurrency(200000, true);
    // Espera alguma forma de abreviação (K, mil, etc.)
    expect(result.length).toBeLessThan(formatCurrency(200000).length);
  });
});
