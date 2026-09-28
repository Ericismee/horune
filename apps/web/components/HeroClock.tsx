"use client";

import { useEffect, useRef, useState } from "react";
import { ClockThemeRenderer } from "@horune/theme-renderer";
import { sampleThemes } from "@horune/theme-schema";

export function HeroClock({ locale }: { locale: "vi" | "en" }) {
  const target = useRef(0);
  const [remaining, setRemaining] = useState(30 * 60 * 1000);
  const [endAt, setEndAt] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<"running" | "paused" | "cancelled">("running");

  useEffect(() => {
    target.current = Date.now() + 30 * 60 * 1000;
    setEndAt(target.current);
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const tick = () => setRemaining(Math.max(0, target.current - Date.now()));
    let timer = window.setInterval(tick, 1000);
    const onVisibility = () => {
      window.clearInterval(timer);
      tick();
      if (!document.hidden) timer = window.setInterval(tick, 1000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [status]);

  const addFiveMinutes = () => {
    setRemaining((current) => current + 5 * 60 * 1000);
    if (status === "running") {
      target.current += 5 * 60 * 1000;
      setEndAt(target.current);
    }
  };

  const togglePause = () => {
    if (status === "cancelled") return;
    if (status === "running") {
      setRemaining(Math.max(0, target.current - Date.now()));
      setStatus("paused");
      return;
    }
    target.current = Date.now() + remaining;
    setEndAt(target.current);
    setStatus("running");
  };

  const cancelOrRestart = () => {
    if (status === "cancelled") {
      const next = 30 * 60 * 1000;
      target.current = Date.now() + next;
      setRemaining(next);
      setEndAt(target.current);
      setStatus("running");
      return;
    }
    setRemaining(0);
    setEndAt(undefined);
    setStatus("cancelled");
  };

  const statusLabel = status === "running"
    ? (locale === "vi" ? "ĐANG ĐẾM" : "RUNNING")
    : status === "paused"
      ? (locale === "vi" ? "TẠM DỪNG" : "PAUSED")
      : (locale === "vi" ? "ĐÃ HỦY" : "CANCELLED");
  const previewLabel = locale === "vi" ? "Bản xem trước đồng hồ nổi Horune" : "Horune floating clock preview";
  const pauseLabel = locale === "vi" ? "Tạm dừng bản xem trước" : "Pause preview";
  const resumeLabel = locale === "vi" ? "Tiếp tục bản xem trước" : "Resume preview";

  return (
    <div className="hero-clock-shell" aria-label={previewLabel}>
      <div className="window-grab"><span /><span>FLOATING CLOCK</span><span>•••</span></div>
      <ClockThemeRenderer theme={sampleThemes[0]!} remainingMs={remaining} endAt={endAt} action="sleep" locale={locale} motionMode="subtle" />
      <div className="preview-state" aria-live="polite"><span />{statusLabel}</div>
      <div className="clock-actions">
        <button type="button" onClick={addFiveMinutes} disabled={status === "cancelled"}>+5 MIN</button>
        <button type="button" onClick={togglePause} disabled={status === "cancelled"} aria-label={status === "paused" ? resumeLabel : pauseLabel}>{status === "paused" ? "▶" : "Ⅱ"}</button>
        <button type="button" className="cancel" onClick={cancelOrRestart}>{status === "cancelled" ? (locale === "vi" ? "CHẠY LẠI" : "RESTART") : (locale === "vi" ? "HỦY" : "CANCEL")}</button>
      </div>
    </div>
  );
}
