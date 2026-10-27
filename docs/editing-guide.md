# מדריך עריכת קוד — איפה משנים מה

## עמוד הבית
- **סדר האזורים:** `src/app/(store)/page.tsx`. כל אזור הוא רכיב אחד; מוחקים, מוסיפים או מזיזים שורה.
- **האזורים:** `src/components/home/`

| רכיב | מה הוא מציג |
|---|---|
| `helmet3d/HelmetHero.tsx` | הפתיח הראשי: כותרת h1, טקסט, כפתורים וקסדת התלת-ממד |
| `AraiExperience.tsx` | פתיח Arai וסיור החלקים הנעוץ (pinned) |
| `AraiRail.tsx` | פס כל חלפי Arai |
| `VehicleBand.tsx` | "מה הכלי שלך?" — בחירת יצרן ודגם |
| `CategoryIndex.tsx` | רשימת הקטגוריות |
| `ProductRail.tsx` | פס מוצרים כללי (משמש למבצעים) |
| `WorkshopStrip.tsx` | "מוסכניקים שפתחו חנות" |

## פתיח הבית וקסדת התלת-ממד
- **טקסטים:** `src/content/home.ts`. בטקסט הגוף, `{count}` ו-`{makes}` מתמלאים מהקטלוג (מספר המוצרים והיצרנים שיש להם מוצרים), כך שהם תמיד נכונים.
- **הקסדה:** `src/components/home/helmet3d/scene.ts` (three.js). זו קסדה גנרית שבנינו בקוד, **איור של MotoStar ולא דגם של יצרן כלשהו**. מתחתיה מוצג "להמחשה בלבד". אין לקשר אותה למוצר או להציג אותה כפריט במלאי.
- **תנועה:** כניסה (עלייה וסיבוב), סיבוב ופתיחת המשקף עם הגלילה (האזור נעוץ ב-CSS sticky), הטיה קלה לפי העכבר בדסקטופ, וריחוף קצר. הקבועים נמצאים בפונקציה `pose()`.
- **ביצועים:** three.js נטען רק אחרי שהדף נצבע וכשהדפדפן פנוי. הציור נעשה רק כשמשהו זז ונעצר כשהאזור מחוץ למסך. בטלפון יש פחות פוליגונים ו-30 פריימים לשנייה.
- **בלי תלת-ממד:** בדפדפן בלי WebGL, או עם רינדור תוכנה (בלי כרטיס גרפי), מוצגת תמונת סטילס של אותה קסדה: `public/images/hero-helmet.webp`. בהפחתת תנועה, הקסדה עומדת במקום.
- **בדיקה בדפדפן headless** (שאין לו כרטיס גרפי): מוסיפים `?3d=force` לכתובת.
- **החלפה בדגם אמיתי:** אם יתקבל מודל GLB מורשה ומדויק, אפשר לטעון אותו ב-`scene.ts` (`GLTFLoader`) במקום `buildHelmet`.

## אזור Arai
- **טקסטים ומוצרים:** `src/content/arai.ts` — כותרת הפתיח, ארבע תחנות הסיור (משקף, כונסי אוויר, מנגנון, ריפודים) ורשימת המוצרים של כל תחנה לפי slug. מוצר שנמחק או הועבר לארכיון מוסתר אוטומטית.
- **כותרת וטקסט הפתיח** ניתנים לעריכה גם בממשק הניהול → "תוכן האתר" (גובר על הקובץ).
- **מדיה:** ברירת המחדל היא תמונת מוצר אמיתית מהקטלוג. כשיהיה חומר מורשה מ-Arai:
  - **תמונה:** `media: { type: "image", src: "/media/arai/hero.webp", … }`
  - **סרטון:** `media: { type: "video", src: "/media/arai/hero.mp4", poster: "…" }`
  - **סיבוב 360° עם הגלילה:** שמים פריימים ב-`public/media/arai/turntable/0001.webp…0072.webp` ומגדירים `media: { type: "sequence", pathPattern: "/media/arai/turntable/{frame}.webp", frameCount: 72, … }`
  - השתמשו רק בצילום אמיתי של הדגם הנמכר. אין להציג קסדה להמחשה כאילו היא במלאי.

## אנימציות
| מה | איפה |
|---|---|
| קסדת התלת-ממד (כניסה, גלילה, עכבר) | `src/components/home/helmet3d/scene.ts` → `pose()` |
| כניסת פתיח Arai (Animation 01) | `@keyframes hero-settle`, `visor-in`, `visor-sheen` ב-`src/styles/globals.css` |
| הרמת הקסדה בגלילה (02) וסיור החלקים הנעוץ (03–04) | `src/components/home/AraiExperience.tsx` — הקבועים `TOUR_SCROLL_PER_STOP` ו-`HERO_LIFT` בראש הקובץ |
| ריחוף כרטיס מוצר (05) | `src/components/product/ProductCard.tsx` |
| מגירת סל / תפריט | `--animate-drawer-in`, `--animate-fade-in` ב-`globals.css` |

**כללים:** כל אנימציה מכבדת `prefers-reduced-motion` (תנאי `motion-safe:` או בדיקה ב-JS). הכותרת הראשית של הדף לעולם לא מתחילה שקופה — היא ה-LCP. במובייל ובהעדפת הפחתת תנועה, הסיור מוצג כרצף אנכי פשוט.

## צבעים, פונטים ומרווחים
- **צבעים:** בלוק `@theme` ב-`src/styles/globals.css`. כל הרכיבים משתמשים בשמות (`ink`, `graphite`, `paper`, `mist`, `signal`…), כך ששינוי ערך מחליף אותו בכל האתר.
  - `signal` — אדום המותג. לטקסט אדום על רקע בהיר משתמשים ב-`signal-deep`, ועל רקע שחור ב-`signal-bright` (שומר על ניגודיות 4.5:1).
- **פונטים:** `src/styles/fonts.ts` (משפחות ומשקלים) ו-`--font-display` / `--font-sans` ב-`globals.css`. קובצי הפונט נבנים ב-`npm run fonts:build`.
- **גדלי כותרות:** `--text-display-*` ב-`globals.css`.

## Header, Footer ופרטי העסק
- **פרטי העסק** (טלפון, כתובת, שעות, וואטסאפ, אינסטגרם): `src/config/site.ts` — המקום היחיד. משמש גם ל-Footer, לעמוד צור קשר ול-JSON-LD.
- **Header:** `src/components/layout/Header.tsx` (קישורי התפריט הראשי), `CategoryMenu.tsx` (מגה-תפריט), `MobileNav.tsx` (טלפון).
- **פס ההודעה העליון:** בממשק הניהול → "תוכן האתר".
- **Footer:** `src/components/layout/Footer.tsx`.
- **לוגו:** `src/components/layout/Wordmark.tsx` (לוגו טיפוגרפי). להחלפה בקובץ לוגו רשמי — הוראות בראש הקובץ.

## עמודי מידע (משלוחים, תקנון, פרטיות, נגישות, אודות)
`src/content/pages.ts` — טקסטים בלבד. להוספת עמוד: מוסיפים רשומה ל-`PAGES` ולינק ב-Footer.

## מוצרים וקטגוריות
- **הוספת מוצר:** בממשק הניהול → מוצרים → "מוצר חדש" (ראו [admin-guide.md](admin-guide.md)). לא מוסיפים מוצרים בקוד.
- **הוספת קטגוריה:** בממשק הניהול → קטגוריות → "קטגוריה חדשה".
- **שיוך קטגוריות ביבוא:** `scripts/import-products/config/categories.ts` (רק אם מריצים יבוא מחדש).
- **מילים נרדפות לחיפוש** ("ימאהה" = yamaha, "טימקס" = tmax): `src/lib/text/search-normalize.ts` → `SYNONYM_GROUPS`. אחרי שינוי מריצים `npm run catalog:import -- --update-existing`, או שומרים כל מוצר בניהול כדי לבנות מחדש את אינדקס החיפוש.

## מערכת התשלומים
`src/lib/payments/` — ממשק אחיד (`types.ts`), מימוש PayPlus (`payplus.ts`) ו-mock לבדיקות. החלפת ספק: [payments.md](payments.md#החלפת-ספק-סליקה).

## משלוח
מחירים, סף משלוח חינם והפעלה — בממשק הניהול → "משלוחים". חישוב העלות: `src/features/checkout/shipping.ts`.

## מיילים
תבניות: `src/lib/email/templates.ts`. שליחה: `src/lib/email/index.ts` (Resend או רישום בלבד).

## הוספת עמוד ניהול
1. שאילתות: `src/features/admin/<תחום>/queries.ts` (עם `import "server-only"`).
2. פעולות: `src/features/admin/<תחום>/actions.ts` — `"use server"`, וכל פונקציה מתחילה ב-`await requireUser("<הרשאה>")`. בדיקה אוטומטית אוכפת זאת.
3. עמוד: `src/app/(admin)/admin/(panel)/<נתיב>/page.tsx`, ולינק במערך `NAV` ב-`(panel)/layout.tsx`.
