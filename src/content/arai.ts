/**
 * Arai flagship section (home page) — copy defaults and configuration.
 * The hero kicker/title/body can also be edited in Admin → Site content (that wins over these defaults).
 * Docs: docs/editing-guide.md → "אזור Arai"
 *
 * Every product referenced here is a real spare part MotoStar sells. Prices,
 * images and availability are read live from the catalog by slug; a stop whose
 * products are all missing/archived is hidden automatically.
 */

export type AraiHeroMedia =
  /** Default: the hero is built from a real catalog product photo (transparent cut-out). */
  | { type: "product"; productSlug: string }
  /** A licensed still of a helmet, placed in /public/media/arai/. */
  | { type: "image"; src: string; alt: string; width: number; height: number }
  /** A licensed clip (MP4/WebM, muted, no audio track). Scrubbed by scroll on desktop. */
  | { type: "video"; src: string; poster: string; alt: string }
  /**
   * A licensed 360° turntable as numbered frames, e.g. /media/arai/turntable/0001.webp … 0072.webp.
   * Scroll rotates the helmet (Animation 02). Only use real photography of the actual model.
   */
  | { type: "sequence"; pathPattern: string; frameCount: number; width: number; height: number; alt: string };

export const araiHero = {
  /** Shown above the headline. */
  kicker: "חלפים מקוריים",
  title: "Arai, חלק אחרי חלק",
  body: "משקפים, מנגנוני משקף, ריפודים, ספוילרים וכונסי אוויר לדגמי SZ-R VAS, RX-7V ו-RAM-X. מקוריים, על המדף בחולון.",
  primaryCta: { label: "לכל חלפי Arai", href: "/brands/arai" },
  media: { type: "product", productSlug: "arai-szr-vas-משקף-שחור-כהה" } as AraiHeroMedia,
};

export type TourStop = {
  key: string;
  /** Part of the helmet being shown. */
  label: string;
  title: string;
  body: string;
  /** First slug supplies the large image; all listed products are linked. */
  productSlugs: string[];
};

export const araiTour: TourStop[] = [
  {
    key: "visor",
    label: "משקף",
    title: "ראות נקייה",
    body: "משקף שרוט או שחוק פוגע בראות, במיוחד מול שמש נמוכה ובנסיעת לילה. משקפים מקוריים כהים ומעושנים ל-SZ-R VAS ול-RX-7V.",
    productSlugs: ["arai-szr-vas-משקף-שחור-כהה", "arai-szr-vas-משקף-מעושן", "משקף-כהה-לקסדה-arai-rx7v-quantic"],
  },
  {
    key: "vents",
    label: "כונסי אוויר וספוילרים",
    title: "החלקים שנשברים ראשונים",
    body: "חלקי המעטפת החיצוניים נשברים בנפילה ונשחקים עם השנים. כונסי אוויר קדמיים, ספוילרים צדדיים וספוילר אחורי ל-SZ-R VAS, בשחור מט, שחור מבריק ובטון.",
    productSlugs: ["כונס-אוויר-קדמי-לקסדת-arai-sz-r-vas", "ספוילרים-arai-szr-vas", "ספוילר-אחורי-arai-szr-vas"],
  },
  {
    key: "mechanism",
    label: "מנגנון משקף",
    title: "משקף שנסגר עד הסוף",
    body: "כשהמשקף לא ננעל או משתחרר בנסיעה, המנגנון הוא החשוד הראשון. מנגנונים פנימיים וחיצוניים ל-SZ-R VAS, ל-RX-7 ול-RAM-X.",
    productSlugs: ["מנגנון-משקף-פנימי-לקסדה-arai-szr-vas", "מנגנון-משקף-חיצוני-לקסדת-arai-3-4-sz-r-vas", "מנגנון-משקף-פנימי-arai-rx7v", "מנגנון-משקף-חיצוני-לקסדת-arai-ram-x"],
  },
  {
    key: "padding",
    label: "ריפודים",
    title: "התאמה מדויקת לראש",
    body: "ריפוד שהתכווץ משנה את הישיבה של הקסדה על הראש. ריפודי לחיים ב-20 וב-25 מ״מ וריפוד ראש 7 מ״מ ל-SZ-R VAS.",
    productSlugs: ["ריפוד-arai-szr-vas-25mm", "ריפוד-arai-szr-vas-20mm", "ריפוד-ראש-arai-szr-vas-7mm"],
  },
];
