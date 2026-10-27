import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/admin/StatusBadge";
import { buttonClass } from "@/components/ui/Button";
import { listAdminCategories } from "@/features/admin/categories/queries";
import { requireUser } from "@/features/auth/guard";
import { can } from "@/features/auth/permissions";

export const metadata: Metadata = { title: "קטגוריות" };

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await requireUser("catalog:read");
  const [tree, { deleted }] = await Promise.all([listAdminCategories(), searchParams]);

  const row = (c: (typeof tree)[number]["children"][number], child: boolean) => (
    <li key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${child ? "ps-10" : ""}`}>
      <Link href={`/admin/categories/${c.id}`} className={`underline-offset-4 hover:underline ${child ? "" : "font-semibold"}`}>
        {c.name}
      </Link>
      {!c.isActive && <Badge tone="muted">מוסתרת</Badge>}
      <span className="ms-auto text-sm text-steel tabular">{c.productCount} מוצרים</span>
      <span className="w-12 text-end text-xs text-steel tabular">#{c.sortOrder}</span>
    </li>
  );

  return (
    <>
      <PageHeader
        title="קטגוריות"
        actions={
          can(user.role, "catalog:write") && (
            <Link href="/admin/categories/new" className={buttonClass("dark", "md")}>
              קטגוריה חדשה
            </Link>
          )
        }
      />
      {deleted && <p role="status" className="mb-4 text-sm text-ok">הקטגוריה נמחקה.</p>}
      <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-paper">
        {tree.map((root) => (
          <li key={root.id}>
            <ul className="divide-y divide-line">
              {row(root, false)}
              {root.children.map((c) => row(c, true))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
