# struts

A CSS and JS starter for web projects, built on Tailwind v4. It's a **starting point you copy and tailor**, not a library you install: each project takes the parts it needs and changes them freely.

Its defaults are dressed in Kite Co.'s brand (blue on neutral, the IBM Plex family, hairline keylines) so the demo looks finished. A project swaps the palette, fonts and type scale and keeps the rest.

## Add it to a project

Give your coding agent this prompt from the project's root:

```text
Adopt struts (https://github.com/kite-co-code/struts) into this project.
Clone it to a temporary folder and follow its ADOPT.md. Plan the work in
phases that each leave a working build, starting with the foundation.
```

[ADOPT.md](ADOPT.md) is the full procedure, for agents and people alike.

## What's in it

- **Colour contexts.** Palette and roles in one JSON file. `surface-blue` makes everything inside (buttons, links, focus rings) follow the blue, with no per-component overrides. Dark mode and contrast warnings included.
- **A custom-property API** for every pattern, with one naming scheme and a rule for where each variable is declared.
- **Fluid sizing at build time.** `fluid(28, 36)` becomes a `clamp()`.
- **Flow spacing.** Elements declare the space above themselves.
- **Layout.** A named-track page grid, and role widths that work inside or outside it. Keylines (`rule-*`, `layout-grid--ruled`) follow every surface.
- **Accessible JS helpers** in TypeScript: disclosure, dialog, animate-on-scroll and small utilities. No framework.

## Run the demo

```bash
pnpm install
pnpm dev        # the demo page: every pattern in one place
pnpm test       # build functions and the colour plugin
pnpm check      # TypeScript
pnpm lint       # Biome
pnpm build      # build the demo into dist/
```

Node 22+, pnpm 11.

## How to read it

1. [docs/naming.md](docs/naming.md): the naming rules. Short, and everything else follows from it.
2. [docs/decisions/](docs/decisions/): why things are the way they are, one topic each.
   1. [CSS layers](docs/decisions/001-css-layers.md)
   2. [Colour contexts](docs/decisions/002-color-contexts.md)
   3. [The custom-property API](docs/decisions/003-custom-property-api.md)
   4. [Spacing and fluid sizing](docs/decisions/004-spacing-and-fluid.md)
   5. [Flow and rhythm](docs/decisions/005-flow-and-rhythm.md)
   6. [Layout](docs/decisions/006-layout.md)
   7. [JS and dynamicElements](docs/decisions/007-js-dynamic-elements.md)
   8. [Progressive enhancement](docs/decisions/008-progressive-enhancement.md)
3. `example/index.html`: every pattern in use.
4. The files themselves. Each pattern's header comment lists its markup and knobs.

To bring struts into a project, follow [ADOPT.md](ADOPT.md). To move Gust over, see [docs/guides/gust-migration.md](docs/guides/gust-migration.md).

## Layout

```
colors.config.json     palette, roles, dark scheme (+ colors.schema.json)
public/fonts/          IBM Plex Sans, Serif and Mono, served at /fonts/
css/
  index.css            the entry: Tailwind, then everything below in order
  tokens/              @theme tokens, shared :root knobs
  base/                fonts and element defaults; forms.css is opt-in
  patterns/            BEM blocks written as @utility
  utilities/           single-purpose helpers
  adapters/            wordpress.css
postcss/
  preset.js            struts({ … }) → the plugin array
  color-system.js      colours, surfaces, dark mode, contrast warnings
  functions.js         to-rem, to-em, fluid, transition
  glob-import.js       optional @import globs
js/                    TypeScript helpers
example/               the demo page
test/                  Vitest
docs/
```

## Using the preset

```js
// postcss.config.js
import { struts } from './postcss/preset.js';

export default {
    plugins: struts({
        colorsConfig: './colors.config.json', // path from the project root, or an object
        fluid: { min: 400, max: 1440 },       // viewport range for fluid(), in px (default 320–1200)
        safelist: false,                      // emit every surface-/on- class even if unused
        // classes: { surface: ['surface-{name}'], on: ['on-{name}'] },
        // globImport: true,
    }),
};
```

The preset runs the colour plugin, then the functions, then Tailwind. Imports must be inlined before it runs so the functions reach every file: Vite does this; in other builds put `postcss-import` first.
