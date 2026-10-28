import Link from "next/link";
import { site, whatsappLink } from "@/config/site";
import { Container } from "@/components/ui/Container";
import { WhatsappIcon } from "@/components/ui/icons";
import { workshop } from "@/content/home";
import { reveal } from "@/components/motion/reveal";

/** Who is behind the store, in their own words (from the original About page). No invented numbers. */
export function WorkshopStrip() {
  return (
    <section aria-labelledby="workshop-title" className="py-20 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div {...reveal.focus}>
          <h2 id="workshop-title" className="font-display text-display-lg">
            {workshop.title}
          </h2>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-steel">
            {workshop.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={whatsappLink("היי, אני רוצה לבדוק התאמה של חלק")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-ink px-5 font-semibold text-paper hover:bg-graphite">
              <WhatsappIcon size={20} />
              {workshop.cta}
            </a>
            <Link href="/about" className="inline-flex h-12 items-center px-3 font-medium underline-offset-4 hover:underline">
              {workshop.more}
            </Link>
          </div>
        </div>
        <dl {...reveal.panel} className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line text-sm">
          <div className="bg-paper p-5">
            <dt className="text-steel">החזרות</dt>
            <dd className="mt-1 font-semibold">{site.returnsDays} יום ממועד הקבלה</dd>
          </div>
          <div className="bg-paper p-5">
            <dt className="text-steel">משלוח</dt>
            <dd className="mt-1 font-semibold">יוצא תוך 1–2 ימי עבודה</dd>
          </div>
          <div className="bg-paper p-5">
            <dt className="text-steel">איסוף עצמי</dt>
            <dd className="mt-1 font-semibold">בחולון, בתיאום מראש</dd>
          </div>
          <div className="bg-paper p-5">
            <dt className="text-steel">אחריות</dt>
            <dd className="mt-1 font-semibold">אחריות יצרן לפי חוק</dd>
          </div>
        </dl>
      </Container>
    </section>
  );
}
