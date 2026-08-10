import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Host WITHOUT the /api prefix: Playwright's request context resolves a
// leading-slash path against baseURL with URL semantics, so
// new URL('/docs/', 'https://host/api') would DROP the /api segment.
export const API_HOST =
  process.env.E2E_API_HOST || "https://edunova-cr-ax7h.onrender.com";

export const API_URL = `${API_HOST}/api`;

const AUTH_FILE = path.resolve(HERE, "..", "..", "..", ".freebuff", "e2e-auth.json");

export interface RoleSession {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
}

export function readAuth(): Record<string, RoleSession> {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Auth file not found at ${AUTH_FILE}. Mint tokens first.`);
  }
  return JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
}

/**
 * Error bucket attached to a page. `expectNoErrors` asserts the page was clean.
 */
export interface ErrorBucket {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  http4xx: string[];
}

export function trackErrors(page: Page): ErrorBucket {
  const bucket: ErrorBucket = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    http4xx: [],
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") bucket.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => bucket.pageErrors.push(String(err)));
  page.on("requestfailed", (req) =>
    bucket.failedRequests.push(
      `${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "unknown"}`
    )
  );
  page.on("response", (res) => {
    if (res.status() >= 400) bucket.http4xx.push(`HTTP ${res.status()} ${res.url()}`);
  });
  return bucket;
}

/** Filter out benign noise (analytics, fonts, favicon). */
export function meaningfulErrors(bucket: ErrorBucket): string[] {
  const noise = /(googletagmanager|gtag|analytics|hotjar|clarity|favicon|sentry|doubleclick)/i;
  const all = [
    ...bucket.consoleErrors.map((e) => `CONSOLE: ${e}`),
    ...bucket.pageErrors.map((e) => `PAGE: ${e}`),
    ...bucket.failedRequests.map((e) => `FAILED: ${e}`),
    ...bucket.http4xx.map((e) => `HTTP: ${e}`),
  ];
  return all.filter((e) => !noise.test(e));
}

/**
 * Injects a pre-minted JWT session for a portal role so the SPA restores the
 * session exactly as after a real login (same localStorage keys the app uses).
 */
export async function injectSession(page: Page, role: string, opts?: { childId?: string }) {
  const auth = readAuth();
  const session = auth[role];
  if (!session) throw new Error(`No session minted for role '${role}'`);
  await page.addInitScript(
    ({ access, refresh, user, role, childId }) => {
      const prefix = `edunova_${role}_`;
      localStorage.setItem(`${prefix}access`, access);
      localStorage.setItem(`${prefix}refresh`, refresh);
      localStorage.setItem(`${prefix}user`, JSON.stringify(user));
      if (childId) localStorage.setItem(`${prefix}active_child`, childId);
    },
    {
      access: session.access,
      refresh: session.refresh,
      user: session.user,
      role,
      childId: opts?.childId ?? null,
    }
  );
}

/** Navigate and wait for the SPA to settle (network quiet + a tick). */
export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Allow the SPA to mount and fire its data requests.
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(800);
}
