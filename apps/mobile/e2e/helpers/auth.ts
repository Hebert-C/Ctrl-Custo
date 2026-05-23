import { device, element, by, waitFor } from "detox";

export async function launchAndLogin() {
  await device.launchApp({ newInstance: true, delete: true });
  await waitFor(element(by.id("input-email")))
    .toBeVisible()
    .withTimeout(90000);
  await element(by.id("input-email")).typeText("nome@teste.com");
  await element(by.id("input-password")).typeText("Teste@1234");
  await element(by.id("login-submit")).tap();
  await waitFor(element(by.text("Saldo")))
    .toBeVisible()
    .withTimeout(30000);
}
