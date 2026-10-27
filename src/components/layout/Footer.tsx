import Link from "next/link";
import { site, whatsappLink } from "@/config/site";
import type { CategoryNode } from "@/features/catalog/types";
import { Container } from "@/components/ui/Container";
import { WhatsappIcon } from "@/components/ui/icons";
import { Wordmark } from "./Wordmark";
import { reveal, revealItem } from "@/components/motion/reveal";

const INFO_LINKS = [
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/info/shipping", label: "משלוחים והחזרות" },
  { href: "/info/buying-guide", label: "מדריך קנייה" },
  { href: "/info/terms", label: "תנאי שימוש" },
  { href: "/info/privacy", label: "מדיניות פרטיות" },
  { href: "/info/accessibility", label: "הצהרת נגישות" },
];

export function Footer({ categories }: { categories: CategoryNode[] }) {
  return (
    <footer className="bg-ink text-paper">
      <Container {...reveal.cascade} className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div {...revealItem(0)}>
          <Link href="/" className="text-[2.75rem]" aria-label="MOTO STAR, לדף הבית">
            <Wordmark />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fog">{site.tagline}</p>
          <a
            href={whatsappLink("היי, הגעתי מהאתר של Moto Star")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-dark px-4 text-sm hover:border-fog"
          >
            <WhatsappIcon size={18} />
            שאלה על התאמה? כתבו לנו
          </a>
        </div>

        <nav {...revealItem(1)} aria-label="קטגוריות">
          <h2 className="font-display text-[1.75rem]">קטגוריות</h2>
          <ul className="mt-3 space-y-0.5 text-sm text-fog">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="inline-block py-1.5 hover:text-paper">{c.name}</Link>
              </li>
            ))}
            <li><Link href="/deals" className="inline-block py-1.5 hover:text-paper">מבצעים</Link></li>
          </ul>
        </nav>

        <nav {...revealItem(2)} aria-label="מידע">
          <h2 className="font-display text-[1.75rem]">מידע</h2>
          <ul className="mt-3 space-y-0.5 text-sm text-fog">
            {INFO_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block py-1.5 hover:text-paper">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div {...revealItem(3)}>
          <h2 className="font-display text-[1.75rem]">החנות בחולון</h2>
          <address className="mt-4 space-y-2.5 text-sm not-italic text-fog">
            <p>{site.address.street}, {site.address.city}</p>
            <p><a href={`tel:${site.phoneE164}`} className="inline-block py-1 tabular hover:text-paper ltr-isolate">{site.phone}</a></p>
            <p><a href={`mailto:${site.email}`} className="inline-block py-1 hover:text-paper">{site.email}</a></p>
          </address>
          <dl className="mt-5 space-y-1 text-sm text-fog">
            {site.hours.map((h) => (
              <div key={h.days} className="flex gap-3">
                <dt className="w-28">{h.days}</dt>
                <dd><bdi dir="ltr" className="tabular">{h.open}–{h.close}</bdi></dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fog">איסוף עצמי בתיאום מראש בלבד.</p>
        </div>
      </Container>
      {/* Closing mark: the page ends on the brand, rising into place as the footer arrives. */}
      <div aria-hidden="true" className="overflow-hidden">
        <Container>
          <div {...reveal.close} className="select-none pt-2 text-center text-[clamp(4.5rem,21vw,19rem)] leading-[0.8] text-steel">
            <Wordmark />
          </div>
        </Container>
      </div>
      <div className="border-t border-line-dark">
        <Container className="flex flex-col gap-2 py-6 text-xs text-fog sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {site.legalName}. כל הזכויות שמורות.</p>
          <p>המחירים באתר כוללים מע״מ.</p>
        </Container>
      </div>
    </footer>
  );
}
