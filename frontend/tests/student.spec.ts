import { test, expect } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession } from "./helpers/session";

const STUDENT_PAGES = [
  { path: "/student/profile", hint: /profile|personal|name|email/i },
  { path: "/student/lms", hint: /course|learning|subject|lms/i },
  { path: "/student/results", hint: /result|exam|marks|grade/i },
  { path: "/student/timetable", hint: /timetable|schedule|period|class/i },
];

test.describe("Student portal", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, "student");
  });

  for (const p of STUDENT_PAGES) {
    test(`${p.path} loads with live data, no errors`, async ({ page }) => {
      const bucket = trackErrors(page);
      await open(page, p.path);
      await expect(page).not.toHaveURL(/\/student\/login/);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(100);
      expect(meaningfulErrors(bucket), JSON.stringify(bucket, null, 2)).toEqual([]);
    });
  }

  test("profile shows the student's real identity", async ({ page }) => {
    await open(page, "/student/profile");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/tarannum|student/i);
  });

  test("results page renders result cards or empty state without errors", async ({ page }) => {
    const bucket = trackErrors(page);
    await open(page, "/student/results");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/result|exam|no .* (results|marks)|empty/i);
    expect(meaningfulErrors(bucket)).toEqual([]);
  });
});
