/**
 * Manually confirmed merge decisions. The importer also *detects* candidates
 * automatically (see lib/dedupe.ts) and lists them in the report, but it only
 * merges what is declared here. Never merge on name alone.
 */

/** Separate source listings that are the same product in different colors → one product with a color option. */
export type VariantMergeGroup = {
  key: string;
  title: string;
  optionName: string;
  /** Source product id → option value. Value comes from the source description ("צבע: …") or SKU. */
  members: { sourceId: number; value: string; evidence: string }[];
  reason: string;
};

export const VARIANT_MERGE_GROUPS: VariantMergeGroup[] = [
  {
    key: "arai-szr-vas-outer-visor-mechanism",
    title: "מנגנון משקף חיצוני לקסדת Arai 3/4 SZ-R VAS",
    optionName: "צבע",
    reason: "שם זהה, תיאור זהה, מחיר זהה (200 ₪ / 250 ₪), אותו דגם קסדה — ההבדל היחיד הוא צבע.",
    members: [
      { sourceId: 8213588213814, value: "לבן פנינה", evidence: "תיאור: \"צבע לבן פנינה\"; SKU: \"…Szr לבן\"" },
      { sourceId: 8213590966326, value: "לבן פנינה מט", evidence: "תיאור: \"צבע: לבן פנינה מט\"" },
      { sourceId: 8213591425078, value: "כסוף מט", evidence: "תיאור: \"צבע: כסוף מט\"" },
      { sourceId: 8213591752758, value: "שחור פנינה מבריק", evidence: "תיאור: \"צבע: שחור פנינה מבריק\"" },
      { sourceId: 8186412826678, value: "שחור מט", evidence: "כותרת ותיאור: \"שחור מט\"" },
      { sourceId: 8213593882678, value: "אפור ירוק", evidence: "תיאור: \"צבע: אפור ירוק\"" },
    ],
  },
  {
    key: "arai-ram-x-outer-visor-mechanism",
    title: "מנגנון משקף חיצוני לקסדת Arai RAM-X",
    optionName: "צבע",
    reason: "שם זהה, מחיר זהה (199.90 ₪), אותו דגם קסדה — ההבדל היחיד הוא צבע.",
    members: [
      { sourceId: 8213763883062, value: "כסוף", evidence: "תיאור: \"צבע: כסוף\"" },
      { sourceId: 8213762834486, value: "לבן פנינה", evidence: "תיאור: \"צבע: לבן פנינה\"" },
    ],
  },
  {
    key: "arai-szr-vas-front-vent",
    title: "כונס אוויר קדמי לקסדת Arai SZ-R VAS",
    optionName: "צבע",
    reason: "שם זהה, מחיר זהה (150 ₪), אותו דגם קסדה — ההבדל היחיד הוא גימור הצבע.",
    members: [
      { sourceId: 8213762113590, value: "שחור מט", evidence: "תיאור: \"צבע: שחור מט\"" },
      { sourceId: 8213697364022, value: "שחור מבריק", evidence: "תיאור: \"צבע: שחור מבריק\"" },
    ],
  },
];

/** Exact duplicate listings → one product. The duplicate's images are kept on the canonical product. */
export type DuplicateDecision = { canonicalId: number; duplicateId: number; reason: string; confirmNote: string };

export const DUPLICATES: DuplicateDecision[] = [
  {
    canonicalId: 8223073665078,
    duplicateId: 8223074582582,
    reason: "כותרת, SKU, תיאור ומחיר זהים לחלוטין (מצבר BTX5L-BS, 500 ₪). רק התמונה שונה.",
    confirmNote: "לאשר מול המלאי שמדובר באותו מצבר (ולא שני ספקים שונים).",
  },
];
