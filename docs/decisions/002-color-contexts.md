# 002: Colour contexts

## Context

Gust generated `color-context-*`, `has-*-background-color` and `foreground-from-*` classes from `theme-config.json`. Each set the background and foreground, then a free-form list of `properties`, which in practice were component variables (`--link--color`, `--link--color-hover`). Every new component that needed to look right on a dark background meant another entry per colour, or a `.has-x-background-color &` override inside the component.

It also emitted HSL parts (`--color-x--hsl`, `--h`, `--s`, `--l`) for tints, wrote colours into `:root` and a non-static `@theme`, and safelisted every generated class.

## Decision

**Contexts set roles, never component variables.** A surface sets `--color-background`, `--color-foreground` and whichever role tokens don't work on it (usually `--color-accent` and `--color-accent-foreground`). Components read roles. A button on `surface-blue` is white with blue text because `surface-blue` sets `--color-accent: white`, not because the button knows about blue.

`postcss/color-system.js` reads `colors.config.json` and appends to the entry stylesheet:

- `@theme static` with `--color-*: initial` (clearing Tailwind's palette), then `--color-{name}` and `--color-{name}-foreground` for every colour. Aliases are `var()` references, so they follow when a role is remapped.
- `@utility surface-{name}`: background, foreground, `color-scheme` and the colour's `vars`.
- `@utility on-{name}`: foreground and `vars` only, for text over an image or a background drawn another way.
- Dark mode (below).

An alias's surface (`surface-accent`) uses its target's declarations directly rather than `var(--color-accent)`. Otherwise the target's `vars`, which set `--color-accent`, would feed back into its own background.

**Config shape:**

```json
{
    "colors": {
        "blue": { "color": "#0e26ac", "foreground": "white", "vars": { "--color-accent": "white" } },
        "accent": { "alias": "blue" }
    },
    "schemes": { "dark": { "background": "blue", "foreground": "white", "accent": "white" } }
}
```

Any value can be a colour name (becomes `var(--color-name)`) or any CSS value. `colors.schema.json` gives editors completion and validation; the plugin also checks references and alias cycles.

**Additions:**

- **Contrast check.** A build warning when a colour and its foreground fall below 4.5:1 (also the dark scheme's background/foreground pair). Uses culori.
- **`color-scheme`** per surface, worked out from luminance (whichever of black or white contrasts more) and overridable with `colorScheme`. Native controls and scrollbars match the surface.
- **Dark mode.** `schemes.dark` maps roles to other colours. Output under `@media (prefers-color-scheme: dark)` on `:root` unless `[data-scheme=light]`, and on any `[data-scheme=dark]` element. `[data-scheme=light]` restores the light roles inside a dark region. Tailwind's `dark:` variant is redefined to match, and a role surface gets a `dark` variant automatically.
- **No HSL parts.** Use `color-mix(in oklab, var(--color-accent) 10%, var(--color-background))` or relative colour syntax. These follow the context; precomputed HSL didn't.
- **Safelist is opt-in.** Only turn it on when classes live outside scanned files (a CMS database).

## Consequences

- Adding a component never touches the colour config. Adding a surface means deciding which roles it needs.
- A surface whose `vars` miss a role inherits it from outside. On a dark page with `surface-white`, the accent stays the dark scheme's unless white's `vars` set it. Set every role that matters on every palette colour used as a surface.
- Palette foregrounds should name palette colours, not roles. `"foreground": "foreground"` would follow the dark scheme and break.
- Generated classes and colours only exist in the entry stylesheet. A component file using `@reference` can `@apply` theme utilities but should read colours with `var()`.
