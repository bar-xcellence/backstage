// src/components/layout/nav-icons.tsx
type IconProps = {
  className?: string;
};

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2.5" y="2.5" width="6" height="6" />
      <rect x="11.5" y="2.5" width="6" height="6" />
      <rect x="2.5" y="11.5" width="6" height="6" />
      <rect x="11.5" y="11.5" width="6" height="6" />
    </svg>
  );
}

export function EventsIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2.5" y="4" width="15" height="13.5" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" />
      <line x1="6" y1="2.5" x2="6" y2="5.5" />
      <line x1="14" y1="2.5" x2="14" y2="5.5" />
    </svg>
  );
}

export function RecipesIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M4 3.5 H14.5 A1.5 1.5 0 0 1 16 5 V17 H5.5 A1.5 1.5 0 0 1 4 15.5 Z" />
      <path d="M4 15.5 A1.5 1.5 0 0 1 5.5 14 H16" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
    </svg>
  );
}

export function HamburgerIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  );
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M8 3.5 H4.5 A1.5 1.5 0 0 0 3 5 V15 A1.5 1.5 0 0 0 4.5 16.5 H8" />
      <line x1="9" y1="10" x2="17" y2="10" />
      <polyline points="14,7 17,10 14,13" />
    </svg>
  );
}
