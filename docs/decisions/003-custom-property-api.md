# 003: The custom-property API

## Context

In Gust, component variables were mostly declared on `:root` (`--btn--background-color: var(--color-brand-2)` inside `@layer base { :root { … } }`). That has a nasty consequence: `var()` resolves where the property is declared, so `--btn--color: var(--color-accent)` was fixed to the root's accent. Inside a blue section the button still used the page accent, which is why the `.has-*-background-color &` overrides existed.

Naming had drifted too: `--btn--color-hover` next to `--btn--background-color--hover`, `--link--text-decoration--hover`, `--base--focus-width` and `--focus--color` for the same feature.

## Decision

The naming is in [naming.md](../naming.md). This doc is about **where variables are declared**, because that decides what can override them.

| Kind of knob | Declared | Read as | Example |
| --- | --- | --- | --- |
| Set only by the block's own variants | On the block | `var(--btn--padding-x)` | `.btn { --btn--padding-x: 1em }` |
| Set by a context (a surface or a parent) | Never | `var(--x, fallback)` | `var(--link--color, var(--color-accent))` |
| Shared by several patterns | `:root` in `tokens/globals.css`, unless it's context-settable | `var(--gap)` | `--gutter`, `--space-base` |
| Derived state | On the block, from the base value | `color-mix(…)` | `--btn--background-color--hover` |

Why each one:

- **On the block**: the `var()` inside resolves at the element, so `--btn--background-color: var(--color-accent)` picks up whatever accent the surface set. Variants override it on the same element.
- **Never declared**: a declaration on the element would beat an inherited value from a parent. Leaving it undeclared lets a parent's `--link--color` inherit down; the fallback covers the default.
- **Derived with `color-mix()`**: `color-mix(in oklab, var(--btn--background-color) 80%, var(--color-background))` follows both the variant and the context. No per-surface hover colours.

Focus is the same pattern: `--focus-color` is never declared, and the ring reads `var(--focus-color, var(--color-foreground))`.

Two variables are registered with `@property … inherits: false`:

- `--flow-space`, so each element's space-above is its own (see [005](005-flow-and-rhythm.md)).
- `--cols`, so a grid nested in a 4-column grid starts at one column.

## Consequences

- Context support is free for any pattern built this way. The test is: put it inside `surface-blue` and `[data-scheme=dark]` with no extra CSS.
- Patterns list their knobs in a header comment. That comment is the API; keep it current.
- A modifier must only set its block's variables. If it needs a real property, check it doesn't fight the block in Tailwind's sort order.
