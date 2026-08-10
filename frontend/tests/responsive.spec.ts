import { test, expect } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession } from "./helpers/session";

const VIEWPORTS = [
  { name: "Desktop 1440x900", viewport: { width: 1440, height: 900 } },
  { name: "Tablet 768x1024", viewport: { width: 768, height: 1024 } },
  { name: "Mobile 390x844", viewport: { width: 390, height: 844 } },
];

test.describe("Responsive rendering", () => {
  for (const vp of VIEWPORTS) {
    test(`homepage at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp.viewport);
      const bucket = trackErrors(page);
      await open(page, "/");
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(300);
      // No horizontal overflow beyond a small tolerance.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(4);
      expect(meaningfulErrors(bucket)).toEqual([]);
    });

    test(`login page at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp.viewport);
      const bucket = trackErrors(page);
      await open(page, "/login");
      await expect(page.locator("body")).not.toBeEmpty();
      expect(meaningfulErrors(bucket)).toEqual([]);
    });
  }

  test("admin dashboard at mobile viewport (session preserved)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await injectSession(page, "admin");
    const bucket = trackErrors(page);
    await open(page, "/admin");
    await expect(page).not.toHaveURL(/\/admin\/login/);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });
});
