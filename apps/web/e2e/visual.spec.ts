import { expect, test } from "@playwright/test";

test("capture responsive landing and desktop surfaces", async ({ page }, testInfo) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/landing-${testInfo.project.name}.png`, fullPage: true });

  if (testInfo.project.name === "desktop") {
    await page.goto("/en/studio");
    await expect(page.getByRole("heading", { name: "Theme Studio" })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/editor-desktop.png", fullPage: true });

    await page.setViewportSize({ width: 1120, height: 760 });
    await page.goto("http://127.0.0.1:1420");
    await expect(page.getByRole("heading", { name: "When do you want to rest?" })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/desktop-main.png", fullPage: true });
    await page.setViewportSize({ width: 760, height: 620 });
    await page.screenshot({ path: "docs/screenshots/desktop-small.png", fullPage: true });
  }
});
