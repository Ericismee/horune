import type { ClockAction } from "@horune/theme-renderer";

export type ScheduleStatus = "scheduled" | "paused" | "due" | "dispatching" | "awaiting_confirmation" | "request_sent" | "completed" | "cancelled" | "failed";

export interface Schedule {
  id: string;
  action: ClockAction;
  mode: "duration" | "absolute";
  createdAt: number;
  scheduledFor: number;
  warningOffsetMs: number;
  status: ScheduleStatus;
  simulation: boolean;
  pausedRemainingMs: number | null;
  warned: boolean;
  message: string | null;
  dispatchStartedAt: number | null;
  finishedAt: number | null;
  resultKind: string | null;
  resultDetail: string | null;
  wakeObservedAt: number | null;
}

export interface ActionResult {
  scheduleId: string;
  ok: boolean;
  simulation: boolean;
  status: ScheduleStatus;
  resultKind: string;
  detail: string;
  occurredAt: number;
}

export interface DesktopSettings {
  overlayAutoHide: boolean;
  overlayControlsTimeoutMs: number;
  overlayClockVisible: boolean;
  overlayAlwaysOnTop: boolean;
  selectedThemeId: string;
  activeThemeJson: string | null;
  motionMode: "static" | "subtle" | "full";
}

export type DesktopSettingsUpdate = Partial<DesktopSettings>;

export interface Capabilities {
  platform: string;
  sleep: boolean;
  shutdown: boolean;
  lock: boolean;
  reminder: boolean;
  simulation: boolean;
}

export interface CreateScheduleInput {
  action: ClockAction;
  mode: "duration" | "absolute";
  scheduledFor: number;
  warningOffsetMs: number;
  message?: string;
}
