"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Permission } from "@/features/auth/permissions";

export type NavItem = { href: string; label: string; permission: Permission };

/** Sidebar links. Items are filtered by permission on the server before reaching here. */
export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <button type="button" className="ms-auto rounded-md border border-line-dark px-3 py-1.5 text-sm lg:hidden" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
        תפריט
      </button>
      <nav id="admin-nav" aria-label="ניווט ניהול" className={`${open ? "block" : "hidden"} w-full lg:mt-8 lg:block`}>
        <ul className="mt-3 space-y-0.5 lg:mt-0">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active(item.href) ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-[0.95rem] transition-colors ${active(item.href) ? "bg-graphite text-paper" : "text-fog hover:bg-graphite/60 hover:text-paper"}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
