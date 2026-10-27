import { defineConfig, devices } from "@playwright/test";
import { E2E } from "./tests/e2e/fixtures/constants";

/**
 * End-to-end suite: `npm run test:e2e`
 * Builds and starts the app on port 3100 against a throw-away database
 * (tests/e2e/prepare-db.ts), with the mock payment provider.
 */
const env = {
  DATABASE_URL: E2E.databaseUrl,
  APP_SECRET: E2E.appSecret,
  NEXT_PUBLIC_SITE_URL: E2E.baseURL,
  PAYMENT_PROVIDER: "mock",
  // next start runs with NODE_ENV=production, where the mock provider is refused unless explicitly allowed.
  ALLOW_TEST_PAYMENTS: "true",
  EMAIL_PROVIDER: "log",
  NEXT_DIST_DIR: ".next-e2e",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: E2E.baseURL, locale: "he-IL", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts|purchase\.spec\.ts/ },
  ],
  webServer: {
    command: `npx tsx tests/e2e/prepare-db.ts && npx next build && npx next start -p ${E2E.port}`,
    url: `${E2E.baseURL}/robots.txt`,
    env,
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
