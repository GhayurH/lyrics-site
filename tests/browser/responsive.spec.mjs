// Responsive navigation, toolbar, and reader geometry across real viewport sizes.
import { test, expect } from "@playwright/test";

test("reader settings collapse by default and expand on every mobile reading view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { path, hasPageJump } of readers) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const controls = page.locator("[data-reading-controls]");
    const toggle = controls.locator("[data-reading-regular-toggle]");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(controls.locator(".reading-view-control")).toBeHidden();
    await expect(controls.locator("[data-reading-line-spacing]")).toBeHidden();
    await expect(controls.locator(".reading-focus-enter")).toBeVisible();
    if (hasPageJump) {
      await expect(controls.locator(".reading-page-jump")).toBeHidden();
      await expect(controls.locator(".reading-contents-button")).toBeHidden();
    }
    const compact = await controls.boundingBox();
    const combinedPager = await controls.locator(".reading-context-nav").count() > 0;
    expect(compact.height).toBeLessThan(combinedPager ? 150 : 100);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(controls.locator(".reading-view-control")).toBeVisible();
    await expect(controls.locator("[data-reading-line-spacing]")).toBeVisible();
    if (hasPageJump) {
      await expect(controls.locator(".reading-page-jump")).toBeVisible();
      await expect(controls.locator(".reading-contents-button")).toBeVisible();
    }
    await controls.locator("[data-reading-line-spacing]").selectOption("relaxed");
    await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-line-spacing", "relaxed");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(controls.locator(".reading-view-control")).toBeHidden();
  }
});

test("Focus mode retains its independent Options behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  const controls = page.locator("[data-reading-controls]");
  await controls.locator("[data-reading-focus-enter]").click();
  await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await expect(controls.locator("[data-reading-focus-options]")).toBeVisible();
  await controls.locator("[data-reading-focus-options]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
  await controls.locator("[data-reading-focus-exit]").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-reading-focus", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeVisible();
});

test("Focus Options aligns fullscreen with line spacing on mobile and desktop", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 820 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/lyrics/na-bhool-kar-bhi/?reading=1");
    const controls = page.locator("[data-reading-controls]");
    await expect(page.locator("html")).toHaveAttribute("data-reading-focus", "true");
    await controls.locator("[data-reading-focus-options]").click();

    const fullscreen = controls.locator("[data-reading-fullscreen-toggle]");
    const spacing = controls.locator("[data-reading-line-spacing]");
    // The button is intentionally hidden when the browser lacks the Fullscreen API.
    if (!(await page.evaluate(() => document.fullscreenEnabled))) {
      await expect(fullscreen).toBeHidden();
      continue;
    }
    await expect(fullscreen).toBeVisible();
    await expect(spacing).toBeVisible();
    await expect(fullscreen).toHaveCSS("align-self", "flex-end");

    const buttonBox = await fullscreen.boundingBox();
    const selectBox = await spacing.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(selectBox).not.toBeNull();
    expect(Math.abs(buttonBox.y + buttonBox.height - selectBox.y - selectBox.height))
      .toBeLessThanOrEqual(2);
  }
});

test("desktop readers keep their complete controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/read/");
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await expect(controls.locator(".reading-view-control")).toBeVisible();
  await expect(controls.locator("[data-reading-line-spacing]")).toBeVisible();
  await expect(controls.locator(".reading-page-jump")).toBeVisible();
});

test("site header hides on downward scrolling and returns on upward scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  const header = page.locator(".site-header");
  const root = page.locator("html");
  await expect(header).toBeVisible();
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(root).toHaveAttribute("data-mobile-header-hidden", "true");
  await expect.poll(() => header.evaluate((node) =>
    node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
  const controls = page.locator("[data-reading-controls]");
  await expect.poll(() => controls.evaluate((el) => getComputedStyle(el).top)).toBe("8px");

  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(root).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await expect(header).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).toBeVisible();
});

test("the open mobile navigation never hides during scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("#mobile-nav-toggle").click();
  await expect(page.locator("#site-navigation")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-mobile-header-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-navigation")).toBeHidden();
});

test("desktop reading controls float as the site header hides and returns", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 550 });
  await page.goto("/basta/read/");
  await expect(page.locator("[data-reading-controls]")).toHaveCSS("position", "sticky");
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/read/");
  const header = page.locator(".site-header");
  const controls = page.locator("[data-reading-controls]");
  const html = page.locator("html");
  await expect(controls).toHaveCSS("position", "sticky");
  await expect(header).toBeVisible();
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");

  await page.evaluate(() => {
    const reader = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: window.scrollY + reader.getBoundingClientRect().top + 400, behavior: "instant" });
  });
  await expect(html).toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await expect.poll(() => header.evaluate((node) =>
    node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
  await expect.poll(() => controls.evaluate((node) => node.getBoundingClientRect().top)).toBeGreaterThanOrEqual(7);
  await expect.poll(() => controls.evaluate((node) => node.getBoundingClientRect().top)).toBeLessThan(12);

  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await expect(header).toBeVisible();
  await expect.poll(async () => {
    const controlTop = await controls.evaluate((node) => node.getBoundingClientRect().top);
    const headerHeight = await header.evaluate((node) => node.getBoundingClientRect().height);
    return controlTop >= headerHeight - 3;
  }).toBe(true);

  await controls.getByRole("button", { name: "Focus Mode" }).click();
  await expect(html).toHaveAttribute("data-reading-focus", "true");
  await expect(controls).toHaveCSS("position", "fixed");
  await controls.getByRole("button", { name: /Exit reading mode/ }).click();
  await expect(html).not.toHaveAttribute("data-reading-focus", "true");
});

test("desktop reader header hides while scrolling the taller Urdu column", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/basta/138/");
  await page.locator('[data-reading-column][value="image"]').uncheck();
  await page.locator('[data-reading-column][value="roman"]').check();
  const urdu = page.locator(".basta-page-urdu");
  const html = page.locator("html");
  await expect(urdu).toHaveAttribute("data-synced-scrollable", "true");
  await page.evaluate(() => document.querySelector("[data-reading-root]").scrollIntoView({ block: "start", behavior: "instant" }));
  await urdu.evaluate((node) => { node.scrollTop += 80; });
  await expect(html).toHaveAttribute("data-desktop-reader-header-hidden", "true");
  await urdu.evaluate((node) => { node.scrollTop -= 50; });
  await expect(html).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
});

test("non-reading desktop pages and pages without JavaScript keep the header", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-desktop-reader-header-hidden", "true");
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const noJs = await context.newPage();
  await noJs.goto("/basta/read/");
  await noJs.evaluate(() => window.scrollTo(0, 700));
  await expect(noJs.locator(".site-header")).toBeVisible();
  await context.close();
});

test("header still retracts after tapping the theme button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("#theme-toggle").click();
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect(page.locator("html")).toHaveAttribute("data-mobile-header-hidden", "true");
  await page.evaluate(() => window.scrollBy({ top: -125, behavior: "instant" }));
  await expect(page.locator(".site-header")).toBeVisible();
});

test("desktop settings collapse after scrolling into the poem but navigation stays available", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/basta/138/");
  const controls = page.locator("[data-reading-controls]");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeHidden();
  await page.evaluate(() => {
    const reading = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + 300, behavior: "instant" });
  });
  await expect(controls).toHaveAttribute("data-reader-compact", "true");
  await expect(controls.locator("[data-reading-regular-toggle]")).toBeVisible();
  await expect(controls.locator(".reading-view-control")).toBeHidden();
  await expect(controls.locator(".basta-pager")).toBeVisible();
  // A single printed page has the pager; full-book page-jump and Contents
  // actions belong to the separate continuous-reader route.
  await controls.locator("[data-reading-regular-toggle]").click();
  await expect(controls.locator(".reading-view-control")).toBeVisible();

  await page.goto("/basta/read/#page-138");
  const continuous = page.locator("[data-reading-controls]");
  await page.evaluate(() => {
    const reading = document.querySelector("[data-reading-root]");
    window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + 500, behavior: "instant" });
  });
  await expect(continuous).toHaveAttribute("data-reader-compact", "true");
  await expect(continuous.locator(".reading-contents-button")).toBeVisible();
  await expect(continuous.locator(".reading-page-jump")).toBeVisible();
  await expect(continuous.locator(".reading-open-page")).toBeVisible();
  await expect(continuous.locator(".reading-current-page")).toBeVisible();
});

test("retracted headers remain keyboard reachable without upward scrolling", async ({ page }) => {
  for (const config of [
    { width: 390, height: 844, url: "/basta/200/", flag: "data-mobile-header-hidden", distance: 650 },
    { width: 1280, height: 820, url: "/basta/read/", flag: "data-desktop-reader-header-hidden", distance: 400 },
  ]) {
    await page.setViewportSize({ width: config.width, height: config.height });
    await page.goto(config.url);
    await page.evaluate(({ distance }) => {
      const reading = document.querySelector("[data-reading-root]");
      window.scrollTo({ top: scrollY + reading.getBoundingClientRect().top + distance, behavior: "instant" });
    }, config);
    await expect(page.locator("html")).toHaveAttribute(config.flag, "true");
    const header = page.locator(".site-header");
    await expect.poll(() => header.evaluate((node) =>
      node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    await page.evaluate(() => document.querySelector("#theme-toggle").focus({ preventScroll: true }));
    await expect(page.locator("#theme-toggle")).toBeFocused();
    await expect(page.locator("html")).not.toHaveAttribute(config.flag, "true");
    await expect.poll(() => header.evaluate((node) =>
      node.getBoundingClientRect().bottom)).toBeGreaterThan(30);
  }
});


test("mobile header occupies one line with accessible menu and icon theme toggle @smoke", async ({ page }) => {
  for (const width of [320, 342, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/basta/200/");
    const header = page.locator(".site-header");
    const headerBox = await header.boundingBox();
    expect(headerBox.height).toBeLessThan(76);
    await expect(page.locator(".site-title")).toBeVisible();
    const toggle = page.locator("#mobile-nav-toggle");
    const nav = page.locator("#site-navigation");
    const theme = page.locator("#theme-toggle");
    await expect(toggle).toBeVisible();
    await expect(nav).toBeHidden();
    const toggleBox = await toggle.boundingBox();
    const themeBox = await theme.boundingBox();
    expect(themeBox.width).toBeLessThan(54);
    expect(toggleBox.width).toBeLessThan(54);
    expect(toggleBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(themeBox.y + themeBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Search" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});


test("paired lyric actions and reader controls have matching accessible heights", async ({ page }) => {
  for (const { width, height } of [{ width: 320, height: 760 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize({ width, height });
    await page.goto("/lyrics/aa-asghar-bin-tere/");
    const actions = page.locator(".lyric-header-actions");
    const save = actions.locator(".favorite-button");
    const add = actions.locator(".lyric-add-recitation");
    await expect(save).toBeVisible();
    await expect(add).toBeVisible();
    const [saveBox, addBox] = await Promise.all([save.boundingBox(), add.boundingBox()]);
    const target = await page.locator("html").evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).getPropertyValue("--ui-target")) * Number.parseFloat(getComputedStyle(el).fontSize));
    expect(Math.abs(saveBox.height - addBox.height)).toBeLessThanOrEqual(1);
    expect(saveBox.height).toBeGreaterThanOrEqual(target - 1);
    expect(addBox.height).toBeGreaterThanOrEqual(target - 1);
    const detailsBox = await page.locator(".lyric-metadata-disclosure summary").boundingBox();
    expect(detailsBox.height).toBeGreaterThanOrEqual(target - 1);

    if (width <= 700) {
      const controls = page.locator("[data-reading-controls]");
      const [focusBox, viewBox, menuBox, themeBox] = await Promise.all([
        controls.locator(".reading-focus-enter").boundingBox(),
        controls.locator(".reading-regular-toggle").boundingBox(),
        page.locator("#mobile-nav-toggle").boundingBox(),
        page.locator("#theme-toggle").boundingBox(),
      ]);
      expect(Math.abs(focusBox.height - viewBox.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(menuBox.height - themeBox.height)).toBeLessThanOrEqual(1);
      expect(focusBox.height).toBeGreaterThanOrEqual(target - 1);
      await controls.locator(".reading-regular-toggle").click();
      for (const selector of [".reading-column-choice", "[data-reading-line-spacing]"]) {
        const box = await controls.locator(selector).first().boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(target - 1);
      }
    }
  }
});

test("selected Image Urdu Roman cells are entirely filled in every applicable reader", async ({ page }) => {
  for (const route of [
    "/lyrics/aa-asghar-bin-tere/",
    "/basta/200/",
    "/basta/read/",
    "/basta/index/",
  ]) {
    await page.setViewportSize({ width: 342, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("[data-reading-regular-toggle]").click();
    const choices = page.locator(".reading-column-choice");
    await expect(choices.first()).toBeVisible();
    const count = await choices.count();
    for (let i = 0; i < count; i++) {
      const item = choices.nth(i);
      const input = item.locator("input");
      if (!(await input.isChecked()) && (await item.locator("input").getAttribute("value")) === "image") {
        await input.check();
      }
      const state = await item.evaluate((label) => {
        const span = label.querySelector("span");
        const input = label.querySelector("input");
        const a = label.getBoundingClientRect(), b = span.getBoundingClientRect();
        return {
          checked: input.checked,
          labelWidth: a.width, labelHeight: a.height,
          spanWidth: b.width, spanHeight: b.height,
          fill: getComputedStyle(span).backgroundColor,
        };
      });
      expect(Math.abs(state.labelWidth - state.spanWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(state.labelHeight - state.spanHeight)).toBeLessThanOrEqual(2);
      if (state.checked) expect(state.fill).not.toBe("rgba(0, 0, 0, 0)");
    }
  }
});

test("Basta page-by-page fills the full width of each stacked edition in mobile portrait", async ({ page }) => {
  for (const width of [320, 342, 390, 600]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/basta/200/");
    const root = page.locator(".basta-page-grid");
    const columns = page.locator(".basta-parallel-kalams-page");
    const urdu = page.locator(".basta-page-urdu");
    const roman = page.locator(".basta-page-roman");
    await page.locator("[data-reading-regular-toggle]").click();
    await page.locator('[data-reading-column][value="roman"]').check();
    await expect(urdu).toBeVisible();
    await expect(roman).toBeVisible();
    await expect.poll(async () => {
      const [container, group, u, r] = await Promise.all([
        root.boundingBox(), columns.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
      ]);
      return group.width / container.width > .9 &&
        u.width / group.width > .95 && r.width / group.width > .95 &&
        Math.abs(u.x - r.x) < 5 && Math.abs(u.y - r.y) > 30;
    }).toBe(true);
    const [container, group, u, r] = await Promise.all([
      root.boundingBox(), columns.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
    ]);
    expect(group.width / container.width).toBeGreaterThan(.9);
    expect(u.width / group.width).toBeGreaterThan(.95);
    expect(r.width / group.width).toBeGreaterThan(.95);
    expect(Math.abs(u.x - r.x)).toBeLessThan(5);
    expect(Math.abs(u.y - r.y)).toBeGreaterThan(30);
    expect(await columns.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
  }
  // The scan must not shrink the stacked text panels either.
  await page.setViewportSize({ width: 342, height: 844 });
  await page.goto("/basta/200/");
  await page.locator("[data-reading-regular-toggle]").click();
  await page.locator('[data-reading-column][value="image"]').check();
  const scanRoot = page.locator(".basta-page-grid");
  const [original, text, panel] = await Promise.all([
    scanRoot.locator(".basta-original-page").boundingBox(),
    scanRoot.locator(".basta-parallel-kalams-page").boundingBox(),
    scanRoot.boundingBox(),
  ]);
  expect(original.width / panel.width).toBeGreaterThan(.9);
  expect(text.width / panel.width).toBeGreaterThan(.9);
  expect(text.y).toBeGreaterThan(original.y);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/basta/200/");
  const u = await page.locator(".basta-page-urdu").boundingBox();
  const r = await page.locator(".basta-page-roman").boundingBox();
  expect(Math.abs(u.y - r.y)).toBeLessThan(25);
});

test("mobile readers start with an uncluttered Urdu view while desktop Basta starts with source plus Urdu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/lyrics/aa-asghar-bin-tere/", "/basta/138/", "/basta/read/", "/basta/index/"]) {
    await page.goto(url);
    await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", "urdu");
    await expect(page.locator("[data-reading-regular-label]")).toContainText("View: Urdu");
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/basta/138/");
  await expect(page.locator("[data-reading-root]")).toHaveAttribute("data-reading-columns", "image urdu");
  await expect(page.locator(".basta-original-page")).toBeVisible();
  await expect(page.locator(".basta-page-roman")).toBeHidden();
});

test("short touch landscape releases the sticky toolbar, but short desktop windows keep it", async ({ browser, page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/basta/200/");
  const pageUrl = page.url();
  const touch = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const phone = await touch.newPage();
    await phone.goto(pageUrl);
    await expect(phone.locator("[data-reading-controls]")).toBeVisible();
    expect(await phone.locator("[data-reading-controls]").evaluate((node) =>
      getComputedStyle(node).position)).toBe("static");
  } finally {
    await touch.close();
  }

  expect(await page.locator("[data-reading-controls]").evaluate((node) =>
    getComputedStyle(node).position)).toBe("sticky");
});

test("Basta stacked editions follow available container width at the mobile/tablet boundary", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 650, height: 850 },
    { width: 760, height: 500 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/basta/200/");
    const menu = page.locator("[data-reading-regular-toggle]");
    if (await menu.isVisible()) await menu.click();
    await page.locator('[data-reading-column][value="roman"]').check();
    await page.locator('[data-reading-column][value="image"]').check();
    const root = page.locator(".basta-page-grid");
    const text = page.locator(".basta-parallel-kalams-page");
    const urdu = page.locator(".basta-page-urdu");
    const roman = page.locator(".basta-page-roman");
    await expect.poll(async () => {
      const [outer, group, u, r] = await Promise.all([
        root.boundingBox(), text.boundingBox(), urdu.boundingBox(), roman.boundingBox(),
      ]);
      return group.width / outer.width > 0.9 &&
        u.width / group.width > 0.95 && r.width / group.width > 0.95 &&
        Math.abs(u.x - r.x) < 5 && Math.abs(u.y - r.y) > 30;
    }).toBe(true);
  }
});
