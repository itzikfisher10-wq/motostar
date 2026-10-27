import Link from "next/link";
import type { BreadcrumbItem } from "@/features/catalog/types";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";

export function Breadcrumbs({ items, tone = "light" }: { items: BreadcrumbItem[]; tone?: "light" | "dark" }) {
  const muted = tone === "dark" ? "text-fog" : "text-steel";
  return (
    <>
      <nav aria-label="נתיב ניווט" className={`text-sm ${muted}`}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="hover:underline underline-offset-4">
              דף הבית
            </Link>
          </li>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                {last ? (
                  <span aria-current="page" className={tone === "dark" ? "text-paper" : "text-ink"}>
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:underline underline-offset-4">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}
