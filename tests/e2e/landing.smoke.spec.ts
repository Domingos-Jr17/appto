import { expect, test } from "@playwright/test";

test("landing exposes only public claims", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /copiloto/i,
    })
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Exportação DOCX" })).toBeVisible();
  await expect(page.getByText("RAG Local")).toHaveCount(0);
  await expect(page.getByText("Streaming AI")).toHaveCount(0);
});
