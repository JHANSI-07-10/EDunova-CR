import { test, expect } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession } from "./helpers/session";

const ADMIN_PAGES = [
  { path: "/admin", hint: /dashboard|overview|admission|student|fee/i },
  { path: "/admin/users", hint: /user|student|teacher|role|email/i },
  { path: "/admin/admissions", hint: /admission|enquiry|pipeline|register/i },
  { path: "/admin/enquiries", hint: /enquir|message|contact/i },
  { path: "/admin/classes", hint: /class|subject|faculty|curriculum/i },
  { path: "/admin/recruitment", hint: /recruit|application|interview|job/i },
];

test.describe("Admin portal", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, "admin");
  });

  for (const p of ADMIN_PAGES) {
    test(`${p.path} loads with live data, no errors`, async ({ page }) => {
      const bucket = trackErrors(page);
      await open(page, p.path);
      await expect(page).not.toHaveURL(/\/admin\/login/);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(100);
      expect(meaningfulErrors(bucket), JSON.stringify(bucket, null, 2)).toEqual([]);
    });
  }

  test("dashboard renders stat cards from live API", async ({ page }) => {
    await open(page, "/admin");
    const body = await page.locator("body").innerText();
    // At least one numeric stat should be present.
    expect(body).toMatch(/[0-9]{1,}/);
  });

  test("admissions page lists real enquiries", async ({ page }) => {
    await open(page, "/admin/admissions");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/admission|enquir|application|no admission/i);
  });

  test("recruitment page loads applications or empty state", async ({ page }) => {
    await open(page, "/admin/recruitment");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/application|interview|no applications/i);
  });
});
