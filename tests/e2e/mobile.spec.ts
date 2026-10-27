import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures/constants";

/** Phone layout: no sideways scrolling, sticky buy bar, navigation drawer. Runs in the "mobile" project. */
const PAGES = ["/", "/categories/replacement-parts", `/products/${encodeURIComponent(E2E.variantProductSlug)}`, "/vehicles", "/cart", "/checkout"];

test.describe("mobile layout", () => {
  for (const path of PAGES) {
    test(`${decodeURIComponent(path)} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("product page has a reachable add-to-cart bar", async ({ page }) => {
    await page.goto(`/products/${encodeURIComponent(E2E.variantProductSlug)}`);
    const bar = page.getByRole("button", { name: "הוספה לסל" }).filter({ visible: true }).last();
    await expect(bar).toBeInViewport();
    const box = await bar.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test("menu drawer opens, lists categories, closes on navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /תפריט/ }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: /מבצעים/ }).first().click();
    await expect(page).toHaveURL(/\/deals/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("reduced motion keeps the Arai section as plain content", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(E2E.baseURL + "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await ctx.close();
  });
});
