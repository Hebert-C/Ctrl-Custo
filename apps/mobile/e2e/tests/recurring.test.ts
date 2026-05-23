import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Recorrentes", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Recorrentes")).tap();
    await waitFor(element(by.text("Recorrentes")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de contas recorrentes", async () => {
    await expect(element(by.text("Recorrentes"))).toBeVisible();
  });

  it("exibe estado vazio quando não há contas recorrentes", async () => {
    await expect(element(by.text("Nenhuma conta recorrente"))).toBeVisible();
  });

  it("abre o formulário de nova conta recorrente", async () => {
    await element(by.label("Adicionar conta recorrente")).tap();
    await waitFor(element(by.text("Nova Conta Recorrente")))
      .toBeVisible()
      .withTimeout(5000);
    await device.pressBack();
  });
});
