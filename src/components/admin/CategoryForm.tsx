"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, Panel, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import type { ActionState } from "@/features/admin/forms";

type Values = { name: string; slug: string; parentId: string | null; description: string | null; sortOrder: number; isActive: boolean; seoTitle: string | null; seoDescription: string | null };

/** Create / edit form for a category. The slug can be set only when creating (it is part of indexed URLs). */
export function CategoryForm({ action, values, parents, mode }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values?: Values; parents: { id: string; name: string }[]; mode: "create" | "edit" }) {
  return (
    <ActionForm action={action} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" messagePlacement="start">
      <div className="space-y-6">
        <Panel title="פרטים">
          <div className="space-y-4">
            <TextField label="שם" name="name" defaultValue={values?.name} required maxLength={80} />
            {mode === "create" ? (
              <TextField label="כתובת (slug)" name="slug" required dir="auto" hint="חלק מכתובת העמוד: /categories/<slug>. לא ניתן לשנות אחרי היצירה." />
            ) : (
              <p className="text-sm">
                <span className="font-medium">כתובת:</span> <span dir="ltr">/categories/{values?.slug}</span>
              </p>
            )}
            <TextArea label="תיאור" name="description" defaultValue={values?.description ?? ""} rows={4} hint="מוצג בראש עמוד הקטגוריה." />
          </div>
        </Panel>
        <Panel title="קידום בגוגל (SEO)">
          <div className="space-y-4">
            <TextField label="כותרת לגוגל" name="seoTitle" defaultValue={values?.seoTitle ?? ""} maxLength={70} />
            <TextArea label="תיאור לגוגל" name="seoDescription" defaultValue={values?.seoDescription ?? ""} rows={3} maxLength={170} />
          </div>
        </Panel>
      </div>
      <div className="space-y-6">
        <Panel title="מיקום ותצוגה">
          <div className="space-y-4">
            <SelectField label="קטגוריית אב" name="parentId" defaultValue={values?.parentId ?? ""}>
              <option value="">ללא (קטגוריה ראשית)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
            <TextField label="סדר הצגה" name="sortOrder" type="number" min={0} defaultValue={values?.sortOrder ?? 0} hint="מספר נמוך מוצג קודם." className="max-w-[10rem]" />
            <CheckboxField label="מוצגת באתר" name="isActive" defaultChecked={values?.isActive ?? true} />
            <SubmitButton className="w-full">{mode === "create" ? "יצירת קטגוריה" : "שמירת שינויים"}</SubmitButton>
          </div>
        </Panel>
      </div>
    </ActionForm>
  );
}
