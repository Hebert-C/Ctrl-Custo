import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Dashboard", () => {
  beforeAll(async () => {
    await launchAndLogin();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe o card Fluxo do Mês", async () => {
    await expect(element(by.text("Fluxo do Mês"))).toBeVisible();
  });

  it("exibe o card Saldo nos Bancos", async () => {
    await expect(element(by.text("Saldo nos Bancos"))).toBeVisible();
  });

  it("exibe a seção de últimas transações", async () => {
    await expect(element(by.text("Últimas transações"))).toBeVisible();
  });

  it("expande e fecha o card Fluxo do Mês", async () => {
    await element(by.text("Fluxo do Mês")).tap();
    await element(by.text("Fluxo do Mês")).tap();
    await expect(element(by.text("Fluxo do Mês"))).toBeVisible();
  });

  it("navega para Transações e volta ao Dashboard", async () => {
    await element(by.text("Transações")).tap();
    await waitFor(element(by.text("Transações")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text("Dashboard")).tap();
    await waitFor(element(by.text("Fluxo do Mês")))
      .toBeVisible()
      .withTimeout(5000);
  });
});
