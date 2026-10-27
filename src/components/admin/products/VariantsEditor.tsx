"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { inputCls, Panel, SubmitButton } from "@/components/admin/form";
import type { ActionState } from "@/features/admin/forms";

export type EditableVariant = {
  id?: string;
  optionValues: Record<string, string>;
  sku: string;
  barcode: string;
  price: string;
  compareAt: string;
  isAvailable: boolean;
  inventoryTracked: boolean;
  stockQuantity: string;
  weightGrams: string;
  imageId: string | null;
};

const blank = (options: string[]): EditableVariant => ({
  optionValues: Object.fromEntries(options.map((o) => [o, ""])),
  sku: "",
  barcode: "",
  price: "",
  compareAt: "",
  isAvailable: true,
  inventoryTracked: false,
  stockQuantity: "",
  weightGrams: "",
  imageId: null,
});

const cell = `${inputCls} mt-0 h-9 text-sm`;

/**
 * Options (e.g. "צבע") and the variant table. State is edited locally and sent
 * as one JSON payload; the server validates everything again (features/admin/products/schema.ts).
 */
export function VariantsEditor({ action, initialOptions, initialVariants, images }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; initialOptions: string[]; initialVariants: EditableVariant[]; images: { id: string; alt: string; index: number }[] }) {
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [variants, setVariants] = useState<EditableVariant[]>(initialVariants.length ? initialVariants : [blank(initialOptions)]);

  const update = (i: number, patch: Partial<EditableVariant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const renameOption = (i: number, name: string) => {
    const old = options[i]!;
    setOptions((os) => os.map((o, j) => (j === i ? name : o)));
    setVariants((vs) => vs.map((v) => ({ ...v, optionValues: Object.fromEntries(Object.entries(v.optionValues).map(([k, val]) => [k === old ? name : k, val])) })));
  };

  const payload = JSON.stringify({
    options,
    variants: variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      optionValues: Object.fromEntries(options.map((o) => [o, v.optionValues[o] ?? ""])),
      sku: v.sku,
      barcode: v.barcode,
      price: v.price,
      compareAt: v.compareAt,
      isAvailable: v.isAvailable,
      inventoryTracked: v.inventoryTracked,
      stockQuantity: v.stockQuantity === "" ? null : Number(v.stockQuantity),
      weightGrams: v.weightGrams === "" ? null : Number(v.weightGrams),
      imageId: v.imageId,
    })),
  });

  return (
    <Panel title="מחירים, וריאציות ומלאי" description="מחירים בשקלים כולל מע״מ. מוצר עם צבעים או מידות: הוסיפו אפשרות ואז שורה לכל צירוף.">
      <ActionForm action={action} className="space-y-5">
        <input type="hidden" name="payload" value={payload} />

        <fieldset>
          <legend className="text-sm font-medium">אפשרויות</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {options.map((o, i) => (
              <span key={i} className="flex items-center gap-1">
                <input aria-label={`שם אפשרות ${i + 1}`} value={o} onChange={(e) => renameOption(i, e.target.value)} className={`${cell} w-36`} placeholder="למשל צבע" />
                <button
                  type="button"
                  className="px-1.5 text-sm text-steel hover:text-signal"
                  aria-label={`הסרת האפשרות ${o}`}
                  onClick={() => {
                    setOptions((os) => os.filter((_, j) => j !== i));
                    setVariants((vs) => vs.map((v) => ({ ...v, optionValues: Object.fromEntries(Object.entries(v.optionValues).filter(([k]) => k !== o)) })));
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
            {options.length < 3 && (
              <button type="button" onClick={() => setOptions((os) => [...os, os.includes("צבע") ? (os.includes("מידה") ? "סוג" : "מידה") : "צבע"])} className="text-sm underline underline-offset-4">
                הוספת אפשרות
              </button>
            )}
          </div>
        </fieldset>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="text-steel">
              <tr>
                {options.map((o, i) => (
                  <th key={i} className="pb-2 pe-2 text-start font-medium">{o || "אפשרות"}</th>
                ))}
                <th className="pb-2 pe-2 text-start font-medium">מחיר ₪</th>
                <th className="pb-2 pe-2 text-start font-medium">לפני הנחה ₪</th>
                <th className="pb-2 pe-2 text-start font-medium">מק״ט</th>
                <th className="pb-2 pe-2 text-start font-medium">זמין</th>
                <th className="pb-2 pe-2 text-start font-medium">ספירת מלאי</th>
                <th className="pb-2 pe-2 text-start font-medium">כמות</th>
                <th className="pb-2 pe-2 text-start font-medium">תמונה</th>
                <th className="pb-2"><span className="sr-only">פעולות</span></th>
              </tr>
            </thead>
            <tbody className="align-top">
              {variants.map((v, i) => (
                <tr key={v.id ?? `new-${i}`} className="border-t border-line">
                  {options.map((o) => (
                    <td key={o} className="py-2 pe-2">
                      <input aria-label={`${o}, שורה ${i + 1}`} value={v.optionValues[o] ?? ""} onChange={(e) => update(i, { optionValues: { ...v.optionValues, [o]: e.target.value } })} className={`${cell} w-32`} />
                    </td>
                  ))}
                  <td className="py-2 pe-2"><input aria-label={`מחיר, שורה ${i + 1}`} value={v.price} onChange={(e) => update(i, { price: e.target.value })} inputMode="decimal" dir="ltr" className={`${cell} w-24`} required /></td>
                  <td className="py-2 pe-2"><input aria-label={`מחיר לפני הנחה, שורה ${i + 1}`} value={v.compareAt} onChange={(e) => update(i, { compareAt: e.target.value })} inputMode="decimal" dir="ltr" className={`${cell} w-24`} placeholder="—" /></td>
                  <td className="py-2 pe-2"><input aria-label={`מק״ט, שורה ${i + 1}`} value={v.sku} onChange={(e) => update(i, { sku: e.target.value })} dir="ltr" className={`${cell} w-36`} /></td>
                  <td className="py-2 pe-2 text-center"><input type="checkbox" aria-label={`זמין, שורה ${i + 1}`} checked={v.isAvailable} onChange={(e) => update(i, { isAvailable: e.target.checked })} className="mt-2.5 h-4 w-4 accent-ink" /></td>
                  <td className="py-2 pe-2 text-center"><input type="checkbox" aria-label={`ספירת מלאי, שורה ${i + 1}`} checked={v.inventoryTracked} onChange={(e) => update(i, { inventoryTracked: e.target.checked })} className="mt-2.5 h-4 w-4 accent-ink" /></td>
                  <td className="py-2 pe-2"><input aria-label={`כמות במלאי, שורה ${i + 1}`} value={v.stockQuantity} onChange={(e) => update(i, { stockQuantity: e.target.value.replace(/\D/g, "") })} inputMode="numeric" dir="ltr" disabled={!v.inventoryTracked} className={`${cell} w-20`} placeholder={v.inventoryTracked ? "0" : "—"} /></td>
                  <td className="py-2 pe-2">
                    <select aria-label={`תמונה, שורה ${i + 1}`} value={v.imageId ?? ""} onChange={(e) => update(i, { imageId: e.target.value || null })} className={`${cell} w-32`}>
                      <option value="">ראשית</option>
                      {images.map((im) => (
                        <option key={im.id} value={im.id}>תמונה {im.index}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    {variants.length > 1 && (
                      <button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="mt-2 text-sm text-steel hover:text-signal">
                        הסרה
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-steel">
          &quot;ספירת מלאי&quot; כבויה: הזמינות נקבעת לפי &quot;זמין&quot; בלבד. דלוקה: המלאי יורד אוטומטית אחרי כל תשלום מאומת, והמוצר מסומן כאזל כשהכמות מגיעה ל-0.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>שמירת וריאציות</SubmitButton>
          {options.length > 0 && (
            <button type="button" onClick={() => setVariants((vs) => [...vs, { ...blank(options), price: vs[vs.length - 1]?.price ?? "" }])} className="text-sm underline underline-offset-4">
              הוספת וריאציה
            </button>
          )}
        </div>
      </ActionForm>
    </Panel>
  );
}
