import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

describe("Relatórios", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Relatórios")).tap();
    await waitFor(element(by.text("Relatórios")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de relatórios", async () => {
    await expect(element(by.text("Relatórios"))).toBeVisible();
  });

  it("exibe os botões de período", async () => {
    await expect(element(by.text("3m"))).toBeVisible();
    await expect(element(by.text("6m"))).toBeVisible();
    await expect(element(by.text("12m"))).toBeVisible();
  });

  it("filtra por 3 meses e exibe gráficos", async () => {
    await element(by.text("3m")).tap();
    await expect(element(by.text("Receitas por mês"))).toBeVisible();
    await expect(element(by.text("Despesas por mês"))).toBeVisible();
  });

  it("filtra por 12 meses e exibe evolução do saldo", async () => {
    await element(by.text("12m")).tap();
    await expect(element(by.text("Evolução do saldo acumulado"))).toBeVisible();
  });

  it("exibe a tabela de detalhamento mensal", async () => {
    await waitFor(element(by.text("Detalhamento mensal")))
      .toBeVisible()
      .whileElement(by.id("reports-scroll"))
      .scroll(300, "down");
    await expect(element(by.text("Detalhamento mensal"))).toBeVisible();
  });

  it("volta ao período padrão de 6 meses", async () => {
    await element(by.text("6m")).tap();
    await expect(element(by.text("Receitas por mês"))).toBeVisible();
  });
});
