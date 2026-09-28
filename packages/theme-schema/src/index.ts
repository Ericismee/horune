import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color");
const safeId = z.string().min(2).max(64).regex(/^[a-z0-9][a-z0-9-]*$/);

export const themeLayerV1Schema = z.object({
  id: safeId,
  kind: z.enum(["text", "sticker", "icon"]),
  content: z.string().min(1).max(80),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.25).max(4),
  rotation: z.number().min(-180).max(180),
  opacity: z.number().min(0.1).max(1),
  hidden: z.boolean(),
  locked: z.boolean(),
  zIndex: z.number().int().min(0).max(99)
}).strict();

export const themeStudioV1Schema = z.object({
  clock: z.object({
    type: z.enum(["digital", "analog", "flip", "word", "hybrid"]),
    showSeconds: z.boolean(),
    showDate: z.boolean(),
    showCountdown: z.boolean(),
    showAction: z.boolean()
  }).strict(),
  canvas: z.object({
    width: z.number().int().min(280).max(960),
    height: z.number().int().min(140).max(640),
    gridSize: z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(16), z.literal(24)])
  }).strict(),
  appearance: z.object({
    backgroundEnd: hex,
    gradientAngle: z.number().int().min(0).max(360),
    fontSize: z.number().int().min(28).max(160),
    gap: z.number().int().min(0).max(48),
    frameWidth: z.number().int().min(0).max(12),
    frameColor: hex,
    shadow: z.enum(["none", "soft", "hard", "glow"]),
    label: z.string().max(40)
  }).strict(),
  layers: z.array(themeLayerV1Schema).max(24)
}).strict();

export const themeManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  name: z.string().min(2).max(64),
  description: z.string().max(180),
  category: z.enum(["minimal", "digital", "flip", "paper", "neon"]),
  palette: z.object({
    background: hex,
    foreground: hex,
    accent: hex,
    muted: hex
  }),
  typography: z.object({
    family: z.enum(["sans", "mono"]),
    weight: z.number().int().min(400).max(900),
    tracking: z.number().min(-0.08).max(0.2)
  }),
  layout: z.object({
    align: z.enum(["left", "center"]),
    density: z.enum(["compact", "comfortable"]),
    radius: z.number().int().min(0).max(32)
  }),
  opacity: z.number().min(0.45).max(1),
  effect: z.object({
    preset: z.enum(["none", "pulse", "scanline", "flip", "grain", "orbit"]),
    intensity: z.number().min(0).max(1),
    maxFps: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(60)])
  }),
  audio: z.object({
    cue: z.enum(["none", "soft-chime", "digital-beep"]),
    volume: z.number().min(0).max(1)
  }),
  studio: themeStudioV1Schema.optional()
}).strict();

export type ThemeManifestV1 = z.infer<typeof themeManifestV1Schema>;
export type ThemeLayerV1 = z.infer<typeof themeLayerV1Schema>;
export type ThemeStudioV1 = z.infer<typeof themeStudioV1Schema>;

export const defaultStudio: ThemeStudioV1 = {
  clock: { type: "digital", showSeconds: true, showDate: false, showCountdown: true, showAction: true },
  canvas: { width: 560, height: 260, gridSize: 8 },
  appearance: {
    backgroundEnd: "#e9edff",
    gradientAngle: 135,
    fontSize: 82,
    gap: 12,
    frameWidth: 0,
    frameColor: "#171713",
    shadow: "soft",
    label: ""
  },
  layers: []
};

export const THEME_IMPORT_LIMITS = {
  jsonBytes: 256 * 1024,
  layers: 24,
  assetBytes: 2 * 1024 * 1024,
  totalAssetBytes: 8 * 1024 * 1024,
  width: 2048,
  height: 2048,
  gifFrames: 120,
  maxFps: 60
} as const;

export const sampleThemes: ThemeManifestV1[] = [
  {
    schemaVersion: 1, id: "minimal-dawn", name: "Minimal Dawn", description: "Quiet focus with a warm sunrise accent.", category: "minimal",
    palette: { background: "#fffdf6", foreground: "#171713", accent: "#ffb84d", muted: "#d8d3c5" },
    typography: { family: "sans", weight: 800, tracking: -0.04 }, layout: { align: "left", density: "comfortable", radius: 22 }, opacity: 0.96,
    effect: { preset: "pulse", intensity: 0.22, maxFps: 15 }, audio: { cue: "soft-chime", volume: 0.5 }
  },
  {
    schemaVersion: 1, id: "flip-mono", name: "Flip Mono", description: "A tactile split-flap clock without visual noise.", category: "flip",
    palette: { background: "#181816", foreground: "#f7f8f2", accent: "#d6ff3f", muted: "#4b4d46" },
    typography: { family: "mono", weight: 700, tracking: -0.06 }, layout: { align: "center", density: "compact", radius: 10 }, opacity: 0.97,
    effect: { preset: "flip", intensity: 0.5, maxFps: 30 }, audio: { cue: "digital-beep", volume: 0.35 }
  },
  {
    schemaVersion: 1, id: "grid-paper", name: "Grid Paper", description: "A hand-planned timer on crisp graph paper.", category: "paper",
    palette: { background: "#f4f0e7", foreground: "#20201d", accent: "#ff6b57", muted: "#b7b4aa" },
    typography: { family: "mono", weight: 700, tracking: -0.02 }, layout: { align: "left", density: "comfortable", radius: 4 }, opacity: 0.95,
    effect: { preset: "grain", intensity: 0.2, maxFps: 15 }, audio: { cue: "soft-chime", volume: 0.45 }
  },
  {
    schemaVersion: 1, id: "neon-pulse", name: "Neon Pulse", description: "Electric color with a readable midnight face.", category: "neon",
    palette: { background: "#110b26", foreground: "#f9f4ff", accent: "#b65cff", muted: "#564170" },
    typography: { family: "sans", weight: 800, tracking: 0.02 }, layout: { align: "center", density: "comfortable", radius: 28 }, opacity: 0.94,
    effect: { preset: "pulse", intensity: 0.62, maxFps: 30 }, audio: { cue: "digital-beep", volume: 0.4 }
  },
  {
    schemaVersion: 1, id: "orbit-digital", name: "Orbit Digital", description: "A technical dial that keeps the numbers first.", category: "digital",
    palette: { background: "#071c26", foreground: "#e8fbff", accent: "#42d9d0", muted: "#31515c" },
    typography: { family: "mono", weight: 700, tracking: 0.05 }, layout: { align: "center", density: "compact", radius: 32 }, opacity: 0.95,
    effect: { preset: "orbit", intensity: 0.5, maxFps: 30 }, audio: { cue: "digital-beep", volume: 0.4 }
  }
];

export function parseThemeManifest(input: unknown): ThemeManifestV1 {
  return themeManifestV1Schema.parse(input);
}

export function createStudioTheme(source: ThemeManifestV1 = sampleThemes[0]!): ThemeManifestV1 {
  return parseThemeManifest({
    ...structuredClone(source),
    id: source.studio ? source.id : `${source.id.slice(0, 57)}-custom`,
    name: source.studio ? source.name : `${source.name} Custom`,
    studio: source.studio ?? structuredClone(defaultStudio)
  });
}
