"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { Panel, SubmitButton, TextField } from "@/components/admin/form";
import type { ActionState } from "@/features/admin/forms";

/** Permanent deletion, confirmed by typing the slug. Archiving is the reversible alternative. */
export function DeleteProduct({ slug, action }: { slug: string; action: (s: ActionState, fd: FormData) => Promise<ActionState> }) {
  return (
    <Panel title="מחיקת מוצר" description="המחיקה סופית. הזמנות קודמות נשמרות. כדי רק להסתיר את המוצר מהאתר, העבירו אותו לארכיון.">
      <ActionForm action={action} className="space-y-3">
        <TextField label={`להקלדה לאישור: ${slug}`} name="confirm" autoComplete="off" dir="auto" />
        <SubmitButton variant="primary" pendingLabel="מוחק…">
          מחיקה לצמיתות
        </SubmitButton>
      </ActionForm>
    </Panel>
  );
}
