import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getSessionUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "כניסה" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-[2.5rem] text-paper">
          <Wordmark />
        </p>
        <div className="mt-8 rounded-[var(--radius-panel)] bg-paper p-6">
          <h1 className="font-display text-display-sm">כניסה לניהול</h1>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
