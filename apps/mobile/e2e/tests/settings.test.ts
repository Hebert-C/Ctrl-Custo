import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Configurações", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Config")).tap();
    await waitFor(element(by.text("Configurações")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de configurações", async () => {
    await expect(element(by.text("Configurações"))).toBeVisible();
  });

  it("exibe a seção de aparência", async () => {
    await expect(element(by.text("APARÊNCIA"))).toBeVisible();
    await expect(element(by.text("Tema escuro"))).toBeVisible();
    await expect(element(by.text("Ocultar valores"))).toBeVisible();
  });

  it("exibe a seção de segurança", async () => {
    await expect(element(by.text("SEGURANÇA"))).toBeVisible();
    await expect(element(by.text("Biometria / Face ID"))).toBeVisible();
    await expect(element(by.text("Sair da conta"))).toBeVisible();
  });

  it("exibe as seções de contas e categorias", async () => {
    await waitFor(element(by.text("Nova conta")))
      .toBeVisible()
      .whileElement(by.id("settings-scroll"))
      .scroll(200, "down");
    await expect(element(by.text("Nova conta"))).toBeVisible();
    await expect(element(by.text("Nova categoria"))).toBeVisible();
  });
});
