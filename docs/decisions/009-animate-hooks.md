# 009: Animate on scroll hangs off data attributes

## Context

Animate on scroll was an `@utility` pattern (`.animate`, `.animate__item`) plus a JS hook (`data-animate`). The CSS hid items with `.js .animate .animate__item` and played them with `.animate[data-playing] .animate__item`. That had three problems:

- **Two hooks for one thing.** `.animate` without `data-animate` hid its items for good: the CSS hid them and no script would ever play them.
- **Items had to be descendants.** A trigger couldn't play an element elsewhere in the page, such as an image in another column.
- **Nesting leaked.** `.animate[data-playing] .animate__item` also matched the items of a nested block, so they played with the outer one.

## Decision

The pattern's styles exist only to serve `js/animate.ts`, so they key off the script's attributes:

- `data-animate` marks a trigger. `data-animate-item` marks an item, and its optional value names a trigger by id.
- An item's trigger is the id in its value, else its nearest `[data-animate]` ancestor (not itself), else the item itself. Each item has exactly one trigger.
- The script sets `[data-playing]` on each item, not the trigger. The CSS has no descendant combinators, so nesting and remote items need no special cases.
- Knobs stay custom properties, never declared and read with a fallback (decision 003), so a class, a parent or a Tailwind arbitrary property can still set them. They inherit through the DOM, so a remote item doesn't get its trigger's.
- The rules sit in `@layer utilities` inside `:where()`, like `utilities/aria-expanded.css`, so any class beats them.

Items that start together go through one queue in document order, whatever their trigger, with a cap on the wait.

## Consequences

- One attribute per element. The hidden state matches exactly what the script will reveal.
- No `md:animate` and no `@apply animate`. Neither makes sense for a behaviour; to vary the look by breakpoint, set the knobs with variants (`md:[--animate--animation-name:fade-in-translate]`).
- This is the rule for any pattern whose CSS exists only to serve a script: style the script's data attributes. Patterns and components that work without JS and only get extras from it (the `site-header` component) stay `@utility` classes.
