import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/text/slug";
import { normalizeForSearch } from "@/lib/text/search-normalize";

describe("slugify", () => {
  it("keeps Hebrew, lowercases Latin, and joins with dashes", () => {
    expect(slugify("מסנן אויר מקורי Yamaha Xmax 300")).toBe("מסנן-אויר-מקורי-yamaha-xmax-300");
  });
  it("drops geresh, slashes and punctuation", () => {
    expect(slugify("קיט פוליני עם רצועה לטימקס 530/560")).toBe("קיט-פוליני-עם-רצועה-לטימקס-530-560");
    expect(slugify("סטרטר לג'ט 14")).toBe("סטרטר-לגט-14");
  });
  it("produces unique slugs", () => {
    const taken = new Set<string>(["a"]);
    expect(uniqueSlug("a", taken)).toBe("a-2");
    expect(uniqueSlug("a", taken)).toBe("a-3");
  });
});

describe("normalizeForSearch", () => {
  it("folds Hebrew and English spellings of a model to one token", () => {
    expect(normalizeForSearch("אקס מקס 300")).toBe(normalizeForSearch("Xmax 300"));
    expect(normalizeForSearch("ימאהה")).toBe("yamaha");
  });
  it("handles attached Hebrew prefixes", () => {
    expect(normalizeForSearch("משענת לטימקס")).toContain("tmax");
    expect(normalizeForSearch("קיט לג׳וייריד")).toContain("joyride");
  });
  it("does not rewrite substrings inside other words", () => {
    expect(normalizeForSearch("כונס")).not.toContain("sym");
  });
});
