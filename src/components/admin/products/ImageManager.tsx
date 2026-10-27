"use client";

import Image from "next/image";
import { useTransition } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { inputCls, Panel, SubmitButton } from "@/components/admin/form";
import type { ActionState } from "@/features/admin/forms";

type Img = { id: string; url: string; alt: string };

/** Upload, describe (alt text), reorder and remove product images. The first image is the main one. */
export function ImageManager({
  images,
  uploadAction,
  altAction,
  moveAction,
  deleteAction,
}: {
  images: Img[];
  uploadAction: (s: ActionState, fd: FormData) => Promise<ActionState>;
  altAction: (imageId: string, s: ActionState, fd: FormData) => Promise<ActionState>;
  moveAction: (imageId: string, direction: "up" | "down") => Promise<void>;
  deleteAction: (imageId: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();

  return (
    <Panel title="תמונות" description="התמונה הראשונה היא התמונה הראשית. כל תמונה מומרת ל-WebP ומידע EXIF נמחק.">
      {images.length === 0 && <p className="mb-4 text-sm text-steel">אין תמונות. מוצר בלי תמונה מוצג עם מקום ריק.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-busy={pending}>
        {images.map((im, i) => (
          <li key={im.id} className="rounded-[var(--radius-control)] border border-line p-2">
            <div className="relative aspect-square overflow-hidden rounded-md bg-mist">
              <Image src={im.url} alt={im.alt} fill sizes="240px" className="object-contain p-2" />
              {i === 0 && <span className="absolute start-2 top-2 rounded bg-ink px-1.5 py-0.5 text-xs text-paper">ראשית</span>}
            </div>
            <ActionForm action={altAction.bind(null, im.id)} className="mt-2 text-xs">
              <label className="block font-medium" htmlFor={`alt-${im.id}`}>
                טקסט חלופי (alt)
              </label>
              <span className="mt-1 flex gap-1">
                <input id={`alt-${im.id}`} name="alt" defaultValue={im.alt} maxLength={200} className={`${inputCls} mt-0 h-8 min-w-0 flex-1 px-2 text-xs`} />
                <button type="submit" className="h-8 shrink-0 rounded-[var(--radius-control)] border border-line px-2 hover:border-ink">שמירה</button>
              </span>
            </ActionForm>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" disabled={i === 0 || pending} onClick={() => start(() => moveAction(im.id, "up"))} className="underline underline-offset-2 disabled:opacity-40">
                הקדמה
              </button>
              <button type="button" disabled={i === images.length - 1 || pending} onClick={() => start(() => moveAction(im.id, "down"))} className="underline underline-offset-2 disabled:opacity-40">
                הזזה אחורה
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("למחוק את התמונה? לא ניתן לבטל.")) start(() => deleteAction(im.id));
                }}
                className="ms-auto text-signal underline underline-offset-2"
              >
                מחיקה
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ActionForm action={uploadAction} className="mt-5 space-y-2 border-t border-line pt-4">
        <label className="block text-sm font-medium">
          הוספת תמונות
          <input type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="mt-1 block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-paper" />
        </label>
        <p className="text-xs text-steel">JPG, PNG, WebP או AVIF, עד 10MB לקובץ. תמונות גדולות מוקטנות ל-2000 פיקסלים.</p>
        <SubmitButton pendingLabel="מעלה…">העלאה</SubmitButton>
      </ActionForm>
    </Panel>
  );
}
