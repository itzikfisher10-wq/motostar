import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="font-display text-display-xl text-line">404</p>
      <h1 className="mt-2 font-display text-display-md">העמוד לא נמצא</h1>
      <p className="mt-4 max-w-lg text-lg text-steel">ייתכן שהמוצר הוסר או שהכתובת השתנתה. אפשר לחפש אותו, או להתחיל מבחירת האופנוע.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/vehicles" className={buttonClass("dark", "lg")}>חלקים לפי דגם</Link>
        <Link href="/categories" className={buttonClass("outline", "lg")}>כל הקטגוריות</Link>
      </div>
    </Container>
  );
}
