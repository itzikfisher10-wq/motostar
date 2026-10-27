import Link from "next/link";
import type { ReactNode } from "react";

/** Title row of every admin page: optional back link, title, and actions at the far end. */
export function PageHeader({ title, back, actions, children }: { title: string; back?: { href: string; label: string }; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-steel underline-offset-4 hover:underline">
          {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-display-sm leading-none">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
