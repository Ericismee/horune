# Ordered implementation plan

This plan starts from repository evidence on 2026-09-28. It does not treat the product brief as completed software.

## Current baseline

- Desktop: local SQLite scheduling, one Rust scheduler, simulation, overdue confirmation, overlay/tray wiring and Windows/macOS adapters exist in source. Native bundles pass CI; real power actions are not hardware-verified.
- Web: static English/Vietnamese landing routes and a browser Studio exist. There is no account, API, community, checkout or download release.
- Themes: a strict `ThemeManifestV1`, five built-in themes, shared renderer and a single-layer editing core exist. External binary assets and portable theme packages do not.

## Slice 1 — honest product story and working entry points

**Deliver now**

1. Rewrite `/en` and `/vi` around timer → safety → personalization → future community.
2. Make every landing CTA lead to a working Studio route, an in-page explanation, the public roadmap, or a real CI page.
3. Add timer flow, account boundary, platform state, FAQ, responsive navigation and localized SEO metadata.
4. Exercise the hero countdown controls and all target viewports with Playwright.

**Exit:** production build succeeds; no fake installer, sign-in, community, or marketplace control is visible.

## Slice 2 — Studio productivity foundation

**Deliver now**

1. Publish the [feature matrix](theme-studio-feature-matrix.md) before expanding the toolbar.
2. Add scoped shortcuts, undoable duplicate/delete/nudge, zoom commands and a searchable command palette.
3. Keep JSON import strict and JSON-only; document binary asset support as Next.
4. Test commands in the real Studio route and preserve controls for pointer users.

**Exit:** commands work with mouse and keyboard, do not fire inside form fields, and survive typecheck/unit/E2E/build checks.

## Slice 3 — shared account backbone

**Next; not implemented in the current client**

1. Prove the proposed OIDC provider against the [identity ADR](adr/0002-identity-provider.md); record pricing/legal/data-region results before acceptance.
2. Create Fastify domain modules and PostgreSQL migrations for users, identities, sessions, devices and roles; generate a typed client from OpenAPI.
3. Implement secure web sessions using server-set cookies and CSRF defenses.
4. Implement desktop Authorization Code + PKCE through the system browser, state/nonce verification, loopback or registered deep link, and OS credential storage.
5. Add session/device listing and revocation, account recovery/linking, and a deterministic local-theme merge flow.
6. Test guest timer continuity across login, logout, expiry and network loss.

**Exit:** one `user_id` is observed by web and desktop; no secret is in SQLite/localStorage; local schedules never depend on the API.

## Slice 4 — richer declarative Studio

**Next**

1. Add multi-selection, transform handles, groups, guides, align/distribute and responsive constraints with schema migration tests.
2. Split clock anatomy into typed editable parts and add allowlisted data bindings.
3. Add canonicalized PNG/WebP/GIF/safe-SVG ingestion, license/attribution, memory budgets and static fallback.
4. Add portable packages, autosave/recovery checkpoints and version migration.
5. Benchmark an editor-only scene graph against the current DOM implementation; keep the overlay runtime minimal per the [canvas ADR](adr/0001-theme-canvas-rendering.md).

## Slice 5 — personal library and community

**Planned**

1. Add draft/version/publication state machines, asset processing workers, ownership checks and CDN-safe public reads.
2. Add personal library sync, conflict resolution and offline entitlement cache policy.
3. Add creator profiles, collections, search, tags, follows, comments, reports, moderation, licenses, attribution and remix lineage.
4. Test guest browse/preview, resource-level authorization and withdrawn/hidden theme behavior.

## Slice 6 — creator commerce

**Planned**

1. Verify operator country/entity, payout availability, tax/KYC and distribution constraints before choosing a payment provider.
2. Implement provider adapters, signed/idempotent webhooks, orders, payment attempts, immutable fee snapshots, entitlements, refunds, chargebacks, reconciliation and payouts.
3. Default creator activation to USD 3 (admin range USD 2–5) and platform fee to 15%, enforced only by the backend.
4. Test duplicate webhook delivery, later fee changes, refund/chargeback revocation and offline purchased-theme access.

## Slice 7 — operations, admin and CRM

**Planned**

1. Ship internal Horune operations CRM first: customers, creator review, moderation, orders, refunds, payouts, tickets, consent and audit history.
2. Enforce the [authorization matrix](authorization-matrix.md), MFA for sensitive roles, deny-by-default APIs and resource-level checks.
3. Add configuration rollback, feature flags and safe bulk actions with load/error/empty states.
4. Open external CRM tenants only after `tenant_id` isolation, membership, quota, billing and cross-tenant attack tests pass.

## Verification rule

Each slice must include working UI, persistent data/API where required, error/empty states, authorization and risk-proportionate tests. Status changes from Planned only after those artifacts exist and this plan, roadmap and README are updated together.
