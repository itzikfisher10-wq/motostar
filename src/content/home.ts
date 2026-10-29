/**
 * Home page copy. Every factual line is checked against the store's own pages (about, contact,
 * shipping) or comes live from the catalog: {count}, {makes}, category counts, model names.
 * The slogan "הכל לאופנוע שלך" is the store's own. No invented numbers, years or reviews.
 * Visible text uses no em dashes. Docs: docs/editing-guide.md → "עמוד הבית", docs/home-brief.md
 */
export const homeHero = {
  badge: "החנות של הרוכבים · חולון",
  title: "הכל לאופנוע שלך.",
  /**
   * The red line under the title. The first phrase is the one search engines and screen readers
   * get; the rest rotate once on load (under five seconds, then it rests on the last one).
   */
  phrases: ["במקום אחד", "לפי הדגם שלך", "מקוריים וחליפיים", "עם ייעוץ ממוסכניק", "במקום אחד"],
  /** {count} and {makes} are filled from the catalog. */
  body: "חלקי חילוף, אביזרים וציוד רכיבה לאופנועים וקטנועים, מחנות של מוסכניקים בחולון. {count} מוצרים בקטלוג ל-{makes}, ומי שעונה לכם יודע בדיוק על איזה בורג אתם מדברים.",
  primaryCta: { label: "מצאו חלק לאופנוע שלכם", href: "/vehicles" },
  /** {count} is the live number of products on sale. */
  dealsCta: { label: "{count} מוצרים במבצע", href: "/deals" },
  whatsappCta: "דברו איתנו בוואטסאפ",
  araiCta: { label: "קסדות Arai", href: "/brands/arai" },
  /** Shown under the 3D helmet so it is never mistaken for a product. */
  illustrationNote: "הדמיית תלת-ממד, להמחשה בלבד",
};

/**
 * The statement read under the headlight beam (components/home/Manifesto.tsx).
 * Each string is one line; words light up in order. The last word is lit in signal red.
 */
export const manifesto = {
  title: "מי אנחנו",
  lines: [
    "התחלנו עם מפתח ביד, לא מאחורי דלפק.",
    "הניסיון שלנו בתיקון אופנועים, קטנועים וטרקטורונים לימד אותנו איזה חלק מחזיק ואיזה חוזר למוסך אחרי חודש.",
    "זה מה שנכנס למדף.",
    "וכשאתם שואלים אם הקיט מתאים לג׳וייריד שלכם, עונה לכם מוסכניק. לא מוקד.",
  ],
};

/** The shelf: a lateral pass across the real categories (components/home/ShelfPan.tsx). */
export const shelf = {
  title: "המדף",
  intro: "מצברים, קיטים לטיפול, חלקי מנוע, דיסקים, שמני מנוע ומשענות, מקוריים וחליפיים, עם מחיר ברור על כל אחד.",
  exampleLabel: "למשל",
  closingTitle: "חסר לכם חלק?",
  closingBody: "שלחו לנו יצרן, דגם ושנה בוואטסאפ, ונבדוק בשבילכם מה מתאים.",
  closingCta: "שליחת דגם בוואטסאפ",
  allCta: "לכל הקטגוריות",
};

/** Vehicle picker band. */
export const vehicleBand = {
  eyebrow: "בלי לנחש מק״טים",
  title: "מה הכלי שלך?",
  pick: "בחרו יצרן",
  all: "כל החלקים ל-{make}",
  body: "בחרו יצרן ודגם, ותראו רק חלקים שסומנו כמתאימים לו. בלי לנחש מק״טים ובלי לקנות פעמיים.",
};

/** Deals rail. */
export const deals = {
  eyebrow: "מבצעים",
  title: "מבצעים שרצים עכשיו",
  intro: "המחיר הרגיל ומחיר המבצע, אחד ליד השני, על כל מוצר.",
};

/** "Mechanics who opened a store". Facts from the original about page. */
export const workshop = {
  eyebrow: "מי אנחנו",
  title: "מוסכניקים שפתחו חנות",
  body: "Moto Star הוקמה על ידי אנשים שמתקנים ומתחזקים אופנועים, קטנועים וטרקטורונים. לכן כל מוצר שעולה למדף עובר קודם את העין של מי שמכיר את הכלי מבפנים. לא בטוחים שחלק מתאים? שלחו לנו את הדגם והשנה, ונבדוק לפני שאתם מזמינים.",
  cta: "בדיקת התאמה בוואטסאפ",
  more: "עוד עלינו",
};

/** Category accordion (components/home/CategoryAccordion.tsx). */
export const categoriesBlock = {
  eyebrow: "קטגוריות",
  title: "מה אתם מחפשים היום?",
  intro: "עברו עם העכבר או הקישו על קטגוריה כדי לפתוח אותה.",
  open: "לפתיחה",
  all: "לעמוד {name}",
};

/** Closing plate above the footer. */
export const closing = {
  title: "תגידו לנו מה אתם רוכבים. את השאר נמצא.",
  body: "יצרן, דגם ושנה בוואטסאפ, ומוסכניק יחזור אליכם עם מה שמתאים.",
  cta: "לוואטסאפ",
  phoneLabel: "או בטלפון",
};
