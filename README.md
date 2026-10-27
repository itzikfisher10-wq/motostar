# MotoStar — חנות אונליין עצמאית

חנות חלקי חילוף, אביזרים וציוד רכיבה לאופנועים — Next.js + PostgreSQL, עם ממשק ניהול, קופה, מערכת הזמנות, יבוא קטלוג מהחנות הישנה ו-SEO טכני מלא. אין תלות ב-Shopify או בפלטפורמה חיצונית: כל הקוד והנתונים בבעלותכם.

> **מצב נוכחי:** הקופה עובדת במצב בדיקה (ספק סליקה מדומה). כדי לגבות כסף אמיתי צריך לחבר PayPlus — ראו [docs/payments.md](docs/payments.md) ואת [רשימת ההגדרות החסרות](docs/production-checklist.md).

## הפעלה מקומית (10 דקות)

דרישות: Node.js 20.9 ומעלה, PostgreSQL 15 ומעלה.

```bash
npm install
cp .env.example .env.local          # ולמלא DATABASE_URL ו-APP_SECRET
createdb motostar                   # או דרך כלי הניהול של Postgres
npm run db:migrate                  # יצירת הטבלאות
npm run catalog:import              # יבוא 79 רשומות המקור → 71 מוצרים
npm run db:seed                     # שיטות משלוח בסיסיות
npm run admin:create -- --email you@example.com --name "השם שלך" --role OWNER
npm run dev                         # http://localhost:3000  ·  ניהול: /admin
```

## פקודות

| פקודה | מה היא עושה |
|---|---|
| `npm run dev` | שרת פיתוח |
| `npm run build` / `npm start` | בנייה והרצה ל-Production |
| `npm run typecheck` · `npm run lint` | בדיקת טיפוסים ו-ESLint |
| `npm test` | בדיקות יחידה ואינטגרציה (Vitest, מול מסד בדיקות נפרד) |
| `npm run test:e2e` | בדיקות קצה-לקצה (Playwright: רכישה, ניהול, SEO, נגישות, מובייל) |
| `npm run db:migrate` · `npm run db:generate` | הרצת מיגרציות · יצירת מיגרציה אחרי שינוי סכמה |
| `npm run db:seed` | נתוני בסיס (שיטות משלוח). לא דורס שינויים קיימים |
| `npm run catalog:import -- --dry-run` | ניתוח הקטלוג ודוח, בלי לכתוב למסד |
| `npm run catalog:import` | יבוא (מוצרים קיימים מדולגים — בטוח להריץ שוב) |
| `npm run catalog:validate` | בדיקת תקינות הקטלוג במסד |
| `npm run catalog:mirror-images` | העתקת תמונות המוצרים מ-Shopify לאתר (חובה לפני העלייה לאוויר) |
| `npm run admin:create` | יצירת משתמש ניהול / איפוס סיסמה |
| `npm run fonts:build` | בניית קובצי הפונטים מחדש (אחרי עדכון חבילת פונט) |

## מבנה הפרויקט בקצרה

```
src/
  app/(store)/      עמודי החנות (דף בית, קטגוריות, מוצר, סל, קופה, הזמנה)
  app/(admin)/      ממשק הניהול (/admin)
  app/api/          סל, הצעות חיפוש, Webhook של ספק הסליקה
  components/       רכיבי תצוגה (ui, layout, product, cart, checkout, home, admin…)
  features/         לוגיקה עסקית לפי תחום (catalog, cart, checkout, orders, auth, admin…)
  lib/              תשתית (db, payments, email, storage, security, seo, media)
  content/          טקסטים ותוכן שנערכים בקוד (עמודי מידע, אזור Arai)
  config/           פרטי העסק ומשתני סביבה
  styles/           צבעים, טיפוגרפיה, פונטים
scripts/            יבוא קטלוג, מיגרציות, יצירת מנהל, פונטים
data/source/        הקטלוג המקורי שנלכד מהחנות הישנה (מקור אמת ליבוא)
reports/            דוח היבוא (כפילויות, איחודים, פריטים לבדיקה)
tests/              unit · integration · e2e
docs/               תיעוד
```

## תיעוד

| מסמך | למי | תוכן |
|---|---|---|
| [docs/architecture.md](docs/architecture.md) | מפתחים | טכנולוגיות, החלטות, תפקיד כל תיקייה, זרימת נתונים |
| [docs/editing-guide.md](docs/editing-guide.md) | מפתחים | איפה משנים: דף בית, אנימציות, צבעים ופונטים, Header/Footer, טקסטים |
| [docs/admin-guide.md](docs/admin-guide.md) | בעל העסק | ניהול מוצרים, קטגוריות, הזמנות, משלוחים, תוכן, משתמשים |
| [docs/catalog-migration.md](docs/catalog-migration.md) | שניהם | איך הקטלוג הועבר, חוקי איחוד, פריטים לבדיקה |
| [docs/payments.md](docs/payments.md) | שניהם | חיבור PayPlus, אבטחת תשלומים, החלפת ספק |
| [docs/deployment.md](docs/deployment.md) | מפתחים | העלאה ל-Production, גיבויים, מעבר דומיין |
| [docs/seo.md](docs/seo.md) | שניהם | מה מיושם, הפניות 301, Search Console |
| [docs/security.md](docs/security.md) | מפתחים | אמצעי אבטחה, מדיניות גיבוי ושחזור |
| [docs/testing.md](docs/testing.md) | מפתחים | הרצת הבדיקות ומה הן מכסות |
| [docs/performance.md](docs/performance.md) | מפתחים | תוצאות Lighthouse שנמדדו בפועל |
| [docs/production-checklist.md](docs/production-checklist.md) | בעל העסק | **מה חסר לפני העלייה לאוויר** |
