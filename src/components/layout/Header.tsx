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

const NAV = [
  { href: "/vehicles", label: "האופנוע שלי" },
  { href: "/brands/arai", label: "קסדות Arai" },
  { href: "/deals", label: "מבצעים" },
  { href: "/about", label: "אודות" },
];

const navLink = "inline-flex h-9 items-center rounded-full px-3.5 font-medium text-paper/85 transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-paper active:scale-[0.97]";

/**
 * Site header. The thin info strip scrolls away; the bar below it stays, as a dark glass
 * material that content scrolls under (globals.css → .glass-bar). Its height is --header-h.
 */
export async function Header({ categories }: { categories: CategoryNode[] }) {
  const announcement = await getContent("announcement");
  return (
    <>
      <div className="bg-ink text-xs text-fog">
        <Container className="flex h-9 items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-4 truncate">
            {announcement.enabled && (announcement.href ? <Link href={announcement.href} className="hover:text-paper">{announcement.text}</Link> : <span>{announcement.text}</span>)}
            {site.hours.map((h) => (
              <span key={h.days} className="hidden md:inline">
                {h.days} <bdi dir="ltr" className="tabular">{h.open}–{h.close}</bdi>
              </span>
            ))}
          </p>
          <a href={`tel:${site.phoneE164}`} className="hidden items-center gap-1.5 font-medium hover:text-paper sm:flex">
            <PhoneIcon size={14} />
            <span className="tabular ltr-isolate">{site.phone}</span>
          </a>
        </Container>
      </div>
      <header className="glass-bar sticky top-0 z-40 text-paper">
        <Container className="flex h-[var(--header-h)] items-center gap-2 lg:gap-5">
          <MobileNav categories={categories} />
          <Link href="/" className="text-[1.6rem] lg:text-[1.75rem]" aria-label="MOTO STAR, לדף הבית">
            <Wordmark />
          </Link>
          <nav aria-label="ניווט ראשי" className="hidden lg:block">
            <ul className="flex items-center gap-0.5 text-[0.95rem]">
              <li>
                <CategoryMenu categories={categories} triggerClassName={navLink} />
              </li>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={navLink}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <MyBikeChip />
            <SearchButton />
            <CartButton />
          </div>
        </Container>
      </header>
    </>
  );
}
