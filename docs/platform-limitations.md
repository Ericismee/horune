# Platform status and limitations

## Windows

The React/Vite and Next.js applications were built and tested on Windows 10 build 26200. The Rust source is formatted and the Windows adapter is implemented. On the verification machine, Windows Application Control blocks newly generated Cargo build-script executables with OS error 4551. This prevents a trustworthy local `cargo test` and NSIS installer result even inside the Visual Studio developer shell.

The Windows native job passed Rust tests and produced an NSIS artifact in [CI run #3](https://github.com/Ericismee/horune/actions/runs/36442542223). This validates compilation and packaging, not real Sleep/shutdown/lock behavior. The local restriction is an environment policy limitation, not a reason to disable or bypass host security controls.

## macOS

The adapter and CI build target are present, but no claim of hardware verification is made. The macOS job passed Rust tests and produced a DMG artifact in [CI run #3](https://github.com/Ericismee/horune/actions/runs/36442542223). Sleep/shutdown/lock behavior still requires manual validation on a physical macOS machine before release.

## Linux

Linux is not a release target in this milestone. The capability layer reports reminder-only behavior and the platform action adapter intentionally returns an unsupported error for power actions.

## Lifecycle behavior

- Closing the main window hides it to the tray instead of terminating the scheduler.
- Hiding a web or desktop surface stops visual animation work; scheduling continues in Rust.
- An overdue record restored after sleep, restart, app exit, or a clock jump requires user confirmation.
- This milestone stores data locally. Account sync, community publishing, marketplace ownership, and payments are explicitly deferred to the backend milestone.
