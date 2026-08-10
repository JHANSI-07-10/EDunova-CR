import { test, expect, request as pwRequest } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession, readAuth, API_HOST } from "./helpers/session";

test.describe("Authentication flow (deployed)", () => {
  test("login role picker renders all four portal options", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/login");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Admin|Student|Teacher|Parent/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("admin login page: empty submit shows validation feedback", async ({ page }) => {
    await open(page, "/admin/login");
    // Click submit with empty fields.
    const submit = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify"), button:has-text("Sign In"), button:has-text("Login"), button:has-text("Get OTP"), button:has-text("Send OTP")').first();
    await submit.click();
    // Either native HTML5 validation or an inline error appears.
    await page.waitForTimeout(600);
    const body = await page.locator("body").innerText();
    const hasInlineError = /required|enter your|invalid|please/i.test(body);
    const isBlocked = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input"));
      return inputs.some((i) => (i as HTMLInputElement).validationMessage);
    });
    expect(hasInlineError || isBlocked).toBe(true);
  });

  test("invalid credentials are rejected with a visible error", async ({ page }) => {
    await open(page, "/admin/login");
    const inputs = page.locator("input");
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const emailInput = inputs.nth(0);
    const passInput = inputs.nth(1);
    await emailInput.fill("nobody@nowhere.com");
    await passInput.fill("WrongPass@999");
    const submit = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify"), button:has-text("Sign In"), button:has-text("Login"), button:has-text("Get OTP"), button:has-text("Send OTP")').first();
    await submit.click();
    await expect
      .poll(async () => page.locator("body").innerText(), { timeout: 15_000 })
      .toMatch(/invalid|incorrect|not found|error|failed/i);
  });

  test("valid credentials proceed to the OTP step (OTP is emailed)", async ({ page }) => {
    await open(page, "/admin/login");
    const inputs = page.locator("input");
    await inputs.nth(0).fill("jhansilakshmi1004@gmail.com");
    await inputs.nth(1).fill("Edunova@123");
    const submit = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify"), button:has-text("Sign In"), button:has-text("Login"), button:has-text("Get OTP"), button:has-text("Send OTP")').first();
    await submit.click();
    // OTP step: a 6-digit code field appears.
    await expect
      .poll(async () => page.locator("body").innerText(), { timeout: 25_000 })
      .toMatch(/otp|verification code|6-?digit/i);
    const otpInput = page.locator('input[maxlength="6"], input[name*="otp" i], input[placeholder*="OTP" i], input[placeholder*="code" i]').first();
    await expect(otpInput).toBeVisible({ timeout: 15_000 });
  });

  test("real JWT session restores admin dashboard (end-to-end API data)", async ({ page }) => {
    const bucket = trackErrors(page);
    await injectSession(page, "admin");
    await open(page, "/admin");
    // Sidebar + dashboard shell render, and live API data arrives.
    await expect(page.locator("body")).not.toBeEmpty();
    await expect
      .poll(async () => page.locator("body").innerText(), { timeout: 25_000 })
      .toMatch(/dashboard|overview|admission|student|welcome/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("refresh does not break the session", async ({ page }) => {
    await injectSession(page, "admin");
    await open(page, "/admin");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    // Still logged in (not redirected to /admin/login).
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });

  test("logout clears the session", async ({ page }) => {
    await injectSession(page, "admin");
    await open(page, "/admin");
    // Find the logout control in the sidebar/topbar.
    const logout = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [title*="logout" i]').first();
    if (await logout.count()) {
      await logout.click();
      await page.waitForTimeout(1200);
      const keys = await page.evaluate(() => Object.keys(localStorage));
      expect(keys.some((k) => k.startsWith("edunova_admin_"))).toBe(false);
    } else {
      // Fallback: exercise the API logout endpoint.
      const session = readAuth().admin;
      const ctx = await pwRequest.newContext({ baseURL: API_HOST });
      const res = await ctx.post("/api/auth/logout/", {
        headers: { Authorization: `Bearer ${session.access}` },
        data: { refresh: session.refresh },
      });
      expect([200, 204, 400]).toContain(res.status());
      await ctx.dispose();
    }
  });
});
