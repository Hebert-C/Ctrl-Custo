import { device, element, by, expect, waitFor } from "detox";

describe("Login", () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe tela de login com título e botão Entrar", async () => {
    await waitFor(element(by.text("Ctrl+Custo")))
      .toBeVisible()
      .withTimeout(90000);
    await expect(element(by.text("Entrar"))).toBeVisible();
  });

  it("faz login com credenciais válidas e navega para o dashboard", async () => {
    await waitFor(element(by.id("input-email")))
      .toBeVisible()
      .withTimeout(90000);
    await element(by.id("input-email")).typeText("nome@teste.com");
    await element(by.id("input-password")).typeText("Teste@1234");
    await element(by.id("login-submit")).tap();
    await waitFor(element(by.text("Saldo")))
      .toBeVisible()
      .withTimeout(30000);
  });
});
