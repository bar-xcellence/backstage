"use client";

import { useState } from "react";

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

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-outline/15 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.id
                ? "border-gold text-gold"
                : "border-transparent text-grey hover:text-charcoal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{children[activeTab]}</div>
    </div>
  );
}
