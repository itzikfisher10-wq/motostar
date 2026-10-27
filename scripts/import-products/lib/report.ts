import type { ApplyResult } from "./apply";
import type { ImportPlan } from "./plan";

const KIND_LABEL: Record<string, string> = {
  SAME_NAME: "שם זהה",
  IDENTICAL_CONTENT: "תוכן זהה לחלוטין",
  SKU_COLLISION: "SKU משותף",
  SHARED_IMAGE: "תמונה משותפת",
  SIZE_VARIANT_CANDIDATE: "מועמד לאיחוד לפי נפח",
};

/** Human-readable migration report (Hebrew), written to reports/catalog-import.md. */
export function renderReport(plan: ImportPlan, opts: { dryRun: boolean; applied?: ApplyResult; generatedAt: Date }): string {
  const s = plan.stats;
  const titleOf = (id: number) => plan.products.flatMap((p) => p.sources).find((x) => x.sourceProductId === id)?.title ?? String(id);
  const lines: string[] = [];
  const add = (...l: string[]) => lines.push(...l);

  add(
    `# דוח יבוא קטלוג — MotoStar`,
    ``,
    `נוצר: ${opts.generatedAt.toISOString()} · מצב: ${opts.dryRun ? "**Dry run (ללא כתיבה למסד)**" : "**יבוא בפועל**"}`,
    ``,
    `מקור: ה-feed הציבורי של החנות המקורית (motostar.co.il/products.json), נלכד ב-26.10.2026 ואומת מול SHA-256.`,
    ``,
    `## סיכום`,
    ``,
    `| מדד | ערך |`,
    `|---|---|`,
    `| רשומות מקור | ${s.sourceRecords} |`,
    `| וריאציות במקור | ${s.sourceVariants} |`,
    `| מוצרים ייחודיים לאחר איחוד | ${s.uniqueProducts} |`,
    `| וריאציות לאחר איחוד | ${s.variants} |`,
    `| רשומות שאוחדו כווריאציות צבע | ${s.mergedAsVariants} |`,
    `| כפילויות שאוחדו | ${s.duplicatesMerged} |`,
    `| מוצרים המסומנים לבדיקה ידנית | ${s.needsReview} |`,
    `| מוצרים ללא תמונה | ${s.withoutImages} |`,
    `| מוצרים ללא קטגוריה | ${s.withoutCategory} |`,
    `| הפניות 301 מכתובות ישנות | ${plan.redirects.length} |`,
    ``,
    `בדיקת התאמה: ${s.sourceRecords} רשומות = ${s.uniqueProducts} מוצרים + ${s.mergedAsVariants} שאוחדו כווריאציות + ${s.duplicatesMerged} כפילויות → ${
      s.uniqueProducts + s.mergedAsVariants + s.duplicatesMerged === s.sourceRecords ? "✅ תקין, אף רשומה לא אבדה" : "❌ אי-התאמה — לבדוק"
    }`,
    ``,
  );

  if (opts.applied) {
    add(`## תוצאת כתיבה למסד`, ``, `נוצרו: ${opts.applied.created} · עודכנו: ${opts.applied.updated} · דולגו (קיימים): ${opts.applied.skipped} · רשומות מקור שנשמרו: ${opts.applied.sourceRecordsWritten}`, ``);
  }

  add(`## איחודים שבוצעו`, ``);
  for (const p of plan.products) {
    const merged = p.sources.filter((x) => x.resolution !== "CREATED");
    if (!merged.length) continue;
    add(`### ${p.title}`, ``, `כתובת חדשה: \`/products/${p.slug}\``, ``);
    for (const src of p.sources) add(`- ${src.resolution === "CREATED" ? "רשומה ראשית" : src.resolution === "MERGED_AS_VARIANT" ? "אוחדה כווריאציה" : "כפילות"}: ${src.sourceProductId} — ${src.title} (\`${src.handle}\`)`);
    add(``, ...p.reviewNotes.filter((n) => n.startsWith("אוחד") || n.startsWith("רשומת מקור")).map((n) => `> ${n}`), ``);
  }

  add(`## מוצרים לבדיקה ידנית`, ``, `| מוצר | סיבה |`, `|---|---|`);
  for (const p of plan.products.filter((x) => x.needsReview)) add(`| ${p.title} | ${p.reviewNotes.join("<br>")} |`);
  add(``);

  add(`## ממצאי זיהוי כפילויות אוטומטי`, ``, `הממצאים הבאים זוהו אוטומטית. רק מה שמופיע ב-\`config/merge-groups.ts\` אוחד בפועל.`, ``);
  for (const f of plan.findings) {
    const ids = "ids" in f ? f.ids : [];
    const detail =
      f.kind === "SAME_NAME" ? `"${f.title}" — ${f.samePrice ? "מחיר זהה" : "מחירים שונים"} — הבדל: ${f.differingBy}`
      : f.kind === "SKU_COLLISION" ? `SKU "${f.sku}"`
      : f.kind === "SHARED_IMAGE" ? `תמונה ${f.imageId}`
      : f.kind === "SIZE_VARIANT_CANDIDATE" ? f.family
      : f.detail;
    add(`- **${KIND_LABEL[f.kind]}**: ${detail}`, ...ids.map((id) => `  - ${id} — ${titleOf(id)}`));
  }
  add(``);

  add(`## בעיות איכות נתונים במקור`, ``, `| מזהה | מוצר | בעיה |`, `|---|---|---|`);
  for (const q of plan.quality) add(`| ${q.id} | ${q.title} | ${q.issue} |`);
  add(``);

  add(`## שיוך לקולקציית יצרן ללא דגם מוצהר`, ``, `לא נוצרה התאמה לרכב עבור המוצרים הבאים, כי התיאור לא מציין דגם:`, ``);
  for (const h of plan.collectionHints) add(`- ${h.title} (${h.productId}) — קולקציות: ${h.collections.join(", ")}`);
  add(``);

  add(
    `## מוצרים שאינם ב-feed הציבורי`,
    ``,
    `מספר המוצרים שהחנות המקורית מדווחת בקולקציות גבוה ממספר המוצרים הגלויים — כנראה מוצרים לא מפורסמים (טיוטה/מוסתרים). ה-feed הציבורי לא חושף אותם, ולכן הם **לא** יובאו. לקבלתם יש לייצא CSV מלוח הניהול של Shopify ולהריץ את היבוא שוב.`,
    ``,
    `| קולקציה | מדווח | גלוי |`,
    `|---|---|---|`,
    ...s.collectionCountMismatch.map((c) => `| ${c.title} | ${c.reported} | ${c.visible} |`),
    ``,
    `## מה לא ניתן היה לייבא מהמקור`,
    ``,
    `- **כמויות מלאי** — המקור חושף רק זמין/לא זמין. כל הווריאציות יובאו במצב "ללא מעקב מלאי" עם הזמינות מהמקור. יש להזין כמויות בניהול כדי להפעיל מעקב.`,
    `- **משקל** — 0 גרם בכל המוצרים במקור.`,
    `- **ברקודים** — לא קיימים במקור.`,
    `- **רוב שדות ה-SKU** במקור מכילים שם תיאורי ולא מק"ט יצרן (למשל "משקף מעושן Arai Szr"). נשמרו כפי שהם.`,
    ``,
    `## עיבוד תיאורים`,
    ``,
    `התיאור המקורי נשמר במלואו ב-\`source_records.raw\`. בתיאור המוצג הוסרו: כפתור הוואטסאפ (בעמוד המוצר יש כפתור משלו), בלוק "📦 מידע נוסף" על משלוחים ושורת "לא בטוחים בהתאמה?" (שניהם מוצגים כעת בכל עמוד מוצר באופן אחיד), ואימוג'י דקורטיביים. שורת ה-⚡ הפכה לתיאור קצר, אלא אם היא חוזרת על עצמה ביותר מ-3 מוצרים.`,
    ``,
  );
  return lines.join("\n");
}
