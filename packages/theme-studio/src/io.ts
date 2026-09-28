import { parseThemeManifest, THEME_IMPORT_LIMITS, type ThemeManifestV1 } from "@horune/theme-schema";

export function serializeTheme(theme: ThemeManifestV1): string {
  return `${JSON.stringify(parseThemeManifest(theme), null, 2)}\n`;
}

export function parseThemeJson(json: string): ThemeManifestV1 {
  if (new TextEncoder().encode(json).byteLength > THEME_IMPORT_LIMITS.jsonBytes) {
    throw new Error(`Theme JSON exceeds ${THEME_IMPORT_LIMITS.jsonBytes / 1024} KiB`);
  }
  return parseThemeManifest(JSON.parse(json) as unknown);
}

export function themeFileName(theme: ThemeManifestV1): string {
  return `${theme.id.replace(/[^a-z0-9-]/g, "-")}.horune.json`;
}
