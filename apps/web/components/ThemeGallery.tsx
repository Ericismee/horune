"use client";

import { useState } from "react";
import { ClockThemeRenderer } from "@horune/theme-renderer";
import { sampleThemes } from "@horune/theme-schema";

export function ThemeGallery({ locale }: { locale: "vi" | "en" }) {
  const [selected, setSelected] = useState(0);
  const theme = sampleThemes[selected]!;
  return (
    <div className="theme-workbench">
      <div className="theme-preview"><ClockThemeRenderer theme={theme} remainingMs={24 * 60 * 1000 + 17_000} action="sleep" locale={locale} motionMode="subtle" /></div>
      <div className="theme-list" role="list" aria-label={locale === "vi" ? "Danh sách theme" : "Theme list"}>
        {sampleThemes.map((item, index) => (
          <button key={item.id} className={index === selected ? "is-active" : ""} onClick={() => setSelected(index)} type="button" aria-pressed={index === selected}>
            <span className="theme-swatch" style={{ background: item.palette.background, color: item.palette.accent }}>●</span>
            <span><strong>{item.name}</strong><small>{item.category}</small></span><b aria-hidden="true">→</b>
          </button>
        ))}
      </div>
    </div>
  );
}
