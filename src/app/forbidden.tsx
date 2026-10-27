import Link from "next/link";

/** Shown when a signed-in admin opens a page their role may not access (forbidden()). */
export default function Forbidden() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-mist p-8 text-center">
      <h1 className="font-display text-display-sm">אין הרשאה</h1>
      <p className="max-w-md text-steel">לחשבון שלך אין הרשאה לעמוד הזה. אם צריך גישה, פנו לבעלים של החשבון.</p>
      <Link href="/admin" className="underline underline-offset-4">
        חזרה לסקירה
      </Link>
    </main>
  );
}
