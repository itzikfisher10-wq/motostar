import Link from "next/link";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { Wordmark } from "@/components/layout/Wordmark";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/guard";
import { can, ROLE_LABEL } from "@/features/auth/permissions";

export const dynamic = "force-dynamic";

/** Sidebar order. Add admin sections here (and gate them with a permission). */
const NAV: NavItem[] = [
  { href: "/admin", label: "סקירה", permission: "orders:read" },
  { href: "/admin/orders", label: "הזמנות", permission: "orders:read" },
  { href: "/admin/products", label: "מוצרים", permission: "catalog:read" },
  { href: "/admin/categories", label: "קטגוריות", permission: "catalog:read" },
  { href: "/admin/customers", label: "לקוחות", permission: "customers:read" },
  { href: "/admin/shipping", label: "משלוחים", permission: "settings:write" },
  { href: "/admin/content", label: "תוכן האתר", permission: "content:write" },
  { href: "/admin/users", label: "משתמשי ניהול", permission: "users:manage" },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = NAV.filter((n) => can(user.role, n.permission));

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-ink px-4 py-4 text-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:py-6">
        <div className="flex flex-wrap items-center gap-3 lg:block">
          <Link href="/admin" className="text-[1.75rem]" aria-label="MOTO STAR, סקירת ניהול">
            <Wordmark />
          </Link>
          <AdminNav items={items} />
        </div>
        <div className="mt-6 hidden border-t border-line-dark pt-4 text-sm lg:mt-auto lg:block">
          <p className="truncate">{user.name}</p>
          <p className="text-xs text-fog">{ROLE_LABEL[user.role]}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="text-fog hover:text-paper" target="_blank">
              לאתר
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-fog hover:text-paper">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
        <form action={logoutAction} className="mt-12 lg:hidden">
          <button type="submit" className="text-sm text-steel underline">
            יציאה ({user.name})
          </button>
        </form>
      </main>
    </div>
  );
}
