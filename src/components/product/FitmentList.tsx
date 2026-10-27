"use client";

import Link from "next/link";
import type { FitmentData } from "@/features/catalog/types";
import { useMyBike } from "@/components/vehicle/my-bike-storage";

const years = (f: FitmentData) => (f.yearFrom && f.yearTo ? `${f.yearFrom}–${f.yearTo}` : f.yearFrom ? `מ-${f.yearFrom}` : f.yearTo ? `עד ${f.yearTo}` : null);

/**
 * Vehicle compatibility. Seller-stated fitments are labelled as such; nothing is
 * presented as guaranteed unless the store marked it VERIFIED.
 */
export function FitmentList({ fitments }: { fitments: FitmentData[] }) {
  const bike = useMyBike();

  if (!fitments.length) {
    return (
      <p className="text-steel">
        למוצר הזה לא צוין דגם ספציפי. כדי לוודא התאמה לכלי שלכם, שלחו לנו את היצרן, הדגם ושנת הייצור.
      </p>
    );
  }

  const mine = bike ? fitments.find((f) => f.makeSlug === bike.makeSlug && f.modelSlug === bike.modelSlug) : undefined;
  const yearOk = mine && bike?.year ? (!mine.yearFrom || bike.year >= mine.yearFrom) && (!mine.yearTo || bike.year <= mine.yearTo) : true;

  return (
    <div>
      {bike && (
        <p className={`mb-5 rounded-[var(--radius-control)] px-4 py-3 text-sm ${mine && yearOk ? "bg-mist" : "border border-line"}`}>
          {mine && yearOk ? (
            <>המוכר ציין שהמוצר מתאים ל-<span className="ltr-isolate font-semibold">{bike.makeName} {bike.modelName}{bike.year ? ` ${bike.year}` : ""}</span> שלך.</>
          ) : mine ? (
            <>המוצר מתאים ל-{mine.modelName} רק בשנים {years(mine)}. שנת הכלי ששמרת: {bike.year}.</>
          ) : (
            <>המוכר לא ציין התאמה ל-<span className="ltr-isolate">{bike.makeName} {bike.modelName}</span>.</>
          )}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {fitments.map((f) => (
          <li key={`${f.makeSlug}-${f.modelSlug}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
            <Link href={`/vehicles/${f.makeSlug}/${f.modelSlug}`} className="font-medium hover:underline underline-offset-4">
              <span className="ltr-isolate">{f.makeName} {f.modelName}</span>
              {years(f) && <span className="ms-2 text-sm font-normal text-steel tabular"><bdi dir="ltr">{years(f)}</bdi></span>}
            </Link>
            <span className={`text-xs ${f.status === "VERIFIED" ? "font-semibold text-ok" : "text-steel"}`}>
              {f.status === "VERIFIED" ? "התאמה מאומתת" : "לפי תיאור המוכר"}
            </span>
          </li>
        ))}
      </ul>
      {fitments.some((f) => f.status === "SELLER_STATED") && (
        <p className="mt-3 text-xs leading-relaxed text-steel">
          ״לפי תיאור המוכר״: ההתאמה מבוססת על מה שנכתב בתיאור המוצר ולא נבדקה מול מק״ט יצרן. לחלקים יקרים מומלץ לאמת מול הכלי לפני ההזמנה.
        </p>
      )}
    </div>
  );
}
