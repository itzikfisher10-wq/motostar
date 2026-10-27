/**
 * Business details shown across the site (header, footer, contact page, JSON-LD).
 * Source: motostar.co.il contact & about pages (October 2026).
 * Edit here — no other file hardcodes these values.
 */
export const site = {
  name: "Moto Star",
  nameHe: "מוטו סטאר",
  legalName: "Moto Star",
  tagline: "חלקים, אביזרים וציוד רכיבה – ממוסכניקים שרוכבים",
  description:
    "חנות חלקי חילוף, אביזרים וציוד רכיבה לאופנועים וקטנועים בחולון. חלקים מקוריים וחליפיים ל-Yamaha, SYM, Kymco ועוד, וחלפים מקוריים לקסדות Arai.",
  locale: "he_IL",
  language: "he",
  currency: "ILS",
  phone: "054-2102111",
  phoneE164: "+972542102111",
  whatsapp: "972542102111",
  email: "motostarmail@gmail.com",
  instagram: "https://www.instagram.com/motostar.il",
  address: {
    street: "אליהו קראוזה 43",
    city: "חולון",
    country: "IL",
    countryName: "ישראל",
  },
  /**
   * Customer-service hours, as published on the original contact page.
   * NOTE: the original site showed two different schedules (header vs. contact page).
   * The contact-page version is used here — confirm with the owner.
   */
  hours: [
    { days: "ראשון–חמישי", open: "10:30", close: "19:00", schemaDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] },
    { days: "שישי", open: "12:00", close: "15:00", schemaDays: ["Friday"] },
  ],
  returnsDays: 14,
  /**
   * Payment methods shown to customers at checkout. List only what is ACTIVE on the
   * payment provider's page (e.g. add "Bit", "Apple Pay", "Google Pay" after enabling them in PayPlus).
   */
  paymentMethods: ["כרטיס אשראי"],
} as const;

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
