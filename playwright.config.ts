import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 45_000 : 30_000,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel: "msedge"
  },
  webServer: [
    {
      command: "pnpm dev:web",
      url: "http://127.0.0.1:3000/vi",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "pnpm --filter @horune/desktop dev",
      url: "http://127.0.0.1:1420",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } }
  ]
});
