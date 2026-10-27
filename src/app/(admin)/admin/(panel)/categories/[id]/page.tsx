import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Panel, SubmitButton } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { deleteCategoryAction, updateCategoryAction } from "@/features/admin/categories/actions";
import { getAdminCategory, listRootCategories } from "@/features/admin/categories/queries";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";

export const metadata: Metadata = { title: "עריכת קטגוריה" };

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser("catalog:read");
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [category, parents] = await Promise.all([getAdminCategory(id), listRootCategories()]);
  if (!category) notFound();
  const editable = can(user.role, "catalog:write");

  return (
    <>
      <PageHeader
        title={category.name}
        back={{ href: "/admin/categories", label: "קטגוריות" }}
        actions={
          category.isActive && (
            <Link href={`/categories/${category.slug}`} target="_blank" className="text-sm underline underline-offset-4">
              צפייה באתר
            </Link>
          )
        }
      >
        {created && <p role="status" className="mt-3 text-sm text-ok">הקטגוריה נוצרה. שייכו אליה מוצרים מעמוד העריכה של כל מוצר.</p>}
      </PageHeader>
      {editable ? (
        <div className="space-y-6">
          <CategoryForm mode="edit" action={updateCategoryAction.bind(null, category.id)} parents={parents.filter((p) => p.id !== category.id)} values={category} />
          <Panel title="מחיקה" description="אפשר למחוק רק קטגוריה ריקה. כדי להסתיר קטגוריה עם מוצרים, בטלו את &quot;מוצגת באתר&quot;.">
            <ActionForm action={deleteCategoryAction.bind(null, category.id)}>
              <SubmitButton variant="outline" pendingLabel="מוחק…">
                מחיקת הקטגוריה
              </SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      ) : (
        <p className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 text-sm text-steel">לחשבון שלך יש הרשאת צפייה בלבד.</p>
      )}
    </>
  );
}
