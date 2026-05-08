import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto("/settings");
  });

  test("exibe página de configurações com abas", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /configurações/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /bancos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /categorias/i })).toBeVisible();
  });

  test("aba Bancos está ativa por padrão e mostra formulário", async ({ page }) => {
    await expect(page.getByText(/novo banco/i)).toBeVisible();
    await expect(page.getByPlaceholder(/nubank, bradesco/i)).toBeVisible();
  });

  test("troca para aba Categorias", async ({ page }) => {
    await page.getByRole("button", { name: /categorias/i }).click();
    // Formulário de banco some, categorias aparecem
    await expect(page.getByPlaceholder(/nubank, bradesco/i)).not.toBeVisible();
  });

  test("cria um banco e aparece na listagem", async ({ page }) => {
    await page.getByPlaceholder(/nubank, bradesco.../i).fill("Banco E2E Teste");
    await page.getByRole("button", { name: /adicionar/i }).click();

    await expect(page.getByText("Banco E2E Teste")).toBeVisible();
  });

  test("edita um banco existente", async ({ page }) => {
    // Requer ao menos um banco cadastrado
    const editBtn = page.getByRole("button", { name: /editar/i }).first();
    const count = await editBtn.count();
    if (count === 0) {
      test.skip(true, "Sem bancos para editar");
      return;
    }

    await editBtn.click();

    // Formulário muda para "Editar Banco"
    await expect(page.getByText(/editar banco/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /atualizar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar/i })).toBeVisible();

    // Cancela
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByText(/novo banco/i)).toBeVisible();
  });

  test("arquiva um banco", async ({ page }) => {
    const arquivarBtn = page.getByRole("button", { name: /arquivar/i }).first();
    const count = await arquivarBtn.count();
    if (count === 0) {
      test.skip(true, "Sem bancos para arquivar");
      return;
    }

    // Obtém o nome do banco que será arquivado
    const bankRow = arquivarBtn.locator("../..");
    const bankName = await bankRow.locator("p.text-sm.font-medium").textContent();

    await arquivarBtn.click();

    // Banco some da lista (arquivados não aparecem)
    if (bankName) {
      await expect(page.getByText(bankName)).not.toBeVisible();
    }
  });
});
