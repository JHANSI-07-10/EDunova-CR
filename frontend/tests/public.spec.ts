import { test, expect } from "@playwright/test";
import { open, trackErrors, meaningfulErrors } from "./helpers/session";

const PUBLIC_PAGES = [
  { path: "/", title: /EduNova/i },
  { path: "/about", title: /EduNova|About/i },
  { path: "/admissions", title: /EduNova|Admissions/i },
  { path: "/academics", title: /EduNova|Academics/i },
  { path: "/faculty", title: /EduNova|Faculty/i },
  { path: "/news", title: /EduNova|News/i },
  { path: "/events", title: /EduNova|Events/i },
  { path: "/gallery", title: /EduNova|Gallery/i },
  { path: "/careers", title: /EduNova|Careers/i },
  { path: "/downloads", title: /EduNova|Downloads/i },
  { path: "/contact", title: /EduNova|Contact/i },
  { path: "/login", title: /EduNova|Login/i },
];

test.describe("Public website", () => {
  for (const pageDef of PUBLIC_PAGES) {
    test(`${pageDef.path} loads without errors`, async ({ page }) => {
      const bucket = trackErrors(page);
      await open(page, pageDef.path);
      await expect(page).toHaveTitle(pageDef.title);
      expect(page.locator("body")).not.toBeEmpty();
      expect(meaningfulErrors(bucket), JSON.stringify(bucket, null, 2)).toEqual([]);
    });
  }

  test("homepage hero + primary content renders", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/");
    // Hero heading and at least one of the known sections.
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(500);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("navigation menu works (desktop)", async ({ page }) => {
    await open(page, "/");
    const nav = page.locator("header nav, header");
    await expect(nav.first()).toBeVisible();
    const loginLink = page.locator('header a[href="/login"]').first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("contact page form section present", async ({ page }) => {
    await open(page, "/contact");
    await expect(page.locator('input[type="email"], input[name*="email" i]').first()).toBeVisible();
  });

  test("admissions page has apply/eligibility CTA", async ({ page }) => {
    await open(page, "/admissions");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Apply|Eligibility|Admission/i);
  });
});
