import type { Locator, Page } from "@playwright/test";
import { test, expect, loginAsSeedUser } from "./helpers";

async function expectMinimumSize(
  locator: Locator,
  minimum: { width?: number; height?: number },
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  if (!box) return;

  if (minimum.width) {
    expect(box.width).toBeGreaterThanOrEqual(minimum.width);
  }

  if (minimum.height) {
    expect(box.height).toBeGreaterThanOrEqual(minimum.height);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });

  expect(hasOverflow).toBe(false);
}

test.describe("Mobile responsiveness", () => {
  test("landing keeps touch targets usable on small screens", async ({ page }) => {
    await page.goto("/");

    if ((page.viewportSize()?.width ?? 0) < 768) {
      const menuButton = page.getByRole("button", { name: /menu/i });

      await expectMinimumSize(menuButton, { width: 44, height: 44 });
      await menuButton.click();
      await expect(
        page.locator("#landing-mobile-menu").getByRole("link", {
          name: /começar grátis/i,
        }),
      ).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /começar grátis/i }).first()).toBeVisible();
    }

    const socialLinks = page.locator('footer a[aria-label]');

    await expect(socialLinks.first()).toBeVisible();

    await expectMinimumSize(socialLinks.first(), { width: 44, height: 44 });
    await expectNoHorizontalOverflow(page);
  });

  test("workspace header actions stay touch-friendly on mobile", async ({ page }) => {
    test.skip(
      test.info().project.name !== "mobile-chrome",
      "Authenticated workspace checks run in the mobile profile only.",
    );

    try {
      await loginAsSeedUser(page);
    } catch {
      test.skip(true, "Auth backend unavailable for the seed-user workspace flow.");
      return;
    }

    await page.goto("/app/trabalhos");

    const firstWorkLink = page.locator('a[href^="/app/trabalhos/"]').first();
    const firstWorkHref = await firstWorkLink
      .getAttribute("href", {
        timeout: 5000,
      })
      .catch(() => null);

    test.skip(!firstWorkHref, "Seed user needs at least one work for mobile workspace checks.");
    if (!firstWorkHref) return;

    await page.goto(firstWorkHref, { waitUntil: "domcontentloaded" });

    const coverButton = page.getByRole("button", { name: /capa/i });
    const downloadButton = page.getByRole("button", { name: /descarregar \.docx/i });
    const titleButton = page.getByTitle("Clique para editar o título");

    await expect(coverButton).toBeVisible({ timeout: 15000 });
    await expect(downloadButton).toBeVisible();
    await expect(titleButton).toBeVisible();

    await expectMinimumSize(coverButton, { height: 44 });
    await expectMinimumSize(downloadButton, { height: 44 });

    await titleButton.click();

    await expectMinimumSize(page.getByRole("button", { name: "Guardar título" }), {
      width: 44,
      height: 44,
    });
    await expectMinimumSize(page.getByRole("button", { name: "Cancelar edição" }), {
      width: 44,
      height: 44,
    });
    await expectNoHorizontalOverflow(page);
  });
});
