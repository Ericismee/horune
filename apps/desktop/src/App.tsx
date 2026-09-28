import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ClockThemeRenderer, type ClockAction } from "@horune/theme-renderer";
import { sampleThemes } from "@horune/theme-schema";
import { ThemeStudio } from "@horune/theme-studio";
import type { MotionMode } from "@horune/design-system";
import { createSchedule, getActiveSchedule, getCapabilities, listenSchedule, scheduleAction, setSimulationMode, showOverlay } from "./bridge";
import { detectClockJump, remainingFromDeadline } from "./lib/countdown";
import type { Capabilities, Schedule } from "./types";

const actionLabels = { sleep: "Sleep", shutdown: "Shut down", lock: "Lock screen", reminder: "Reminder" } as const;

function useCountdown(schedule: Schedule | null) {
  const [now, setNow] = useState(Date.now());
  const anchor = useRef({ wall: Date.now(), mono: performance.now() });
  useEffect(() => {
    if (!schedule) return;
    let timer: number | undefined;
    const tick = () => {
      const wall = Date.now(); const mono = performance.now();
      if (detectClockJump(anchor.current.wall, anchor.current.mono, wall, mono)) void getActiveSchedule();
      anchor.current = { wall, mono }; setNow(wall);
    };
    const syncVisibility = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
      tick();
      if (!document.hidden) timer = window.setInterval(tick, 500);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => { if (timer) window.clearInterval(timer); document.removeEventListener("visibilitychange", syncVisibility); };
  }, [schedule]);
  return schedule ? remainingFromDeadline(schedule.scheduledFor, now) : 0;
}

function Overlay({ schedule, themeIndex, motion }: { schedule: Schedule | null; themeIndex: number; motion: MotionMode }) {
  const remaining = useCountdown(schedule);
  if (!schedule) return <div className="overlay-empty">No active schedule</div>;
  return (
    <main className="overlay-root" data-tauri-drag-region>
      <ClockThemeRenderer theme={sampleThemes[themeIndex]!} remainingMs={remaining} endAt={schedule.scheduledFor} action={schedule.action} locale="en" motionMode={motion} compact />
      <div className="overlay-controls">
        <button onClick={() => scheduleAction("snooze_schedule")}>+5 minutes</button>
        <button onClick={() => scheduleAction(schedule.status === "paused" ? "resume_schedule" : "pause_schedule")}>{schedule.status === "paused" ? "Resume" : "Pause"}</button>
        <button className="danger" onClick={() => scheduleAction("cancel_schedule")}>Cancel</button>
      </div>
    </main>
  );
}

export function App() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [duration, setDuration] = useState(30);
  const [action, setAction] = useState<ClockAction>("sleep");
  const [themeIndex, setThemeIndex] = useState(0);
  const [motion, setMotion] = useState<MotionMode>("subtle");
  const [simulation, setSimulation] = useState(true);
  const [absolute, setAbsolute] = useState(false);
  const [dateTime, setDateTime] = useState(() => new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16));
  const [notice, setNotice] = useState<string | null>(null);
  const [surface, setSurface] = useState<"scheduler" | "studio">("scheduler");
  const remaining = useCountdown(schedule);
  const isOverlay = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && getCurrentWindow().label === "overlay";

  useEffect(() => {
    void Promise.all([getActiveSchedule(), getCapabilities()]).then(([active, caps]) => { setSchedule(active); setCapabilities(caps); setSimulation(caps.simulation); });
    let unlisten: (() => void) | undefined;
    void listenSchedule((next) => setSchedule(next)).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  const target = useMemo(() => absolute ? new Date(dateTime).getTime() : Date.now() + duration * 60_000, [absolute, dateTime, duration]);

  if (isOverlay) return <Overlay schedule={schedule} themeIndex={themeIndex} motion={motion} />;

  const start = async () => {
    if (!Number.isFinite(target) || target <= Date.now()) { setNotice("The finish time must be in the future."); return; }
    const next = await createSchedule({ action, mode: absolute ? "absolute" : "duration", scheduledFor: target, warningOffsetMs: 5 * 60_000 });
    setSchedule(next); setNotice(`${actionLabels[action]} scheduled for ${new Date(target).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}.`); void showOverlay(true);
  };

  return (
    <main className="desktop-shell h-dot-grid" data-motion={motion}>
      <header className="app-header">
        <div className="brand"><img className="brand-mark" src="/horune-mark.png" alt="" aria-hidden="true" /><span><strong>HORUNE</strong><small>DESKTOP / LOCAL FIRST</small></span></div>
        <div className="header-actions"><span className="connection"><i /> OFFLINE READY</span><div className="view-switch" aria-label="Switch workspace"><button className={surface === "scheduler" ? "active" : ""} onClick={() => setSurface("scheduler")}>Scheduler</button><button className={surface === "studio" ? "active" : ""} onClick={() => setSurface("studio")}>Studio</button></div></div>
      </header>

      {surface === "studio" ? <ThemeStudio locale="en" storageKey="horune.theme-studio.v1.desktop" /> : <section className="dashboard">
        <div className="scheduler-panel h-card">
          <div className="panel-title"><span className="h-label">NEW SCHEDULE / 01</span><h1>When do you want to rest?</h1><p>Choose a time and Horune will handle it locally on this device.</p></div>
          <div className="mode-tabs" role="tablist" aria-label="Schedule type">
            <button className={!absolute ? "active" : ""} onClick={() => setAbsolute(false)} role="tab" aria-selected={!absolute}>After a duration</button>
            <button className={absolute ? "active" : ""} onClick={() => setAbsolute(true)} role="tab" aria-selected={absolute}>Date & time</button>
          </div>
          {!absolute ? (
            <div className="duration-control"><button onClick={() => setDuration(Math.max(5, duration - 5))}>−</button><label><input aria-label="Minutes" type="number" min="5" max="1440" value={duration} onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))} /><span>minutes</span></label><button onClick={() => setDuration(Math.min(1440, duration + 5))}>+</button></div>
          ) : <label className="datetime-control">Finish time<input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} /></label>}

          <fieldset className="action-grid"><legend>Action</legend>{(Object.keys(actionLabels) as ClockAction[]).map((item) => <button type="button" key={item} className={action === item ? "active" : ""} onClick={() => setAction(item)} disabled={capabilities ? !capabilities[item] : false}><span>{item === "sleep" ? "☾" : item === "shutdown" ? "⏻" : item === "lock" ? "▣" : "◷"}</span>{actionLabels[item]}</button>)}</fieldset>

          <div className="finish-summary"><span className="h-label">EXPECTED FINISH</span><strong>{new Date(target).toLocaleString("en", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</strong><small>Warn 5 minutes before · Never force-close other applications</small></div>
          <button className="start-button" onClick={start}>Start <span>→</span></button>
          {notice ? <p className="notice" role="status">{notice}</p> : null}
        </div>

        <aside className="preview-panel">
          <div className="preview-heading"><div><span className="h-label">FLOATING CLOCK / LIVE</span><h2>{schedule ? "Active schedule" : "Preview"}</h2></div><button className="icon-button" onClick={() => showOverlay(true)} aria-label="Open floating clock">↗</button></div>
          <ClockThemeRenderer theme={sampleThemes[themeIndex]!} remainingMs={schedule ? remaining : Math.max(0, target - Date.now())} endAt={schedule?.scheduledFor ?? target} action={schedule?.action ?? action} locale="en" motionMode={motion} />
          {schedule && schedule.status !== "cancelled" ? <div className="active-actions"><button onClick={() => scheduleAction("snooze_schedule")}>+5 minutes</button><button onClick={() => scheduleAction(schedule.status === "paused" ? "resume_schedule" : "pause_schedule")}>{schedule.status === "paused" ? "Resume" : "Pause"}</button><button className="danger" onClick={() => scheduleAction("cancel_schedule")}>Cancel schedule</button></div> : null}
          <div className="settings-row"><label>Theme<select value={themeIndex} onChange={(e) => setThemeIndex(Number(e.target.value))}>{sampleThemes.map((theme, index) => <option key={theme.id} value={index}>{theme.name}</option>)}</select></label><label>Motion<select value={motion} onChange={(e) => setMotion(e.target.value as MotionMode)}><option value="static">Static</option><option value="subtle">Subtle</option><option value="full">Full</option></select></label></div>
          <label className="simulation-toggle"><span><strong>Simulation mode</strong><small>Never run real system actions</small></span><input type="checkbox" checked={simulation} onChange={async (e) => { const enabled = e.target.checked; await setSimulationMode(enabled); setSimulation(enabled); }} /></label>
        </aside>
      </section>}
    </main>
  );
}
