import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_STATE_PATH = path.join(__dirname, "tests/e2e/.auth-state.json");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./global-setup",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
    storageState: AUTH_STATE_PATH,
  },
  webServer: {
    command: "bunx next dev -p 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
