"use client";

import { useTransition } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Panel, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { Badge } from "@/components/admin/StatusBadge";
import type { ActionState } from "@/features/admin/forms";

type Fit = { id: string; make: string; model: string; yearFrom: number | null; yearTo: number | null; status: "VERIFIED" | "SELLER_STATED"; evidence: string | null; note: string | null };

/**
 * Which bikes a part fits. "מאומת" is shown to customers as confirmed fitment;
 * "לפי המוכר" is shown with a reminder to check before ordering.
 */
export function FitmentPanel({ fitments, models, addAction, deleteAction }: { fitments: Fit[]; models: { id: string; name: string; make: string }[]; addAction: (s: ActionState, fd: FormData) => Promise<ActionState>; deleteAction: (id: string) => Promise<void> }) {
  const [pending, start] = useTransition();
  const years = (f: Fit) => (f.yearFrom || f.yearTo ? `${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}` : "כל השנים");

  return (
    <Panel title="התאמה לאופנועים" description="סמנו &quot;מאומת&quot; רק כשההתאמה נבדקה (מק״ט יצרן או בדיקה פיזית).">
      {fitments.length === 0 ? (
        <p className="text-sm text-steel">לא הוגדרה התאמה. המוצר לא יופיע בחיפוש לפי אופנוע.</p>
      ) : (
        <ul className="divide-y divide-line text-sm" aria-busy={pending}>
          {fitments.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-medium">
                {f.make} {f.model}
              </span>
              <span className="text-steel tabular">{years(f)}</span>
              <Badge tone={f.status === "VERIFIED" ? "ok" : "warn"}>{f.status === "VERIFIED" ? "מאומת" : "לפי המוכר"}</Badge>
              {f.evidence && <span className="w-full text-xs text-steel">מקור: {f.evidence}</span>}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`להסיר את ההתאמה ל-${f.make} ${f.model}?`)) start(() => deleteAction(f.id));
                }}
                className="ms-auto text-xs text-signal underline underline-offset-2"
              >
                הסרה
              </button>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-6">
        <SelectField label="דגם" name="modelId" required className="sm:col-span-3" defaultValue="">
          <option value="" disabled>
            בחירת דגם
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.make} {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="סטטוס" name="status" defaultValue="SELLER_STATED" className="sm:col-span-3">
          <option value="SELLER_STATED">לפי המוכר (לא אומת)</option>
          <option value="VERIFIED">מאומת</option>
        </SelectField>
        <TextField label="משנת" name="yearFrom" inputMode="numeric" dir="ltr" className="sm:col-span-2" />
        <TextField label="עד שנת" name="yearTo" inputMode="numeric" dir="ltr" className="sm:col-span-2" />
        <TextField label="הערה" name="note" className="sm:col-span-2" />
        <div className="sm:col-span-6">
          <SubmitButton variant="outline">הוספה או עדכון התאמה</SubmitButton>
        </div>
      </ActionForm>
    </Panel>
  );
}
