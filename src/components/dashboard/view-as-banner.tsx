import Link from "next/link";

export function ViewAsBanner() {
  return (
    <div className="sticky top-0 z-50 bg-cream border-b-2 border-gold py-3 px-6 flex items-center justify-between">
      <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
        Viewing as: Rory (LC)
      </p>
      <Link
        href="/"
        className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase text-charcoal hover:text-gold transition-colors duration-150 min-h-[44px] flex items-center"
      >
        Exit preview →
      </Link>
    </div>
  );
}
