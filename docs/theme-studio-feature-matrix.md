# Theme Studio feature matrix

This matrix is the implementation contract for Theme Studio. A control may appear in the product only when the row is **Available** or **Delivering now** and its action is wired to state, validation, and tests. “Next” and “Later” items must remain documentation, not decorative toolbar buttons.

Status definitions:

- **Available** — implemented in the shared Studio and renderer.
- **Delivering now** — being implemented but not yet accepted; no current row uses this status after the latest verified slice.
- **Next** — the next editor milestone, not present in the UI.
- **Later** — depends on a schema/rendering or backend milestone.
- **Out of scope** — intentionally not supported because it conflicts with Horune's safe declarative theme model.

## Canvas and precision

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| Overlay-sized canvas, transparent-capable preview | Available | Canvas dimensions are stored in `ThemeManifestV1`; web and desktop use the same renderer. Width and height can be edited directly or with three layout presets. |
| Zoom, grid, grid snap | Available | Zoom range and grid size are bounded. Pointer drag writes normalized coordinates. |
| Select and drag one layer | Available | Canvas and layer tree share selection; locked layers cannot be dragged. |
| Numeric position, scale, rotation, opacity and z-order | Available | Inspector exposes position, scale, rotation, layer opacity; visibility, lock and ordering are wired. |
| Keyboard nudge and large nudge | Available | Arrow keys move a selected unlocked layer by 1 px; Shift moves 10 px. |
| Duplicate, delete and deselect shortcuts | Available | Commands share the same mutations as visible UI actions and remain undoable. |
| Multi-select, marquee, resize handles, anchor point, flip | Next | Requires selection-set state and transform-handle interaction tests. |
| Align selected layer to canvas edges or center | Available | Top toolbar changes the selected layer's normalized coordinates; locked layers cannot move. |
| Rulers, guides, smart guides, distance measurement, multi-layer distribution | Next | These need dedicated canvas interactions and measurement tests. |
| Responsive constraints and resize-state testing | Later | Requires a versioned constraint model and renderer conformance tests. |
| Preview state switcher (running, paused, due, overdue) | Next | The renderer accepts schedule data, but Studio has no state switcher yet. |

## Layers, components and history

| Capability | Status | Current evidence / acceptance boundary |
| --- | --- | --- |
| Text and built-in sticker layers | Available | Maximum 24 layers; each layer is strict data, never executable content. |
| Hide, lock, order and delete | Available | Available from the layer tree/inspector and recorded in undo history. |
| Undo/redo (50 recent edits) | Available | In-memory immutable snapshots. |
| Manual local draft save/restore | Available | Versioned local-storage key; import is revalidated before restore. |
| Searchable command palette and shortcut reference | Available | Palette lists only implemented commands and never intercepts text entry. |
| Validated desktop apply and restart restore | Available | A bundled source is forked, the manifest is validated, and ID+JSON are stored atomically for the main and overlay webviews. |
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
| Save draft | Available | `Ctrl/Cmd + S` |
| Undo / redo | Available | `Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z` |
| Duplicate selected layer | Available | `Ctrl/Cmd + J` |
| Deselect | Available | `Ctrl/Cmd + D` |
| Delete selected layer | Available | `Delete` / `Backspace` |
| Nudge | Available | Arrow; hold `Shift` for 10 px |
| Zoom | Available | `+`, `-`, `0` to fit |
| Add text | Available | `T` |
| Open command palette | Available | `Ctrl/Cmd + K` |
| Move/select tool (`V`), shape tool (`U`), zoom tool (`Z`) | Next | Added only when the editor has explicit tool modes. |
| Temporary pan (`Space` + drag), Alt/Option drag duplicate | Next | Requires pan and transform gesture state. |
| Group / ungroup | Next | `Ctrl/Cmd + G`, `Ctrl/Cmd + Shift + G` after group schema lands. |

Keyboard commands are scoped to Studio. They do not run while focus is in an input, select, textarea, or editable text region, and every essential command has a visible UI route.
