/**
 * Home page hero copy. Only verifiable statements: the slogan is the store's own
 * ("הכל לאופנוע שלך", from the original site), counts and makes come from the live catalog.
 * Docs: docs/editing-guide.md → "עמוד הבית"
 */
export const homeHero = {
  kicker: "חולון · חלקים, אביזרים וציוד רכיבה",
  title: "הכל לאופנוע שלך",
  /** {count} and {makes} are filled from the catalog. */
  body: "{count} מוצרים בקטלוג: חלקי חילוף ל-{makes}, אביזרים וחלפים מקוריים לקסדות Arai. ייעוץ טלפוני ממוסכניקים.",
  primaryCta: { label: "חלקים לאופנוע שלי", href: "/vehicles" },
  secondaryCta: { label: "כל הקטגוריות", href: "/categories" },
  /** Shown under the 3D helmet so it is never mistaken for a product. */
  illustrationNote: "הדמיית תלת-ממד של MotoStar, להמחשה בלבד",
};
