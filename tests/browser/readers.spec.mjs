import { test, expect } from "@playwright/test";

test("all reader types expose text before JavaScript initializes", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/lyrics/aa-asghar-bin-tere/");
  await expect(page.locator(".lyric-reading-urdu .lyric-verse").first()).toBeVisible();
  await page.goto("/basta/138/");
  await expect(page.locator(".basta-page-urdu .basta-verse-line").first()).toBeVisible();
  await page.goto("/basta/read/");
  await expect(page.locator('.basta-reader-page[data-basta-page="3"]')).toBeVisible();
  await context.close();
});

test("two text editions are stacked in portrait and parallel in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/138/");
  const urdu = page.locator(".basta-page-urdu");
  const roman = page.locator(".basta-page-roman");
  await expect(urdu).toBeVisible();
  await expect(roman).toBeVisible();
  let u = await urdu.boundingBox(), r = await roman.boundingBox();
  expect(Math.abs(u.y - r.y)).toBeGreaterThan(25);
  await page.setViewportSize({ width: 840, height: 390 });
  await expect.poll(async () => {
    const left = await urdu.boundingBox(), right = await roman.boundingBox();
    return Math.abs(left.y - right.y);
  }).toBeLessThan(25);
});

test("edition preferences, Focus mode, and image enlargement work together", async ({ page }) => {
  await page.goto("/basta/138/");
  const image = page.locator(".basta-original-page");
  await expect(image).toBeHidden();
  await page.getByLabel("Image", { exact: true }).check();
  await expect(image).toBeVisible();
  await image.locator("a").click();
  await expect(page.locator("dialog.scan-viewer")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Focus mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await page.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
});

test("continuous reader deep links load streamed content and preserve the current page", async ({ page }) => {
  await page.goto("/basta/read/#page-138");
  const page138 = page.locator('[data-basta-page="138"]');
  await expect(page138).toBeAttached({ timeout: 20000 });
  await page.getByRole("button", { name: "Focus mode" }).click();
  await page.getByRole("button", { name: /Show reading options/ }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.locator(".basta-reader-index")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".basta-reader-index")).toBeHidden();
});
