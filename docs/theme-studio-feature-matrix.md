# Theme Studio feature matrix

This matrix is the implementation contract for Theme Studio. A control may appear in the product only when the row is **Available** or **Delivering now** and its action is wired to state, validation, and tests. “Next” and “Later” items must remain documentation, not decorative toolbar buttons.

Status definitions:

- **Available** — implemented in the shared Studio and renderer.
- **Delivering now** — part of the current keyboard/productivity slice; it becomes Available only after tests pass.
- **Next** — the next editor milestone, not present in the UI.
- **Later** — depends on a schema/rendering or backend milestone.
- **Out of scope** — intentionally not supported because it conflicts with Horune's safe declarative theme model.

## Canvas and precision

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| Overlay-sized canvas, transparent-capable preview | Available | Canvas dimensions are stored in `ThemeManifestV1`; web and desktop use the same renderer. |
| Zoom, grid, grid snap | Available | Zoom range and grid size are bounded. Pointer drag writes normalized coordinates. |
| Select and drag one layer | Available | Canvas and layer tree share selection; locked layers cannot be dragged. |
| Numeric position, scale, rotation, opacity and z-order | Available | Inspector exposes position/scale/rotation; visibility, lock and ordering are wired. Per-layer opacity is schema-backed and renderer-supported; its inspector control is Next. |
| Keyboard nudge and large nudge | Delivering now | Arrow keys move a selected unlocked layer by 1 px; Shift moves 10 px. |
| Duplicate, delete and deselect shortcuts | Delivering now | Commands share the same mutations as visible UI actions and remain undoable. |
| Multi-select, marquee, resize handles, anchor point, flip | Next | Requires selection-set state and transform-handle interaction tests. |
| Rulers, guides, smart guides, distance measurement, align/distribute | Next | No UI is exposed yet. |
| Responsive constraints and resize-state testing | Later | Requires a versioned constraint model and renderer conformance tests. |
| Preview state switcher (running, paused, due, overdue) | Next | The renderer accepts schedule data, but Studio has no state switcher yet. |

## Layers, components and history

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| Text and built-in sticker layers | Available | Maximum 24 layers; each layer is strict data, never executable content. |
| Hide, lock, order and delete | Available | Available from the layer tree/inspector and recorded in undo history. |
| Undo/redo (50 recent edits) | Available | In-memory immutable snapshots. |
| Manual local draft save/restore | Available | Versioned local-storage key; import is revalidated before restore. |
| Searchable command palette and shortcut reference | Delivering now | Palette lists only implemented commands and never intercepts text entry. |
| Layer rename, search, group/ungroup, drag into group | Next | Needs nested layer schema and migration. |
| Autosave, crash recovery checkpoint, named versions | Next | Manual save is not represented as autosave today. |
| Reusable component/instance, override and variants | Later | Requires component identity, override semantics and cycle prevention. |
| Shared styles/design tokens and basic auto layout | Later | Requires token references and deterministic layout in the runtime renderer. |
| Real-time collaboration | Later | Comes only after shared accounts, API authorization and conflict resolution. |

## Clock and graphics

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| Digital, analog, flip, word and hybrid clock faces | Available | Renderer supports all five from the shared clock-type field. |
| Seconds/date/action toggles | Available | Schema-backed controls update the renderer. |
| Background gradient, accent, font size, overall opacity | Available | Values are bounded by the schema. |
| Separate clock anatomy (hands, hub, ticks, units, separator) | Next | Needs typed subparts rather than a monolithic clock face. |
| Typed data bindings such as `remaining.minutes` | Next | Must be an allowlisted binding enum; free expressions will not be accepted. |
| Rich text properties and box text | Next | Font catalog, line metrics and fallback behavior must be deterministic. |
| Shape primitives and safe vector paths | Next | SVG/path parser and renderer limits are prerequisites. |
| Boolean path operations and pen tool | Later | Editor-only operation may emit a bounded flattened path. Runtime boolean operations are not planned. |
| Crop, mask, blend modes and bounded color filters | Later | Only a tested allowlist can enter the manifest. |

## Motion, assets and packages

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| `static`, `subtle`, `full` motion modes | Available | Shared renderer plus `prefers-reduced-motion` fallback. |
| Bounded effect presets and maximum FPS | Available | Manifest stores preset, intensity and FPS cap. |
| Low-power quality fallback | Next | Requires desktop battery/power integration and measured thresholds. |
| PNG/WebP/GIF/safe-SVG import | Next | No upload control exists. Canonicalization, license capture and memory budgets come first. |
| Portable package with manifest/assets/thumbnail/license | Next | JSON-only export is the sole supported format today. |
| Property keyframe timeline | Later | Limited to stable position, scale, rotation, opacity and color tracks. |
| Figma import | Later | Converter for a documented node subset only; unsupported nodes produce a report. |
| PSD import | Later | Feasibility study only; flattened safe assets may be more appropriate than editable parity. |
| Arbitrary HTML/CSS/JavaScript, plugins or system commands | Out of scope | Horune will never execute creator code inside a theme. |

## Keyboard interaction

| Command | Status | Default |
| --- | --- | --- |
| Save draft | Delivering now | `Ctrl/Cmd + S` |
| Undo / redo | Delivering now | `Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z` |
| Duplicate selected layer | Delivering now | `Ctrl/Cmd + J` |
| Deselect | Delivering now | `Ctrl/Cmd + D` |
| Delete selected layer | Delivering now | `Delete` / `Backspace` |
| Nudge | Delivering now | Arrow; hold `Shift` for 10 px |
| Zoom | Delivering now | `+`, `-`, `0` to fit |
| Add text | Delivering now | `T` |
| Open command palette | Delivering now | `Ctrl/Cmd + K` |
| Move/select tool (`V`), shape tool (`U`), zoom tool (`Z`) | Next | Added only when the editor has explicit tool modes. |
| Temporary pan (`Space` + drag), Alt/Option drag duplicate | Next | Requires pan and transform gesture state. |
| Group / ungroup | Next | `Ctrl/Cmd + G`, `Ctrl/Cmd + Shift + G` after group schema lands. |

Keyboard commands are scoped to Studio. They do not run while focus is in an input, select, textarea, or editable text region, and every essential command has a visible UI route.
