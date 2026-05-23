import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Investimentos", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Investimentos")).tap();
    await waitFor(element(by.text("Investimentos")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de investimentos", async () => {
    await expect(element(by.text("Investimentos"))).toBeVisible();
  });

  it("exibe o card de resumo com os totais", async () => {
    await expect(element(by.text("Valor atual"))).toBeVisible();
    await expect(element(by.text("Custo total"))).toBeVisible();
    await expect(element(by.text("Lucro/Perda"))).toBeVisible();
  });

  it("abre o formulário de novo investimento", async () => {
    await element(by.label("Adicionar investimento")).tap();
    await waitFor(element(by.text("Novo Investimento")))
      .toBeVisible()
      .withTimeout(5000);
    await device.pressBack();
  });
});
