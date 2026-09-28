import { describe, expect, it } from "vitest";
import { createStudioTheme, parseThemeManifest, sampleThemes, THEME_IMPORT_LIMITS } from "./index";

describe("ThemeManifestV1", () => {
  it("accepts all bundled themes", () => {
    expect(sampleThemes.map(parseThemeManifest)).toHaveLength(5);
  });

  it("rejects executable or unknown fields", () => {
    expect(() => parseThemeManifest({ ...sampleThemes[0], script: "shutdown /s" })).toThrow();
  });

  it("enforces animation and opacity budgets", () => {
    expect(() => parseThemeManifest({ ...sampleThemes[0], opacity: 0.1 })).toThrow();
    expect(() => parseThemeManifest({ ...sampleThemes[0], effect: { preset: "pulse", intensity: 5, maxFps: 120 } })).toThrow();
  });

  it("creates a strict, editable studio document", () => {
    const theme = createStudioTheme();
    theme.studio!.layers.push({
      id: "focus-label",
      kind: "text",
      content: "Focus mode",
      x: 0.5,
      y: 0.2,
      scale: 1,
      rotation: 0,
      opacity: 1,
      hidden: false,
      locked: false,
      zIndex: 1
    });
    expect(parseThemeManifest(theme).studio?.layers).toHaveLength(1);
  });

  it("rejects unsafe studio payloads and excessive layers", () => {
    const theme = createStudioTheme();
    const layer = {
      id: "safe-layer",
      kind: "text",
      content: "Safe",
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      opacity: 1,
      hidden: false,
      locked: false,
      zIndex: 1
    } as const;
    expect(() => parseThemeManifest({ ...theme, studio: { ...theme.studio, layers: [{ ...layer, html: "<script>" }] } })).toThrow();
    expect(() => parseThemeManifest({ ...theme, studio: { ...theme.studio, layers: Array.from({ length: THEME_IMPORT_LIMITS.layers + 1 }, (_, index) => ({ ...layer, id: `layer-${index}` })) } })).toThrow();
  });
});
