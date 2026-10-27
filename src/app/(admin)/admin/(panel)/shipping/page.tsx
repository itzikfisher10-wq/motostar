import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, Panel, SubmitButton, TextField } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/admin/StatusBadge";
import { agorotToInput } from "@/features/admin/forms";
import { updateShippingMethodAction } from "@/features/admin/settings/shipping-actions";
import { listShippingMethods } from "@/features/admin/settings/shipping-queries";
import { requireUser } from "@/features/auth/guard";

export const metadata: Metadata = { title: "משלוחים" };

export default async function AdminShippingPage() {
  await requireUser("settings:write");
  const methods = await listShippingMethods();
  return (
    <>
      <PageHeader title="משלוחים">
        <p className="mt-2 max-w-2xl text-sm text-steel">המחירים כאן הם מה שהקופה גובה. שיטה פעילה מוצגת ללקוחות בקופה. מחירים בשקלים כולל מע״מ.</p>
      </PageHeader>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        {methods.map((m) => (
          <Panel key={m.id} title={m.name} description={m.requiresAddress ? "דורש כתובת למשלוח" : "ללא כתובת (איסוף)"} actions={<Badge tone={m.isActive ? "ok" : "muted"}>{m.isActive ? "פעיל" : "כבוי"}</Badge>}>
            <ActionForm action={updateShippingMethodAction.bind(null, m.id)} className="space-y-3">
              <TextField label="שם בקופה" name="name" defaultValue={m.name} required />
              <TextField label="זמן אספקה" name="etaText" defaultValue={m.etaText ?? ""} />
              <TextField label="תיאור" name="description" defaultValue={m.description ?? ""} />
              <div className="grid grid-cols-3 gap-3">
                <TextField label="מחיר ₪" name="price" defaultValue={agorotToInput(m.priceAgorot)} inputMode="decimal" dir="ltr" required />
                <TextField label="חינם מעל ₪" name="freeOver" defaultValue={agorotToInput(m.freeOverAgorot)} inputMode="decimal" dir="ltr" hint="ריק = אף פעם" />
                <TextField label="סדר" name="sortOrder" type="number" min={0} defaultValue={m.sortOrder} />
              </div>
              <CheckboxField label="פעיל בקופה" name="isActive" defaultChecked={m.isActive} />
              <SubmitButton>שמירה</SubmitButton>
            </ActionForm>
          </Panel>
        ))}
      </div>
    </>
  );
}
