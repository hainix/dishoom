"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface FilmDetailTabsProps {
  tabs: Tab[];
  dark?: boolean;
}

export default function FilmDetailTabs({ tabs, dark }: FilmDetailTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  const borderColor = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const inactiveColor = dark ? "rgba(255,255,255,0.4)" : "#9ca3af";

  return (
    <div>
      <nav className="flex mt-6" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="px-5 py-4 text-sm font-semibold uppercase tracking-wide transition-colors"
              style={{
                color: isActive ? "#EF4832" : inactiveColor,
                borderBottom: isActive ? "2px solid #EF4832" : "2px solid transparent",
                marginBottom: -1,
                background: "transparent",
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div className="pt-7">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
