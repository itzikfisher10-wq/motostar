/**
 * Typographic wordmark. To use the official logo instead, put the file in
 * public/brand/ and replace this component's markup with <Image src="/brand/logo.svg" … />.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-bold leading-none ltr-isolate ${className}`} dir="ltr">
      <span>MOTO</span>
      {/* Real space so the accessible text reads "MOTO STAR" (flex hides it visually). */}
      {" "}
      <svg viewBox="0 0 20 20" className="h-[0.62em] w-[0.62em] text-signal" aria-hidden="true">
        <path fill="currentColor" d="M10 0l2.6 6.8L20 7.6l-5.6 4.9L16.2 20 10 16l-6.2 4 1.8-7.5L0 7.6l7.4-.8z" />
      </svg>
      {" "}
      <span>STAR</span>
    </span>
  );
}
