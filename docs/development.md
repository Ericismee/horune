# Development guide

## Toolchain

- Node.js 24+
- pnpm 11 (the workspace pins `pnpm@11.19.0`)
- Rust stable
- Git
- Windows: MSVC C++ Build Tools, Windows SDK, WebView2
- macOS: Xcode command-line tools

The repository is a pnpm workspace orchestrated by Turborepo. No database service is needed for the current milestone; desktop SQLite is created in the Tauri app data directory.

## Install

```bash
git clone https://github.com/Ericismee/horune.git
cd horune
pnpm install
```

On Windows, install the stable MSVC toolchain:

```powershell
rustup toolchain install stable-x86_64-pc-windows-msvc
rustup default stable-x86_64-pc-windows-msvc
```

Run Rust commands from a Developer PowerShell if the linker cannot find the Windows SDK or `msvcrt.lib`.

On macOS:

```bash
xcode-select --install
rustup toolchain install stable
```

## Development servers

```bash
pnpm dev:web
```

This starts Next.js. Routes are `/vi`, `/en`, `/vi/studio`, and `/en/studio`.

```bash
pnpm dev:desktop
```

This runs the native Tauri application. For UI-only work, `pnpm --filter @horune/desktop dev` starts the Vite browser preview on port 1420; browser bridge calls use simulation data and never execute OS actions.

## Build

```bash
pnpm build
```

This type-checks shared packages, creates the Next.js production build, and creates the desktop webview bundle.

```bash
pnpm tauri icon src-tauri/icons/source.png
pnpm tauri build
```

The native command creates an installer for the host OS only. The CI matrix targets NSIS on Windows and DMG on macOS. A successful web build is not evidence that a native installer succeeded.

## Test

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Playwright starts/reuses the web and Vite servers and checks desktop, tablet, and mobile viewports. Keep simulation enabled for all manual scheduler checks.

## Common problems

### Next.js blocks local client assets

The repository allows `127.0.0.1` through `allowedDevOrigins` because Playwright uses that host. If the server is opened under a different development hostname, add only the required local origin rather than using a broad wildcard.

### Rust cannot find MSVC libraries

Confirm that Visual Studio's Desktop development with C++ workload and a Windows SDK are installed, then use Developer PowerShell. Do not switch to an incompatible GNU toolchain as a workaround for a Tauri MSVC build.

### OS error 4551 / Application Control

The current verification machine blocks generated Cargo build-script executables. Do not disable or bypass security policy. Use the checked-in Windows CI job or an approved Windows development machine and record the environment in the test report.

### WebView2 is missing

Install the Microsoft WebView2 Runtime and restart the Tauri dev command.

### pnpm requests build approval

Only `esbuild` is approved in `pnpm-workspace.yaml`. Review any newly requested lifecycle script before adding it to the allowlist.

## Change discipline

- Put theme semantics in `theme-schema`, visuals in `theme-renderer`, and editing behavior in `theme-studio`.
- Do not copy renderer logic into apps.
- Do not add client-side financial or paid-entitlement decisions.
- Do not add one interval per schedule or network polling for countdowns.
- Update status-labelled documentation when a planned feature becomes implemented.
