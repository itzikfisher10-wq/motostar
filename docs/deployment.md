# העלאה ל-Production

> **אין להעלות לאוויר בלי אישור בעל העסק**, ובלי לעבור על [production-checklist.md](production-checklist.md).

## אפשרות מומלצת: Vercel + PostgreSQL מנוהל
הגרסה הקודמת (motostar.vercel.app) כבר רצה על Vercel, כך שזה ההמשך הטבעי.

| רכיב | שירות מוצע | הערה |
|---|---|---|
| אתר | Vercel | Node.js 20+, אזור `fra1` (פרנקפורט, קרוב לישראל) |
| מסד נתונים | Neon / Supabase / כל Postgres מנוהל ≥15 | אותו אזור. להשתמש ב-connection string **עם pooler** (החיבור כבר מוגדר `prepare: false`) |
| תמונות שמועלות בניהול | Vercel Blob | `STORAGE_PROVIDER=vercel-blob` (הדיסק ב-Vercel לא נשמר) |
| מיילים | Resend | דומיין שולח מאומת (SPF/DKIM) |
| תשלומים | PayPlus | [payments.md](payments.md) |

### הדרך הקצרה (בלי טרמינל)
1. מחברים את המאגר ב-GitHub ל-Vercel (Import).
2. ב-Vercel → Storage: מוסיפים **Neon** (Postgres). זה מגדיר `DATABASE_URL` אוטומטית. מוסיפים גם **Blob**, שמגדיר `BLOB_READ_WRITE_TOKEN`.
3. ב-Settings → Environment Variables: `APP_SECRET`, `STORAGE_PROVIDER=vercel-blob`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12 תווים לפחות). לבדיקה בכתובת `*.vercel.app` מוסיפים גם `ALLOW_TEST_PAYMENTS=true`.
4. Deploy. הסקריפט `vercel-build` מריץ את `deploy:setup` לפני ה-build: מיגרציות, יבוא הקטלוג (מדלג על מה שקיים), נתוני בסיס, קישור התמונות ויצירת חשבון הבעלים. אפשר להריץ אותו שוב ושוב, והוא לא דורס שינויים שנעשו בניהול.
5. אחרי הכניסה הראשונה לניהול, מוחקים את `ADMIN_PASSWORD` מ-Vercel.

כש-`NEXT_PUBLIC_SITE_URL` לא מוגדר, האתר משתמש בכתובת ה-Production של Vercel. **בכתובת `*.vercel.app` האתר חסום לגוגל** (robots.txt חוסם הכל, ובכל עמוד יש noindex), כדי שלא ייווצר עותק כפול של החנות. במעבר הדומיין חובה להגדיר `NEXT_PUBLIC_SITE_URL=https://motostar.co.il` ולעשות Redeploy. רק אז האתר נפתח לאינדוקס.

### שלבים (ידני)
1. **מסד נתונים:** יוצרים מסד. המיגרציה `0000_extensions.sql` מפעילה את ההרחבה `pg_trgm` (חיפוש עם שגיאות הקלדה). בחלק מהשירותים צריך להפעיל אותה ידנית או לתת הרשאה.
2. **הכנת המסד** (ממחשב מקומי, מול כתובת ה-Production):
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   DATABASE_URL="postgres://…" npm run catalog:import
   DATABASE_URL="postgres://…" npm run db:seed
   DATABASE_URL="postgres://…" npm run admin:create -- --email owner@… --name "…" --role OWNER
   ```
3. **תמונות:** `npm run catalog:mirror-images`, ואז מבצעים commit לקבצים שנוצרו ב-`public/images/products/`. אחר כך מסירים את `cdn.shopify.com` מ-`next.config.ts` (CSP ו-`remotePatterns`).
4. **משתני סביבה ב-Vercel:** כל מה שב-`.env.example`. חשוב במיוחד:
   - `NEXT_PUBLIC_SITE_URL=https://motostar.co.il`
   - `APP_SECRET` — 32 תווים אקראיים לפחות. מייצרים עם הפקודה ב-`.env.example`.
   - `PAYMENT_PROVIDER=payplus` עם המפתחות ו-`PAYPLUS_BASE_URL=https://restapi.payplus.co.il`. **לא** להגדיר `ALLOW_TEST_PAYMENTS`. השרת מסרב לעלות בדומיין אמיתי עם ספק מדומה או עם sandbox.
   - לבדיקות ב-preview של Vercel (`*.vercel.app`) מול PayPlus sandbox: `PAYPLUS_BASE_URL=https://restapidev.payplus.co.il` + `ALLOW_TEST_PAYMENTS=true` — רק בסביבת Preview, לא ב-Production.
   - `STORAGE_PROVIDER=vercel-blob` ו-`BLOB_READ_WRITE_TOKEN`.
   - `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.
5. **Deploy:** מחברים את ה-repository ל-Vercel. Build command: `npm run build`. השרת בודק את ההגדרות בעלייה, ונכשל מיד אם חסר משהו קריטי (`src/instrumentation.ts`).
6. **בדיקת עשן** על כתובת ה-preview, לפני חיבור הדומיין:
   - קנייה מלאה מול PayPlus sandbox.
   - כניסה לניהול.
   - עריכת מוצר, ובדיקה שהשינוי מופיע באתר.
   - `/sitemap.xml`, `/robots.txt`.
   - כמה כתובות ישנות, ובדיקה שמגיעות הפניות 301.
7. **מעבר דומיין:** ראו בהמשך.

### מיגרציות בעתיד
משנים את הסכמה ב-`src/lib/db/schema/*.ts` ← `npm run db:generate` (נוצר קובץ SQL ב-`drizzle/`) ← בודקים את ה-SQL ← `npm run db:migrate` מול Production **לפני** ה-deploy של הקוד החדש. מומלץ לגבות את המסד לפני כל מיגרציה.

## אפשרות חלופית: שרת VPS / Docker
Node 20 + PostgreSQL + nginx (TLS) + systemd או pm2.
```bash
npm ci && npm run build && npm start   # פורט 3000 מאחורי nginx
```
- `STORAGE_PROVIDER=local` ו-`UPLOAD_DIR` על דיסק קבוע שנכלל בגיבוי.
- nginx צריך להעביר `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` ו-`X-Forwarded-Host`. האפליקציה לוקחת את כתובת הלקוח מהערך **האחרון** ברשימה, ומניחה פרוקסי אמין אחד לפניה. ב-Vercel זה מוגדר אוטומטית.

## משימות מתוזמנות (מומלץ)
- **שליחת מיילים שנכשלו:** המיילים נשלחים מיד, אבל אם הספק לא היה זמין הם נשארים בתור `email_outbox`. אפשר להוסיף Vercel Cron שקורא ל-`deliverPending()` כל כמה דקות.
- **ניקוי:** עגלות נטושות ישנות מ-90 יום, וסשנים שפג תוקפם (הסשנים מתנקים גם אוטומטית בכל כניסה).

## מעבר הדומיין מ-Shopify בלי לאבד תנועה אורגנית
1. **לפני:**
   - שומרים את רשימת הכתובות של האתר הישן. כבר ממופים 54 כתובות מוצר (היסטוריית slugs במסד) ו-45 כתובות collections ועמודים (`src/content/generated/legacy-redirects.json`).
   - מייצאים מ-Google Search Console את "Pages" ואת 1,000 השאילתות המובילות, כדי להשוות אחרי המעבר.
2. **ביום המעבר:**
   - מפנים את רשומות ה-DNS של `motostar.co.il` ו-`www` ל-Vercel.
   - קובעים את `www` → `motostar.co.il` (או ההפך), בהפניה קבועה אחת.
   - **לא** משאירים את חנות Shopify פתוחה על דומיין אחר עם אותו תוכן (תוכן כפול). מכבים אותה או חוסמים אותה ל-noindex.
3. **מיד אחרי:**
   - Search Console → מוסיפים את הנכס (אם צריך) ומגישים את `https://motostar.co.il/sitemap.xml`.
   - בודקים ב-URL Inspection כמה כתובות ישנות (צריך 301 לכתובת החדשה) וכמה כתובות חדשות (צריך "ניתן לאינדוקס").
   - הבדיקה האוטומטית `tests/e2e/seo.spec.ts` מוודאת שכל הכתובות הישנות מפנות פעם אחת, בלי שרשראות, לעמוד חי.
4. **שבועיים–שישה שבועות:** עוקבים אחרי Coverage ושגיאות 404 ב-Search Console. כתובת ישנה שמופיעה כ-404: אם היא של collection או עמוד, מוסיפים אותה ל-`legacy-redirects.json` (או ל-`COLLECTION_REDIRECTS` בקונפיג היבוא); אם היא של מוצר, מוסיפים שורה ל-`product_slug_history`.
5. **חשוב:** לא מוחקים את קובץ ההפניות ואת טבלת `product_slug_history`. משאירים אותם לפחות שנה.

אין הבטחה לדירוג מסוים. המטרה היא שהמעבר יהיה נקי טכנית, כך שגוגל יעביר את הסמכות מהכתובות הישנות לחדשות.
