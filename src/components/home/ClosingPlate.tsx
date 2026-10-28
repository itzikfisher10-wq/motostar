import { site, whatsappLink } from "@/config/site";
import { Container } from "@/components/ui/Container";
import { WhatsappIcon, PhoneIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/Button";
import { reveal } from "@/components/motion/reveal";

type Props = { copy: { title: string; body: string; cta: string; phoneLabel: string } };

/** The close: one direct ask, set large, with the two ways to reach a person. */
export function ClosingPlate({ copy }: Props) {
  return (
    <section aria-labelledby="closing-title" className="bg-ink py-24 text-paper lg:py-36">
      <Container>
        <h2 id="closing-title" {...reveal.wipe} className="max-w-[16ch] font-display text-[clamp(3.5rem,2rem+6.5vw,8.5rem)] leading-[0.88]">
          {copy.title}
        </h2>
        <div {...reveal.focus} className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[40ch] text-xl leading-relaxed text-fog">{copy.body}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href={whatsappLink("היי, אני מחפש חלק. היצרן, הדגם והשנה:")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
              <WhatsappIcon size={20} />
              {copy.cta}
            </a>
            <a href={`tel:${site.phoneE164}`} className="inline-flex h-14 items-center gap-2 px-2 text-lg hover:text-signal-bright">
              <PhoneIcon size={20} />
              <span className="text-fog">{copy.phoneLabel}</span>
              <span className="tabular ltr-isolate">{site.phone}</span>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
