import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bunx next dev --webpack -p 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /.*responsive\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      testMatch: /.*responsive\.mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet-chrome",
      testMatch: /.*responsive\.mobile\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
