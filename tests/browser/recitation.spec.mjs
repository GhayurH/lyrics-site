import { test, expect } from "@playwright/test";

test("create local recitation programme and read standalone lyric @smoke", async ({ page }) => {
  await page.goto("/recite/");
  await expect(page.getByRole("heading", { name: "Recitation Sets" })).toBeVisible();
  await page.locator("#recite-title").fill("Test recitation programme");
  await page.locator("#recite-source").selectOption("lyric");
  const result = page.locator("#recite-results li button:not([disabled])").first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator("#recite-count")).toContainText("1 kalam");
  await expect(page.locator("#recite-sequence li")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#recite-title")).toHaveValue("Test recitation programme");
  await expect(page.locator("#recite-sequence li")).toHaveCount(1);
  await page.locator("#recite-open-reader").click();
  await expect(page).toHaveURL(/\/recite\/read\/\?draft=/);
  await expect(page.locator("#recite-reader-title")).toHaveText("Test recitation programme");
  await expect(page.locator(".recite-work-header h2")).toBeVisible();
  await page.locator("#recite-reader-view").selectOption("sequential");
  await expect(page.locator("#recite-position")).toHaveText("1 / 1");
  await expect(page.locator(".recite-editions .lyric-reading-urdu")).toBeVisible();
});

test("local recitation ordering and duplication @smoke", async ({ page }) => {
  await page.goto("/recite/");
  await page.locator("#recite-title").fill("Two kalams");
  await page.locator("#recite-source").selectOption("lyric");
  const add = page.locator("#recite-results li button:not([disabled])");
  await expect(add.first()).toBeVisible();
  await add.first().click();
  await add.nth(1).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-sequence li").nth(1).getByRole("button",{name:"↑"}).click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await page.locator("#recite-duplicate").click();
  await expect(page.locator("#recite-sequence li")).toHaveCount(2);
  await expect(page.locator("#recite-drafts option")).toHaveCount(2);
});
