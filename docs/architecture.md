# ארכיטקטורה

## טכנולוגיות

| שכבה | בחירה | למה |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 | SSR/SSG/ISR לעמודים שצריך לאנדקס, Server Components ו-Server Actions |
| שפה | TypeScript (strict) | בטיחות טיפוסים מקצה לקצה |
| מסד נתונים | PostgreSQL | עסקאות (transactions), נעילות שורה, חיפוש fuzzy עם `pg_trgm` |
| ORM | **Drizzle** | ראו "למה לא Prisma" למטה |
| ולידציה | Zod 4 | כל קלט מהדפדפן נבדק בשרת |
| עיצוב | Tailwind CSS 4 | טוקנים במקום אחד (`src/styles/globals.css`) |
| אנימציה | GSAP + ScrollTrigger, CSS | גלילה קולנועית באזור Arai; מיקרו-אינטראקציות ב-CSS |
| פונטים | next/font/local (Heebo, ארבעה משקלים) | טעינה מוקדמת ו-fallback מותאם — בלי קפיצות טקסט |
| תשלומים | PayPlus (דף תשלום מאובטח) | ספק ישראלי; פרטי הכרטיס לא עוברים בשרת שלנו |
| אימייל | Resend (או מצב log) | תור `email_outbox` — אף מייל לא הולך לאיבוד אם הספק נופל |
| אחסון קבצים | דיסק מקומי או Vercel Blob | ממשק `StorageAdapter`, ניתן להחלפה |
| בדיקות | Vitest, Playwright, axe-core | יחידה, אינטגרציה מול Postgres אמיתי, E2E, נגישות |

### למה Drizzle ולא Prisma
הסכמה והמיגרציות נכתבו ב-Drizzle: SQL-first, בלי מנוע בינארי נפרד (קל יותר בסביבת serverless), טיפוסים מלאים, ושליטה מלאה בשאילתות כבדות (נעילות `FOR UPDATE`, `pg_trgm`). Prisma היה עובד גם כן, אבל מעבר היה כתיבה מחדש בלי תועלת ממשית.

### למה אין Three.js
אין מודל תלת-ממדי מורשה ומדויק של קסדות Arai. מודל "דומה" היה מציג פרטים לא נכונים של מוצר אמיתי. לכן אזור Arai בנוי מתמונות מוצר אמיתיות מהקטלוג, עם מקום מוכן לסרטון מורשה או לרצף תמונות 360° (ראו [editing-guide.md](editing-guide.md#אזור-arai)).

## תפקיד כל תיקייה

```
src/app/(store)/        עמודי החנות. כל עמוד: שליפת נתונים + metadata + הרכבת רכיבים.
src/app/(admin)/admin/  ממשק הניהול. login מחוץ ל-(panel); כל השאר בתוך (panel) עם תפריט צד.
src/app/api/            route handlers: /api/cart, /api/search/suggest, /api/payments/[provider]/webhook
src/app/uploads/        הגשת תמונות שהועלו בניהול (כש-STORAGE_PROVIDER=local)
src/app/sitemap.ts      Sitemap דינמי · robots.ts · icon.svg · opengraph-image.png

src/components/ui/        כפתור, מחיר, כמות, אייקונים — בלי לוגיקה עסקית
src/components/layout/    Header, Footer, תפריטים, לוגו
src/components/home/      רכיבי דף הבית (AraiExperience = אזור הדגל)
src/components/product/   כרטיס מוצר, קנייה, התאמה לאופנוע
src/components/cart/      ספק העגלה (context), מגירה, עמוד סל
src/components/checkout/  טופס הקופה
src/components/admin/     רכיבי ניהול (טפסים, טבלאות, עורכי מוצר)

src/features/catalog/     שאילתות קטלוג, זמינות, אינדקס חיפוש
src/features/cart/        עגלה בצד השרת (cookie חתום → cart id)
src/features/checkout/    יצירת הזמנה, משלוח, ולידציה
src/features/orders/      אישור תשלום, גישה להזמנה, סטטוסים
src/features/auth/        סשנים, הרשאות, guard
src/features/admin/*      פעולות ושאילתות של ממשק הניהול לפי תחום
src/features/content/     בלוקי תוכן שנערכים בניהול
src/features/search/      הצעות חיפוש

src/lib/db/               חיבור + סכמה (schema/*.ts)
src/lib/payments/         ממשק ספק סליקה + PayPlus + mock
src/lib/email/            תור מיילים ותבניות
src/lib/storage/          אחסון קבצים
src/lib/security/         חתימות, סיסמאות, rate limit, sanitize
src/lib/seo/              metadata ו-JSON-LD
src/lib/cache/            רענון עמודי החנות אחרי שינוי
src/hooks/                hooks משותפים בצד הלקוח
src/content/              טקסטים שנערכים בקוד (עמודי מידע, אזור Arai)
src/config/               פרטי העסק (site.ts), משתני סביבה (env.ts)
```

## זרימות מרכזיות

**קנייה.** הוספה לסל (Server Action) → העגלה נשמרת במסד, מזוהה ב-cookie חתום ל-90 יום → בקופה הכל מחושב מחדש בשרת: מחירים, זמינות, משלוח → נוצרת הזמנה `PENDING_PAYMENT` בעסקה אחת עם מפתח idempotency (לחיצה כפולה = אותה הזמנה) → הפניה לדף התשלום של הספק → ה-Webhook נבדק חתימה, ואז **השרת שואל את הספק ישירות** מה הסטטוס → ההזמנה מסומנת `PAID` רק אם הסכום והמטבע זהים בדיוק → המלאי יורד, העגלה מתרוקנת, נשלחים מיילים.

**גישה להזמנה בלי חשבון לקוח.** עמוד ההזמנה נפתח עם טוקן אקראי (רק ה-hash שלו נשמר) או קישור חתום עם תוקף (במייל).

**ניהול.** כל עמוד וכל Server Action קוראים ל-`requireUser(permission)`. סשן = טוקן אקראי ב-cookie (HttpOnly, SameSite=Strict); במסד נשמר רק SHA-256. בדיקה אוטומטית (`tests/unit/admin.test.ts`) נכשלת אם פעולת ניהול חדשה לא מתחילה בבדיקת הרשאה.

**מטמון (cache).** עמודי קטלוג נבנים סטטית ומתרעננים כל 5 דקות (ISR). שינוי בניהול או תשלום שמשנה מלאי מרענן מיד (`src/lib/cache/revalidate.ts`).

## מודל נתונים (עיקרי)

- `products` ← `product_variants` (מחיר באגורות, מלאי, SKU) ← `product_options` (צבע/מידה)
- `categories` (שתי רמות), `brands`, `product_categories`
- `vehicle_makes` ← `vehicle_models` ← `fitments` (התאמה: `VERIFIED` או `SELLER_STATED`)
- `carts`/`cart_items`, `orders`/`order_items` (צילום מצב — הזמנה לא משתנה כשהקטלוג משתנה), `order_status_history`, `payment_events`
- `users`/`sessions` (ניהול), `audit_log`, `email_outbox`, `content_blocks`, `rate_limits`
- `source_records` — כל רשומה מהחנות הישנה, לביקורת ויבוא חוזר בלי כפילויות
- `product_slug_history` — כתובות ישנות של מוצרים שהשם שלהם השתנה (הפניה 301 אוטומטית)

כל הסכומים נשמרים כמספרים שלמים באגורות (₪1 = 100), כדי למנוע שגיאות עיגול.
