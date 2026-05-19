"use client";

import { useRouter, useSearchParams } from "next/navigation";

function ymToLabel(ym: string): string {
  if (ym === "upcoming") return "All upcoming";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function shiftMonth(today: Date, offset: number): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1)
  );
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function MonthSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();

  const options = [
    shiftMonth(today, -1),
    shiftMonth(today, 0),
    shiftMonth(today, 1),
    shiftMonth(today, 2),
    shiftMonth(today, 3),
    "upcoming",
  ];

  // Ensure current value is in the list (e.g. if a user bookmarked Feb 2027)
  if (!options.includes(value)) options.push(value);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("month", next);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      value={value}
      onChange={onChange}
      aria-label="Month"
      className="bg-charcoal text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase px-4 py-2.5 border-0 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {ymToLabel(opt)}
        </option>
      ))}
    </select>
  );
}
