import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ActionResult,
  Capabilities,
  CreateScheduleInput,
  DesktopSettings,
  DesktopSettingsUpdate,
  Schedule
} from "./types";

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let mockSchedule: Schedule | null = null;
let mockHistory: Schedule[] = [];
let mockSettings: DesktopSettings = {
  overlayAutoHide: true,
  overlayControlsTimeoutMs: 3500,
  overlayClockVisible: true,
  overlayAlwaysOnTop: true,
  selectedThemeId: "minimal-dawn",
  activeThemeJson: null,
  motionMode: "subtle"
};

const previewRead = <T>(key: string, fallback: T): T => {
  if (typeof sessionStorage === "undefined") return fallback;
  try { return JSON.parse(sessionStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
};

const previewWrite = (key: string, value: unknown) => {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, JSON.stringify(value));
};

export async function getCapabilities(): Promise<Capabilities> {
  if (isTauri()) return invoke("get_capabilities");
  return { platform: "browser-preview", sleep: true, shutdown: true, lock: true, reminder: true, simulation: true };
}

export async function getActiveSchedule(): Promise<Schedule | null> {
  if (isTauri()) return invoke("get_active_schedule");
  mockSchedule = previewRead<Schedule | null>("horune.preview.schedule", mockSchedule);
  return mockSchedule;
}

export async function listHistory(limit = 30): Promise<Schedule[]> {
  if (isTauri()) return invoke("list_history", { limit });
  mockHistory = previewRead<Schedule[]>("horune.preview.history", mockHistory);
  return mockHistory.slice(0, limit);
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  if (isTauri()) return invoke("create_schedule", { input });
  const next: Schedule = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: Date.now(),
    status: "scheduled",
    simulation: true,
    pausedRemainingMs: null,
    warned: false,
    message: input.message ?? null,
    dispatchStartedAt: null,
    finishedAt: null,
    resultKind: null,
    resultDetail: null,
    wakeObservedAt: null
  };
  mockSchedule = next;
  mockHistory = [next, ...mockHistory];
  previewWrite("horune.preview.schedule", mockSchedule);
  previewWrite("horune.preview.history", mockHistory);
  return next;
}

export async function scheduleAction(command: "pause_schedule" | "resume_schedule" | "snooze_schedule" | "cancel_schedule" | "confirm_overdue", scheduleId?: string): Promise<Schedule | null> {
  if (isTauri()) return invoke(command, command === "snooze_schedule" ? { minutes: 5, scheduleId } : { scheduleId });
  if (!mockSchedule) return null;
  if (scheduleId && mockSchedule.id !== scheduleId) throw new Error("The selected schedule has changed. Refresh and try again.");
  if (command === "cancel_schedule") {
    mockSchedule = { ...mockSchedule, status: "cancelled", finishedAt: Date.now(), resultKind: "cancelled", resultDetail: "Cancelled in browser preview" };
  }
  if (command === "pause_schedule") {
    mockSchedule = { ...mockSchedule, status: "paused", pausedRemainingMs: Math.max(0, mockSchedule.scheduledFor - Date.now()) };
  }
  if (command === "resume_schedule") {
    mockSchedule = { ...mockSchedule, status: "scheduled", scheduledFor: Date.now() + (mockSchedule.pausedRemainingMs ?? 0), pausedRemainingMs: null };
  }
  if (command === "snooze_schedule") {
    mockSchedule = { ...mockSchedule, status: "scheduled", scheduledFor: Math.max(Date.now(), mockSchedule.scheduledFor) + 300_000, pausedRemainingMs: null };
  }
  if (command === "confirm_overdue") {
    mockSchedule = { ...mockSchedule, status: "scheduled", scheduledFor: Date.now(), warned: true };
  }
  mockHistory = [mockSchedule, ...mockHistory.filter((item) => item.id !== mockSchedule?.id)];
  previewWrite("horune.preview.schedule", mockSchedule);
  previewWrite("horune.preview.history", mockHistory);
  return mockSchedule;
}

export async function setSimulationMode(enabled: boolean): Promise<boolean> {
  return isTauri() ? invoke("set_simulation_mode", { enabled }) : enabled;
}

export async function getDesktopSettings(): Promise<DesktopSettings> {
  if (isTauri()) return invoke("get_desktop_settings");
  mockSettings = previewRead<DesktopSettings>("horune.preview.settings", mockSettings);
  return mockSettings;
}

export async function updateDesktopSettings(update: DesktopSettingsUpdate): Promise<DesktopSettings> {
  if (isTauri()) return invoke("update_desktop_settings", { update });
  mockSettings = { ...mockSettings, ...update };
  previewWrite("horune.preview.settings", mockSettings);
  return mockSettings;
}

export async function showOverlay(show: boolean): Promise<void> {
  if (isTauri()) await invoke("show_overlay", { show });
}

export async function showMainWindow(): Promise<void> {
  if (isTauri()) await invoke("show_main_window");
}

export async function listenSchedule(callback: (schedule: Schedule | null) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => undefined;
  return listen<Schedule | null>("schedule://changed", (event) => callback(event.payload));
}

export async function listenActionResult(callback: (result: ActionResult) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => undefined;
  return listen<ActionResult>("schedule://action-result", (event) => callback(event.payload));
}

export async function listenSettings(callback: (settings: DesktopSettings) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => undefined;
  return listen<DesktopSettings>("settings://changed", (event) => callback(event.payload));
}
