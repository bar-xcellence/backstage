"use client";

import { useRef, useState, type KeyboardEvent } from "react";

interface Tab {
  id: string;
  label: string;
}

export function EventTabs({
  tabs,
  children,
}: {
  tabs: Tab[];
  children: Record<string, React.ReactNode>;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Event sections"
        onKeyDown={handleKey}
        className="flex gap-0 border-b border-outline/15 mb-6"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? "border-gold text-gold"
                  : "border-transparent text-grey hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {children[activeTab]}
      </div>
    </div>
  );
}
