/**
 * New category tree (spec §8) and how each original Shopify collection maps into it.
 * Vehicle-brand collections (yamaha, sym…) are NOT categories: they feed vehicle
 * fitment hints instead. The "מבצע" collection is derived from compare-at prices.
 */
export type CategoryDef = { slug: string; name: string; description?: string; children?: CategoryDef[] };

export const CATEGORY_TREE: CategoryDef[] = [
  {
    slug: "rider-gear",
    name: "ציוד לרוכב",
    description: "חלפים ואביזרים לקסדות, כפפות ומשקפי אבק.",
    children: [
      { slug: "helmets-accessories", name: "קסדות ואביזרים", description: "חלפים מקוריים לקסדות Arai: משקפים, מנגנוני משקף, ריפודים, ספוילרים וכונסי אוויר." },
      { slug: "gloves", name: "כפפות" },
      { slug: "goggles", name: "משקפי אבק" },
    ],
  },
  {
    slug: "replacement-parts",
    name: "חלקי חילוף",
    description: "חלקים מקוריים וחליפיים לאופנועים וקטנועים.",
    children: [
      { slug: "batteries", name: "מצברים" },
      { slug: "brakes", name: "בלמים ודיסקים" },
      { slug: "electrical-lighting", name: "חשמל ותאורה", description: "מערכות חשמל ותאורה לאופנועים וקטנועים." },
      { slug: "service-kits", name: "קיטים לטיפול", description: "קיטים לטיפול גדול לאופנועים וקטנועים." },
      { slug: "engine", name: "חלקי מנוע" },
      { slug: "filters", name: "פילטרים", description: "כל סוגי הפילטרים לאופנוע ולקטנוע." },
      { slug: "chains-sprockets", name: "שרשראות וגלגלי שיניים" },
      { slug: "belts", name: "רצועות", description: "רצועות וריאטור לקטנועים." },
      { slug: "starters", name: "סטרטרים", description: "סטרטרים לאופנועים וקטנועים." },
      { slug: "used-parts", name: "חלקים משומשים" },
    ],
  },
  {
    slug: "accessories",
    name: "תוספות ואביזרים",
    description: "כל התוספות והאביזרים לאופנוע.",
    children: [
      { slug: "bodywork", name: "פלסטיקה וחלקי גוף", description: "קיטים פלסטיקה לאופנועים וקטנועים." },
      { slug: "backrests-racks", name: "משענות וסבלים" },
      { slug: "cases", name: "ארגזים" },
      { slug: "windshields", name: "מגני רוח" },
      { slug: "mirrors", name: "מראות" },
      { slug: "exhaust-guards", name: "מגני אגזוז" },
      { slug: "handlebars", name: "ידיות" },
    ],
  },
  {
    slug: "oils-care",
    name: "שמנים וחומרי עזר",
    description: "שמנים, נוזלים וחומרי ניקוי לתחזוקה שוטפת של האופנוע.",
    children: [
      { slug: "engine-oils", name: "שמני מנוע", description: "כל סוגי השמנים לאופנועים וקטנועים." },
      { slug: "coolant", name: "נוזלי קירור" },
      { slug: "care-products", name: "חומרי עזר" },
    ],
  },
  {
    slug: "tires",
    name: "צמיגים",
    children: [
      { slug: "road-tires", name: "צמיגי כביש" },
      { slug: "offroad-tires", name: "צמיגי שטח" },
    ],
  },
];

/** Shopify collection handle → new category slug. */
export const COLLECTION_TO_CATEGORY: Record<string, string> = {
  "קסדות-ואביזרים": "helmets-accessories",
  "copy-קסדות": "gloves",
  "copy-מגני-גוף": "goggles",
  "מצבר-btx14-1": "batteries",
  "מערכת-בלמים": "brakes",
  "חשמל-ותאורה": "electrical-lighting",
  "קיטים-לטיפול": "service-kits",
  "copy-אופנועי-שטח-1": "engine",
  "copy-תרסיסים-וחומרי-ניקוי": "filters",
  "שרשראות-וגלגשים": "chains-sprockets",
  "רצועות": "belts",
  "סטרטרים-1": "starters",
  "copy-פלסטיקה-וחלקי-גוף": "used-parts",
  "תוספות-ואביזרים": "accessories",
  "copy-שרשראות": "bodywork",
  "copy-ארגזים": "backrests-racks",
  "copy-מצברים-1": "cases",
  "מגני-רוח": "windshields",
  "copy-מגנים": "mirrors",
  "מגני-אגזוז": "exhaust-guards",
  "copy-פילטרים": "handlebars",
  "שמני-מנוע": "engine-oils",
  "נוזל-קירור": "coolant",
  "שמנים-וחומרי-ניקוי": "care-products",
  "copy-חליפות-גשם": "road-tires",
  "copy-צמיגי-כביש": "offroad-tires",
};

/** Collections that are not categories. */
export const NON_CATEGORY_COLLECTIONS = new Set(["can-am", "honda", "kawasaki", "ktm", "kymco", "polaris", "sym", "yamaha", "מבצע"]);

/** Where the original collection URL should redirect. */
export const COLLECTION_REDIRECTS: Record<string, string> = {
  all: "/products",
  "מבצע": "/deals",
  sym: "/vehicles/sym",
  yamaha: "/vehicles/yamaha",
  kymco: "/vehicles/kymco",
  honda: "/vehicles/honda",
  kawasaki: "/vehicles/kawasaki",
  ktm: "/vehicles/ktm",
  "can-am": "/vehicles/can-am",
  polaris: "/vehicles/polaris",
};

export const PAGE_REDIRECTS: Record<string, string> = {
  "אודותינו": "/about",
  "צור-קשר": "/contact",
  "תנאי-שימוש": "/info/terms",
  "מדריך-קנייה": "/info/buying-guide",
  "משלוחים-והחזרות": "/info/shipping",
  "הצהרת-נגישות": "/info/accessibility",
  "הצהרת-פרטיות": "/info/privacy",
  "בלוג": "/",
};

/**
 * Per-product category corrections, with the reason. Applied after collection mapping.
 * Kept small and explicit so every deviation from the source is reviewable.
 */
export const CATEGORY_OVERRIDES: Record<number, { remove?: string[]; add?: string[]; reason: string }> = {
  // Centrifugal clutch shoes were listed under "brakes" in the source store.
  8388605214774: { remove: ["brakes"], reason: "סנדלי סחיבה הם חלק ממערכת ההנעה (קלאץ׳), לא מערכת בלמים" },
  8388684709942: { remove: ["brakes"], reason: "סנדלי סחיבה הם חלק ממערכת ההנעה (קלאץ׳), לא מערכת בלמים" },
  // Front-fork oil seal had no category in the source (only the Yamaha brand collection).
  8226410168374: { add: ["replacement-parts"], reason: "למוצר לא הוגדרה קטגוריה במקור; שויך לחלקי חילוף כללי" },
};
