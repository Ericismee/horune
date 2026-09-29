import type { Schedule } from "../types";

export interface OverlayResultPresentation {
  tone: "success" | "danger" | "neutral";
  title: string;
  detail: string;
  terminal: boolean;
}

export function overlayResult(schedule: Schedule | null): OverlayResultPresentation | null {
  if (!schedule) return null;
  if (schedule.status === "request_sent") {
    return {
      tone: "success",
      title: "Request sent to the operating system",
      detail: schedule.resultDetail ?? "The request process started. OS completion and resume are tracked separately.",
      terminal: true
    };
  }
  if (schedule.status === "completed") {
    if (schedule.simulation || schedule.resultKind === "simulation_completed") {
      return { tone: "success", title: "Completed in simulation mode", detail: "No system action was run.", terminal: true };
    }
    return {
      tone: "success",
      title: "Request sent to the operating system",
      detail: schedule.resultDetail ?? "The system accepted the request. Resume is recorded separately after wake.",
      terminal: true
    };
  }
  if (schedule.status === "failed") {
    return { tone: "danger", title: "Action failed", detail: schedule.resultDetail ?? "Open Horune for details before trying again.", terminal: true };
  }
  if (schedule.status === "cancelled") {
    return { tone: "neutral", title: "Schedule cancelled", detail: schedule.resultDetail ?? "The schedule remains available in history.", terminal: true };
  }
  if (schedule.status === "awaiting_confirmation") {
    return { tone: "danger", title: "Confirmation required", detail: schedule.resultDetail ?? "This schedule became overdue or its previous dispatch was interrupted.", terminal: false };
  }
  return null;
}

export function shouldAutoHideOverlay(schedule: Schedule | null, enabled: boolean): boolean {
  return Boolean(enabled && schedule && ["request_sent", "completed", "cancelled"].includes(schedule.status));
}
