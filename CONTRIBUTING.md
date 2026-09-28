# Contributing to Horune

Thank you for helping build a calm, safe, local-first timer and theme ecosystem.

## Before you start

- Read the [architecture](docs/architecture.md), [Theme Studio scope](docs/theme-studio.md), and [theme security policy](docs/theme-security.md).
- Search existing issues before opening a duplicate.
- For substantial product or schema changes, open an issue describing the user problem, current/next milestone, compatibility impact, and validation plan.
- Keep the Apache-2.0 license and do not add assets without a compatible license/source record.

## Development

Follow [docs/development.md](docs/development.md), then run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

If native prerequisites and host policy allow it:

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Never disable simulation for automated tests. Do not test real Sleep/shutdown against a machine with unsaved work.

## Pull requests

- Keep changes focused and explain the observable behavior.
- Add or update tests for schema, scheduler, renderer, import, and accessibility behavior.
- Include real screenshots for visual changes; label browser previews and native captures accurately.
- Update README/docs statuses. Do not describe planned work as available.
- Note Windows/macOS/Linux verification separately.
- Preserve the one-scheduler design and deadline-derived countdown.

## Theme rules

Themes are data. Contributions must not introduce arbitrary HTML/CSS/JavaScript execution, creator-controlled URLs, shell commands, or theme-triggered system actions. New fields need explicit bounds, migration/compatibility rules, renderer support, and rejection tests. Asset support also needs decoded-memory and denial-of-service analysis.

## Code style

- TypeScript is strict; avoid `any` and duplicate cross-app logic.
- Prefer server-rendered/static Next.js shells with small client islands.
- Keep transient animation state out of persistent models.
- In Rust, do not hold database mutex guards across `await` points.
- Make keyboard/focus/reduced-motion behavior part of acceptance criteria.

## Reporting bugs

Open a [GitHub issue](https://github.com/Ericismee/horune/issues) with OS/build details, steps, expected/actual behavior, simulation state, and relevant logs. Remove secrets and personal data. Security vulnerabilities belong in the private process described in [SECURITY.md](SECURITY.md).
