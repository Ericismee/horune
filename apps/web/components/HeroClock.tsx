"use client";

import { useEffect, useRef, useState } from "react";
import { ClockThemeRenderer } from "@horune/theme-renderer";
import { sampleThemes } from "@horune/theme-schema";

export function HeroClock({ locale }: { locale: "vi" | "en" }) {
  const target = useRef(0);
  const [remaining, setRemaining] = useState(30 * 60 * 1000);

  useEffect(() => {
    target.current = Date.now() + 30 * 60 * 1000;
    const tick = () => setRemaining(Math.max(0, target.current - Date.now()));
    let timer = window.setInterval(tick, 1000);
    const onVisibility = () => {
      window.clearInterval(timer);
      tick();
      if (!document.hidden) timer = window.setInterval(tick, 1000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  return (
    <div className="hero-clock-shell" aria-label="Horune floating clock preview">
      <div className="window-grab"><span /><span>FLOATING CLOCK</span><span>•••</span></div>
      <ClockThemeRenderer theme={sampleThemes[0]!} remainingMs={remaining} endAt={Date.now() + remaining} action="sleep" locale={locale} motionMode="subtle" />
      <div className="clock-actions"><button type="button">+5 MIN</button><button type="button">Ⅱ</button><button type="button" className="cancel">{locale === "vi" ? "HỦY" : "CANCEL"}</button></div>
    </div>
  );
}
