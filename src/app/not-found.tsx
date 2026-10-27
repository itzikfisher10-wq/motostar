import Link from "next/link";

/** Fallback for paths outside the store layout. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">העמוד לא נמצא</h1>
      <Link href="/" className="underline underline-offset-4">לדף הבית</Link>
    </main>
  );
}
