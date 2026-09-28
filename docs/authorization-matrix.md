# Authorization and creator-state matrix

This is the target backend policy. It is documentation, not evidence of a deployed API. Authorization is deny-by-default, evaluated server-side for every resource, and never inferred from hidden UI controls.

## Global roles

| Capability | Guest | User | Creator | Moderator | Support | Finance | Admin | Super admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse/preview public themes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Use local timer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Save/sync own library | — | own | own | own | own | own | own | own |
| Comment/follow/report | — | own | own | own | own | own | own | own |
| Create/edit theme drafts | — | own | own | own | own | own | own | own |
| Publish free themes | — | — | own | own | own | own | own | own |
| Sell paid themes | — | — | own, active | — | — | — | — | — |
| Moderate content/reports | — | — | — | scoped | — | — | all | all |
| Read support profile/tickets | — | own | own | — | scoped | — | all | all |
| Refund/order intervention | — | — | — | — | request/scoped | scoped | all | all |
| Configure fees/payout policy | — | — | — | — | — | — | controlled | all |
| Assign privileged roles | — | — | — | — | — | — | limited | all |
| View/verify audit log | — | own security events | own security events | scoped | scoped | scoped | all | all |

`Creator` is additive: a person remains a buyer/user. Paying an activation fee may move an eligible application toward `active`; it never grants moderator, finance, admin or super-admin privileges.

## Creator lifecycle

| State | May edit drafts | May publish free | May list paid | May receive payout | Notes |
| --- | :---: | :---: | :---: | :---: | --- |
| `not_applied` | ✓ | — | — | — | Standard account. |
| `pending` | ✓ | — | — | — | Application/review in progress. |
| `active` | ✓ | ✓ | ✓ | subject to payout/KYC holds | Paid listing also requires content approval. |
| `suspended` | own/read-only policy | — | — | held/reviewed | Existing buyer entitlements follow an explicit revocation policy. |
| `rejected` | ✓ | — | — | — | Reason and appeal path recorded. |

## Resource checks

Every request checks authentication, global role, resource ownership, lifecycle state, moderation visibility, entitlement and—where applicable—tenant membership. Orders, payment attempts, fee snapshots, entitlements, refunds, payouts, tickets and audit events are never authorized by a client-supplied owner ID.

Sensitive finance/admin actions require MFA freshness, an immutable audit event, reason text, rate limits and a second approval where policy requires it.

## Future CRM SaaS tenant roles

External tenants are **planned only**. `owner`, `manager`, `agent` and `viewer` are scoped by `tenant_id`; no global Horune role is implied. Every tenant table carries `tenant_id`, and both application authorization plus database isolation tests must reject cross-tenant IDs before the SaaS CRM can open.
