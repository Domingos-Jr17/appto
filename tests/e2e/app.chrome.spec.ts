import { test, expect, loginAsSeedUser } from "./helpers";

test.describe("Workspace chrome", () => {
  test.describe.configure({ timeout: 60000 });

  test("keeps the dashboard focused on resume and recent work", async ({ page }) => {
    await loginAsSeedUser(page);
    await page.goto("/app");

    await expect(page.getByRole("heading", { name: "Início", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        "O dashboard fica reduzido ao essencial: continuar a sessão principal, perceber o estado actual e abrir rapidamente o trabalho recente."
      )
    ).toBeVisible();
    await expect(page.getByText("Visão rápida")).toBeVisible();
    await expect(page.getByText("Sessões recentes")).toBeVisible();
  });

  test("uses the compact settings tabs and keeps navigation in sync", async ({ page }) => {
    await loginAsSeedUser(page);
    await page.goto("/app/settings");

    await expect(page.getByRole("heading", { name: "Definições", exact: true })).toBeVisible({ timeout: 15000 });
    const securityTab = page.getByRole("tab", { name: "Segurança" });
    await securityTab.click();
    await expect(page).toHaveURL(/tab=seguranca/);
    await expect(securityTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText("Definições de segurança da conta")).toBeVisible();
  });
});
