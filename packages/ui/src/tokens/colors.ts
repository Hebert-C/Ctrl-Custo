// Paleta base — usada para construir os temas
const palette = {
  // Verde financeiro (brand)
  green50: "#F0FDF4",
  green100: "#DCFCE7",
  green200: "#BBF7D0",
  green300: "#86EFAC",
  green400: "#4ADE80",
  green500: "#22C55E",
  green600: "#16A34A",
  green700: "#15803D",
  green800: "#166534",
  green900: "#14532D",

  // Vermelho (despesas / perigo)
  red50: "#FEF2F2",
  red100: "#FEE2E2",
  red400: "#F87171",
  red500: "#EF4444",
  red600: "#DC2626",
  red700: "#B91C1C",

  // Amarelo (atenção / pendente)
  yellow50: "#FEFCE8",
  yellow400: "#FACC15",
  yellow500: "#EAB308",
  yellow600: "#CA8A04",

  // Azul (transferências / informação)
  blue50: "#EFF6FF",
  blue400: "#60A5FA",
  blue500: "#3B82F6",
  blue600: "#2563EB",

  // Roxo (investimentos)
  purple400: "#C084FC",
  purple500: "#A855F7",
  purple600: "#9333EA",

  // Neutros
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  gray950: "#030712",
} as const;

// Tema claro
export const lightColors = {
  // Brand
  primary: palette.green600,
  primaryLight: palette.green500,
  primaryDark: palette.green700,
  primarySurface: palette.green50,

  // Semânticas financeiras
  income: palette.green600,
  expense: palette.red500,
  transfer: palette.blue500,
  investment: palette.purple500,
  pending: palette.yellow500,

  // Superfícies
  background: palette.gray50,
  surface: palette.white,
  surfaceRaised: palette.white,
  border: palette.gray200,
  borderStrong: palette.gray300,

  // Texto
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textDisabled: palette.gray400,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  // Estados
  danger: palette.red500,
  dangerSurface: palette.red50,
  warning: palette.yellow500,
  warningSurface: palette.yellow50,
  info: palette.blue500,
  infoSurface: palette.blue50,
  success: palette.green600,
  successSurface: palette.green50,

  // Overlay
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

// Tema escuro
export const darkColors = {
  // Brand
  primary: palette.green400,
  primaryLight: palette.green300,
  primaryDark: palette.green500,
  primarySurface: palette.green900,

  // Semânticas financeiras
  income: palette.green400,
  expense: palette.red400,
  transfer: palette.blue400,
  investment: palette.purple400,
  pending: palette.yellow400,

  // Superfícies
  background: palette.gray950,
  surface: palette.gray900,
  surfaceRaised: palette.gray800,
  border: palette.gray700,
  borderStrong: palette.gray600,

  // Texto
  textPrimary: palette.gray50,
  textSecondary: palette.gray400,
  textDisabled: palette.gray600,
  textInverse: palette.gray900,
  textOnPrimary: palette.gray950,

  // Estados
  danger: palette.red400,
  dangerSurface: "#2D1515",
  warning: palette.yellow400,
  warningSurface: "#2D2510",
  info: palette.blue400,
  infoSurface: "#0F1E2D",
  success: palette.green400,
  successSurface: palette.green900,

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
} as const;

export type ColorToken = keyof typeof lightColors;
export type Colors = { [K in keyof typeof lightColors]: string };

// Cores para categorias de transações (usadas em badges e gráficos)
export const categoryColors = [
  "#22C55E", // verde
  "#EF4444", // vermelho
  "#3B82F6", // azul
  "#F59E0B", // âmbar
  "#8B5CF6", // violeta
  "#EC4899", // rosa
  "#14B8A6", // teal
  "#F97316", // laranja
  "#6366F1", // índigo
  "#84CC16", // lima
] as const;
