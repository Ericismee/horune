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
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "When should this computer rest?" })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/desktop-main.png", fullPage: true });
    await page.setViewportSize({ width: 760, height: 620 });
    await page.screenshot({ path: "docs/screenshots/desktop-small.png", fullPage: true });

    await page.setViewportSize({ width: 1120, height: 760 });
    await page.getByRole("button", { name: "Studio" }).click();
    await page.getByRole("button", { name: "+ Text" }).click();
    await page.getByRole("button", { name: "Apply to overlay" }).click();
    await expect(page.getByText(/was validated and applied atomically/)).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/editor-desktop.png", fullPage: true });

    await page.getByRole("button", { name: "Scheduler" }).click();
    await page.getByRole("button", { name: /Start/ }).click();
    await page.setViewportSize({ width: 430, height: 205 });
    await page.goto("http://127.0.0.1:1420/?surface=overlay");
    await expect(page.getByText("No active schedule")).toHaveCount(0);
    await expect(page.getByLabel("Floating clock controls")).toBeVisible();
    await expect(page.getByText("Sleep", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Horune home" })).toBeVisible();
    const pin = page.getByRole("button", { name: "Unpin floating clock" });
    await expect(pin).toHaveAttribute("aria-pressed", "true");
    await pin.click();
    await expect(page.getByRole("button", { name: "Pin floating clock" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Show icon only" }).click();
    await expect(page.getByRole("button", { name: /Horune floating clock/ })).toBeVisible();
    await page.getByRole("button", { name: "Show clock" }).click();
    await expect(page.getByText("Sleep", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/overlay-browser-preview.png", omitBackground: true });
  }
});
