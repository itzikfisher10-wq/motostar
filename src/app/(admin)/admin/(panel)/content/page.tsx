import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, Panel, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { saveContentAction } from "@/features/admin/content/actions";
import { requireUser } from "@/features/auth/guard";
import { getContent } from "@/features/content/blocks";

export const metadata: Metadata = { title: "תוכן האתר" };

export default async function AdminContentPage() {
  await requireUser("content:write");
  const [announcement, hero] = await Promise.all([getContent("announcement"), getContent("araiHero")]);

  return (
    <>
      <PageHeader title="תוכן האתר">
        <p className="mt-2 max-w-2xl text-sm text-steel">
          טקסטים שמופיעים באתר ואפשר לערוך בלי מתכנת. עמודי מידע (משלוחים, תקנון, פרטיות) נערכים בקוד: src/content/pages.ts.
        </p>
      </PageHeader>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Panel title="פס הודעה עליון" description="השורה הקטנה מעל התפריט הראשי.">
          <ActionForm action={saveContentAction.bind(null, "announcement")} className="space-y-4">
            <CheckboxField label="להציג את ההודעה" name="enabled" defaultChecked={announcement.enabled} />
            <TextField label="טקסט" name="text" defaultValue={announcement.text} maxLength={120} required />
            <TextField label="קישור (לא חובה)" name="href" defaultValue={announcement.href} dir="ltr" hint="קישור פנימי, למשל /deals" />
            <SubmitButton>שמירה</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="פתיח Arai בעמוד הבית" description="הכותרת והטקסט ליד תמונת הקסדה.">
          <ActionForm action={saveContentAction.bind(null, "araiHero")} className="space-y-4">
            <TextField label="כותרת" name="title" defaultValue={hero.title} maxLength={60} required />
            <TextArea label="טקסט" name="body" defaultValue={hero.body} rows={4} maxLength={300} />
            <SubmitButton>שמירה</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
