import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://edunova-school-iumy.vercel.app";
const API_URL = process.env.E2E_API_URL || "https://edunova-cr-ax7h.onrender.com/api";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "e2e-report/results.json" }],
    ["html", { outputFolder: "e2e-report/html", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    // Use the full Chromium build (headless-shell download is flaky on this network).
    launchOptions: {
      executablePath:
        process.env.E2E_CHROME_PATH ||
        "C:\\Users\\win10\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  // Expose the API base to specs via a project-independent mechanism.
  globalSetup: undefined,
});

export { BASE_URL, API_URL };
