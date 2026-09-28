import { describe, expect, it } from "vitest";
import { createStudioTheme, THEME_IMPORT_LIMITS } from "@horune/theme-schema";
import { parseThemeJson, serializeTheme, themeFileName } from "./io";

describe("theme studio import and export", () => {
  it("round-trips a validated declarative theme", () => {
    const source = createStudioTheme();
    expect(parseThemeJson(serializeTheme(source))).toEqual(source);
    expect(themeFileName(source)).toBe("minimal-dawn-custom.horune.json");
  });

  it("rejects unknown executable fields and oversized input", () => {
    const source = createStudioTheme();
    expect(() => parseThemeJson(JSON.stringify({ ...source, javascript: "alert(1)" }))).toThrow();
    expect(() => parseThemeJson(" ".repeat(THEME_IMPORT_LIMITS.jsonBytes + 1))).toThrow(/exceeds/);
  });
});
