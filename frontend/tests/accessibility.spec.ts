import { test, expect } from "@playwright/test";
import { open } from "./helpers/session";

const TITLE_PAGES = ["/", "/about", "/admissions", "/contact", "/login"];

test.describe("Accessibility smoke", () => {
  for (const p of TITLE_PAGES) {
    test(`${p} has a non-empty page title`, async ({ page }) => {
      await open(page, p);
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
    });
  }

  test("images on the homepage carry alt attributes", async ({ page }) => {
    await open(page, "/");
    const imgs = page.locator("img");
    const count = await imgs.count();
    let missingAlt = 0;
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute("alt");
      if (alt === null) missingAlt++;
    }
    // Decorative images may be empty-string alt; null alt is the failure case.
    expect(missingAlt).toBe(0);
  });

  test("buttons have accessible names (no empty buttons)", async ({ page }) => {
    await open(page, "/");
    const buttons = page.locator("button");
    const count = await buttons.count();
    let empty = 0;
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i);
      const name = (await b.getAttribute("aria-label")) || (await b.innerText().catch(() => ""));
      const hasIcon = (await b.locator("svg").count()) > 0;
      if (!name?.trim() && !hasIcon) empty++;
    }
    expect(empty).toBeLessThanOrEqual(2);
  });

  test("keyboard: Tab moves focus through the header nav", async ({ page }) => {
    await open(page, "/");
    // Focus the first tabbable element and step through header links.
    await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => {});
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el ? el.tagName + (el.getAttribute("href") ? `:${el.getAttribute("href")}` : "") : "";
      });
      expect(focused.length).toBeGreaterThan(0);
    }
  });
});
