import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "ניהול", template: "%s | ניהול Moto Star" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-mist text-ink">{children}</div>;
}
