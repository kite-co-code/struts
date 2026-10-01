# 005: Flow and vertical rhythm

## Context

Gust had `flow`, `content-flow`, `prose`, `not-prose`, `stack-*` and margin rules in base styles. `--flow-space` was declared on `:root` and inherited, so a `<div>` inside a `<p>`-spaced list picked up paragraph spacing by accident. `not-prose` duplicated the whole prose block to undo it, and then a third copy re-enabled prose inside `not-prose`.

## Decision

Three tools, each with one job:

| Tool | Spacing comes from | Use for |
| --- | --- | --- |
| `flow` | Each child's own `--flow-space`, falling back to `--space-layout` | Mixed content where elements should space themselves |
| `stack-{n}` | One explicit gap, `--spacing(n)` | Components with uniform spacing |
| `prose` | `flow`, plus a measure and list styling | Rich text you don't control |

**`--flow-space` is registered with `inherits: false`.** An element only has a flow space if it declares one. Defaults are in `base/elements.css`:

- `p`, `ul`, `ol`, `dl`: `--space-base`
- headings: `1lh`, or `--spacing(4)` straight after another heading
- anything after `.layout-wide`/`.layout-full`: `--space-layout`
- everything else: the fallback, `--space-layout`

**`stack-{n}`** writes the margin straight onto the children rather than through a variable, so a nested stack can't inherit its parent's gap. Children's own block margins are cleared.

**`prose`** = `flow` + `max-inline-size: 65ch` on text children + `list-styled` on lists. `content-flow` is merged into it.

**`not-prose`** has no CSS. Prose's list selectors exclude it: `:where(ul, ol):not(:where(.not-prose, .not-prose *))`.

`margin-trim`, `margin-trim-first` and `margin-trim-last` stay, for containers that aren't `flow` but hold elements with margins.

## Consequences

- To change spacing for an element type, change its `--flow-space` in one place.
- A `.prose` inside `.not-prose` stays excluded. That's the price of not duplicating the block; restructure the markup if you hit it.
- `flow` only spaces direct children. Nested content needs its own `flow`, `stack` or `prose`.
