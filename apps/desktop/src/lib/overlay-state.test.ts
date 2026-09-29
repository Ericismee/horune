import { describe, expect, it } from "vitest";
import type { Schedule } from "../types";
import { overlayResult, shouldAutoHideOverlay } from "./overlay-state";

const schedule = (status: Schedule["status"], update: Partial<Schedule> = {}): Schedule => ({
  id: "schedule-5-minutes",
  action: "sleep",
  mode: "duration",
  createdAt: 0,
  scheduledFor: 300_000,
  warningOffsetMs: 60_000,
  status,
  simulation: true,
  pausedRemainingMs: null,
  warned: true,
  message: null,
  dispatchStartedAt: status === "dispatching" ? 300_000 : null,
  finishedAt: status === "completed" ? 300_001 : null,
  resultKind: status === "completed" ? "simulation_completed" : null,
  resultDetail: null,
  wakeObservedAt: null,
  ...update
});

describe("overlay terminal state", () => {
  it("keeps the completed record even though it is no longer active", () => {
    const result = overlayResult(schedule("completed"));
    expect(result?.title).toBe("Completed in simulation mode");
    expect(shouldAutoHideOverlay(schedule("completed"), true)).toBe(true);
  });

  it("never auto-hides an error", () => {
    const failed = schedule("failed", { simulation: false, resultDetail: "Access denied" });
    expect(overlayResult(failed)?.detail).toBe("Access denied");
    expect(shouldAutoHideOverlay(failed, true)).toBe(false);
  });

  it("follows the same preference after cancellation", () => {
    expect(shouldAutoHideOverlay(schedule("cancelled"), true)).toBe(true);
    expect(shouldAutoHideOverlay(schedule("cancelled"), false)).toBe(false);
  });

  it("distinguishes accepted native requests from wake confirmation", () => {
    const native = schedule("request_sent", { simulation: false, resultKind: "sleep_request_started", resultDetail: "Request started; wake has not been observed." });
    expect(overlayResult(native)?.title).toContain("operating system");
    expect(overlayResult(native)?.detail).toContain("wake has not been observed");
  });
});
