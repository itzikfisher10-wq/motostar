import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/content/InfoPage";
import { PAGES } from "@/content/pages";
import { buildMetadata } from "@/lib/seo/metadata";

const INFO_SLUGS = ["shipping", "buying-guide", "terms", "privacy", "accessibility"] as const;
export const dynamicParams = false;
export function generateStaticParams() {
  return INFO_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = PAGES[(await params).slug];
  return page ? buildMetadata({ title: page.title, description: page.description, path: `/info/${page.slug}` }) : {};
}

export default async function Page({ params }: Props) {
  const page = PAGES[(await params).slug];
  if (!page) notFound();
  return <InfoPage page={page} path={`/info/${page.slug}`} />;
}
