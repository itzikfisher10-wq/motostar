import { site, whatsappLink } from "@/config/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { PhoneIcon, WhatsappIcon } from "@/components/ui/icons";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "צור קשר",
  description: `Moto Star, ${site.address.street}, ${site.address.city}. טלפון ${site.phone}, וואטסאפ ואימייל. ייעוץ מקצועי בבחירת חלקים.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: "צור קשר", href: "/contact" }]} />
      <h1 className="mt-8 font-display text-display-lg">צור קשר</h1>
      <p className="mt-4 max-w-xl text-lg text-steel">יש לכם שאלה על מוצר או צריכים עזרה בבחירת חלק? אנחנו משתדלים לענות לכל פנייה תוך 24 שעות בימי עבודה.</p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href={whatsappLink("היי, הגעתי מהאתר של Moto Star")} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-ink p-6 text-paper hover:bg-graphite">
          <WhatsappIcon size={28} />
          <span className="font-display text-display-sm">וואטסאפ</span>
          <span className="text-fog">הדרך המהירה לבדיקת התאמה. שלחו יצרן, דגם ושנה.</span>
        </a>
        <a href={`tel:${site.phoneE164}`} className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line p-6 hover:border-ink">
          <PhoneIcon size={28} />
          <span className="font-display text-display-sm">טלפון</span>
          <span className="tabular text-lg ltr-isolate">{site.phone}</span>
        </a>
        <a href={`mailto:${site.email}`} className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line p-6 hover:border-ink">
          <span className="font-display text-display-sm">אימייל</span>
          <span className="text-lg">{site.email}</span>
        </a>
      </div>
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="font-display text-display-sm">כתובת</h2>
          <p className="mt-3 text-lg">{site.address.street}, {site.address.city}</p>
          <p className="mt-1 text-steel">איסוף עצמי בתיאום מראש בלבד.</p>
        </section>
        <section>
          <h2 className="font-display text-display-sm">שעות מענה</h2>
          <dl className="mt-3 space-y-1 text-lg">
            {site.hours.map((h) => (
              <div key={h.days} className="flex gap-4">
                <dt className="w-32">{h.days}</dt>
                <dd><bdi dir="ltr" className="tabular">{h.open}–{h.close}</bdi></dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Container>
  );
}
