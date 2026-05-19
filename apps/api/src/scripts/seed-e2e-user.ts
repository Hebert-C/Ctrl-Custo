/**
 * Cria o usuário E2E para os testes do Maestro.
 *
 * Uso (na VM ou local com tunnel ativo):
 *   pnpm --filter @ctrl-custo/api tsx src/scripts/seed-e2e-user.ts
 */
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, categories, accounts } from "../db/schema";

const E2E_EMAIL = "e2e@ctrl-custo.test";
const E2E_PASSWORD = "e2e-password-123";

const DEFAULT_CATEGORIES = [
  { name: "Alimentação", type: "expense" as const, icon: "🍽️", color: "#F97316" },
  { name: "Transporte", type: "expense" as const, icon: "🚗", color: "#06B6D4" },
  { name: "Moradia", type: "expense" as const, icon: "🏠", color: "#8B5CF6" },
  { name: "Saúde", type: "expense" as const, icon: "❤️", color: "#EF4444" },
  { name: "Lazer", type: "expense" as const, icon: "🎮", color: "#10B981" },
  { name: "Educação", type: "expense" as const, icon: "📚", color: "#F59E0B" },
  { name: "Salário", type: "income" as const, icon: "💼", color: "#22C55E" },
  { name: "Freelance", type: "income" as const, icon: "💻", color: "#3B82F6" },
  { name: "Presentes", type: "income" as const, icon: "🎁", color: "#DB2777" },
  { name: "Outros", type: "both" as const, icon: "❓", color: "#6B7280" },
];

async function main() {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, E2E_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Usuário E2E já existe: ${E2E_EMAIL} (id: ${existing[0].id})`);
    process.exit(0);
  }

  const passwordHash = await argon2.hash(E2E_PASSWORD, { type: argon2.argon2id });

  const [user] = await db
    .insert(users)
    .values({ email: E2E_EMAIL, passwordHash, emailVerified: true })
    .returning({ id: users.id });

  console.log(`Usuário criado: ${user.id}`);

  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId: user.id })));
  console.log(`${DEFAULT_CATEGORIES.length} categorias criadas`);

  await db.insert(accounts).values({
    userId: user.id,
    name: "Conta E2E",
    type: "checking",
    balance: 500000, // R$ 5.000,00 em centavos
    color: "#3B82F6",
    icon: "🏦",
    bankName: "Banco E2E",
  });
  console.log("Conta padrão criada (R$ 5.000,00)");

  console.log(`\nPronto! Login: ${E2E_EMAIL} / ${E2E_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
