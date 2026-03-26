import { test, expect, type Page } from "@playwright/test";

export async function getFirstProjectId(page: Page): Promise<string> {
  // Ensure page is on the app origin so fetch works
  if (!page.url().includes("/app")) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
  }
  const projects = await page.evaluate(async () => {
    const res = await fetch("/api/projects?sortBy=updatedAt&sortOrder=desc");
    return res.json();
  });
  if (!Array.isArray(projects) || !projects.length) {
    throw new Error("No projects found. Run the seed script first.");
  }
  return projects[0].id;
}

export { test, expect };
