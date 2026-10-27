import { expect, type Page } from "@playwright/test";
import { E2E } from "./constants";

export async function loginAs(page: Page, who: "admin" | "staff") {
  const { email, password } = E2E[who];
  await page.goto("/admin/login");
  await page.getByLabel("אימייל").fill(email);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "כניסה" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Opens the admin editor of a product, found through the admin search. */
export async function openProductEditor(page: Page, search: string) {
  await page.goto(`/admin/products?q=${encodeURIComponent(search)}`);
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}/);
}

/** Places and pays (mock) for one unit of a product from its storefront page. Returns the order page URL. */
export async function buyOne(page: Page, productPath: string, email: string) {
  await page.goto(productPath);
  await page.getByRole("button", { name: "הוספה לסל" }).filter({ visible: true }).first().click();
  await page.getByRole("dialog").getByRole("link", { name: "מעבר לתשלום" }).click();
  await page.getByLabel("שם פרטי").fill("בדיקת");
  await page.getByLabel("שם משפחה").fill("מלאי");
  await page.getByLabel("אימייל").fill(email);
  await page.getByLabel("טלפון נייד").fill("0521234567");
  await page.getByRole("checkbox", { name: /תנאי השימוש/ }).check();
  await page.getByRole("button", { name: "המשך לתשלום מאובטח" }).click();
  await page.getByRole("button", { name: "סימולציית תשלום מוצלח" }).click();
  await expect(page.getByRole("status").filter({ hasText: "סטטוס" })).toContainText("שולמה");
  return page.url();
}
