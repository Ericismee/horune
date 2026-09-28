import { describe, expect, it } from "vitest";
import { formatRemaining, formatWordClock } from "./index";

describe("clock formatting", () => {
  it("formats a deadline-derived countdown", () => {
    expect(formatRemaining(3_661_000)).toBe("01:01:01");
    expect(formatRemaining(-1)).toBe("00:00:00");
  });

  it("formats word clocks in both supported locales", () => {
    expect(formatWordClock(30 * 60_000, "vi")).toBe("30 phút");
    expect(formatWordClock(61 * 60_000, "en")).toBe("1h 1m");
  });
});
