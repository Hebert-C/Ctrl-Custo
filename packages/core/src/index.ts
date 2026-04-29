// Tipos
export * from "./types/index";

// Schema (tabelas Drizzle — usadas pelos stores da web)
export { categories, accounts, cards, transactions, goals, investments } from "./db/schema";

// Banco de dados
export { createDatabase, schema } from "./db/index";
export type { CoreDatabase } from "./db/index";

// Services
export { createTransactionService } from "./services/TransactionService";
export { createCategoryService } from "./services/CategoryService";
export { createAccountService } from "./services/AccountService";
export { createReportService } from "./services/ReportService";
export { createExportService } from "./services/ExportService";

// Tipos dos services
export type { TransactionService } from "./services/TransactionService";
export type { CategoryService } from "./services/CategoryService";
export type { AccountService } from "./services/AccountService";
export type { ReportService } from "./services/ReportService";
export type { ExportService } from "./services/ExportService";

// Tipos dos reports
export type { PeriodSummary, CategorySummary, MonthlyEvolution } from "./services/ReportService";
export type { ExportData } from "./services/ExportService";
