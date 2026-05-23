import { device, element, by, expect, waitFor } from "detox";
import { launchAndLogin } from "../helpers/auth";

const GOAL_NAME = "Meta Detox E2E";

describe("Metas", () => {
  beforeAll(async () => {
    await launchAndLogin();
    await element(by.text("Metas")).tap();
    await waitFor(element(by.text("Metas")))
      .toBeVisible()
      .withTimeout(5000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("exibe a tela de metas", async () => {
    await expect(element(by.text("Metas"))).toBeVisible();
  });

  it("cria uma nova meta", async () => {
    await element(by.label("Nova Meta")).tap();
    await waitFor(element(by.text("Nova Meta")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("input-goal-name")).typeText(GOAL_NAME);
    await element(by.id("input-goal-amount")).typeText("100000");
    await element(by.text("Salvar")).tap();
    await waitFor(element(by.text(GOAL_NAME)))
      .toBeVisible()
      .withTimeout(5000);
  });

  it("exclui a meta criada", async () => {
    await element(by.id(`btn-delete-goal-${GOAL_NAME}`)).tap();
    await element(by.text("Excluir")).tap();
    await waitFor(element(by.text(GOAL_NAME)))
      .not.toBeVisible()
      .withTimeout(5000);
  });
});
