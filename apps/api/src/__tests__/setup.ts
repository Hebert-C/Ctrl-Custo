import { beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../db/index";

// Mock do módulo de e-mail: nenhum e-mail real é enviado durante os testes
vi.mock("../lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Limpa todas as tabelas antes de cada teste — garante isolamento total
beforeEach(async () => {
  // TRUNCATE em CASCADE: apaga users e propaga para todas as tabelas filhas
  // (accounts, cards, categories, transactions, goals, investments)
  await db.execute(sql`TRUNCATE auth.users CASCADE`);
});
