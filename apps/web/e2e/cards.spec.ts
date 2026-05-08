import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Cards", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto("/cards");
  });

  test("exibe página de cartões", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cartões/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /novo cartão/i })).toBeVisible();
  });

  test("abre formulário de novo cartão", async ({ page }) => {
    await page.getByRole("button", { name: /novo cartão/i }).click();
    await expect(page.getByRole("heading", { name: /novo cartão/i })).toBeVisible();
    await expect(page.getByLabel(/nome do cartão/i)).toBeVisible();
    await expect(page.getByLabel(/limite/i)).toBeVisible();
    await expect(page.getByLabel(/cor/i)).toBeVisible();
  });

  test("cria e exclui um cartão", async ({ page }) => {
    // Pula se não há contas cadastradas
    const acctSelect = page.locator("select").first();

    await page.getByRole("button", { name: /novo cartão/i }).click();

    await page.getByLabel(/nome do cartão/i).fill("Teste Playwright");
    await page.getByLabel(/limite/i).fill("1000");

    // Tenta selecionar a primeira conta disponível
    const options = await acctSelect.locator("option").all();
    if (options.length <= 1) {
      // Sem conta disponível — apenas fecha o form e encerra o teste
      await page.getByRole("button", { name: /cancelar/i }).click();
      return;
    }
    await acctSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: /salvar/i }).click();

    // Cartão deve aparecer na lista
    await expect(page.getByText("Teste Playwright")).toBeVisible();

    // Exclui o cartão criado
    const card = page.locator(".card", { hasText: "Teste Playwright" });
    await card.hover();
    page.on("dialog", (d) => d.accept());
    await card.getByRole("button", { name: "✕" }).click();
    await expect(page.getByText("Teste Playwright")).not.toBeVisible();
  });

  test("abre modal de detalhamento ao clicar no cartão", async ({ page }) => {
    // Requer que haja pelo menos um cartão na conta do usuário de teste
    const cards = page.locator(".card");
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, "Sem cartões cadastrados na conta de teste");
      return;
    }

    await cards.first().click();

    // Modal de detalhe deve aparecer com as três seções de resumo
    await expect(page.getByText("Fatura")).toBeVisible();
    await expect(page.getByText("Disponível")).toBeVisible();
    await expect(page.getByText("Limite")).toBeVisible();

    // Navegação de mês deve estar visível
    await expect(page.getByRole("button", { name: "‹" })).toBeVisible();
    await expect(page.getByRole("button", { name: "›" })).toBeVisible();

    // Fecha ao clicar no ✕
    await page.getByRole("button", { name: "✕" }).first().click();
    await expect(page.getByText("Fatura")).not.toBeVisible();
  });
});
