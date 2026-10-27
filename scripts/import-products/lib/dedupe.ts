import { fold } from "../../../src/lib/text/search-normalize";
import { textOf, toAgorot } from "./normalize";
import type { SourceProduct } from "./source";

/**
 * Automatic duplicate / variant-candidate detection. It never merges anything by
 * itself — it produces findings for the report. Merges are declared explicitly in
 * config/merge-groups.ts after review.
 *
 * Signals used (spec §7): source id, SKU, normalized name, price, option values,
 * description content, shared images. Barcodes are not present in the source.
 */
export type Finding =
  | { kind: "SAME_NAME"; title: string; ids: number[]; samePrice: boolean; differingBy: string }
  | { kind: "IDENTICAL_CONTENT"; ids: number[]; detail: string }
  | { kind: "SKU_COLLISION"; sku: string; ids: number[] }
  | { kind: "SHARED_IMAGE"; imageId: number; ids: number[] }
  | { kind: "SIZE_VARIANT_CANDIDATE"; family: string; ids: number[] };

const COLOR_WORDS = /(לבן|שחור|כסוף|אפור|ירוק|מט|מבריק|פנינה|בטון|כהה|מעושן)/g;

export function normalizedName(title: string): string {
  return fold(title).replace(COLOR_WORDS, "").replace(/\s+/g, " ").trim();
}

export function detectFindings(products: SourceProduct[]): Finding[] {
  const findings: Finding[] = [];

  // 1. Same normalized name.
  const byName = groupBy(products, (p) => normalizedName(p.t));
  for (const [, group] of byName) {
    if (group.length < 2) continue;
    const prices = new Set(group.map((p) => p.vr.map((v) => v.p).join("|")));
    const colorish = group.map((p) => describeDifference(p)).join(" / ");
    findings.push({ kind: "SAME_NAME", title: group[0]!.t, ids: group.map((p) => p.id), samePrice: prices.size === 1, differingBy: colorish });
  }

  // 2. Identical title + description + prices (true duplicate listings).
  const byContent = groupBy(products, (p) => [fold(p.t), textOf(p.b), p.vr.map((v) => `${v.p}/${v.c}/${v.s}`).join(";")].join("§"));
  for (const [, group] of byContent) {
    if (group.length > 1) findings.push({ kind: "IDENTICAL_CONTENT", ids: group.map((p) => p.id), detail: "כותרת, תיאור, מחיר ו-SKU זהים" });
  }

  // 3. SKU used by more than one product.
  const skuOwners = new Map<string, Set<number>>();
  for (const p of products) for (const v of p.vr) if (v.s) (skuOwners.get(v.s.trim()) ?? skuOwners.set(v.s.trim(), new Set()).get(v.s.trim())!).add(p.id);
  for (const [sku, ids] of skuOwners) if (ids.size > 1) findings.push({ kind: "SKU_COLLISION", sku, ids: [...ids] });

  // 4. Same image file on different products.
  const imageOwners = new Map<number, Set<number>>();
  for (const p of products) for (const im of p.im) (imageOwners.get(im.id) ?? imageOwners.set(im.id, new Set()).get(im.id)!).add(p.id);
  for (const [imageId, ids] of imageOwners) if (ids.size > 1) findings.push({ kind: "SHARED_IMAGE", imageId, ids: [...ids] });

  // 5. Same product family in different sizes (e.g. oil 1L vs 4L).
  // JS \b is ASCII-only, so Hebrew word edges use explicit look-arounds.
  const byFamily = groupBy(products, (p) => fold(p.t).replace(/(?<![\p{L}\p{N}])\d+\s*ליטר(?![\p{L}\p{N}])/gu, "").replace(/\s+/g, " ").trim());
  for (const [family, group] of byFamily) {
    if (group.length > 1 && group.some((p) => /ליטר/.test(p.t))) findings.push({ kind: "SIZE_VARIANT_CANDIDATE", family, ids: group.map((p) => p.id) });
  }

  return findings;
}

function describeDifference(p: SourceProduct): string {
  const color = textOf(p.b).match(/צבע:?\s*([^\s,.]+(?:\s(?:פנינה|מט|מבריק|ירוק))*)/);
  return color ? color[1]! : `${p.vr[0]!.s ?? "—"} · ₪${toAgorot(p.vr[0]!.p) / 100}`;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    (map.get(k) ?? map.set(k, []).get(k)!).push(item);
  }
  return map;
}

/** Data-quality checks that don't involve duplicates. */
export type QualityIssue = { id: number; title: string; issue: string };

export function detectQualityIssues(products: SourceProduct[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const p of products) {
    const body = textOf(p.b);
    if (p.im.length === 0) issues.push({ id: p.id, title: p.t, issue: "אין תמונות" });
    if (p.vr.every((v) => v.g === 0)) issues.push({ id: p.id, title: p.t, issue: "משקל חסר (0 גרם) — נדרש לחישוב משלוח לפי משקל" });
    if (p.vr.some((v) => !v.s)) issues.push({ id: p.id, title: p.t, issue: "חסר SKU באחת הווריאציות" });
    for (const visc of p.t.match(/\d+W\d+/gi) ?? []) {
      if (!body.toUpperCase().includes(visc.toUpperCase())) {
        const other = body.match(/\d+W\d+/i)?.[0];
        issues.push({ id: p.id, title: p.t, issue: `הכותרת אומרת ${visc} אך התיאור אומר ${other ?? "צמיגות אחרת"}` });
      }
    }
    const optionCountClaim = body.match(/(\d+) צבעים/);
    if (optionCountClaim && p.vr.length > 1 && Number(optionCountClaim[1]) !== p.vr.length) {
      issues.push({ id: p.id, title: p.t, issue: `התיאור מציין ${optionCountClaim[1]} צבעים אך קיימות ${p.vr.length} וריאציות` });
    }
    if (p.vr.some((v) => !v.a)) issues.push({ id: p.id, title: p.t, issue: "מסומן כלא זמין במקור" });
  }
  return issues;
}
