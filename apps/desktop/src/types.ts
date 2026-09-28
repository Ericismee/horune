import type { ClockAction } from "@horune/theme-renderer";

export type ScheduleStatus = "scheduled" | "paused" | "awaiting_confirmation" | "completed" | "cancelled" | "failed";

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
}

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
