import { parseThemeManifest, sampleThemes, type ThemeManifestV1 } from "@horune/theme-schema";
import type { DesktopSettings } from "../types";

export type ThemeLoadState = "active" | "invalid" | "unsupported_version";

export interface ResolvedTheme {
  theme: ThemeManifestV1;
  state: ThemeLoadState;
  detail: string | null;
}

const fallback = sampleThemes[0]!;

export function resolveDesktopTheme(settings: DesktopSettings): ResolvedTheme {
  const builtIn = sampleThemes.find((theme) => theme.id === settings.selectedThemeId);
  if (builtIn) return { theme: builtIn, state: "active", detail: null };
  if (!settings.activeThemeJson) {
    return { theme: fallback, state: "invalid", detail: "The selected custom theme is missing. Minimal Dawn is active." };
  }
  try {
    const raw: unknown = JSON.parse(settings.activeThemeJson);
    if (typeof raw === "object" && raw !== null && "schemaVersion" in raw && (raw as { schemaVersion?: unknown }).schemaVersion !== 1) {
      return { theme: fallback, state: "unsupported_version", detail: "This theme uses an unsupported manifest version. Minimal Dawn is active." };
    }
    const parsed = parseThemeManifest(raw);
    if (parsed.id !== settings.selectedThemeId) {
      return { theme: fallback, state: "invalid", detail: "The stored theme ID does not match the active selection. Minimal Dawn is active." };
    }
    return { theme: parsed, state: "active", detail: null };
  } catch (error) {
    return {
      theme: fallback,
      state: "invalid",
      detail: `The custom theme failed validation. Minimal Dawn is active. ${error instanceof Error ? error.message : ""}`.trim()
    };
  }
}
