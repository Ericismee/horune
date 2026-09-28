# Performance

Horune is designed for low background cost, but the project does not describe itself as lightweight until native measurements are available.

## Test host

| Item | Configuration |
| --- | --- |
| OS | Microsoft Windows NT 10.0.26200.0 |
| CPU | AMD Ryzen 7 7840H with Radeon 780M Graphics, 16 logical processors |
| RAM | 27.7 GiB reported by Windows |
| Integrated GPU | AMD Radeon 780M, driver 31.0.22028.3001 |
| Discrete GPU | NVIDIA GeForce RTX 3050 4GB Laptop GPU, driver 31.0.15.3188 |
| Node / pnpm / Rust | Node 24.15.0, pnpm 11.19.0, Rust 1.98.1 stable MSVC |

## Actual results currently available

The production build on this host completed successfully. The desktop webview main JavaScript asset is 358.58 kB raw / 108.36 kB gzip and its CSS is 28.75 kB raw / 9.67 kB gzip. Next.js statically generated `/vi`, `/en`, and both Studio routes.

CPU, RAM, and GPU numbers for native main-window, overlay, and tray states are **not available**. Windows Application Control blocks generated Cargo build-script executables with OS error 4551, so no trustworthy native binary could be measured. Empty cells below are intentional; they are not estimates.

| State | Motion | CPU median (60 s) | Working set peak | Private memory peak | GPU | Status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Main window | static | — | — | — | — | Pending native artifact |
| Main window | subtle | — | — | — | — | Pending native artifact |
| Main window | full | — | — | — | — | Pending native artifact |
| Overlay | static | — | — | — | — | Pending native artifact |
| Overlay | subtle | — | — | — | — | Pending native artifact |
| Overlay | full | — | — | — | — | Pending native artifact |
| Tray only | static | — | — | — | — | Pending native artifact |
| Tray only | subtle | — | — | — | — | Pending native artifact |
| Tray only | full | — | — | — | — | Pending native artifact |

## Initial budgets (targets, not measurements)

| State | CPU median target | Working set target | Behavior target |
| --- | ---: | ---: | --- |
| Main window, subtle | ≤2% of total host CPU | ≤180 MiB | 30 FPS maximum for theme effects |
| Overlay, subtle | ≤1.5% | ≤140 MiB | Transparent area does not repaint full display |
| Tray only | ≤0.3% | ≤90 MiB | No webview animation/render loop |

Budgets will be revised only from repeatable release-build measurements. A theme that exceeds animation, memory, or battery policy should fall back to `quality="low"` or `static` rather than degrading countdown readability.

## Motion modes

- `static`: no theme animation.
- `subtle` (default): supported effects use a longer duration and the manifest FPS ceiling.
- `full`: the allowed preset runs at its declared ceiling (never above 60 FPS).

`prefers-reduced-motion` disables effect animation regardless of the selected mode. Low-quality mode disables animations and lowers decorative opacity. Battery/weak-device detection is planned; it is not currently claimed.

## Measurement procedure

1. Build a release installer on an approved Windows machine.
2. Record OS, CPU, GPUs/drivers, RAM, WebView2, power mode, display refresh rate, and whether the discrete GPU is active.
3. Warm Horune for 30 seconds.
4. Run `scripts/measure-windows.ps1 -ProcessName <name> -Seconds 60` for main, overlay, and tray states.
5. Repeat each state for all three motion modes at least three times; publish medians and peaks.
6. Capture GPU engine utilization and present rate with Windows Performance Recorder/GPUView or an equivalent documented profiler.
7. Repeat on battery and confirm that hidden windows stop visual work.

The PowerShell sampler reports normalized process CPU, working set, and private memory. GPU collection remains separate because counter names and engine assignment depend on Windows/driver versions.
