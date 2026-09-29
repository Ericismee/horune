# Platform status and limitations

## Windows

The React/Vite and Next.js applications were built and tested on Windows 10 build 26200. The Rust source is formatted and the Windows adapter is implemented. The current local attempt reaches the MSVC linker but stops before project compilation with `LNK1104: cannot open file 'msvcrt.lib'`; the Windows SDK/Universal CRT library path is incomplete on this host. This prevents a trustworthy local `cargo test` and NSIS installer result.

The Windows native job passed Rust tests and produced an NSIS artifact in [CI run #3](https://github.com/Ericismee/horune/actions/runs/36442542223). This validates compilation and packaging, not real Sleep/shutdown/lock behavior. The local restriction is an environment policy limitation, not a reason to disable or bypass host security controls.

## macOS

The adapter and CI build target are present, but no claim of hardware verification is made. The macOS job passed Rust tests and produced a DMG artifact in [CI run #3](https://github.com/Ericismee/horune/actions/runs/36442542223). Sleep/shutdown/lock behavior still requires manual validation on a physical macOS machine before release.

## Linux

Linux is not a release target in this milestone. The capability layer reports reminder-only behavior and the platform action adapter intentionally returns an unsupported error for power actions.

## Lifecycle behavior

- Closing the main window hides it to the tray instead of terminating the scheduler.
- Hiding a web or desktop surface stops visual animation work; scheduling continues in Rust.
- An overdue or interrupted `due`/`dispatching` record restored after sleep, restart, app exit, or a clock jump requires user confirmation and is never repeated automatically.
- A successful adapter spawn records an accepted OS request, not proof that Sleep/shutdown completed. Only a same-process Tauri resume records a separate wake observation.
- Overlay transparency has been checked through computed browser-preview styles; desktop-through transparency, native z-order, tray recovery, multi-monitor bounds, and DPI behavior still require a runnable native Windows artifact.
- This milestone stores data locally. Account sync, community publishing, marketplace ownership, and payments are explicitly deferred to the backend milestone.
