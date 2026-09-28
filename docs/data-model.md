# Planned server data model

This document defines the migration target for the shared API milestone. No PostgreSQL database or server migration exists in the current repository yet; these tables remain **planned** until the end-to-end account slice is implemented.

Conventions: UUID primary keys, `timestamptz` timestamps, immutable `created_at`, explicit `updated_at`, lowercase ISO currency codes, integer minor-unit money values, and soft deletion only where retention/audit requirements justify it. Client-supplied owner, role, price, fee or entitlement fields are never trusted.

## Identity and authorization

| Table | Key fields and constraints | Important indexes / lifecycle |
| --- | --- | --- |
| `users` | `id`, handle, display name, locale, status | unique normalized handle; active → suspended → deletion-pending → anonymized |
| `identities` | `id`, `user_id`, provider, subject, verified email metadata | unique `(provider, subject)`; many login methods may link to one user |
| `sessions` | `id`, `user_id`, `device_id`, refresh-token hash, expiry, revoked time | index `(user_id, revoked_at, expires_at)`; token material is hashed/encrypted, never plaintext |
| `devices` | `id`, `user_id`, public label, platform, last seen, revoked time | index `(user_id, last_seen_at desc)`; supports remote logout |
| `role_bindings` | `id`, `user_id`, global role, granted/revoked by and reason | unique active `(user_id, role)`; sensitive changes always produce audit events |
| `creator_profiles` | `user_id`, state, review fields, activation order, suspension reason | state check: `not_applied/pending/active/suspended/rejected`; activation never changes global roles |

Web cookie sessions and desktop OIDC credentials map to the same `user_id`. Local schedules and machine settings do not enter these tables.

## Themes and assets

| Table | Key fields and constraints | Important indexes / lifecycle |
| --- | --- | --- |
| `themes` | `id`, `owner_user_id`, slug, title, visibility, lifecycle state, license | unique owner/slug; draft → review → published → hidden/withdrawn |
| `theme_versions` | `id`, `theme_id`, semver, schema version, manifest JSONB, content hash, review state | unique `(theme_id, semver)` and `(theme_id, content_hash)`; published rows immutable |
| `assets` | `id`, owner, content hash, canonical MIME, bytes, dimensions, frames, duration, license/attribution, scan state | unique canonical hash where safe; quarantined → accepted/rejected; object key is server-generated |
| `theme_version_assets` | `theme_version_id`, `asset_id`, logical path, role | unique `(theme_version_id, logical_path)`; every referenced asset must be accepted |
| `theme_components` | `id`, owner/theme, stable key, schema version, definition JSONB | planned for the component milestone; references are cycle-checked |
| `library_items` | `user_id`, `theme_id`, source, selected version, local fingerprint, sync state | unique `(user_id, theme_id)`; source distinguishes saved, owned, created and remixed |
| `remix_edges` | child theme/version, source theme/version, attribution snapshot | immutable lineage; source withdrawal does not erase required attribution |

Every manifest is parsed with the same versioned limits used by local import, followed by server asset validation. PostgreSQL JSONB is not permission: resource checks still use owner/state columns.

## Community

| Table | Key fields and constraints | Important indexes / lifecycle |
| --- | --- | --- |
| `posts` | `id`, author, theme/version, body, visibility, moderation state | public feed index `(visibility, published_at desc, id)`; body is sanitized data |
| `comments` | `id`, post, author, optional parent, body, moderation state | index `(post_id, created_at, id)`; bounded nesting |
| `follows` | follower user, followed creator | primary key pair; self-follow rejected |
| `collections` / `collection_items` | owner, visibility, title; ordered theme links | unique collection slug per owner; stable item ordering |
| `reports` | reporter, resource type/id, reason, evidence, state, assignee | index `(state, priority, created_at)`; reporter access is private |
| `moderation_actions` | report/resource, action, actor, reason, expiry | append-only and mirrored to the audit log |

Public list endpoints use cursor pagination with stable `(published_at, id)` or `(rank, id)` ordering. Search indexes never bypass visibility or moderation filters.

## Commerce

| Table | Key fields and constraints | Important indexes / lifecycle |
| --- | --- | --- |
| `products` | theme, creator, state, current approved version | unique active product per theme; paid listing requires active creator and approved content |
| `prices` | product, currency, amount minor units, active interval | positive amount; overlapping active intervals for one currency are rejected |
| `fee_policies` | creator activation range/default, platform basis points, rounding rule, effective interval | append-only versions; admin change and rollback are audited |
| `orders` | buyer, currency, subtotal, platform fee, creator amount, tax/refund totals, fee-policy snapshot JSONB, state | immutable calculation snapshot; idempotency key unique per buyer/operation |
| `order_items` | order, product/theme/version, unit price, fee/tax snapshot | immutable after checkout confirmation |
| `payment_attempts` | order, provider, provider reference, amount, state | unique provider reference; client state cannot mark an order paid |
| `webhook_receipts` | provider event ID, signature result, payload hash, processing state, attempts | unique `(provider, event_id)` for idempotency; raw payload retention is bounded |
| `entitlements` | user, theme/product, source order, granted/revoked interval, offline policy version | unique active purchase grant; server issues signed/cacheable desktop claims later |
| `refunds` / `chargebacks` | order/payment, amount, reason, provider state | sum cannot exceed eligible captured amount; entitlement policy is explicit |
| `payout_accounts` / `payouts` | creator, provider token reference, amount, currency, state, reconciliation ID | no bank credentials in Horune DB; finance/admin separation and MFA |

Creator activation is represented by its own order/product type and can move only the creator-state workflow. It never grants an administrative role.

## Admin, support and internal CRM

| Table | Purpose |
| --- | --- |
| `audit_events` | Append-only actor, effective user, resource, action, before/after hashes or bounded JSON, IP/session, reason and correlation ID. |
| `configuration_versions` | Versioned limits, fees and feature flags with author, approval, effective time and rollback parent. |
| `tickets` | Customer/creator support lifecycle, category, severity, assignee and SLA timestamps. |
| `ticket_messages` / `internal_notes` | Public replies are separated from staff-only notes; both are audited. |
| `customer_interactions` | Consent-aware operational interactions linked to a user/ticket/order, with source and retention class. |
| `consents` | Purpose, channel, policy version, grant/revoke timestamp and evidence. |
| `tasks` | Assigned operational follow-up with status, due time and resource reference. |

Dashboards aggregate only persisted facts. Empty data renders an empty state; seed/demo figures are clearly isolated from production.

## Future external CRM tenants

External creator/team CRM is not part of the internal CRM launch. When introduced, `tenants`, `tenant_memberships`, `tenant_role_bindings`, `tenant_quotas`, `tenant_subscriptions` and every tenant-owned business table carry a non-null `tenant_id`. Primary/unique keys include `tenant_id` where appropriate, queries require membership context, object-storage prefixes are tenant-scoped, and cross-tenant negative tests run at both API and database-policy layers.

## Migration and retention rules

1. Migrations are forward-only in production, transactional when PostgreSQL permits, and have a rehearsed application rollback path.
2. New manifest major versions use explicit parser/migration functions; unsupported future majors are rejected rather than guessed.
3. Published versions, order calculations, payment events, entitlements and audit events are append-only or corrected through compensating rows.
4. Session secrets, password/provider credentials, raw payment credentials and arbitrary uploaded HTML/code are never stored.
5. Account deletion anonymizes community identity where legally possible while preserving the minimum order/tax/audit records required by the eventual operating jurisdiction.
6. High-volume audit, webhook and interaction tables receive time/tenant indexes and a documented partition/archive policy before scale requires it.
