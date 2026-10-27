/**
 * Search normalization shared by indexing (products.search_text) and querying.
 *
 * Customers type the same thing many ways: "ימאהה", "ימאה", "yamaha"; "אקס מקס",
 * "xmax", "x-max". We fold every spelling to one canonical token, so a query
 * matches regardless of language or transliteration. Typos are handled
 * separately by pg_trgm similarity.
 *
 * To add a synonym: add the spellings to SYNONYM_GROUPS. The first entry is canonical.
 */
export const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["yamaha", "ימאהה", "ימאה", "ימהה", "יאמהה"],
  ["sym", "סאן יאנג", "סאניאנג", "סים"],
  ["kymco", "קימקו"],
  ["honda", "הונדה"],
  ["kawasaki", "קוואסאקי", "קאוואסאקי"],
  ["ktm", "קיי טי אם"],
  ["arai", "אראי"],
  ["motul", "מוטול"],
  ["xmax", "אקס מקס", "אקסמקס", "x max", "x-max", "איקס מקס"],
  ["tmax", "טימקס", "טי מקס", "t max", "t-max"],
  ["nmax", "אנמקס", "אן מקס", "n max", "n-max"],
  ["joyride", "ג'וייריד", "גוייריד", "ג׳וייריד", "גויריד", "ג'ויריד", "ג׳ויריד"],
  ["joymax", "ג'ויימקס", "גויימקס", "ג׳ויימקס", "ג׳וימקס", "ג'וימקס", "jm"],
  ["jet14", "ג'ט 14", "גט 14", "ג׳ט 14", "jet 14"],
  ["downtown", "דאונטאון", "דאון טאון"],
  ["movie", "מובי"],
  ["mt07", "mt-07", "mt 07", "אמ טי 07"],
  ["szr", "szr-vas", "sz-r", "szr vas"],
  ["rx7", "rx-7", "rx7v", "rx7-v"],
  ["ramx", "ram x", "ram-x"],
  ["משקף", "ויזור", "visor"],
  ["מצבר", "battery", "סוללה"],
  ["קסדה", "helmet", "קסדות"],
  ["דיסק", "disc", "דיסקים", "רוטור"],
  ["פילטר", "מסנן", "filter"],
  ["שמן", "oil", "שמנים"],
  ["סטרטר", "starter", "מתנע"],
  ["רצועה", "belt", "רצועות"],
  ["קיט טיפול", "טיפול גדול", "service kit"],
];

const canonicalMap: [RegExp, string][] = SYNONYM_GROUPS.flatMap(([canonical, ...rest]) =>
  [canonical!, ...rest]
    .sort((a, b) => b.length - a.length)
    .map((s) => {
      const folded = fold(s);
      // Hebrew words take one-letter prefixes (ל/ב/ה/ו/מ/ש/כ): "לטימקס" → "tmax".
      const prefix = /^\p{Script=Hebrew}/u.test(folded) ? "(?:[והבכלמש]{1,2})?" : "";
      return [new RegExp(`(^|[^\\p{L}\\p{N}])${prefix}${escape(folded)}(?=$|[^\\p{L}\\p{N}])`, "gu"), `$1${canonical}`] as [RegExp, string];
    }),
);

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lower-case, strip niqqud/geresh/punctuation, unify whitespace. */
export function fold(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/[׳״`"]/g, "'")
    .replace(/[‎‏]/g, "")
    .replace(/[^\p{L}\p{N}'\s\-\/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fold + replace every known spelling with its canonical token. */
export function normalizeForSearch(input: string): string {
  let text = ` ${fold(input)} `;
  for (const [re, rep] of canonicalMap) text = text.replace(re, rep);
  // Hebrew final letters → regular forms so "מסנן"/"מסננ" etc. match while typing.
  text = text.replace(/ך/g, "כ").replace(/ם/g, "מ").replace(/ן/g, "נ").replace(/ף/g, "פ").replace(/ץ/g, "צ");
  return text.replace(/['\-\/]/g, " ").replace(/\s+/g, " ").trim();
}
