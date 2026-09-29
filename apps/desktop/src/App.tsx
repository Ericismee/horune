import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ClockThemeRenderer, type ClockAction } from "@horune/theme-renderer";
import { sampleThemes, type ThemeManifestV1 } from "@horune/theme-schema";
import { ThemeStudio } from "@horune/theme-studio";
import {
  createSchedule,
  getActiveSchedule,
  getCapabilities,
  getDesktopSettings,
  isTauri,
  listenActionResult,
  listenSchedule,
  listenSettings,
  listHistory,
  scheduleAction,
  setSimulationMode,
  showMainWindow,
  showOverlay,
  updateDesktopSettings
} from "./bridge";
import { detectClockJump, remainingFromDeadline } from "./lib/countdown";
import { overlayResult, shouldAutoHideOverlay } from "./lib/overlay-state";
import { resolveDesktopTheme } from "./lib/theme-selection";
import type { Capabilities, DesktopSettings, Schedule } from "./types";

const actionLabels = { sleep: "Sleep", shutdown: "Shut down", lock: "Lock screen", reminder: "Reminder" } as const;
const defaultSettings: DesktopSettings = {
  overlayAutoHide: true,
  overlayControlsTimeoutMs: 3500,
  overlayClockVisible: true,
  overlayAlwaysOnTop: true,
  selectedThemeId: "minimal-dawn",
  activeThemeJson: null,
  motionMode: "subtle"
};

function useCountdown(schedule: Schedule | null) {
  const [now, setNow] = useState(Date.now());
  const anchor = useRef({ wall: Date.now(), mono: performance.now() });
  useEffect(() => {
    if (!schedule || !matchesLiveStatus(schedule.status)) return;
    let timer: number | undefined;
    const tick = () => {
      const wall = Date.now();
      const mono = performance.now();
      if (detectClockJump(anchor.current.wall, anchor.current.mono, wall, mono)) void getActiveSchedule();
      anchor.current = { wall, mono };
      setNow(wall);
    };
    const syncVisibility = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
      tick();
      if (!document.hidden) timer = window.setInterval(tick, 500);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [schedule?.id, schedule?.status]);
  if (!schedule) return 0;
  if (schedule.status === "paused") return schedule.pausedRemainingMs ?? 0;
  return remainingFromDeadline(schedule.scheduledFor, now);
}

function matchesLiveStatus(status: Schedule["status"]) {
  return ["scheduled", "due", "dispatching"].includes(status);
}

function Overlay({ schedule, settings, theme, onSettingsChange }: { schedule: Schedule | null; settings: DesktopSettings; theme: ThemeManifestV1; onSettingsChange: (settings: DesktopSettings) => void }) {
  const remaining = useCountdown(schedule);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [commandError, setCommandError] = useState<string | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const overlayRef = useRef<HTMLElement | null>(null);
  const result = overlayResult(schedule);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    const tryHide = () => {
      const root = overlayRef.current;
      const controlsAreInUse = root?.querySelector(":focus-within, .overlay-toolbar:hover, .overlay-controls:hover, .overlay-result:hover");
      if (controlsAreInUse) {
        hideTimer.current = window.setTimeout(tryHide, 500);
      } else {
        setControlsVisible(false);
      }
    };
    hideTimer.current = window.setTimeout(tryHide, settings.overlayControlsTimeoutMs);
  }, [settings.overlayControlsTimeoutMs]);

  useEffect(() => {
    revealControls();
    return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, [revealControls]);

  useEffect(() => {
    if (!shouldAutoHideOverlay(schedule, settings.overlayAutoHide)) return;
    const timer = window.setTimeout(() => void showOverlay(false), 2400);
    return () => window.clearTimeout(timer);
  }, [schedule?.id, schedule?.status, settings.overlayAutoHide]);

  const setSetting = async (update: Partial<DesktopSettings>) => {
    revealControls();
    onSettingsChange(await updateDesktopSettings(update));
  };

  const runAction = async (command: Parameters<typeof scheduleAction>[0], scheduleId: string) => {
    try { setCommandError(null); await scheduleAction(command, scheduleId); }
    catch (error) { setCommandError(error instanceof Error ? error.message : String(error)); }
  };

  const startResize = (direction: "NorthWest" | "NorthEast" | "SouthWest" | "SouthEast") => {
    if (isTauri()) void getCurrentWindow().startResizeDragging(direction);
  };

  const canMutate = schedule && ["scheduled", "paused", "awaiting_confirmation"].includes(schedule.status);
  const clockVisible = settings.overlayClockVisible && schedule !== null;

  return (
    <main
      ref={overlayRef}
      className={`overlay-root ${controlsVisible ? "controls-visible" : "controls-hidden"}`}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onFocusCapture={revealControls}
      onBlurCapture={revealControls}
      onContextMenu={revealControls}
    >
      <div className="overlay-drag-region" data-tauri-drag-region aria-label="Drag floating clock" />
      <nav className="overlay-toolbar" aria-label="Floating clock controls">
        <button type="button" onClick={() => void showMainWindow()} title="Open Horune home" aria-label="Open Horune home">⌂</button>
        <button type="button" onClick={() => void setSetting({ overlayClockVisible: !settings.overlayClockVisible })} title={clockVisible ? "Show icon only" : "Show clock"} aria-label={clockVisible ? "Show icon only" : "Show clock"}>{clockVisible ? "◉" : "◌"}</button>
        <button type="button" className={settings.overlayAlwaysOnTop ? "is-active" : ""} onClick={() => void setSetting({ overlayAlwaysOnTop: !settings.overlayAlwaysOnTop })} title={settings.overlayAlwaysOnTop ? "Unpin from always on top" : "Keep always on top"} aria-label={settings.overlayAlwaysOnTop ? "Unpin floating clock" : "Pin floating clock"} aria-pressed={settings.overlayAlwaysOnTop}>⌖</button>
      </nav>

      {clockVisible && schedule ? (
        <ClockThemeRenderer theme={theme} remainingMs={remaining} endAt={schedule.scheduledFor} action={schedule.action} locale="en" motionMode={settings.motionMode} compact />
      ) : (
        <button type="button" className="overlay-icon-mode" onClick={revealControls} onDoubleClick={() => void showMainWindow()} aria-label="Horune floating clock; double click to open the main app">
          <img src="/horune-mark.png" alt="Horune" />
          {!schedule ? <span>No schedule is running</span> : <span>Show clock</span>}
        </button>
      )}

      {result ? <section className={`overlay-result ${result.tone}`} role={result.tone === "danger" ? "alert" : "status"}><strong>{result.title}</strong><small>{result.detail}</small>{schedule?.status === "awaiting_confirmation" ? <button type="button" onClick={() => void runAction("confirm_overdue", schedule.id)}>Confirm action</button> : null}{schedule?.status === "failed" ? <button type="button" onClick={() => void showMainWindow()}>View details</button> : null}</section> : null}
      {commandError ? <p className="overlay-command-error" role="alert">{commandError}</p> : null}

      {canMutate ? <div className="overlay-controls">
        <button type="button" onClick={() => void runAction("snooze_schedule", schedule.id)}>+5 minutes</button>
        {schedule.status !== "awaiting_confirmation" ? <button type="button" onClick={() => void runAction(schedule.status === "paused" ? "resume_schedule" : "pause_schedule", schedule.id)}>{schedule.status === "paused" ? "Resume" : "Pause"}</button> : null}
        <button type="button" className="danger" onClick={() => void runAction("cancel_schedule", schedule.id)}>Cancel</button>
      </div> : null}

      {(["NorthWest", "NorthEast", "SouthWest", "SouthEast"] as const).map((direction) => <button key={direction} type="button" tabIndex={-1} aria-hidden="true" className={`resize-handle ${direction.toLowerCase()}`} onPointerDown={() => startResize(direction)} />)}
    </main>
  );
}

export function App() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [history, setHistory] = useState<Schedule[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [settings, setSettings] = useState<DesktopSettings>(defaultSettings);
  const [duration, setDuration] = useState(30);
  const [action, setAction] = useState<ClockAction>("sleep");
  const [simulation, setSimulation] = useState(true);
  const [absolute, setAbsolute] = useState(false);
  const [dateTime, setDateTime] = useState(() => new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16));
  const [notice, setNotice] = useState<string | null>(null);
  const [surface, setSurface] = useState<"scheduler" | "studio" | "history">("scheduler");
  const remaining = useCountdown(schedule);
  const isOverlay = new URLSearchParams(window.location.search).get("surface") === "overlay" || (isTauri() && getCurrentWindow().label === "overlay");
  const resolvedTheme = useMemo(() => resolveDesktopTheme(settings), [settings]);

  const refreshHistory = useCallback(() => void listHistory().then(setHistory), []);

  useEffect(() => {
    void Promise.all([getActiveSchedule(), getCapabilities(), getDesktopSettings(), listHistory()])
      .then(([active, caps, desktopSettings, records]) => {
        setSchedule(active);
        setCapabilities(caps);
        setSimulation(caps.simulation);
        setSettings(desktopSettings);
        setHistory(records);
      })
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : String(error)));
    let stopSchedule: (() => void) | undefined;
    let stopSettings: (() => void) | undefined;
    let stopResult: (() => void) | undefined;
    void listenSchedule((next) => { setSchedule(next); refreshHistory(); }).then((stop) => { stopSchedule = stop; });
    void listenSettings(setSettings).then((stop) => { stopSettings = stop; });
    void listenActionResult(() => refreshHistory()).then((stop) => { stopResult = stop; });
    return () => { stopSchedule?.(); stopSettings?.(); stopResult?.(); };
  }, [refreshHistory]);

  const target = useMemo(() => absolute ? new Date(dateTime).getTime() : Date.now() + duration * 60_000, [absolute, dateTime, duration]);

  if (isOverlay) return <Overlay schedule={schedule} settings={settings} theme={resolvedTheme.theme} onSettingsChange={setSettings} />;

  const start = async () => {
    try {
      if (!Number.isFinite(target) || target <= Date.now()) { setNotice("The finish time must be in the future."); return; }
      const next = await createSchedule({ action, mode: absolute ? "absolute" : "duration", scheduledFor: target, warningOffsetMs: 5 * 60_000 });
      setSchedule(next);
      setNotice(`${actionLabels[action]} scheduled for ${new Date(target).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}. ${next.simulation ? "Simulation is ON." : "Simulation is OFF; a real system request will be sent."}`);
      refreshHistory();
      await showOverlay(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };

  const selectBuiltInTheme = async (themeId: string) => {
    try {
      const next = await updateDesktopSettings({ selectedThemeId: themeId, activeThemeJson: null });
      setSettings(next);
      setNotice(`${sampleThemes.find((theme) => theme.id === themeId)?.name ?? "Theme"} is now active in preview and overlay.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };

  const applyStudioTheme = async (theme: ThemeManifestV1) => {
    const next = await updateDesktopSettings({ selectedThemeId: theme.id, activeThemeJson: JSON.stringify(theme) });
    setSettings(next);
    setNotice(`${theme.name} was validated and applied atomically. The built-in source remains unchanged.`);
  };

  const updateSetting = async (update: Partial<DesktopSettings>) => {
    try { setSettings(await updateDesktopSettings(update)); }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };

  const scheduleIsMutable = schedule && ["scheduled", "paused", "awaiting_confirmation"].includes(schedule.status);
  const runAction = async (command: Parameters<typeof scheduleAction>[0], scheduleId: string) => {
    try { await scheduleAction(command, scheduleId); refreshHistory(); }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };

  return (
    <main className="desktop-shell h-dot-grid" data-motion={settings.motionMode}>
      <header className="app-header">
        <div className="brand"><img className="brand-mark" src="/horune-mark.png" alt="" aria-hidden="true" /><span><strong>HORUNE</strong><small>DESKTOP / LOCAL FIRST</small></span></div>
        <div className="header-actions"><span className="connection"><i /> OFFLINE READY</span><div className="view-switch" aria-label="Switch workspace"><button className={surface === "scheduler" ? "active" : ""} onClick={() => setSurface("scheduler")}>Scheduler</button><button className={surface === "studio" ? "active" : ""} onClick={() => setSurface("studio")}>Studio</button><button className={surface === "history" ? "active" : ""} onClick={() => { setSurface("history"); refreshHistory(); }}>History</button></div></div>
      </header>

      {notice && surface !== "scheduler" ? <p className="global-notice" role="status">{notice}</p> : null}

      {surface === "studio" ? <ThemeStudio key={resolvedTheme.theme.id} locale="en" initialTheme={resolvedTheme.theme} storageKey="horune.theme-studio.v1.desktop" onApplyTheme={applyStudioTheme} /> : null}

      {surface === "history" ? <section className="history-view"><span className="h-label">LOCAL HISTORY</span><h1>Schedule results stay on this device.</h1><p>Completed, failed, cancelled, and interrupted dispatches are retained instead of disappearing from the overlay.</p><div className="history-list">{history.length ? history.map((item) => <article key={item.id}><div><strong>{actionLabels[item.action]}</strong><code>{item.id.slice(0, 8)}</code></div><span className={`status status-${item.status}`}>{item.status.replaceAll("_", " ")}</span><time>{new Date(item.scheduledFor).toLocaleString("en")}</time><small>{item.resultDetail ?? (item.simulation ? "Simulation schedule" : "Real system action schedule")}</small></article>) : <p>No schedules yet.</p>}</div></section> : null}

      {surface === "scheduler" ? <section className="dashboard">
        <div className="scheduler-panel h-card">
          <div className="panel-title"><span className="h-label">NEW SCHEDULE / 01</span><h1>When should this computer rest?</h1><p>Choose an exact finish time. The single local scheduler continues without an account or internet connection.</p></div>
          <div className="mode-tabs" role="tablist" aria-label="Schedule type"><button className={!absolute ? "active" : ""} onClick={() => setAbsolute(false)} role="tab" aria-selected={!absolute}>After a duration</button><button className={absolute ? "active" : ""} onClick={() => setAbsolute(true)} role="tab" aria-selected={absolute}>Date & time</button></div>
          {!absolute ? <div className="duration-control"><button onClick={() => setDuration(Math.max(1, duration - 5))}>−</button><label><input aria-label="Minutes" type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(Math.max(1, Number(event.target.value)))} /><span>minutes</span></label><button onClick={() => setDuration(Math.min(1440, duration + 5))}>+</button></div> : <label className="datetime-control">Finish time<input type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} /></label>}
          <fieldset className="action-grid"><legend>Action</legend>{(Object.keys(actionLabels) as ClockAction[]).map((item) => <button type="button" key={item} className={action === item ? "active" : ""} onClick={() => setAction(item)} disabled={capabilities ? !capabilities[item] : false}><span>{item === "sleep" ? "☾" : item === "shutdown" ? "⏻" : item === "lock" ? "▣" : "◷"}</span>{actionLabels[item]}</button>)}</fieldset>
          <div className="finish-summary"><span className="h-label">EXPECTED FINISH</span><strong>{new Date(target).toLocaleString("en", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</strong><small>Warn 5 minutes before · Never force-close other applications</small></div>
          <button className="start-button" onClick={start}>Start <span>→</span></button>
          {notice ? <p className="notice" role="status">{notice}</p> : null}
        </div>

        <aside className="preview-panel">
          <div className="preview-heading"><div><span className="h-label">FLOATING CLOCK / LIVE</span><h2>{schedule ? `Schedule · ${schedule.status.replaceAll("_", " ")}` : "Theme preview"}</h2></div><button className="icon-button" onClick={() => void showOverlay(true)} aria-label="Open floating clock">↗</button></div>
          <ClockThemeRenderer theme={resolvedTheme.theme} remainingMs={schedule ? remaining : Math.max(0, target - Date.now())} endAt={schedule?.scheduledFor ?? target} action={schedule?.action ?? action} locale="en" motionMode={settings.motionMode} />
          {resolvedTheme.detail ? <p className="theme-error" role="alert">{resolvedTheme.detail}</p> : null}
          {scheduleIsMutable ? <div className="active-actions"><button onClick={() => void runAction("snooze_schedule", schedule.id)}>+5 minutes</button>{schedule.status !== "awaiting_confirmation" ? <button onClick={() => void runAction(schedule.status === "paused" ? "resume_schedule" : "pause_schedule", schedule.id)}>{schedule.status === "paused" ? "Resume" : "Pause"}</button> : <button onClick={() => void runAction("confirm_overdue", schedule.id)}>Confirm</button>}<button className="danger" onClick={() => void runAction("cancel_schedule", schedule.id)}>Cancel schedule</button></div> : null}
          <div className="settings-row"><label>Theme<select value={sampleThemes.some((theme) => theme.id === settings.selectedThemeId) ? settings.selectedThemeId : "custom"} onChange={(event) => { if (event.target.value !== "custom") void selectBuiltInTheme(event.target.value); }}>{!sampleThemes.some((theme) => theme.id === settings.selectedThemeId) ? <option value="custom">{resolvedTheme.theme.name} · personal</option> : null}{sampleThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select><small>{resolvedTheme.state === "active" ? "Valid · active" : resolvedTheme.state.replaceAll("_", " ")}</small></label><label>Motion<select value={settings.motionMode} onChange={(event) => void updateSetting({ motionMode: event.target.value as DesktopSettings["motionMode"] })}><option value="static">Static</option><option value="subtle">Subtle</option><option value="full">Full</option></select><small>Reduced motion still wins.</small></label></div>
          <label className="simulation-toggle"><span><strong>Simulation mode {simulation ? "ON" : "OFF"}</strong><small>{schedule ? `Current schedule: ${schedule.simulation ? "simulation" : "real OS request"}. Changes apply to the next schedule.` : "When on, system actions are never executed."}</small></span><input aria-label="Simulation mode" type="checkbox" checked={simulation} onChange={async (event) => { const enabled = event.target.checked; setSimulation(await setSimulationMode(enabled)); }} /></label>
          <details className="overlay-settings"><summary>Floating clock behavior</summary><label><input type="checkbox" checked={settings.overlayAutoHide} onChange={(event) => void updateSetting({ overlayAutoHide: event.target.checked })} /> Hide after a successful result or cancellation</label><label><input type="checkbox" checked={settings.overlayAlwaysOnTop} onChange={(event) => void updateSetting({ overlayAlwaysOnTop: event.target.checked })} /> Keep above other windows</label><label>Controls hide after <select value={settings.overlayControlsTimeoutMs} onChange={(event) => void updateSetting({ overlayControlsTimeoutMs: Number(event.target.value) })}><option value="2000">2 seconds</option><option value="3500">3.5 seconds</option><option value="6000">6 seconds</option><option value="10000">10 seconds</option></select></label></details>
        </aside>
      </section> : null}
    </main>
  );
}
