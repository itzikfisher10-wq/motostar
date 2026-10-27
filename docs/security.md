# אבטחה, גיבוי ושחזור

## אמצעים מיושמים
| תחום | יישום | קבצים |
|---|---|---|
| ולידציה | כל קלט נבדק בשרת עם Zod; סכומים מחושבים בשרת בלבד | `features/*/schema.ts`, `features/admin/forms.ts` |
| הרשאות | תפקידים (בעלים/מנהל/צוות); כל עמוד וכל Server Action בודקים הרשאה; בדיקה אוטומטית אוכפת זאת; ביטול/זיכוי — מנהל ומעלה | `features/auth/*`, `tests/unit/admin.test.ts` |
| סשנים | טוקן אקראי 256-bit ב-cookie HttpOnly/Secure/SameSite=Strict; במסד רק SHA-256; תוקף 12 שעות; ניתוק בשינוי סיסמה/הרשאות | `features/auth/session.ts` |
| סיסמאות | scrypt (N=2¹⁵) עם salt; זמן תגובה זהה גם כשהמשתמש לא קיים; מינימום 12 תווים | `lib/security/password.ts` |
| CSRF | Server Actions: בדיקת Origin מובנית ב-Next.js + SameSite=Strict; route handlers: בדיקת same-origin | `lib/security/request.ts` |
| Rate limiting | כניסה לניהול (לפי IP, לפי חשבון+IP, ומגבלה רחבה לחשבון כדי שזר לא יוכל לנעול את הבעלים), יצירת הזמנה; נשמר ב-Postgres (עובד גם עם כמה שרתים). ה-IP נלקח מהערך האחרון ב-`X-Forwarded-For` (מה שהפרוקסי שלנו הוסיף) | `lib/security/rate-limit.ts`, `lib/security/request.ts` |
| XSS | React escaping; HTML בתיאורים עובר sanitize בשמירה ובהצגה (רשימת תגיות מצומצמת, ללא attributes); CSP | `lib/security/sanitize.ts`, `next.config.ts` |
| SQL injection | Drizzle עם פרמטרים בלבד; חיפוש: escaping של תווי LIKE | — |
| העלאת קבצים | זיהוי סוג לפי תוכן הקובץ (לא לפי שם), מגבלת גודל ופיקסלים, קידוד מחדש ל-WebP (מוחק EXIF/GPS ומנטרל קבצים מוסווים), שם קובץ אקראי, הגשה עם `nosniff` ו-CSP `default-src 'none'` | `lib/media/process-image.ts`, `app/uploads/` |
| תשלומים | ראו [payments.md](payments.md#איך-התשלום-מאובטח) |
| Headers | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `/admin` עם noindex ו-no-store | `next.config.ts` |
| סודות | רק במשתני סביבה, נבדקים בעלייה; mock payments חסום ב-Production | `config/env.ts`, `instrumentation.ts` |
| Logging | אין רישום של פרטי כרטיס, סיסמאות או טוקנים; payload של תשלומים עובר הסרה של שדות רגישים; יומן ביקורת לכל פעולת ניהול | `features/orders/payment.ts`, `features/admin/audit.ts` |
| גישה להזמנה | טוקן אקראי (נשמר רק hash) או קישור חתום עם תוקף; אותו 404 לכל כישלון | `features/orders/access.ts` |

## מדיניות גיבוי ושחזור
**מה מגבים:** מסד הנתונים (הכול: קטלוג, הזמנות, לקוחות, משתמשים). קבצים שהועלו בניהול (Vercel Blob / תיקיית `UPLOAD_DIR`). הקוד נמצא ב-git.

**תדירות מומלצת**
- שירות מנוהל (Neon/Supabase): להפעיל Point-in-Time Recovery (שחזור לכל רגע ב-7 הימים האחרונים לפחות).
- בנוסף, גיבוי יומי עצמאי מחוץ לספק (למשל ל-S3/Backblaze/Google Drive), שמירה 30 יום + גיבוי חודשי לשנה:
  ```bash
  pg_dump "$DATABASE_URL" --format=custom --no-owner --file=motostar-$(date +%F).dump
  ```
- לפני כל מיגרציה: גיבוי ידני.

**שחזור**
```bash
createdb motostar_restore
pg_restore --no-owner --dbname="postgres://…/motostar_restore" motostar-2026-10-26.dump
# בודקים את הנתונים, ורק אז מחליפים את DATABASE_URL או משחזרים למסד הראשי
```
**לבדוק שחזור פעם ברבעון** — גיבוי שלא נבדק אינו גיבוי.

**קבצים מצורפים:** Vercel Blob שומר את הקבצים; לגיבוי עצמאי אפשר להשתמש ב-`list()` של `@vercel/blob` ולהוריד מעת לעת. בשרת VPS: לכלול את `UPLOAD_DIR` בגיבוי הדיסק.

## סקירת אבטחה בלתי תלויה (26.10.2026)
סוקר נפרד עבר על מסלולי התשלום, ההרשאות, ההעלאות והעגלה. לא נמצאו ממצאים קריטיים. כל הממצאים תוקנו, ולכל אחד נוספה בדיקה אוטומטית:
- אישור תשלום חוזר (replay) הפך הזמנה שזוכתה בחזרה ל"שולמה".
- שליחה חוזרת של הקופה פתחה דף תשלום שני.
- אפשר היה להריץ Production מול sandbox.
- קישור "פנימי" בפס ההודעה קיבל `//דומיין-חיצוני`.
- אפשר היה לעקוף את הגבלת הקצב בעזרת header מזויף, ולנעול חשבון של מישהו אחר.
- צוות יכול היה לבטל ולזכות הזמנות.

## נקודות לבדיקה תקופתית
- `npm audit` ועדכון תלויות (Next.js, React) — חודשי.
- סקירת משתמשי ניהול פעילים — רבעוני.
- סקירת `payment_events` עם `AMOUNT_MISMATCH` או `INVALID_SIGNATURE`.
