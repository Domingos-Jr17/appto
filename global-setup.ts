import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_STATE_PATH = path.join(__dirname, "tests/e2e/.auth-state.json");
const SEED_EMAIL = process.env.E2E_LOGIN_EMAIL || "teste@aptto.mz";
const SEED_PASSWORD = process.env.E2E_LOGIN_PASSWORD || "teste123";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });

  // Save auth state
  await context.storageState({ path: AUTH_STATE_PATH });
  await browser.close();

  console.log(`✅ Auth state saved to ${AUTH_STATE_PATH}`);
}

export default globalSetup;
