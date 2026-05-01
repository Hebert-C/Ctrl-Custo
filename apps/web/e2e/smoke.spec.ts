import { test, expect } from "@playwright/test";

// These tests require the API to be running at VITE_API_URL (default: http://localhost:3000)
// and a valid test user registered beforehand.
//
// Set env vars before running:
//   E2E_EMAIL=test@example.com E2E_PASSWORD=testpass123 pnpm --filter web e2e

const EMAIL = process.env.E2E_EMAIL ?? "e2e@ctrl-custo.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

test.describe("Auth flow", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("shows balance card", async ({ page }) => {
    await expect(page.getByText("Saldo total")).toBeVisible();
  });
});

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(EMAIL);
    await page.getByPlaceholder("Mínimo 8 caracteres").fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("can navigate to transactions page", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page.getByText("Transações")).toBeVisible();
  });

  test("can open new transaction form", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: /nova transação/i }).click();
    await expect(page.getByRole("heading", { name: /nova transação/i })).toBeVisible();
  });
});
