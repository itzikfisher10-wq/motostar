import type { InfoPageContent } from "@/content/pages";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";

export function InfoPage({ page, path, children }: { page: InfoPageContent; path: string; children?: React.ReactNode }) {
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: page.title, href: path }]} />
      <article className="mt-8 max-w-[68ch]">
        <h1 className="font-display text-display-lg">{page.title}</h1>
        {page.updated && <p className="mt-3 text-sm text-steel">עדכון אחרון: {page.updated}</p>}
        <div className="prose-product mt-8 text-[1.05rem]">
          {page.blocks.map((b, i) =>
            b.type === "h2" ? (
              <h2 key={i} className="mt-10 font-display text-display-sm">{b.text}</h2>
            ) : b.type === "ul" ? (
              <ul key={i}>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>
        {children}
      </article>
    </Container>
  );
}
