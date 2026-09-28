import { expect, test } from "@playwright/test";

test("root route defaults to English", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) hydrationErrors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("time to rest");
  await expect.poll(() => hydrationErrors).toEqual([]);
});

test("Vietnamese landing exposes the core journey", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Đến giờ nghỉ");
  await expect(page.getByLabel("Horune floating clock preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimal Dawn" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Flip Mono" }).click();
  await expect(page.getByRole("button", { name: "Flip Mono" })).toHaveAttribute("aria-pressed", "true");
});

test("English route has localized metadata and copy", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle(/Time it your way/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("time to rest");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("keyboard focus remains visible", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});

test("Theme Studio edits and restores a validated local draft", async ({ page }) => {
  await page.goto("/en/studio");
  await expect(page.getByRole("heading", { name: "Theme Studio" })).toBeVisible();
  await page.getByLabel("Clock type").selectOption("flip");
  await expect(page.locator("[data-clock-type='flip']")).toBeVisible();
  await page.getByRole("button", { name: "+ Text" }).click();
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(1);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("output")).toContainText("Draft saved");
  await page.reload();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("[data-clock-type='flip']")).toBeVisible();
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(1);
});
