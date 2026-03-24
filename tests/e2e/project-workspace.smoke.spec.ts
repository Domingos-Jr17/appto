import { expect, test } from "@playwright/test";

const workspaceProjectId = process.env.E2E_PROJECT_ID;
const loginEmail = process.env.E2E_LOGIN_EMAIL;
const loginPassword = process.env.E2E_LOGIN_PASSWORD;

test.skip(
  !workspaceProjectId || !loginEmail || !loginPassword,
  "Defina E2E_PROJECT_ID, E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para validar o workspace autenticado."
);

test("authenticated user can open the new project workspace", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(loginEmail || "");
  await page.getByLabel("Senha").fill(loginPassword || "");
  await page.getByRole("button", { name: /entrar/i }).click();

  await page.goto(`/app/projects/${workspaceProjectId}/workspace`);

  await expect(page.getByText(/workspace v2/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /codigo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /preview/i })).toBeVisible();
});
