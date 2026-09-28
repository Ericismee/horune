# ADR 0001: Declarative DOM runtime with an editor-only scene graph option

- Status: Accepted for the current milestone
- Date: 2026-09-28

## Context

Horune needs precise visual editing without making the always-on-top overlay expensive. Web and Tauri must render the same manifest, reduced motion must be reliable, and creator themes cannot execute code. A canvas framework could simplify selection and transforms, but shipping it in every overlay would increase bundle and memory cost before measurements justify it.

## Decision

Keep `ThemeManifestV1` as the only durable format and keep `@horune/theme-renderer` DOM/CSS based for the runtime overlay. The current editor also uses that renderer, with editor-owned selection and transform state layered around it.

For the multi-select/vector milestone, benchmark an editor-only scene graph implementation (for example Konva or a small custom SVG layer) against the DOM baseline. It may be adopted only inside `@horune/theme-studio` if it:

- round-trips the declarative manifest without hidden framework state;
- does not enter the overlay bundle;
- supports keyboard and pointer accessibility through an equivalent DOM control path;
- stays within documented bundle, idle CPU and memory budgets;
- produces renderer-conformance snapshots at multiple overlay sizes.

Vector authoring will emit bounded path data. Runtime boolean operations, imported plugins and arbitrary shaders are excluded.

## Consequences

- Today’s preview is closest to the actual overlay and shares its CSS/reduced-motion behavior.
- Advanced handles and vector tools take more editor work in the next milestone.
- The runtime remains independent of editor complexity and can load only the layers/effects needed by one theme.
