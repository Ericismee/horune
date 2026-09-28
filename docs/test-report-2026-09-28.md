# Verification report — 2026-09-28

## Environment

- Windows NT 10.0.26200
- 16 logical processors
- Node.js 24.15.0
- pnpm 11.19.0
- Rust 1.98.1 stable MSVC

## Results

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript typecheck | Pass | Six workspace packages/apps |
| Production web build | Pass | Next.js static output for `/vi`, `/en`, and both Studio routes |
| Desktop webview build | Pass | Vite main JS 358.58 kB raw / 108.36 kB gzip |
| Unit tests | Pass, 12/12 | Schema, renderer, Studio JSON I/O, countdown logic |
| Playwright UI tests | Pass, 18/18 | 1440×900, 768×1024, 390×844; English default; VI/EN; Studio draft; keyboard; screenshots |
| Browser interaction QA | Pass | Live countdown/theme selection; Studio layer and hybrid renderer; desktop Studio |
| Rust formatting | Pass | `cargo fmt` applied |
| Native Rust tests | Pass in CI | Windows and macOS runners; blocked locally by Application Control error 4551 |
| Windows NSIS installer | Pass in CI | Unsigned CI artifact built in [run #3](https://github.com/Ericismee/horune/actions/runs/36442542223); no real power action executed |
| macOS DMG | Pass in CI | Unsigned CI artifact built in the same run; no physical Mac action test |

All automated tests use simulation or pure logic. No test executed a real sleep, shutdown, or lock command.

## Captured views

Playwright writes stable captures to `docs/screenshots`:

- `landing-desktop.png`
- `landing-tablet.png`
- `landing-mobile.png`
- `desktop-main.png`
- `desktop-small.png`
- `editor-desktop.png`

The landing page was also inspected in the application browser with JavaScript enabled. Clean Playwright sessions now assert that the English-default route emits no hydration error at desktop, tablet, or mobile sizes.
