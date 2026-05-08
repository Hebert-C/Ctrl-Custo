import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Goals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto("/goals");
  });

  test("exibe página de metas", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /metas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /nova meta/i })).toBeVisible();
  });

  test("abre e fecha formulário de nova meta", async ({ page }) => {
    await page.getByRole("button", { name: /nova meta/i }).click();
    await expect(page.getByRole("heading", { name: /nova meta/i })).toBeVisible();
    await expect(page.getByLabel(/nome/i)).toBeVisible();
    await expect(page.getByLabel(/valor alvo/i)).toBeVisible();

    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("heading", { name: /nova meta/i })).not.toBeVisible();
  });

  test("cria uma meta e verifica na listagem", async ({ page }) => {
    await page.getByRole("button", { name: /nova meta/i }).click();

    await page.getByLabel(/nome/i).fill("Meta E2E Teste");
    await page.getByLabel(/valor alvo/i).fill("500");
    await page.getByRole("button", { name: /criar meta/i }).click();

    await expect(page.getByText("Meta E2E Teste")).toBeVisible();

    // Barra de progresso começa em 0%
    await expect(page.getByText("0%")).toBeVisible();
  });

  test("botão depositar aparece em meta ativa", async ({ page }) => {
    // Requer que haja ao menos uma meta ativa
    const goals = page.locator(".card");
    const count = await goals.count();
    if (count === 0) {
      test.skip(true, "Sem metas cadastradas");
      return;
    }
    // Pelo menos uma meta deve ter o botão de depósito
    await expect(page.getByRole("button", { name: /depositar/i }).first()).toBeVisible();
  });

  test("abre formulário de depósito ao clicar em Depositar", async ({ page }) => {
    const depositBtn = page.getByRole("button", { name: /depositar/i }).first();
    const count = await depositBtn.count();
    if (count === 0) {
      test.skip(true, "Sem metas ativas para depositar");
      return;
    }

    await depositBtn.click();

    // Campos de depósito aparecem inline
    await expect(page.getByPlaceholder("Banco de origem…")).toBeVisible();
    await expect(page.getByPlaceholder("0,00")).toBeVisible();

    // Cancela
    await page.getByRole("button", { name: "✕" }).last().click();
    await expect(page.getByPlaceholder("0,00")).not.toBeVisible();
  });
});
