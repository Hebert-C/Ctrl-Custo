import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Cartões", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Cartões")).tap();
    await waitFor(element(by.text("Cartões")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de cartões", async () => {
    await expect(element(by.text("Cartões"))).toBeVisible();
  });

  it("exibe estado vazio quando não há cartões cadastrados", async () => {
    await expect(element(by.text("Nenhum cartão cadastrado"))).toBeVisible();
  });

  it("abre o formulário de novo cartão via FAB", async () => {
    await element(by.label("Adicionar cartão")).tap();
    await waitFor(element(by.text("Novo Cartão")))
      .toBeVisible()
      .withTimeout(5000);
    await device.pressBack();
  });
});
