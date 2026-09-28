import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Capabilities, CreateScheduleInput, Schedule } from "./types";

const isTauri = () => "__TAURI_INTERNALS__" in window;
let mockSchedule: Schedule | null = null;

export async function getCapabilities(): Promise<Capabilities> {
  if (isTauri()) return invoke("get_capabilities");
  return { platform: "browser-preview", sleep: true, shutdown: true, lock: true, reminder: true, simulation: true };
}

export async function getActiveSchedule(): Promise<Schedule | null> {
  return isTauri() ? invoke("get_active_schedule") : mockSchedule;
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  if (isTauri()) return invoke("create_schedule", { input });
  mockSchedule = { id: crypto.randomUUID(), ...input, createdAt: Date.now(), status: "scheduled", simulation: true, pausedRemainingMs: null, warned: false, message: input.message ?? null };
  return mockSchedule;
}

export async function scheduleAction(command: "pause_schedule" | "resume_schedule" | "snooze_schedule" | "cancel_schedule" | "confirm_overdue"): Promise<Schedule | null> {
  if (isTauri()) return invoke(command, command === "snooze_schedule" ? { minutes: 5 } : {});
  if (!mockSchedule) return null;
  if (command === "cancel_schedule") mockSchedule = { ...mockSchedule, status: "cancelled" };
  if (command === "pause_schedule") mockSchedule = { ...mockSchedule, status: "paused", pausedRemainingMs: Math.max(0, mockSchedule.scheduledFor - Date.now()) };
  if (command === "resume_schedule") mockSchedule = { ...mockSchedule, status: "scheduled", scheduledFor: Date.now() + (mockSchedule.pausedRemainingMs ?? 0), pausedRemainingMs: null };
  if (command === "snooze_schedule") mockSchedule = { ...mockSchedule, status: "scheduled", scheduledFor: mockSchedule.scheduledFor + 300_000 };
  return mockSchedule;
}

export async function setSimulationMode(enabled: boolean): Promise<boolean> {
  return isTauri() ? invoke("set_simulation_mode", { enabled }) : enabled;
}

export async function showOverlay(show: boolean): Promise<void> {
  if (isTauri()) await invoke("show_overlay", { show });
}

export async function listenSchedule(callback: (schedule: Schedule | null) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => undefined;
  return listen<Schedule | null>("schedule://changed", (event) => callback(event.payload));
}
