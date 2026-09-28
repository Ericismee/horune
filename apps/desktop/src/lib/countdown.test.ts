import { describe, expect, it } from "vitest";
import { detectClockJump, remainingFromDeadline } from "./countdown";

describe("countdown", () => {
  it("derives remaining time from a fixed deadline", () => expect(remainingFromDeadline(60_000, 10_000)).toBe(50_000));
  it("never becomes negative", () => expect(remainingFromDeadline(10_000, 20_000)).toBe(0));
  it("detects material wall-clock jumps", () => {
    expect(detectClockJump(1_000, 100, 12_000, 1_100)).toBe(true);
    expect(detectClockJump(1_000, 100, 2_000, 1_100)).toBe(false);
  });
});
