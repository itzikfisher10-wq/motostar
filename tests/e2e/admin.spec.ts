import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { buyOne, loginAs, openProductEditor } from "./fixtures/admin";

/**
 * Admin: access control, catalog editing reflected on the storefront,
 * image upload, stock tracking through a real (mock-paid) order, order status updates.
 */
test.describe("admin access", () => {
  test("signed-out visitors are sent to the login page", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts/);
  });

  test("a forged session cookie does not get in", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "ms_admin", value: "forged-token", url: baseURL! }]);
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong password shows a generic error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("אימייל").fill("owner@e2e.test");
    await page.getByLabel("סיסמה").fill("not-the-password");
    await page.getByRole("button", { name: "כניסה" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "שגויים" })).toBeVisible();
  });

  test("staff can see orders but not create products or manage users", async ({ page }) => {
    await loginAs(page, "staff");
    await expect(page.getByRole("navigation", { name: "ניווט ניהול" }).getByRole("link", { name: "משתמשי ניהול" })).toHaveCount(0);
    await page.goto("/admin/products/new");
    await expect(page.getByRole("heading", { name: "אין הרשאה" })).toBeVisible();
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "אין הרשאה" })).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "הזמנות" })).toBeVisible();
  });

  test("admin pages are not indexable", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("catalog management", () => {
  test.beforeEach(async ({ page }) => loginAs(page, "admin"));

  test("price change and sale price appear on the storefront", async ({ page }) => {
    await openProductEditor(page, "אטם ראש מנוע");
    const row = page.getByRole("row").filter({ has: page.getByLabel("מחיר, שורה 1") });
    await row.getByLabel("מחיר, שורה 1").fill("180");
    await row.getByLabel("מחיר לפני הנחה, שורה 1").fill("150");
    await page.getByRole("button", { name: "שמירת וריאציות" }).click();
    await expect(page.getByText("המחיר לפני הנחה חייב להיות גבוה מהמחיר")).toBeVisible();

    await row.getByLabel("מחיר לפני הנחה, שורה 1").fill("200");
    await page.getByRole("button", { name: "שמירת וריאציות" }).click();
    await expect(page.getByRole("status").filter({ hasText: "הווריאציות נשמרו" })).toBeVisible();

    await page.goto(`/products/${encodeURIComponent("אטם-ראש-מנוע-ימאה-אקס-מקס-300")}`);
    const buyBox = page.locator("main");
    await expect(buyBox.getByText(/180[\s\u200f]*₪/).first()).toBeVisible();
    await expect(buyBox.getByText(/200[\s\u200f]*₪/).first()).toBeVisible();
  });

  test("create a draft product, upload an image, publish it", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByLabel("שם המוצר").fill("מוצר בדיקה E2E מגן שרשרת");
    await page.getByLabel("מחיר (₪, כולל מע״מ)").fill("99.90");
    await page.getByRole("button", { name: "יצירת טיוטה" }).click();
    await expect(page.getByText("הטיוטה נוצרה")).toBeVisible();

    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#c00" } }).png().toBuffer();
    await page.getByLabel("הוספת תמונות").setInputFiles({ name: "chain-guard.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "העלאה" }).click();
    await expect(page.getByText("הועלו 1 תמונות")).toBeVisible();
    await expect(page.locator("li span").filter({ hasText: /^ראשית$/ })).toBeVisible();

    // A non-image disguised as an image is rejected.
    await page.getByLabel("הוספת תמונות").setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
    await page.getByRole("button", { name: "העלאה" }).click();
    await expect(page.getByText(/לא ניתן לקרוא את הקובץ כתמונה|פורמט לא נתמך/)).toBeVisible();

    await page.getByRole("region", { name: "פרסום" }).getByLabel("סטטוס").selectOption("ACTIVE");
    await page.getByRole("button", { name: "שמירת שינויים" }).click();
    await expect(page.getByRole("status").filter({ hasText: "השינויים נשמרו" })).toBeVisible();

    await page.goto("/search?q=" + encodeURIComponent("מגן שרשרת E2E"));
    await expect(page.getByRole("link", { name: /מוצר בדיקה E2E מגן שרשרת/ }).first()).toBeVisible();
  });

  test("slug change keeps the old URL working with a 301", async ({ page, request }) => {
    await openProductEditor(page, "אטם בסיס צילינדר");
    const slug = page.getByLabel("כתובת (slug)");
    const old = await slug.inputValue();
    await slug.fill(`${old}-חדש`);
    await page.getByRole("button", { name: "שמירת שינויים" }).click();
    await expect(page.getByRole("status").filter({ hasText: "השינויים נשמרו" })).toBeVisible();

    const res = await request.get(`/products/${encodeURIComponent(old)}`, { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(decodeURIComponent(res.headers()["location"] ?? "")).toContain(`${old}-חדש`);
  });
});

test.describe("stock and orders", () => {
  test("tracked stock goes down on payment and the product shows as sold out", async ({ page }) => {
    await loginAs(page, "admin");
    await openProductEditor(page, "דיסק אחורי kymco");
    await page.getByLabel("ספירת מלאי, שורה 1").check();
    await page.getByLabel("כמות במלאי, שורה 1").fill("1");
    await page.getByRole("button", { name: "שמירת וריאציות" }).click();
    await expect(page.getByRole("status").filter({ hasText: "הווריאציות נשמרו" })).toBeVisible();

    const productPath = `/products/${encodeURIComponent("דיסק-אחורי-kymco-movie-s")}`;
    await buyOne(page, productPath, "stock@e2e.test");

    await page.goto(productPath);
    await expect(page.getByRole("button", { name: "אזל במלאי" })).toBeDisabled();

    // Mark the order as shipped from the admin.
    await page.goto("/admin/orders?q=stock%40e2e.test");
    await page.getByRole("table").getByRole("link").first().click();
    await expect(page.getByText("שולמה").first()).toBeVisible();
    await page.getByLabel("סטטוס חדש").selectOption("SHIPPED");
    await page.getByLabel("הערה (לא חובה)").fill("מספר משלוח 12345");
    await page.getByRole("button", { name: "עדכון" }).click();
    await expect(page.getByRole("status").filter({ hasText: "הסטטוס עודכן" })).toBeVisible();
    await page.reload();
    await expect(page.getByText("ההזמנה ").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "מיילים" })).toBeVisible();
    await expect(page.getByText(/יצאה אליך/)).toBeVisible();

    // Cancelling after shipping is not an allowed transition.
    await expect(page.getByLabel("סטטוס חדש").locator("option[value=CANCELLED]")).toHaveCount(0);
  });
});
