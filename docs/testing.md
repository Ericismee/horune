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

On 2026-09-28 the TypeScript typecheck passed for all six packages/apps. Twelve unit tests passed:

- `theme-schema`: bundled themes, strict unknown-field rejection, opacity/animation bounds, Studio document, unsafe/excess layer rejection (5).
- `theme-renderer`: deadline and bilingual word-clock formatting (2).
- `theme-studio`: validated JSON round-trip, unknown executable field and size rejection (2).
- `desktop`: deadline countdown, pause/resume, snooze/clock-jump behavior (3).

The production build passed for the shared packages, Next.js routes, and Vite desktop webview. Eighteen Playwright tests passed across desktop `1440×900`, tablet `768×1024`, and mobile `390×844`, covering:

- English-default redirect, bilingual landing journeys, and live theme selection;
- English metadata/copy and document language;
- keyboard focus visibility;
- Studio clock-type changes, layer creation, local draft save/reload/restore;
- responsive screenshots for the landing, desktop scheduler preview, and Studio.

Manual browser QA additionally changed the editor to a hybrid face, enabled the date, added a layer, and confirmed the renderer updated in both web and desktop surfaces.

## Not verified locally

Rust source was formatted, but local `cargo test` and NSIS could not complete because Windows Application Control blocked generated Cargo build-script executables with OS error 4551. No security-control bypass was attempted. Windows and macOS native jobs are defined in `.github/workflows/ci.yml`; their results should be treated as pending until the pushed workflow reports them.

No physical macOS test, Linux release build, signed installer, tray-only resource measurement, or real Sleep/shutdown/lock action has been claimed.

## Safe scheduler testing

1. Keep simulation enabled (the first-run default).
2. Use a short reminder or Sleep schedule.
3. Verify the exact end time before starting.
4. Exercise warning, pause/resume, +5, cancel, close-to-tray, and overlay controls.
5. To test overdue recovery, stop the app while a simulated schedule is active and restart after its deadline. Confirm it shows `awaiting_confirmation` and does not run automatically.
6. Never disable simulation in CI or an automated test.

Real system action tests require an isolated manual checklist on each supported OS, explicit user confirmation, unsaved-work precautions, and a documented result.

## Screenshot policy

Committed screenshots must come from a running local build and include descriptive alt text where used. Do not substitute Figma/Canva mockups for completion evidence. The native overlay screenshot remains absent until a native artifact runs successfully.

See [`test-report-2026-09-28.md`](test-report-2026-09-28.md) for the dated environment table and [`performance.md`](performance.md) for measurement status.
