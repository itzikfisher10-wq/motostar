import { describe, expect, it } from "vitest";
import { buildPlan } from "../../scripts/import-products/lib/plan";
import { cleanDescription, detectOrigin, toAgorot } from "../../scripts/import-products/lib/normalize";
import { loadSource } from "../../scripts/import-products/lib/source";
import { detectFindings, normalizedName } from "../../scripts/import-products/lib/dedupe";

const source = loadSource("data/source");
const plan = buildPlan(source);

describe("source data", () => {
  it("parses every record without validation errors", () => {
    expect(source.errors).toEqual([]);
    expect(source.products).toHaveLength(79);
  });
});

describe("price parsing", () => {
  it("converts to integer agorot without float drift", () => {
    expect(toAgorot("99.90")).toBe(9990);
    expect(toAgorot("1790.00")).toBe(179000);
    expect(toAgorot("139.9")).toBe(13990);
    expect(toAgorot("0.1")).toBe(10);
  });
});

describe("plan accounting", () => {
  it("accounts for every source record exactly once", () => {
    const ids = plan.products.flatMap((p) => p.sources.map((s) => s.sourceProductId));
    expect(new Set(ids).size).toBe(79);
    expect(ids).toHaveLength(79);
    expect(plan.stats.uniqueProducts + plan.stats.mergedAsVariants + plan.stats.duplicatesMerged).toBe(79);
  });
  it("keeps every source variant except the declared duplicate", () => {
    expect(plan.stats.sourceVariants - plan.stats.duplicatesMerged).toBe(plan.stats.variants);
  });
  it("produces unique slugs", () => {
    const slugs = plan.products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("merging rules", () => {
  it("merges the six Arai SZ-R VAS outer mechanism listings into one product with a color option", () => {
    const p = plan.products.find((x) => x.key === "arai-szr-vas-outer-visor-mechanism")!;
    expect(p.variants).toHaveLength(6);
    expect(p.options).toEqual([{ name: "צבע", values: ["לבן פנינה", "לבן פנינה מט", "כסוף מט", "שחור פנינה מבריק", "שחור מט", "אפור ירוק"] }]);
    // Per-variant availability is preserved.
    expect(p.variants.filter((v) => !v.isAvailable).map((v) => v.title)).toEqual(["לבן פנינה מט", "שחור פנינה מבריק"]);
    // A variant-specific part number must not appear as a product-wide spec.
    expect(p.specs.find((s) => s.label === "מק״ט")).toBeUndefined();
  });

  it("does not merge products that only share a name pattern but differ (RX-7 old vs new)", () => {
    const rx7 = plan.products.filter((p) => p.title.includes("מנגנון משקף פנימי") && p.title.includes("Rx7"));
    expect(rx7).toHaveLength(2);
  });

  it("keeps differently-priced backrests with a shared SKU separate and flags them", () => {
    const backrests = plan.products.filter((p) => p.variants.some((v) => v.sku === "משענת מורכב Yamaha Xmax"));
    expect(backrests).toHaveLength(2);
    expect(backrests.every((p) => p.needsReview)).toBe(true);
  });

  it("folds the exact duplicate battery into the canonical product and keeps its image", () => {
    const battery = plan.products.find((p) => p.sources.some((s) => s.sourceProductId === 8223073665078))!;
    expect(battery.sources.map((s) => s.resolution)).toEqual(["CREATED", "DUPLICATE_OF"]);
    expect(battery.images).toHaveLength(2);
    expect(battery.variants).toHaveLength(1);
  });

  it("detects the same-name groups automatically", () => {
    const sameName = detectFindings(source.products).filter((f) => f.kind === "SAME_NAME");
    expect(sameName.some((f) => "ids" in f && f.ids.includes(8213588213814) && f.ids.includes(8213593882678))).toBe(true);
    expect(normalizedName("כונס אויר קדמי Arai Szr-vas")).toBe(normalizedName("כונס אויר קדמי Arai Szr-vas"));
  });
});

describe("redirects", () => {
  it("maps original collections and pages (product URLs are handled by slug history)", () => {
    const map = new Map(plan.redirects.map((r) => [r.from, r.to]));
    expect([...map.keys()].some((k) => k.startsWith("/products/"))).toBe(false);
    expect(map.get("/collections/מבצע")).toBe("/deals");
    expect(map.get("/pages/צור-קשר")).toBe("/contact");
  });
});

describe("description cleanup", () => {
  it("removes the WhatsApp button, shipping blurb and emoji, and lifts the tagline", () => {
    const raw = source.products.find((p) => p.id === 8627399000118)!.b;
    const out = cleanDescription(raw);
    expect(out.html).not.toContain("wa.me");
    expect(out.html).not.toContain("מידע נוסף");
    expect(out.html).not.toMatch(/[✔⚡📦🔧]/u);
    expect(out.html).toContain("<h3>התקנה במוסך</h3>");
    expect(out.short).toBe("דליפת שמן? זה החלק שצריך להחליף");
  });
  it("never lets attributes through", () => {
    const out = cleanDescription('<p onclick="x()" style="color:red">שלום<script>alert(1)</script></p>');
    expect(out.html).toBe("<p>שלום</p>");
  });
});

describe("origin detection", () => {
  it("uses explicit wording only", () => {
    expect(detectOrigin("סנדלי סחיבה תואם מקורי JM250", "")).toBe("AFTERMARKET");
    expect(detectOrigin("פילטר שמן מקורי Xmax", "")).toBe("ORIGINAL");
    expect(detectOrigin("מצבר BTX12", "<li>מתאים לאופנועים</li>")).toBe("UNSPECIFIED");
  });
});

describe("redirects from the old store", () => {
  const live = new Set(plan.products.map((p) => `/products/${p.slug}`));
  const from = new Set(plan.redirects.map((r) => r.from));

  it("never start at a live product URL and never chain or loop", () => {
    for (const r of plan.redirects) {
      expect(live.has(r.from), r.from).toBe(false);
      expect(from.has(r.to), `${r.from} → ${r.to}`).toBe(false);
    }
  });

  it("no product's new slug reuses another product's old URL", () => {
    const ownerOf = new Map(plan.products.flatMap((p) => p.sources.map((s) => [s.handle, p] as const)));
    for (const p of plan.products) {
      const owner = ownerOf.get(p.slug);
      expect(owner === undefined || owner === p, `${p.slug} belongs to "${owner?.title}"`).toBe(true);
    }
  });

  it("keeps the crossed BTX14 / BTX14-BS handles with the right battery", () => {
    const owner = (handle: string) => plan.products.find((p) => p.sources.some((s) => s.handle === handle))!;
    expect(owner("מצבר-btx14").title).toBe("מצבר BTX14-BS");
    expect(owner("מצבר-btx14-bs").title).toBe("מצבר BTX14");
    expect(plan.products.map((p) => p.slug)).not.toContain("מצבר-btx14");
    expect(plan.products.map((p) => p.slug)).not.toContain("מצבר-btx14-bs");
  });

  it("maps every original collection and info page", () => {
    expect(plan.redirects.filter((r) => r.from.startsWith("/collections/")).length).toBeGreaterThanOrEqual(35);
    expect(plan.redirects.filter((r) => r.from.startsWith("/pages/")).length).toBeGreaterThanOrEqual(5);
  });
});
