# 007: JS setup with dynamicElements

## Context

Gust's helpers were plain JS classes registered with `dynamicElements.define(selector, callback)`, a small `customElements.define()` lookalike for ordinary markup. It worked, but tracked set-up elements in a `WeakMap<Element, Set<selector>>`, had no teardown, and the helpers had grown project-specific bits (a `localStorage` key, `console.log`s, `aria-hidden` and tabindex rewriting).

## Decision

Keep the pattern, port to TypeScript (strict), and tighten it:

- **Tracking**: one `WeakSet<Element>` per selector (`Map<selector, WeakSet>`; a string can't be a `WeakMap` key). Set-up elements can still be garbage collected.
- **Added nodes**: check the node itself and its descendants.
- **`disconnected` callback**: optional. Runs when a set-up element leaves the DOM, but not when it's moved (moved nodes are connected again by the time the observer runs). The element is set up again if it comes back. Only definitions with this callback keep strong references.
- **Hooks are `data-*` attributes**, never classes.
- Each helper registers itself on import: `import './js/disclosure'` is enough.

Helpers:

| File | Notes |
| --- | --- |
| `disclosure.ts` | `hidden` + `inert` instead of `aria-hidden` and tabindex rewriting. `CSS.escape` for ids. Enter/Space for non-button triggers. Trigger contents shown by state with CSS (`data-show-expanded`), not JS. For a plain accordion, use `<details name>` instead. |
| `dialog.ts` | Native `<dialog>` does focus and Escape. Adds invoker commands (`commandfor`) where they're missing, `data-dialog-open` from anywhere, `<template>` cloning into a slot, and clearing the slot after close. Scroll lock is CSS. |
| `animate.ts` | IntersectionObservers that set `[data-playing]` on each item, through one queue so items that start together play in document order. Unobserves on disconnect. |
| `focusable.ts` | Functions, using `checkVisibility()`. |
| `cookies.ts` | URI-encoded names and values; `Secure` on HTTPS. |
| `debounce.ts` | Replaces `lodash.debounce`. |
| `data-attributes.ts` | Shared boolean/number data-attribute readers. |

Component scripts (`components/{name}/scripts.ts`) follow the same rules; see [010](010-components.md).

Build plugins stay plain ESM JS with JSDoc so they copy into any build without TypeScript config.

## Consequences

- No framework, no custom elements, no hydration step. Works with server-rendered HTML and content injected later.
- `define()` throws if a selector is defined twice, which catches double imports.
- A helper that needs per-instance teardown exposes `destroy()`; pass it to `disconnected` when elements can be removed.
