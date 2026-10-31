// About-page bilingual content, navigation, and narrow-viewport behaviour.
import { test, expect } from "@playwright/test";

test("About explains the archive and offers bilingual routes and contact @smoke", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("heading", { name: "About & contact" })).toBeVisible();

  for (const [id, language] of [
    ["about-en-heading", "en"], ["about-ur-heading", "ur"],
    ["about-sources-en", "en"], ["about-sources-ur", "ur"],
    ["contact-heading-ur", "ur"],
  ]) {
    const heading = page.locator("#" + id);
    await expect(heading).toBeVisible();
    await expect(heading.locator("xpath=ancestor::*[@lang][1]")).toHaveAttribute("lang", language);
  }
  await expect(page.locator(".about-language[lang=ur][dir=rtl]")).toHaveCount(3);
  for (const href of ["/search/", "/basta/", "/recite/"]) {
    await expect(page.locator(`.about-path[href="${href}"]`)).toBeVisible();
  }
  await expect(page.locator("#contact .about-contact-email"))
    .toHaveAttribute("href", "mailto:lyricsadmin@gmail.com");

  // The homepage's existing contact shortcut remains a working deep link.
  await page.goto("/");
  await page.locator('.home-closing a[href="/about/#contact"]').click();
  await expect(page).toHaveURL(/\/about\/#contact$/);
  await expect(page.locator("#contact")).toBeInViewport();
});

test("About reflows with readable Urdu and a usable email link on mobile and landscape @smoke", async ({ page }) => {
  await page.goto("/about/");
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
    { width: 700, height: 390 },
    { width: 768, height: 420 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    const english = await page.locator(".about-intro [lang=en]").boundingBox();
    const urdu = await page.locator(".about-intro [lang=ur]").boundingBox();
    expect(english).toBeTruthy();
    expect(urdu).toBeTruthy();
    if (viewport.width <= 700) {
      expect(urdu.y).toBeGreaterThan(english.y + english.height - 2);
    } else {
      expect(Math.abs(urdu.y - english.y)).toBeLessThan(2);
    }
    const email = await page.locator(".about-contact-email").boundingBox();
    expect(email).toBeTruthy();
    expect(email.width).toBeGreaterThan(0);
    expect(email.height).toBeGreaterThanOrEqual(44);
    expect(email.x).toBeGreaterThanOrEqual(0);
    expect(email.x + email.width).toBeLessThanOrEqual(viewport.width + 2);
    await expect(page.locator(".about-language[lang=ur]").first())
      .toHaveCSS("text-align", "right");
  }

  // Enlarged text must not clip the page's bilingual copy or email address.
  await page.setViewportSize({ width: 480, height: 760 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => page.locator(".about-page").evaluate((node) =>
    node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(2);
  const email = await page.locator(".about-contact-email").boundingBox();
  expect(email.x + email.width).toBeLessThanOrEqual(482);
});

test("About text and link surfaces retain theme colours", async ({ page }) => {
  await page.goto("/about/");
  await page.locator("#theme-toggle").click();
  await page.locator('#theme-dialog input[value="sepia"]').check();
  await page.locator("#theme-dialog-done").click();
  await expect.poll(() => page.locator(".about-contact").evaluate((node) =>
    getComputedStyle(node).backgroundColor)).toBe("rgb(251, 244, 230)");
  await expect(page.locator(".about-path").first()).toBeVisible();
});
