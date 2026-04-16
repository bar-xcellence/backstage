"use client";

import { useState, useEffect } from "react";

type ViewMode = "list" | "kanban";

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = localStorage.getItem("backstage-events-view");
    if (stored === "kanban" || stored === "list") {
      setMode(stored);
    }
  }, []);

  function setViewMode(newMode: ViewMode) {
    setMode(newMode);
    localStorage.setItem("backstage-events-view", newMode);
  }

  return [mode, setViewMode];
}

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex">
      <button
        onClick={() => onChange("list")}
        className={`px-4 py-2 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[36px] cursor-pointer ${
          mode === "list"
            ? "bg-gold text-cream"
            : "bg-surface-low text-grey hover:text-charcoal"
        }`}
      >
        LIST
      </button>
      <button
        onClick={() => onChange("kanban")}
        className={`px-4 py-2 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[36px] cursor-pointer ${
          mode === "kanban"
            ? "bg-gold text-cream"
            : "bg-surface-low text-grey hover:text-charcoal"
        }`}
      >
        KANBAN
      </button>
    </div>
  );
}
