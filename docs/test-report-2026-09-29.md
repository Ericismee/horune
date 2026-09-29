# Verification report — 2026-09-29

## Scope

This run investigated the reported five-minute Sleep overlay defect and verified the new schedule lifecycle, overlay UI, and desktop theme-apply path. The work started from clean `main` at `5a13652`; the supplied screenshots may come from a different binary, so conclusions were based on matching source behavior rather than assuming build identity.

No automated or manual real Sleep, shutdown, or lock action was executed. Simulation and fake adapters were used exclusively.

## Reproduction evidence

The pre-fix source had a deterministic path matching the screenshot:

1. Scheduler changed the record to `completed`/`failed`.
2. It emitted `schedule://action-result`, which the overlay did not listen to.
3. It then re-queried `active_schedule`; terminal statuses were excluded, so `schedule://changed` carried `null`.
4. Overlay rendered the literal `No active schedule` for `null`.

Theme selection was independent React state in main and overlay, matching the screenshot where main selected Orbit Digital while the floating window used Minimal Dawn. The full analysis and fixed contract are in [scheduler-overlay-lifecycle.md](scheduler-overlay-lifecycle.md).

## Checks run

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm typecheck` | Pass | Six TypeScript apps/packages |
| `pnpm test` | Pass | 20 unit tests: schema 5, renderer 2, Studio 2, desktop 11 |
| `pnpm build` | Pass | Next.js static routes and Vite desktop bundle |
| `pnpm test:e2e` | Pass in CI | 27/27 cases across desktop/tablet/mobile in [CI run #8](https://github.com/Ericismee/horune/actions/runs/36525429869); locally all cases reported OK but the process stayed open after the last case |
| `cargo fmt --check` | Pass | Rust sources formatted |
| `cargo test` | Pass in CI | Eight tests on Windows and macOS in run #8; local MSVC linker stops on missing `msvcrt.lib` before project code compiles |
| Native Tauri bundles | Pass in CI | Unsigned Windows NSIS and macOS ARM64 DMG artifacts in run #8; no local native build |
| Real Windows power action | Not run | Requires a separate manual hardware checklist and unsaved-work precautions |
| macOS hardware | Not available | Source/CI only; no physical Mac verification |

Desktop production output on this run:

- JavaScript: 378.89 kB raw / 113.75 kB gzip.
- CSS: 36.08 kB raw / 11.06 kB gzip.

These are bundle sizes, not runtime resource measurements.

## Browser UI verification

The running Vite desktop preview was inspected directly:

- Scheduler, Studio, History, theme selection, and simulation wording rendered without a Vite error overlay.
- Browser console returned no warnings or errors during the inspected flow.
- A text layer was added, validated, applied, and shown as `Minimal Dawn Custom · personal` in the main theme selector.
- Home, eye mode, and pin/unpin controls were exercised in Playwright.
- Studio top alignment, three canvas presets, quick position controls, and undo were exercised at desktop, tablet, and mobile sizes.
- The legacy literal `No active schedule` was asserted absent.
- Computed backgrounds for overlay `html`, `body`, and root were all `rgba(0, 0, 0, 0)`.
- A running overlay browser preview was captured with `omitBackground: true` at [`screenshots/overlay-browser-preview.png`](screenshots/overlay-browser-preview.png).

Browser transparency does not prove Windows desktop-through transparency, native z-order, tray restoration, or multi-monitor/DPI behavior. Those remain native acceptance items.

## Test coverage added

TypeScript tests cover terminal success/error/cancel presentation, auto-hide policy, request-versus-wake wording, custom theme validation, malicious/malformed input fallback, and unsupported manifest versions.

Rust tests in source use an in-memory SQLite database and fake OS adapter for:

- a five-minute schedule, warning, persisted due/dispatching, and simulation completion;
- adapter accepted/error/post-wake classifications;
- wake observation before a Sleep adapter returns, retained through result finalization;
- interrupted dispatch recovery without a second adapter call;
- overdue startup confirmation even inside the normal live tolerance;
- DPI scaling limits and returning saved overlay bounds to a visible monitor.

The Rust cases passed in CI #8. A repaired local Windows SDK is still required for hands-on native UI and power-management testing on this machine.

## Native acceptance still required

1. Run a short simulation schedule in the packaged Tauri app and capture running/result/auto-hidden states.
2. Verify resize, drag, Home restore, eye recovery, pin/unpin z-order, tray actions, and bounds after removing an external display.
3. Measure CPU/RAM/GPU for main, overlay, and tray in all motion modes.
4. Only then run real Sleep manually on a prepared Windows machine; confirm request dispatch and same-process wake observation separately.
5. Repeat the platform checklist on macOS before claiming hardware support.
