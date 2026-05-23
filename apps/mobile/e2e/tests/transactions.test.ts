import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Transações", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Transações")).tap();
    await waitFor(element(by.text("Transações")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de transações", async () => {
    await expect(element(by.text("Transações"))).toBeVisible();
  });

  it("abre o formulário de nova transação via FAB", async () => {
    await element(by.label("Adicionar transação")).tap();
    await waitFor(element(by.text("Nova Transação")))
      .toBeVisible()
      .withTimeout(5000);
  });

  it("exibe os três toggles de tipo", async () => {
    await expect(element(by.text("Despesa"))).toBeVisible();
    await expect(element(by.text("Receita"))).toBeVisible();
    await expect(element(by.text("Transf."))).toBeVisible();
  });

  it("exibe campo banco de destino ao selecionar Transferência", async () => {
    await element(by.text("Transf.")).tap();
    await expect(element(by.text("Banco de destino"))).toBeVisible();
  });

  it("fecha o formulário", async () => {
    await device.pressBack();
    await waitFor(element(by.text("Transações")))
      .toBeVisible()
      .withTimeout(5000);
  });
});
