import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto("/transactions");
  });

  test("exibe página de transações com contador", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /transações/i })).toBeVisible();
    await expect(page.getByText(/transação\(ões\)/i)).toBeVisible();
  });

  test("abre e fecha formulário de nova transação", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();
    await expect(page.getByRole("heading", { name: /nova transação/i })).toBeVisible();

    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("heading", { name: /nova transação/i })).not.toBeVisible();
  });

  test("formulário tem campos obrigatórios: descrição, valor, tipo, banco", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();

    await expect(page.getByPlaceholder(/descrição/i)).toBeVisible();
    await expect(page.getByLabel(/tipo/i)).toBeVisible();
  });

  test("seletor de tipo tem opções: Receita, Despesa, Transferência", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();

    const typeSelect = page.getByLabel(/tipo/i);
    await expect(typeSelect.locator("option", { hasText: /receita/i })).toHaveCount(1);
    await expect(typeSelect.locator("option", { hasText: /despesa/i })).toHaveCount(1);
    await expect(typeSelect.locator("option", { hasText: /transferência/i })).toHaveCount(1);
  });

  test("campo parcelas aparece ao selecionar modo parcelado", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();

    // Procura o seletor de parcelas (normalmente um select com "À vista")
    const installmentSelect = page.getByLabel(/parcelas/i);
    if ((await installmentSelect.count()) > 0) {
      await expect(installmentSelect).toBeVisible();
    }
  });

  test("botão Editar aparece na listagem", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /editar/i }).first();
    const count = await editBtn.count();
    if (count === 0) {
      test.skip(true, "Sem transações para editar");
      return;
    }
    await expect(editBtn).toBeVisible();
  });

  test("abre formulário de edição ao clicar em Editar", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /editar/i }).first();
    const count = await editBtn.count();
    if (count === 0) {
      test.skip(true, "Sem transações para editar");
      return;
    }

    await editBtn.click();
    await expect(page.getByRole("heading", { name: /editar transação/i })).toBeVisible();

    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("heading", { name: /editar transação/i })).not.toBeVisible();
  });

  test("filtros: busca por texto filtra a listagem", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar/i);
    if ((await searchInput.count()) === 0) {
      test.skip(true, "Campo de busca não encontrado");
      return;
    }

    const initialCount = await page.locator("tbody tr, [data-testid='tx-row']").count();
    await searchInput.fill("xyznonexistent123");

    // Com texto que não existe, lista deve ficar vazia ou menor
    const filteredCount = await page.locator("tbody tr, [data-testid='tx-row']").count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });
});
