import Link from "next/link";

export function Pagination({ page, pageCount, basePath, params }: { page: number; pageCount: number; basePath: string; params: Record<string, string | number | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && k !== "page") q.set(k, String(v));
    if (p > 1) q.set("page", String(p));
    return `${basePath}${q.size ? `?${q}` : ""}`;
  };
  return (
    <nav aria-label="עימוד" className="mt-14 flex items-center justify-center gap-2">
      {page > 1 && <Link href={href(page - 1)} className="h-11 rounded-[var(--radius-control)] border border-line px-4 leading-[2.75rem] hover:border-ink" rel="prev">הקודם</Link>}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={`h-11 min-w-11 rounded-[var(--radius-control)] px-3 text-center leading-[2.75rem] tabular ${p === page ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}>
          {p}
        </Link>
      ))}
      {page < pageCount && <Link href={href(page + 1)} className="h-11 rounded-[var(--radius-control)] border border-line px-4 leading-[2.75rem] hover:border-ink" rel="next">הבא</Link>}
    </nav>
  );
}
