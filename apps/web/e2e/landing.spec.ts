import { expect, test } from "@playwright/test";

test("root route defaults to English", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) hydrationErrors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Schedule your computer to rest");
  await expect.poll(() => hydrationErrors).toEqual([]);
});

test("Vietnamese landing exposes the core journey", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hẹn giờ cho máy nghỉ");
  await expect(page.getByLabel("Bản xem trước đồng hồ nổi Horune")).toBeVisible();
  await expect(page.getByText("Dùng bộ hẹn giờ không cần tài khoản", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimal Dawn" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Flip Mono" }).click();
  await expect(page.getByRole("button", { name: "Flip Mono" })).toHaveAttribute("aria-pressed", "true");
});

test("English route has localized metadata and copy", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveTitle(/Schedule rest, keep time in sight/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Schedule your computer to rest");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Open Theme Studio" }).first()).toHaveAttribute("href", "/en/studio");
  await expect(page.getByText("Horune Account is in development", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discovery and remix come after shared accounts." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Download for Windows/i })).toHaveCount(0);
});

test("hero clock preview controls are functional", async ({ page }) => {
  await page.goto("/en");
  const preview = page.getByLabel("Horune floating clock preview");
  await preview.getByRole("button", { name: "Pause preview" }).click();
  await expect(preview.getByText("PAUSED")).toBeVisible();
  await preview.getByRole("button", { name: "CANCEL" }).click();
  await expect(preview.getByText("CANCELLED")).toBeVisible();
  await preview.getByRole("button", { name: "RESTART" }).click();
  await expect(preview.getByText("RUNNING")).toBeVisible();
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

test("Theme Studio keyboard commands are real and scoped", async ({ page }) => {
  await page.goto("/en/studio");
  await page.getByRole("button", { name: "+ Text" }).click();
  await page.keyboard.press("Control+j");
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(2);

  const xInput = page.getByLabel("X", { exact: true });
  const before = Number(await xInput.inputValue());
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Number(await xInput.inputValue())).toBeGreaterThan(before);

  await page.getByLabel("Content").press("t");
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(2);
  await page.getByRole("button", { name: /Commands/ }).focus();

  await page.keyboard.press("Delete");
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".theme-studio__layers .layer-name")).toHaveCount(2);

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Commands" });
  await expect(palette).toBeVisible();
  await palette.getByPlaceholder("Find a command…").fill("Save");
  await palette.getByRole("button", { name: /Save draft/ }).click();
  await expect(page.locator("output")).toContainText("Draft saved");
});

test("Theme Studio layout tools change the manifest and can be undone", async ({ page }) => {
  await page.goto("/en/studio");
  await page.getByRole("button", { name: "+ Text" }).click();
  await page.getByRole("button", { name: "Align bottom" }).click();
  await expect(page.getByLabel("Y", { exact: true })).toHaveValue("90");
  await page.getByRole("button", { name: "Wide" }).click();
  await expect(page.getByLabel("Width (px)")).toHaveValue("720");
  await page.getByRole("button", { name: "Move layer right" }).click();
  await expect(page.getByText(/X \d+ px · Y \d+ px/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Width (px)")).toHaveValue("720");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Width (px)")).toHaveValue("560");
});
