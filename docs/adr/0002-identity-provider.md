# ADR 0002: Standards-first shared identity provider

- Status: Proposed — provider not yet selected or integrated
- Date: 2026-09-28

## Context

Horune needs one account identity across a server-rendered website and a public native Tauri client. Desktop credentials must not enter a WebView or plaintext SQLite/localStorage. The local timer must remain usable without an account and independent of session state.

## Proposed decision

Put an internal identity adapter in front of an OpenID Connect provider and use two registered clients:

- a confidential web client with server-created sessions, `HttpOnly`, `Secure`, `SameSite` cookies, rotation and CSRF protection;
- a public native client using the system browser and Authorization Code + PKCE, exact `state`/nonce checks, a registered deep link or loopback redirect, and operating-system credential storage.

The application database owns Horune's stable `user_id`, profiles, roles, creator status, devices and domain data. Provider subject identifiers live in an identity-link table, allowing multiple login methods without making provider IDs domain primary keys.

## Provider shortlist

### Preferred proof-of-concept: ZITADEL

ZITADEL publishes a native Electron/Tauri application path using Authorization Code + PKCE and supports both hosted and self-hosted operation. That makes it a strong data-control and native-client candidate. Its current pricing dimensions and self-hosted licensing/operations still need written verification for Horune's expected traffic and operator entity before this ADR can be accepted.

### Fallback proof-of-concept: Auth0

Auth0 documents native applications as public clients using Authorization Code + PKCE and has mature hosted operations. Its current plan limits and price curve must be modelled against expected active users, organizations, MFA and support requirements. Pricing is not copied into architecture constants because it can change.

### Not selected yet: Clerk

Clerk supports web authentication and custom OAuth/OIDC flows, but this review did not find equivalent first-party Tauri guidance and native session/device proof. It can re-enter the shortlist only with a tested native flow and data/control comparison.

## Acceptance gate

Before choosing a provider, a time-boxed proof must demonstrate:

1. web login/logout, rotation, expiry and remote revocation;
2. Tauri system-browser PKCE with deep-link and loopback threat tests;
3. account linking/recovery, MFA, device inventory and audit events;
4. export/deletion, data region, incident and availability terms;
5. current pricing at realistic MAU, MFA and management-API usage;
6. no interruption to an active local schedule during every auth transition.

Until that gate passes, website copy says Horune Account is in development and no sign-in control is displayed.

## Security references

- [RFC 8252: OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [ZITADEL application types, including native Electron/Tauri](https://zitadel.com/docs/guides/manage/console/applications-overview)
- [ZITADEL pricing and billing dimensions](https://help.zitadel.com/pricing-and-billing-of-zitadel-services)
- [Auth0 native applications](https://auth0.com/docs/get-started/auth0-overview/create-applications/native-apps)
- [Auth0 confidential and public applications](https://auth0.com/docs/get-started/applications/confidential-and-public-applications)
