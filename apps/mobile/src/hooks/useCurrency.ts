export function formatCurrency(cents: number, compact = false): string {
  const value = cents / 100;
  if (compact && Math.abs(value) >= 1000) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
      notation: "compact",
    });
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits.replace(/^0+/, "") || "0", 10);
}

export function formatCurrencyInput(cents: number): string {
  if (cents === 0) return "";
  const str = cents.toString().padStart(3, "0");
  const int = str.slice(0, -2);
  const dec = str.slice(-2);
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted},${dec}`;
}
