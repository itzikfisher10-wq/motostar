import Link from "next/link";
import { site } from "@/config/site";
import { getContent } from "@/features/content/blocks";
import type { CategoryNode } from "@/features/catalog/types";
import { CartButton } from "@/components/cart/CartButton";
import { Container } from "@/components/ui/Container";
import { PhoneIcon } from "@/components/ui/icons";
import { CategoryMenu } from "./CategoryMenu";
import { MobileNav } from "./MobileNav";
import { SearchButton } from "@/components/search/SearchOverlay";
import { Wordmark } from "./Wordmark";
import { MyBikeChip } from "@/components/vehicle/MyBikeChip";

export async function Header({ categories }: { categories: CategoryNode[] }) {
  const announcement = await getContent("announcement");
  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <div className="border-b border-line-dark text-xs text-fog">
        <Container className="flex h-8 items-center justify-between gap-4">
          <p className="flex min-w-0 gap-4 truncate">
            {announcement.enabled && (announcement.href ? <Link href={announcement.href} className="hover:text-paper">{announcement.text}</Link> : <span>{announcement.text}</span>)}
            {site.hours.map((h) => (
              <span key={h.days} className="hidden md:inline">
                {h.days} <bdi dir="ltr" className="tabular">{h.open}–{h.close}</bdi>
              </span>
            ))}
          </p>
          <a href={`tel:${site.phoneE164}`} className="hidden items-center gap-1.5 hover:text-paper sm:flex">
            <PhoneIcon size={14} />
            <span className="tabular ltr-isolate">{site.phone}</span>
          </a>
        </Container>
      </div>
      <Container className="flex h-16 items-center gap-2 lg:gap-6">
        <MobileNav categories={categories} />
        <Link href="/" className="text-[2rem] lg:text-[2.25rem]" aria-label="MOTO STAR, לדף הבית">
          <Wordmark />
        </Link>
        <nav aria-label="ניווט ראשי" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-[0.95rem]">
            <li>
              <CategoryMenu categories={categories} />
            </li>
            <li>
              <Link href="/vehicles" className="rounded-md px-3 py-2 hover:bg-graphite">
                האופנוע שלי
              </Link>
            </li>
            <li>
              <Link href="/brands/arai" className="rounded-md px-3 py-2 hover:bg-graphite">
                Arai
              </Link>
            </li>
            <li>
              <Link href="/deals" className="rounded-md px-3 py-2 hover:bg-graphite">
                מבצעים
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <MyBikeChip />
          <SearchButton />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
