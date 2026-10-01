# 006: Layout

## Context

Gust had `content-grid` (a 12-column grid with `full` and `wide` areas), `col-*` placement, `align-*` utilities for outside the grid, `content-width-*`, `content-width-fluid-*`, `max-w-fluid-*` and `--width-fluid-*` variables. Several did the same thing; the 12 columns were only used for left/right halves.

## Decision

**`layout-grid`** has named tracks:

```
| full | wide |        content        | wide | full |
              | start      |      end |
```

- Children default to `content` (with zero specificity, so any class wins).
- The outer tracks are at least `--gutter`, so content never touches the viewport edge.
- The `wide` tracks shrink to `--layout--inset` before `content` does (zero by default; Kite Co. sets it from `md`).
- `layout-grid--ruled` draws a keyline down the inline-start edge of `wide`, through the grid's padding, from `md`. It's an absolutely positioned `::before` placed with `grid-column: wide`, so it tracks the grid without extra markup.

**Role widths**, on `:root` in `patterns/layout.css`, pointing at container tokens:

| Role | Default |
| --- | --- |
| `--layout--wide` | `--container-lg` |
| `--layout--content` | `--container-lg` (Kite Co.: content fills the frame, inset from the keyline) |
| `--layout--narrow` | `--container-sm` |
| `--layout--inset` | `0px`, `--spacing(24)` from `md` |

Kite Co.'s pages are left-aligned: a keyline at the frame's edge, content just inside it, and each element capping its own measure (`prose`, `max-w-[…]`). Pointing `--layout--content` at a narrower container brings back a centred column.

**`layout-full | layout-wide | layout-content | layout-narrow`** work in both places:

- Inside `layout-grid`: they set `grid-column` (narrow is the content track, capped and centred).
- Anywhere else: `inline-size: 100%; max-inline-size: min(role width, 100% - 2 × --gutter); margin-inline: auto`.

**`layout-width-{size}`** is the same gutter-aware cap for any `--container-*` token: `layout-width-xs`. It replaces `content-width-*`, `content-width-fluid-*` and `max-w-fluid-*`.

**`layout-start` / `layout-end`** are the two halves of the content track, side by side from `md`, stacked below. Only valid inside `layout-grid`. The 12-column system is dropped; use `grid-simple cols-12` if you really need one.

Separate grids for content: `grid-simple` (`--cols` equal columns, set with `cols-{n}`), `grid-auto` (as many as fit), `flex-grid` (columns that can centre the last row) and `flex-list` (a wrapping row at natural widths).

## Consequences

- One mental model: a role name means the same width in and out of the grid.
- Projects change widths by repointing the three role variables, not by editing the grid.
- Container tokens are reset (`--container-*: initial`) so Tailwind's `max-w-3xl` and friends don't exist alongside the project's scale.
