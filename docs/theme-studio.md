# Theme Studio

Theme Studio is a shared React editor in `packages/theme-studio`. The browser route and desktop window use the same `ThemeManifestV1`, renderer, controls, and JSON parser.

## Status legend

- **Available**: implemented in this repository and exercised by current tests/UI QA.
- **Next milestone**: designed and prioritized, but no working UI is claimed.
- **Long term**: product direction that may change after profiling and user research.

## Available now

### Clock and display

- Clock type: digital, analog, flip, word, or hybrid.
- Show/hide seconds, date, action label, and the scheduled-time line.
- Background and end-gradient colors, accent, opacity, font size, and a bounded effect preset.
- Motion preview: `static`, `subtle`, or `full`; CSS also honors `prefers-reduced-motion`.
- Canvas metadata: 280–960 px wide, 140–640 px high, and a bounded grid size.

### Layers

Text and built-in sticker layers can be added up to a maximum of 24. A layer stores normalized `x/y` coordinates, scale, rotation, opacity, visibility, lock state, and z-index. The editor supports selection, pointer dragging, numeric position editing, scale/rotate controls, hide/show, lock/unlock, bring forward/send back, and delete.

The current icon/sticker content is built into the editor. There is no external image upload button yet.

### Editing workflow

- Canvas zoom from 60% to 140%.
- Grid visibility and drag snapping.
- Undo/redo with the most recent 50 editing states.
- Device-local draft save and restore through versioned local-storage keys.
- Reset to the source theme.
- Strict JSON export and import with a 256 KiB input limit.

Drafts are local to an origin/application today; web-to-desktop sync is planned with accounts.

## Import and export today

The only supported external format in the current UI is JSON matching `ThemeManifestV1`. Files normally use the `.horune.json` suffix. Parsing rejects unknown fields, invalid IDs/colors, out-of-range values, more than 24 layers, and any field that attempts to introduce executable behavior.

Minimal Studio excerpt (a complete manifest also includes palette, typography, layout, effect, and audio):

```json
{
  "schemaVersion": 1,
  "id": "quiet-night-custom",
  "name": "Quiet Night Custom",
  "description": "A local Studio draft.",
  "category": "digital",
  "palette": {
    "background": "#111827",
    "foreground": "#f9fafb",
    "accent": "#a3e635",
    "muted": "#64748b"
  },
  "typography": { "family": "mono", "weight": 700, "tracking": 0 },
  "layout": { "align": "center", "density": "comfortable", "radius": 24 },
  "opacity": 0.95,
  "effect": { "preset": "pulse", "intensity": 0.3, "maxFps": 30 },
  "audio": { "cue": "soft-chime", "volume": 0.4 },
  "studio": {
    "clock": {
      "type": "hybrid",
      "showSeconds": true,
      "showDate": true,
      "showCountdown": true,
      "showAction": true
    },
    "canvas": { "width": 560, "height": 260, "gridSize": 8 },
    "appearance": {
      "backgroundEnd": "#312e81",
      "gradientAngle": 135,
      "fontSize": 82,
      "gap": 12,
      "frameWidth": 0,
      "frameColor": "#f9fafb",
      "shadow": "glow",
      "label": ""
    },
    "layers": []
  }
}
```

## Next milestone

- PNG and WebP import after header decoding, dimension/byte checks, metadata stripping, license capture, and safe re-encoding.
- Animated GIF import with decoded dimensions, frame count, duration, FPS, byte, and memory budgets; static fallback generation.
- Safe SVG subset with XML parsing, element/attribute allowlists, reference flattening, and raster fallback. Scripts, events, external references, filters with unbounded cost, and embedded HTML remain forbidden.
- Resize handles, multi-select, grouping/ungrouping, alignment/distribution, guides, keyboard nudging, and layer duplication.
- Autosave versions, named recovery points, theme duplication, and asset-aware portable export bundles.
- Battery/low-power detection, automatic `quality="low"`, and measurable theme performance warnings.
- Validated asset preview shared with the backend ingestion pipeline.

### Figma and external UI conversion

Figma import is planned only as a converter to ThemeManifest data. A converter may map verified frames, text styles, fills, safe vector paths, and image assets into supported fields. Unsupported nodes must produce a report, not executable fallback content. HTML/CSS import, if explored, follows the same rule: parse an allowlisted subset in an isolated conversion service and emit a manifest; never load or run the source document in Horune.

## Long term

- Keyframe/preset timeline with bounded properties and frame rates.
- Reusable components, constraints, responsive overlay variants, and richer typography.
- Collaborative drafts, review comments, publishing, moderation, attribution, and remix lineage.
- Creator asset libraries, version updates, and marketplace packaging.

These ideas are not available until code, tests, and status documentation say otherwise.

## Compatibility rules

`schemaVersion` is required. Readers must reject unsupported future major versions instead of guessing. Compatible additive behavior should use optional fields or a new parser migration that produces the current in-memory model. Export always writes a fully validated manifest. Marketplace/shared themes will pass the same parser and asset pipeline as local imports; purchase does not weaken validation.
