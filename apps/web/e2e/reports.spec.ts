import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Reports", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto("/reports");
  });

  test("exibe página de relatórios", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /relatórios/i })).toBeVisible();
  });

  test("exibe todos os botões de período", async ({ page }) => {
    await expect(page.getByRole("button", { name: /mês atual/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /3 meses/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /6 meses/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /12 meses/i })).toBeVisible();
  });

  test("muda para Mês atual e exibe badge na tabela", async ({ page }) => {
    await page.getByRole("button", { name: /mês atual/i }).click();

    // Badge "atual" deve aparecer na linha do mês corrente
    await expect(page.getByText("atual")).toBeVisible();

    // Tabela deve ter apenas uma linha de dados (1 mês)
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
  });

  test("muda para 3 meses e exibe 3 linhas na tabela", async ({ page }) => {
    await page.getByRole("button", { name: /3 meses/i }).click();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(3);
  });

  test("muda para 12 meses e exibe 12 linhas na tabela", async ({ page }) => {
    await page.getByRole("button", { name: /12 meses/i }).click();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(12);
  });

  test("exibe tabela de evolução mensal com cabeçalhos corretos", async ({ page }) => {
    await expect(page.getByText("Evolução Mensal")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /mês/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /receitas/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /despesas/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /saldo/i })).toBeVisible();
  });

  test("botões de exportar estão visíveis", async ({ page }) => {
    await expect(page.getByRole("button", { name: /exportar csv/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /exportar json/i })).toBeVisible();
  });
});
