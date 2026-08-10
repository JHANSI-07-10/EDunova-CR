import { test, expect } from "@playwright/test";
import { open, trackErrors, meaningfulErrors, injectSession } from "./helpers/session";

const TEACHER_PAGES = [
  { path: "/teacher", hint: /dashboard|welcome|overview|class/i },
  { path: "/teacher/assignments", hint: /assignment|homework|create|list/i },
  { path: "/teacher/timetable", hint: /timetable|schedule|period/i },
  { path: "/teacher/marks-entry", hint: /marks|entry|grade|student/i },
  { path: "/teacher/exams", hint: /exam|schedule|paper/i },
  { path: "/teacher/classes", hint: /class|roster|section/i },
];

test.describe("Teacher portal", () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page, "teacher");
  });

  for (const p of TEACHER_PAGES) {
    test(`${p.path} loads with live data, no errors`, async ({ page }) => {
      const bucket = trackErrors(page);
      await open(page, p.path);
      await expect(page).not.toHaveURL(/\/teacher\/login/);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(100);
      expect(meaningfulErrors(bucket), JSON.stringify(bucket, null, 2)).toEqual([]);
    });
  }

  test("dashboard shows teacher's real classes/profile", async ({ page }) => {
    await open(page, "/teacher");
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/raviteja|teacher|class/i);
  });
});
