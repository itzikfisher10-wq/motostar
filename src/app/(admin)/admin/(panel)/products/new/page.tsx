import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { Panel, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { createProductAction } from "@/features/admin/products/actions";
import { getProductFormLookups } from "@/features/admin/products/queries";
import { requireUser } from "@/features/auth/guard";

export const metadata: Metadata = { title: "מוצר חדש" };

export default async function NewProductPage() {
  await requireUser("catalog:write");
  const { categories } = await getProductFormLookups();
  return (
    <>
      <PageHeader title="מוצר חדש" back={{ href: "/admin/products", label: "מוצרים" }} />
      <div className="max-w-xl">
        <Panel title="פרטים בסיסיים" description="המוצר נוצר כטיוטה. בעמוד הבא מוסיפים תמונות, תיאור, וריאציות והתאמה לאופנועים, ואז מפרסמים.">
          <ActionForm action={createProductAction} className="space-y-4">
            <TextField label="שם המוצר" name="title" required maxLength={200} />
            <TextField label="מחיר (₪, כולל מע״מ)" name="price" inputMode="decimal" dir="ltr" required className="max-w-[12rem]" />
            <SelectField label="קטגוריה ראשית" name="categoryId" defaultValue="">
              <option value="">ללא</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.depth ? "— " : ""}
                  {c.name}
                </option>
              ))}
            </SelectField>
            <SubmitButton pendingLabel="יוצר…">יצירת טיוטה</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
