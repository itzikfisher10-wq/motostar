"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the hosting provider's logs; no personal data is included.
    console.error("store_error", error.digest);
  }, [error]);
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-24">
      <h1 className="font-display text-display-md">משהו השתבש בטעינת העמוד</h1>
      <p className="mt-4 max-w-lg text-lg text-steel">נסו שוב. אם הבעיה חוזרת, אפשר להזמין גם בטלפון או בוואטסאפ.</p>
      <Button variant="dark" size="lg" className="mt-8" onClick={reset}>ניסיון חוזר</Button>
    </Container>
  );
}
