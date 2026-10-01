# 001: CSS layers and file order

## Context

Gust split its CSS into numbered folders (`1-theme`, `2-base`, `3-patterns`, `4-utilities`). The numbers did the job of cascade layers, but by convention only, and specificity fights crept in (`.has-*-background-color &` overrides inside buttons, `!important` in the screen-reader class).

## Decision

Lean on Tailwind v4's cascade layers and keep the folders by role:

| Folder | Layer | What goes in it |
| --- | --- | --- |
| `css/tokens/` | `theme` (via `@theme`), `base` | Theme tokens; shared `:root` knobs |
| `css/base/` | `base` | Element defaults. `forms.css` is opt-in |
| `css/patterns/` | `utilities` (via `@utility`) | Multi-property BEM blocks |
| `css/utilities/` | `utilities` | Single-purpose helpers |
| `css/adapters/` | `components` | Mapping a platform's classes onto patterns |

`css/index.css` is the only entry. It imports Tailwind, then everything in that order.

Patterns are `@utility` rather than plain classes, even though they're multi-property:

- `@apply btn` works anywhere, including from base styles (`a { @apply link }`).
- Variants work: `md:cols-4`, `hover:…`, `dark:…`.
- Tailwind only emits what's used.

Within the utilities layer, Tailwind sorts custom-property-only utilities after ones that set real properties. That's why modifiers (which only set their block's variables) reliably beat their block without extra specificity.

## Consequences

- Any class beats any element default, because base is an earlier layer. No `:where()` gymnastics needed in base.
- Adapter rules live in `components`, so a utility still overrides them.
- Because patterns are only emitted when used, classes that only exist in a CMS database won't be generated. Adapters use plain rules for that reason, and the colour plugin has a `safelist` option.
- `@property` registrations (`--flow-space`, `--cols`) sit outside any layer, as they must.
