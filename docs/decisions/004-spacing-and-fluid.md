# 004: Spacing and fluid sizing

## Context

Gust had five ways to size things: `space(px)`, `spaceFluid(min, max)`, `rem()`, `rfs()` and `ru()`. The fluid ones produced `calc()` against `--fluid-bp`, a variable worked out from `--fluid-screen` and two breakpoints. It only stopped growing at the top of the range, so values kept shrinking below 320px. `--spacing: 1px` made `p-16` mean 16px, not 16rem/4.

## Decision

**`--spacing: 0.0625rem`**, so a spacing step is 1px at the default root size but still scales with the user's font size. `p-16` = 1rem. In CSS, use Tailwind's `--spacing(16)`; it replaces `space()`. Write `px` literally only for things that shouldn't scale (borders, focus rings).

**Build functions** (`postcss/functions.js`, via postcss-functions):

| Function | Output |
| --- | --- |
| `to-rem(24)` | `1.5rem` |
| `to-em(24)` / `to-em(24, 12)` | `1.5em` / `2em` |
| `fluid(28, 36)` | `clamp(1.75rem, 1.5682rem + 0.9091vw, 2.25rem)` |
| `transition(color, opacity)` | `color var(--default-transition-duration) var(--default-transition-timing-function), …` |

`fluid(min, max)` replaces `spaceFluid`, `rfs`, `ru`, `strip-unit`, `--fluid-bp` and `--fluid-screen`. It's a build-time `clamp()`:

- Linear between the preset's range (320–1200 by default, set with `struts({ fluid: { min, max } })`), held at the bounds outside it.
- Matches the old formula exactly at 320, 760 and 1200 (tested).
- A shrinking value (`fluid(40, 24)`) gets its bounds swapped so the `clamp()` stays valid.
- The preferred value is `rem + vw`, so zooming text still works.

`foreground-color('x')` is gone: it's `var(--color-x-foreground)` now.

**Fluid type as tokens.** `--text-h1: fluid(28, 36)` with `--text-h1--line-height: 1.3` in `@theme` gives the `text-h1` utility. The `type-*` utilities compose family, weight and leading with that size. `heading-attributes` became `type-heading`.

## Consequences

- No runtime variables for fluid sizing; the browser just sees `clamp()`.
- Functions run before Tailwind, so they work inside `@theme` and `@utility`. Imports must be inlined first (Vite does this; elsewhere put postcss-import before the preset).
- Changing the fluid range changes every fluid value at once, which is the point.
