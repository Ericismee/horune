# Security policy

## Supported versions

Horune is pre-release software and has no supported production release line yet. Security fixes are made on `main`; this statement will be updated when versioned releases exist.

## Report a vulnerability

Do not open a public issue for a vulnerability. Use GitHub's private vulnerability reporting for [`Ericismee/horune`](https://github.com/Ericismee/horune/security/advisories/new) when available, or email [eric.wk08@gmail.com](mailto:eric.wk08@gmail.com) with the subject `Horune security report`.

Include:

- affected commit/version and operating system;
- impact and required preconditions;
- minimal reproduction steps or proof of concept;
- whether simulation was enabled;
- suggested mitigation, if known.

Do not include unrelated personal data or execute a real shutdown/sleep action on someone else's device. Please allow a reasonable acknowledgement and remediation window before public disclosure.

## High-priority areas

- A theme or imported asset executing script, loading an external resource, escaping validation, or reaching Tauri/native commands.
- A schedule executing without explicit local acceptance, especially after restart, sleep, clock change, or overdue recovery.
- Simulation mode being bypassed.
- Path traversal, unsafe SVG/GIF handling, decompression/memory denial of service, or unbounded animation.
- Future authentication, authorization, paid entitlement, payment webhook, admin, or audit-log bypasses.

## Design commitments

- Themes remain declarative, bounded data and never contain executable creator code.
- Website/remote API state cannot directly invoke a local power action.
- Payment confirmation and paid ownership will be server-authoritative.
- Automated tests use simulation/fake adapters only.
- Security controls on a contributor machine should not be disabled to make a build pass.

See [docs/theme-security.md](docs/theme-security.md) for format and asset policy.
