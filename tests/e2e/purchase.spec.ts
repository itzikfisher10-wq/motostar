import { expect, test } from "@playwright/test";
import { E2E } from "./fixtures/constants";

/**
 * Full purchase path, as a customer:
 * product → variant → add to cart → checkout → order → (mock) payment → order marked paid.
 */
test.describe("purchase flow", () => {
  test("pick a variant, pay, and see the order confirmed", async ({ page }) => {
    await page.goto(`/products/${encodeURIComponent(E2E.variantProductSlug)}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Choose the second colour variant; the URL mirrors the choice.
    const variantButtons = page.locator("fieldset").first().getByRole("button");
    await expect(variantButtons).toHaveCount(3);
    await variantButtons.nth(1).click();
    await expect(variantButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/variant=/);

    // Add 2 to cart → drawer opens without leaving the page.
    await page.getByRole("button", { name: "הוספת יחידה" }).first().click();
    await page.getByRole("button", { name: "הוספה לסל" }).filter({ visible: true }).first().click();
    const drawer = page.getByRole("dialog", { name: /הסל שלך/ });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("(2)")).toBeVisible();

    await drawer.getByRole("link", { name: "מעבר לתשלום" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText("מצב בדיקה")).toBeVisible();

    // Validation runs on the server: submitting empty shows field errors.
    await page.getByRole("button", { name: "המשך לתשלום מאובטח" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "יש לתקן" })).toBeVisible();

    await page.getByLabel("שם פרטי").fill("ישראל");
    await page.getByLabel("שם משפחה").fill("בדיקה");
    await page.getByLabel("אימייל").fill("customer@e2e.test");
    await page.getByLabel("טלפון נייד").fill("050-1234567");
    await page.getByText("משלוח עד הבית").click();
    await page.getByLabel("עיר").fill("חולון");
    await page.getByLabel("רחוב").fill("אליהו קראוזה");
    await page.getByLabel("מספר בית").fill("43");
    await page.getByRole("checkbox", { name: /תנאי השימוש/ }).check();

    // Shipping is priced by the server. 2 × spoilers is above the e2e free-delivery threshold (500 ₪).
    await expect(page.locator("aside dl > div").filter({ hasText: "משלוח" })).toContainText("ללא עלות");

    await page.getByRole("button", { name: "המשך לתשלום מאובטח" }).click();
    await expect(page).toHaveURL(/\/checkout\/mock-pay/);
    await page.getByRole("button", { name: "סימולציית תשלום מוצלח" }).click();

    await expect(page).toHaveURL(/\/order\/[0-9a-f-]{36}\?t=.+&from=checkout/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ההזמנה התקבלה");
    await expect(page.getByRole("status").filter({ hasText: "סטטוס" })).toContainText("שולמה");

    // The cart is emptied only after verified payment.
    await page.goto("/cart");
    await expect(page.getByText("הסל ריק.")).toBeVisible();
  });

  test("failed payment leaves the order unpaid and the cart intact", async ({ page }) => {
    await page.goto(`/products/${encodeURIComponent(E2E.variantProductSlug)}`);
    await page.getByRole("button", { name: "הוספה לסל" }).filter({ visible: true }).first().click();
    await page.getByRole("dialog").getByRole("link", { name: "מעבר לתשלום" }).click();

    await page.getByLabel("שם פרטי").fill("ישראל");
    await page.getByLabel("שם משפחה").fill("בדיקה");
    await page.getByLabel("אימייל").fill("failed@e2e.test");
    await page.getByLabel("טלפון נייד").fill("0501234567");
    // One item is below the free-delivery threshold, so delivery costs the configured 35 ₪.
    await page.getByText("משלוח עד הבית").click();
    await expect(page.locator("aside dl > div").filter({ hasText: "משלוח" })).toContainText(/35(\.00)?[\s\u200f]*₪/);
    await page.getByLabel("עיר").fill("חולון");
    await page.getByLabel("רחוב").fill("הרצל");
    await page.getByLabel("מספר בית").fill("1");
    await page.getByRole("checkbox", { name: /תנאי השימוש/ }).check();
    await page.getByRole("button", { name: "המשך לתשלום מאובטח" }).click();
    await page.getByRole("button", { name: "סימולציית תשלום שנכשל" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("התשלום לא הושלם");
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /ספוילרים/ }).first()).toBeVisible();
  });

  test("order pages cannot be opened without the secret link", async ({ page }) => {
    const res = await page.goto("/order/00000000-0000-4000-8000-000000000000?t=guess");
    expect(res?.status()).toBe(404);
  });

  test("forged payment webhook is rejected", async ({ request }) => {
    const res = await request.post("/api/payments/mock/webhook", {
      data: { request_id: "mock_00000000-0000-4000-8000-000000000000", order_id: "x", status: "PAID" },
      headers: { "x-mock-signature": "forged" },
    });
    expect(res.status()).toBe(401);
  });
});
