/**
 * Vehicle compatibility, extracted by hand from each product's own title and
 * description. Every entry quotes its evidence. All imported fitments are
 * SELLER_STATED: the store wrote them, nobody has verified a part number.
 * The owner can mark a fitment VERIFIED from the admin after checking.
 *
 * Products not listed here have no stated vehicle (e.g. batteries, alarm, seat cover).
 */
export type FitmentDef = {
  make: string;
  models: string[];
  yearFrom?: number;
  yearTo?: number;
  evidence: string;
  note?: string;
};

const JOYRIDE_ALL = ["joyride-125s", "joyride-125-evo", "joyride-200s", "joyride-200-evo"];

export const FITMENTS: Record<number, FitmentDef[]> = {
  8627399000118: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8627358564406: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8548948738102: [{ make: "yamaha", models: ["xmax-300"], evidence: "מתאימה לדגם Xmax 300" }],
  8569309265974: [{ make: "yamaha", models: ["mt-07", "tracer-700", "tenere-700"], evidence: "מתאים לדגמים: Yamaha MT-07, Tracer 700, Tenere 700" }],
  8549352439862: [{ make: "yamaha", models: ["tmax-530", "tmax-560"], evidence: "מתאים לדגמי טימקס 530/560" }],
  8549182636086: [{ make: "sym", models: ["joymax-250", "joymax-300"], evidence: "מתאים לדגמי סאן יאנג ג׳ויימקס 250/300" }],
  8388605214774: [{ make: "sym", models: ["joymax-250", "joymax-300", "cruisym-300"], evidence: "התאמה לדגמים: SYM JM250 / JM300 / CRUISYM300" }],
  8388684709942: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה לדגם: Yamaha Xmax 300" }],
  8388654530614: [{ make: "yamaha", models: ["nmax-125", "nmax-155"], evidence: "התאמה לדגם: Yamaha Nmax 125 / 155" }],
  8388606722102: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה לדגם: Yamaha Xmax 300" }],
  8385430618166: [{ make: "sym", models: ["jet-14"], evidence: "התאמה מדויקת לג'ט 14" }],
  8328851980342: [{ make: "yamaha", models: ["tmax-530", "tmax-560"], yearFrom: 2017, yearTo: 2021, evidence: "מראות חליפיים לימאהה טימקס 530/560 · מתאים לשנתונים 2017-2021" }],
  8327395967030: [{ make: "sym", models: ["joyride-125s", "joyride-200s", "joyride-200-evo"], evidence: "מתאים לסוגי Sym Joyride 125s/200s/200evo" }],
  8309384871990: [{ make: "yamaha", models: ["tmax-560"], yearFrom: 2022, yearTo: 2026, evidence: "התאמה מדויקת לשנת 2022-2026 בלבד" }],
  8279555571766: [{ make: "sym", models: JOYRIDE_ALL, yearFrom: 2010, yearTo: 2026, evidence: "תואם לכל סוגי Sym Joyride 125/200 · מתאים לשנים 2010-2026" }],
  8258907373622: [{ make: "yamaha", models: ["xmax-300"], yearFrom: 2017, yearTo: 2026, evidence: "ל-Yamaha Xmax 300 · מתאים לשנים 2017-2026" }],
  8258907013174: [{ make: "yamaha", models: ["xmax-300"], yearFrom: 2017, yearTo: 2026, evidence: "ל-Yamaha Xmax 300 · מתאים לשנים 2017-2026" }],
  8213565964342: [{ make: "yamaha", models: ["xmax-125", "xmax-300"], evidence: "פילטר שמן מקורי לימאהה Xmax 125/300" }],
  8213563605046: [{ make: "kymco", models: ["movie-s"], evidence: "קיט טיפול גדול לקטנוע Movie S" }],
  8309384380470: [{ make: "yamaha", models: ["tmax-530", "tmax-560"], yearFrom: 2017, yearTo: 2021, evidence: "ל-Yamaha Tmax 530/560 · התאמה מדויקת לשנת 2017-2021" }],
  8309383266358: [{ make: "yamaha", models: ["xmax-125", "xmax-300"], yearFrom: 2017, yearTo: 2026, evidence: "התאמה מדויקת Yamaha Xmax 125/300 · מתאים משנת 2017-2026" }],
  8309378908214: [{ make: "yamaha", models: ["xmax-125", "xmax-300"], yearFrom: 2017, yearTo: 2021, evidence: "ל-Yamaha Xmax 125/300 · מתאים לשנת 2017-2021 בלבד" }],
  8308867563574: [{ make: "sym", models: JOYRIDE_ALL, evidence: "התאמה מדויקת לדגם Sym Joyride", note: "המוכר לא ציין גרסה (125/200, S/EVO) — לבדוק לפני אישור" }],
  8279556554806: [{ make: "kymco", models: ["movie-s"], evidence: "התאמה מדויקת לדגם Kymco Movie S" }],
  8279555178550: [{ make: "sym", models: ["joyride-125s", "joyride-200s"], evidence: "התאמה מדויקת לדגם Joyride S", note: "המוכר כתב \"Joyride S\" ללא נפח" }],
  8216748294198: [{ make: "sym", models: JOYRIDE_ALL, evidence: "התאמה מדויקת לדגמי Joyride 125/200" }],
  8226932981814: [{ make: "sym", models: ["joyride-200-evo"], evidence: "התאמה מדויקת לדגם Joyride 200 Evo" }],
  8226932883510: [{ make: "sym", models: ["joyride-125-evo"], evidence: "התאמה מדויקת לדגם Joyride 125 Evo" }],
  8226932785206: [{ make: "sym", models: ["joyride-125s"], evidence: "התאמה מדויקת לדגם Joyride 125S" }],
  8226932654134: [{ make: "sym", models: ["joyride-200s"], evidence: "התאמה מדויקת לדגם Joyride 200S" }],
  8226932391990: [{ make: "sym", models: ["joyride-200s"], evidence: "התאמה מדויקת לדגם Joyride 200S" }],
  8226931245110: [{ make: "sym", models: ["joyride-125s"], evidence: "התאמה מדויקת לדגם Joyride 125 S" }],
  8226928558134: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226414526518: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226412757046: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226410168374: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226389622838: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226244624438: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226243051574: [{ make: "yamaha", models: ["xmax-300"], evidence: "התאמה מדויקת לדגם Xmax 300" }],
  8226242330678: [{ make: "kymco", models: ["downtown-250", "downtown-350"], evidence: "מתאים ל-Kymco Downtown 250-350" }],
  8216757731382: [{ make: "sym", models: JOYRIDE_ALL, evidence: "התאמה מדויקת לדגמי Joyride 125/200" }],
};

/**
 * Arai spare parts fit helmet models, not vehicles. Stored as a product spec
 * ("מתאים לקסדה") so it shows on the product page and is searchable.
 */
export const HELMET_COMPATIBILITY: Record<number, string> = {
  8482877964342: "Arai SZ-R VAS",
  8213614723126: "Arai SZ-R VAS",
  8213594308662: "Arai SZ-R VAS",
  8186420625462: "Arai SZ-R VAS",
  8186366165046: "Arai SZ-R VAS",
  8186319110198: "Arai RX-7V / Quantic",
  8213769945142: "Arai SZ-R VAS",
  8213947744310: "Arai SZ-R VAS",
  8213588213814: "Arai SZ-R VAS (3/4)",
  8213765226550: "Arai RX-7V (דגם חדש)",
  8213764669494: "Arai RX-7 (דגם ישן)",
  8213763883062: "Arai RAM-X",
  8213762113590: "Arai SZ-R VAS",
  8186424819766: "Arai SZ-R VAS",
};
