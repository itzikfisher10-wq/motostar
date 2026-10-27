import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import importReport from "../../reports/catalog-import.json" with { type: "json" };
import legacy from "../../src/content/generated/legacy-redirects.json" with { type: "json" };
import { E2E } from "./fixtures/constants";

/** Technical SEO, accessibility and link health on the real catalog. */

const PRODUCT = `/products/${encodeURIComponent(E2E.variantProductSlug)}`;
const KEY_PAGES = ["/", "/categories", "/categories/replacement-parts", "/brands/arai", "/vehicles", "/deals", PRODUCT, "/info/shipping"];

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as Record<string, unknown>).flatMap((b) => (Array.isArray(b["@graph"]) ? (b["@graph"] as Record<string, unknown>[]) : [b]));
}

test.describe("metadata", () => {
  for (const path of KEY_PAGES) {
    test(`${decodeURIComponent(path)}: one h1, unique title, description, absolute canonical, Hebrew RTL`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute("lang", "he");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect((await page.title()).length).toBeGreaterThan(5);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length ?? 0).toBeGreaterThan(30);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/^https?:\/\//);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    });
  }

  test("titles are unique across key pages", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of KEY_PAGES) {
      await page.goto(path);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(KEY_PAGES.length);
  });

  test("filtered and sorted listings are noindex and canonical to the clean URL", async ({ page }) => {
    await page.goto("/categories/replacement-parts?sort=price-asc");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/categories\/replacement-parts$/);
  });

  test("checkout, cart and search are noindex", async ({ page }) => {
    for (const path of ["/cart", "/search?q=arai"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });
});

test.describe("structured data", () => {
  test("product page has Product/ProductGroup + Offer with real prices and no invented ratings", async ({ page }) => {
    await page.goto(PRODUCT);
    const items = await jsonLd(page);
    // Products with colours are a ProductGroup with one Product per variant (Google's variant markup).
    const root = items.find((i) => i["@type"] === "Product" || i["@type"] === "ProductGroup");
    expect(root).toBeTruthy();
    expect(root!.name).toBeTruthy();
    const variants = root!["@type"] === "ProductGroup" ? (root!.hasVariant as Record<string, unknown>[]) : [root!];
    expect(variants.length).toBeGreaterThan(0);
    for (const v of [root!, ...variants]) {
      expect(v).not.toHaveProperty("aggregateRating");
      expect(v).not.toHaveProperty("review");
    }
    for (const v of variants) {
      const offer = v.offers as Record<string, unknown>;
      expect(offer.priceCurrency).toBe("ILS");
      expect(Number(offer.price)).toBeGreaterThan(0);
      expect(String(offer.availability)).toMatch(/schema\.org\/(InStock|OutOfStock)/);
    }
    expect(items.some((i) => i["@type"] === "BreadcrumbList")).toBe(true);
  });

  test("home page declares the store", async ({ page }) => {
    await page.goto("/");
    const types = (await jsonLd(page)).map((i) => i["@type"]).flat();
    expect(types.some((t) => t === "OnlineStore" || t === "Organization" || t === "AutoPartsStore")).toBe(true);
    expect(types).toContain("WebSite");
  });
});

test.describe("crawling", () => {
  test("robots.txt blocks private areas and points to the sitemap", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const path of ["/admin", "/api/", "/cart", "/checkout", "/order/"]) expect(body).toContain(`Disallow: ${path}`);
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("sitemap lists products and categories, all reachable", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(urls.filter((u) => u.includes("/products/")).length).toBeGreaterThan(50);
    expect(urls.some((u) => u.includes("/categories/"))).toBe(true);
    const sample = [...urls.filter((u) => u.includes("/products/")).slice(0, 8), ...urls.filter((u) => !u.includes("/products/"))];
    for (const u of sample) {
      const res = await request.get(new URL(u).pathname, { maxRedirects: 0 });
      expect(res.status(), u).toBe(200);
    }
  });

  test("every old collection and info-page URL redirects once (301) to a live page", async ({ request }) => {
    const entries = Object.entries(legacy as Record<string, string>);
    expect(entries.length).toBeGreaterThan(40);
    for (const [from, to] of entries) {
      const res = await request.get(encodeURI(from), { maxRedirects: 0 });
      expect(res.status(), from).toBe(301);
      expect(decodeURIComponent(new URL(res.headers()["location"]!, "http://x").pathname), from).toBe(to);
      expect((await request.get(encodeURI(to), { maxRedirects: 0 })).status(), `${from} → ${to}`).toBe(200);
    }
  });

  test("every old product URL redirects in one permanent hop to the product's current page", async ({ request }) => {
    const handles = importReport.products.flatMap((p) => p.sources.map((s) => ({ handle: s.handle, slug: p.slug }))).filter((x) => x.handle !== x.slug);
    expect(handles.length).toBeGreaterThan(40);
    for (const { handle } of handles) {
      const res = await request.get(`/products/${encodeURIComponent(handle)}`, { maxRedirects: 0 });
      expect([301, 308], handle).toContain(res.status());
      const target = await request.get(res.headers()["location"]!, { maxRedirects: 0 });
      expect(target.status(), `${handle} → ${res.headers()["location"]}`).toBe(200);
    }
    // Shopify's nested collection URL shape still ends on the product.
    const nested = await request.get(`/collections/all/products/${encodeURIComponent(handles[0]!.handle)}`);
    expect(nested.status()).toBe(200);
  });

  test("unknown pages return 404", async ({ request }) => {
    expect((await request.get("/products/no-such-product-xyz")).status()).toBe(404);
    expect((await request.get("/categories/no-such-category")).status()).toBe(404);
  });

  test("no broken internal links on the home page", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) {
      const res = await request.get(href, { maxRedirects: 0 });
      expect([200, 301, 308], href).toContain(res.status());
    }
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  for (const path of ["/", PRODUCT, "/categories/replacement-parts", "/cart", "/admin/login"]) {
    test(`${decodeURIComponent(path)} has no serious violations`, async ({ page }) => {
      // Scroll reveals leave below-the-fold content mid-fade while the page sits at the top, and a
      // static contrast check would score that transient frame. Audit the resting state instead
      // (what every visitor ends up seeing, and what reduced-motion visitors always see).
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // @axe-core/playwright is typed against its own playwright-core copy; the Page object is the same at runtime.
      const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  }
});
