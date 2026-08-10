import { test, expect, request as pwRequest } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession, readAuth, API_HOST } from "./helpers/session";

async function firstChildId(): Promise<string | null> {
  const session = readAuth().parent;
  const ctx = await pwRequest.newContext({ baseURL: API_HOST });
  const res = await ctx.get("/api/parent/children/", {
    headers: { Authorization: `Bearer ${session.access}` },
  });
  const data = res.ok() ? await res.json() : [];
  await ctx.dispose();
  return Array.isArray(data) && data.length > 0 ? String(data[0].id) : null;
}

test.describe("Parent portal", () => {
  let childId: string | null;

  test.beforeAll(async () => {
    childId = await firstChildId();
  });

  test.beforeEach(async ({ page }) => {
    await injectSession(page, "parent", { childId: childId ?? undefined });
  });

  test("profile loads without errors", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/parent/profile");
    await expect(page).not.toHaveURL(/\/parent\/login/);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("children list renders (real API data)", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/parent/dashboard");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/child|student|welcome|dashboard/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("child attendance loads (with child context)", async ({ page }) => {
    test.skip(!childId, "parent has no linked children in the database");
    const bucket = trackErrors(page);
    await open(page, "/parent/attendance");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/attendance|present|absent/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("child results load (with child context)", async ({ page }) => {
    test.skip(!childId, "parent has no linked children in the database");
    const bucket = trackErrors(page);
    await open(page, "/parent/results");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/result|exam|marks|report/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("fees page loads without errors", async ({ page }) => {
    test.skip(!childId, "parent has no linked children in the database");
    const bucket = trackErrors(page);
    await open(page, "/parent/fees");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/fee|payment|amount|invoice/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });

  test("notifications page loads without errors", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/parent/notifications");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });
});
