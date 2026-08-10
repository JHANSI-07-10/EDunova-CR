import { test, expect, request as pwRequest } from "@playwright/test";
import { readAuth, API_HOST } from "./helpers/session";

test.describe("Backend API health (deployed Render)", () => {
  test("docs, schema and public endpoints respond 200", async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_HOST, timeout: 30_000 });
    const checks: Array<[string, string]> = [
      ["/api/docs/", "GET"],
      ["/api/schema/", "GET"],
      ["/api/website/stats/", "GET"],
      ["/api/website/faculty/", "GET"],
      ["/api/cms/settings/", "GET"],
      ["/api/campuses/", "GET"],
    ];
    const results: string[] = [];
    for (const [endpoint] of checks) {
      const started = Date.now();
      const res = await ctx.get(endpoint);
      const ms = Date.now() - started;
      results.push(`${res.status()} ${ms}ms ${endpoint}`);
      expect(res.status(), endpoint).toBe(200);
    }
    console.log("API responses:\n" + results.join("\n"));
    await ctx.dispose();
  });

  test("login endpoint rejects bad credentials (400) and accepts valid (200 + user_id)", async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_HOST, timeout: 30_000 });
    // A wrong-but-well-formed password is generated at runtime so no
    // credential-like literal lives in the test source.
    const bad = await ctx.post("/api/auth/login/", {
      data: { email: "nobody@nowhere.com", password: `incorrect-${Date.now()}` },
    });
    expect([400, 401]).toContain(bad.status());

    // Real-account assertion only runs when this e2e is supplied the admin
    // credentials via environment (never committed to the repo).
    test.skip(
      !process.env.E2E_ADMIN_PASSWORD,
      "E2E_ADMIN_PASSWORD not set — skipping valid-login assertion"
    );
    const good = await ctx.post("/api/auth/login/", {
      data: {
        email: process.env.E2E_ADMIN_EMAIL || "jhansilakshmi1004@gmail.com",
        password: process.env.E2E_ADMIN_PASSWORD as string,
      },
    });
    expect(good.status()).toBe(200);
    const body = await good.json();
    expect(body.user_id).toBeTruthy();
    expect(body.email_sent).toBe(true);
    await ctx.dispose();
  });

  test("token refresh endpoint issues new access token", async () => {
    const session = readAuth().admin;
    const ctx = await pwRequest.newContext({ baseURL: API_HOST, timeout: 30_000 });
    const res = await ctx.post("/api/auth/refresh/", { data: { refresh: session.refresh } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.access).toBeTruthy();
    await ctx.dispose();
  });

  test("authenticated admin endpoints return data with JWT", async () => {
    const session = readAuth().admin;
    const ctx = await pwRequest.newContext({
      baseURL: API_HOST,
      extraHTTPHeaders: { Authorization: `Bearer ${session.access}` },
      timeout: 30_000,
    });
    const endpoints = [
      "/api/admin-portal/dashboard/",
      "/api/admin-portal/users/",
      "/api/admin-portal/admissions/enquiries/",
      "/api/admin-portal/academic/dashboard/",
      "/api/admin-portal/contact-messages/",
    ];
    for (const ep of endpoints) {
      const res = await ctx.get(ep);
      expect(res.status(), ep).toBe(200);
    }
    await ctx.dispose();
  });

  test("authenticated student endpoint returns data with JWT", async () => {
    const session = readAuth().student;
    const ctx = await pwRequest.newContext({
      baseURL: API_HOST,
      extraHTTPHeaders: { Authorization: `Bearer ${session.access}` },
      timeout: 30_000,
    });
    const res = await ctx.get("/api/student/dashboard/");
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });
});
