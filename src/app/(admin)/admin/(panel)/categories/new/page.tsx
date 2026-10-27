import type { Metadata } from "next";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { createCategoryAction } from "@/features/admin/categories/actions";
import { listRootCategories } from "@/features/admin/categories/queries";
import { requireUser } from "@/features/auth/guard";

export const metadata: Metadata = { title: "קטגוריה חדשה" };

export default async function NewCategoryPage() {
  await requireUser("catalog:write");
  const parents = await listRootCategories();
  return (
    <>
      <PageHeader title="קטגוריה חדשה" back={{ href: "/admin/categories", label: "קטגוריות" }} />
      <CategoryForm mode="create" action={createCategoryAction} parents={parents} />
    </>
  );
}
