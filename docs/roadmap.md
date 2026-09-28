# Roadmap

Status is based on repository evidence, not the original plan. “Available” means code plus current checks; “in progress” means partial code or verification; “planned” means no completed feature is claimed.

## Milestone 1 — local desktop foundation and identity

**Available in source**

- pnpm/Turborepo monorepo and shared design system.
- Strict `ThemeManifestV1`, five bundled themes, and shared renderer.
- Desktop scheduling UI, SQLite persistence, one Rust scheduler, simulation default, warning, pause/resume, +5, cancel, and overdue confirmation logic.
- Windows/macOS action adapters, tray wiring, and transparent overlay source.
- Bilingual static landing and responsive Playwright coverage.
- Windows/macOS Rust tests plus NSIS and DMG bundles in CI.

**In progress / not verified**

- Physical Windows/macOS power-action behavior, real tray/overlay capture, and signed releases.
- 60-second CPU/RAM/GPU baseline in main, overlay, and tray states.

## Milestone 1.5 — Theme Studio core

**Available in source**

- Shared web/desktop Studio package.
- Digital, analog, flip, word, and hybrid clock faces.
- Palette/gradient, opacity, font size, effect, seconds/date/action controls.
- Bounded text and built-in sticker layers with drag, numeric position, scale, rotate, hide, lock, order, and delete.
- Zoom, grid, snap, undo/redo, local draft save/restore, reset, validated JSON import/export.
- Scoped keyboard editing for save, undo/redo, duplicate, delete, deselect, pixel nudge and zoom.
- Searchable Command Palette containing implemented actions only.

**Next milestone**

- PNG/WebP/GIF/safe-SVG ingestion and canonicalization with byte/dimension/frame/memory/license controls.
- Resize handles, multi-select, group/ungroup, alignment/distribution, rulers, guides and smart guides.
- Asset-aware portable theme bundles, autosave versions, named restore points, and per-theme profiling.
- Low-power/battery detection and automatic static/low-quality fallback.
- Tested declarative Figma conversion for a documented subset. Unsupported nodes produce a report; no creator code executes.

**Long term ideas**

- Bounded preset/keyframe timeline, reusable components, constraints, and responsive overlay variants.
- Collaborative drafts and review comments after the account/sync foundation.

## Milestone 2 — website and Studio productization

**Current**: landing, language routes, gallery, browser Studio.

**Planned**: download/release discovery from real artifacts, author pages, public theme detail pages, search/filter/categories, optimized previews, installation handoff to desktop, and guest/account boundary copy.

## Milestone 3 — API, accounts, and community

**Planned**

- Fastify/TypeScript API, PostgreSQL migrations, S3-compatible object storage, OpenAPI-generated client.
- Standards-first OIDC account/session flow shared by web and desktop; guest use remains available for the timer and public preview. The provider decision is still proposed and gated by a proof-of-concept.
- System-browser Authorization Code + PKCE for desktop, secure OS credential storage, server cookie sessions for web, device/session revocation and local-theme conflict resolution.
- Draft sync, theme versions, publish → review → discover → install.
- Saves, follows, comments, reports, moderation, attribution, and remix lineage.
- Cache/CDN for public reads, pagination, upload limits, role/ownership checks, and admin audit history.

No continuous transport will be added for local countdowns. SSE/WebSocket requires a concrete real-time server feature.

## Milestone 4 — sandbox marketplace

**Planned only; no current client/backend payment implementation**

- Free sharing remains open.
- Creator store activation is a one-time fee, default USD 3; admins may configure USD 2–5.
- Platform fee defaults to 15% of each successful order and is snapshotted on that order so later configuration changes do not rewrite history.
- Sandbox provider integration, server-verified transactions, entitlements, paid-theme review, version updates, refunds, infringement reports, pending settlement, withdrawable balance, and audit logs.
- Admin management for content, creators, orders, fees, and configuration changes.

Real payments wait for verification of operator entity, receiving country, tax/consumer obligations, provider terms, and macOS distribution rules. Clients never grant ownership based on payment data they submit.

## Milestone 5 — optimization and release

**Planned**

- Native measurements across representative Windows/macOS hardware, battery modes, motion modes, and weak-device fallback.
- Physical operating-system action matrix and upgrade/recovery testing.
- Signed/notarized installers, release notes, verified download links, crash/privacy review, accessibility audit, and localization review.
- Linux implementation after Windows/macOS behavior and resource budgets are stable.

## Exit criteria for any milestone

A feature moves from planned/in-progress to available only when its code path exists, tests proportionate to its risk pass, real UI is inspected where applicable, limitations are documented, and the README status table is updated. Mockups, disabled buttons, schemas without consumers, and CI configuration without a successful run are not completion evidence.

The cross-milestone delivery order and acceptance gates are in [implementation-plan.md](implementation-plan.md). The target role model is in [authorization-matrix.md](authorization-matrix.md), and architecture decisions live under [`docs/adr`](adr/).
