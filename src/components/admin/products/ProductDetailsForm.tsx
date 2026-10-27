"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, inputCls, Panel, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import type { ActionState } from "@/features/admin/forms";
import type { ProductSpec } from "@/lib/db/schema/catalog";

type Lookups = { brands: { id: string; name: string }[]; categories: { id: string; name: string; depth: number }[] };
type Values = {
  title: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  condition: "NEW" | "USED";
  origin: "ORIGINAL" | "AFTERMARKET" | "UNSPECIFIED";
  brandId: string | null;
  primaryCategoryId: string | null;
  categoryIds: string[];
  shortDescription: string | null;
  descriptionHtml: string | null;
  specs: ProductSpec[];
  seoTitle: string | null;
  seoDescription: string | null;
  needsReview: boolean;
  reviewNotes: string | null;
};

/** Main product form: text, organization, specs, SEO and the review flag. One save button. */
export function ProductDetailsForm({ action, values, lookups, siteUrl }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Values; lookups: Lookups; siteUrl: string }) {
  const [specs, setSpecs] = useState<ProductSpec[]>(values.specs.length ? values.specs : []);
  const [seoTitle, setSeoTitle] = useState(values.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(values.seoDescription ?? "");
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);

  return (
    <ActionForm action={action} className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" messagePlacement="start">
      <div className="space-y-6">
        <Panel title="פרטי מוצר">
          <div className="space-y-4">
            <TextField label="שם המוצר" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
            <TextField label="כתובת (slug)" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required hint={`${siteUrl}/products/${slug}. שינוי הכתובת יוצר הפניה אוטומטית מהכתובת הקודמת.`} />
            <TextArea label="תיאור קצר" name="shortDescription" defaultValue={values.shortDescription ?? ""} rows={2} maxLength={300} hint="מופיע בכרטיסי מוצר ובתוצאות חיפוש. עד 300 תווים." />
            <TextArea
              label="תיאור מלא"
              name="descriptionHtml"
              defaultValue={values.descriptionHtml ?? ""}
              rows={10}
              dir="auto"
              hint="מותר HTML בסיסי בלבד: <p>, <ul>, <ol>, <li>, <strong>, <em>, <h3>, <h4>, <br>. כל השאר מוסר אוטומטית."
            />
          </div>
        </Panel>

        <Panel
          title="מפרט טכני"
          description="שורות שמוצגות בטבלת המפרט בעמוד המוצר."
          actions={
            <button type="button" onClick={() => setSpecs((s) => [...s, { label: "", value: "" }])} className="text-sm underline underline-offset-4">
              הוספת שורה
            </button>
          }
        >
          {specs.length === 0 ? (
            <p className="text-sm text-steel">אין שורות מפרט.</p>
          ) : (
            <ul className="space-y-2">
              {specs.map((s, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                  <input aria-label={`שם מאפיין ${i + 1}`} name="specLabel" value={s.label} onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${inputCls} mt-0`} placeholder="מאפיין" />
                  <input aria-label={`ערך ${i + 1}`} name="specValue" value={s.value} onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={`${inputCls} mt-0`} placeholder="ערך" />
                  <button type="button" onClick={() => setSpecs((all) => all.filter((_, j) => j !== i))} className="px-2 text-sm text-steel hover:text-signal" aria-label={`מחיקת שורה ${i + 1}`}>
                    הסרה
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="קידום בגוגל (SEO)" description="אם ריק, נעשה שימוש בשם ובתיאור הקצר.">
          <div className="space-y-4">
            <TextField label="כותרת לגוגל" name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} hint={`${seoTitle.length}/60 תווים מומלצים`} />
            <TextArea label="תיאור לגוגל" name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={170} hint={`${seoDescription.length}/155 תווים מומלצים`} />
            <div className="rounded-md border border-line p-3" aria-label="תצוגה מקדימה בתוצאות חיפוש">
              <p className="truncate text-[#1a0dab]">{seoTitle || title} | Moto Star</p>
              <p className="truncate text-xs text-ok" dir="ltr">
                {siteUrl}/products/{slug}
              </p>
              <p className="line-clamp-2 text-sm text-steel">{seoDescription || values.shortDescription || "…"}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="פרסום">
          <div className="space-y-4">
            <SelectField label="סטטוס" name="status" defaultValue={values.status} hint="רק מוצר פעיל מופיע באתר.">
              <option value="ACTIVE">פעיל</option>
              <option value="DRAFT">טיוטה</option>
              <option value="ARCHIVED">בארכיון</option>
            </SelectField>
            <SubmitButton className="w-full">שמירת שינויים</SubmitButton>
          </div>
        </Panel>

        <Panel title="שיוך">
          <div className="space-y-4">
            <SelectField label="מותג" name="brandId" defaultValue={values.brandId ?? ""}>
              <option value="">ללא</option>
              {lookups.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="קטגוריה ראשית" name="primaryCategoryId" defaultValue={values.primaryCategoryId ?? ""} hint="קובעת את נתיב הניווט (breadcrumbs) בעמוד המוצר.">
              <option value="">ללא</option>
              {lookups.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.depth ? "— " : ""}
                  {c.name}
                </option>
              ))}
            </SelectField>
            <fieldset>
              <legend className="text-sm font-medium">קטגוריות נוספות</legend>
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-line p-3">
                {lookups.categories.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 text-sm ${c.depth ? "ps-4" : "font-medium"}`}>
                    <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={values.categoryIds.includes(c.id)} className="h-4 w-4 accent-ink" />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <SelectField label="מצב" name="condition" defaultValue={values.condition}>
              <option value="NEW">חדש</option>
              <option value="USED">משומש</option>
            </SelectField>
            <SelectField label="מקור החלק" name="origin" defaultValue={values.origin}>
              <option value="UNSPECIFIED">לא צוין</option>
              <option value="ORIGINAL">מקורי</option>
              <option value="AFTERMARKET">חליפי</option>
            </SelectField>
          </div>
        </Panel>

        <Panel title="בדיקה ידנית">
          <div className="space-y-3">
            <CheckboxField label="המוצר דורש בדיקה" name="needsReview" defaultChecked={values.needsReview} hint="סימון פנימי בלבד, לא מוצג באתר." />
            <TextArea label="הערות" name="reviewNotes" defaultValue={values.reviewNotes ?? ""} rows={4} />
          </div>
        </Panel>
      </div>
    </ActionForm>
  );
}
