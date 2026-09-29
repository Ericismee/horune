import { describe, expect, it } from "vitest";
import { createStudioTheme, sampleThemes } from "@horune/theme-schema";
import type { DesktopSettings } from "../types";
import { resolveDesktopTheme } from "./theme-selection";

const settings = (update: Partial<DesktopSettings> = {}): DesktopSettings => ({
  overlayAutoHide: true,
  overlayControlsTimeoutMs: 3500,
  overlayClockVisible: true,
  overlayAlwaysOnTop: true,
  selectedThemeId: "minimal-dawn",
  activeThemeJson: null,
  motionMode: "subtle",
  ...update
});

describe("desktop theme selection", () => {
  it("loads a selected built-in theme", () => {
    expect(resolveDesktopTheme(settings({ selectedThemeId: "orbit-digital" })).theme.id).toBe("orbit-digital");
  });

  it("loads a validated custom fork atomically", () => {
    const custom = createStudioTheme(sampleThemes[4]);
    const result = resolveDesktopTheme(settings({ selectedThemeId: custom.id, activeThemeJson: JSON.stringify(custom) }));
    expect(result.state).toBe("active");
    expect(result.theme.id).toBe(custom.id);
  });

  it("keeps a safe fallback for malicious or malformed JSON", () => {
    const result = resolveDesktopTheme(settings({ selectedThemeId: "broken-custom", activeThemeJson: JSON.stringify({ schemaVersion: 1, html: "<script>bad()</script>" }) }));
    expect(result.state).toBe("invalid");
    expect(result.theme.id).toBe("minimal-dawn");
  });

  it("separates unsupported versions from invalid manifests", () => {
    const result = resolveDesktopTheme(settings({ selectedThemeId: "future-theme", activeThemeJson: JSON.stringify({ schemaVersion: 2, id: "future-theme" }) }));
    expect(result.state).toBe("unsupported_version");
    expect(result.theme.id).toBe("minimal-dawn");
  });
});
