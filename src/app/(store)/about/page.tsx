import { InfoPage } from "@/components/content/InfoPage";
import { PAGES } from "@/content/pages";
import { buildMetadata } from "@/lib/seo/metadata";

const page = PAGES.about!;
export const metadata = buildMetadata({ title: page.title, description: page.description, path: "/about" });

export default function AboutPage() {
  return <InfoPage page={page} path="/about" />;
}
