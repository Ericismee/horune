# Testing

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Native checks, when the host permits Cargo executables:

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm tauri build
```

## Current verified scope

On 2026-09-29 the TypeScript typecheck passed for all six packages/apps. Twenty unit tests passed:

- `theme-schema`: bundled themes, strict unknown-field rejection, opacity/animation bounds, Studio document, unsafe/excess layer rejection (5).
- `theme-renderer`: deadline and bilingual word-clock formatting (2).
- `theme-studio`: validated JSON round-trip, unknown executable field and size rejection (2).
- `desktop`: deadline countdown, pause/resume, snooze/clock-jump behavior; terminal overlay presentation/auto-hide; native-request wording; validated custom themes; malformed and unsupported-version fallback (11).

The production build passed for the shared packages, Next.js routes, and Vite desktop webview. Twenty-seven Playwright cases completed across desktop `1440×900`, tablet `768×1024`, and mobile `390×844`, covering:

- English-default redirect, bilingual landing journeys, and live theme selection;
- English metadata/copy, account/status honesty, real CTA targets, and document language;
- functional pause/cancel/restart controls in the landing preview;
- keyboard focus visibility;
- Studio clock-type changes, layer creation, local draft save/reload/restore;
- scoped duplicate/delete/nudge/save/undo shortcuts and the searchable Command Palette;
- responsive screenshots for the landing, desktop scheduler preview, Studio, and a transparent-background overlay browser preview.

Manual browser QA added a Studio layer, applied the validated custom fork, confirmed the main preview selected the same personal theme, verified no Vite error overlay or console warnings/errors, and measured computed `rgba(0, 0, 0, 0)` backgrounds for overlay `html`, `body`, and root. This is browser-preview evidence, not proof of native Windows transparency.

Rust tests and platform bundles passed in [CI run #8](https://github.com/Ericismee/horune/actions/runs/36525429869): Windows produced an unsigned NSIS artifact and macOS produced an unsigned ARM64 DMG artifact.

Eight Rust tests cover the durable five-minute warning/due/simulation path, fake-adapter success/failure/post-wake classification, a wake event arriving before the adapter returns, interrupted-dispatch recovery without repeat, overdue startup confirmation, DPI-aware overlay sizing, and multi-monitor position clamping. They passed on both native CI runners; they cannot run locally because linking stops at missing `msvcrt.lib`.

## Native and hardware limitations

Rust source was formatted, but local native verification is not currently complete. An earlier run was blocked by Windows Application Control (OS error 4551); the latest Visual Studio Developer Prompt reaches the MSVC linker but fails with `LNK1104: cannot open file 'msvcrt.lib'`, indicating the local Windows SDK/library installation is incomplete or not discoverable. No security-control bypass was attempted. Rust tests and bundle steps succeeded in CI #8; that result validates compilation and packaging, not physical power-management behavior.

No physical macOS test, Linux release build, signed installer, tray-only resource measurement, or real Sleep/shutdown/lock action has been claimed.

## Safe scheduler testing

1. Keep simulation enabled (the first-run default).
2. Use a short reminder or Sleep schedule.
3. Verify the exact end time before starting.
4. Exercise warning, pause/resume, +5, cancel, close-to-tray, and overlay controls.
5. At completion, confirm the overlay shows the simulation result briefly, auto-hides only if configured, the main/tray remains alive, and the schedule remains in History.
6. To test overdue recovery, stop the app while a simulated schedule is active and restart after its deadline. Confirm it shows `awaiting_confirmation` and does not run automatically.
7. Never disable simulation in CI or an automated test.

Real system action tests require an isolated manual checklist on each supported OS, explicit user confirmation, unsaved-work precautions, and a documented result.

## Screenshot policy

Committed screenshots must come from a running local build and include descriptive alt text where used. Do not substitute Figma/Canva mockups for completion evidence. The native overlay screenshot remains absent until a native artifact runs successfully.

See [`test-report-2026-09-29.md`](test-report-2026-09-29.md) for this change's evidence and [`performance.md`](performance.md) for measurement status.
