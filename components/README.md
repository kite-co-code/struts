# Components

A component is a whole piece of UI (a site header, a card, a cookie banner) with its markup, styles and behaviour kept in one folder. Why: [decision 010](../docs/decisions/010-components.md).

| Kind | What it is | Lives in |
| --- | --- | --- |
| Pattern | Styles for something that appears everywhere: `btn`, `link`, `layout-grid` | `css/patterns/` |
| Utility | One job: `stack-16`, `sr-only`, `scroll-lock` | `css/utilities/` |
| Helper | Behaviour for any markup: disclosure, dialog, animate | `js/` |
| Component | Markup, styles and behaviour that only make sense together | `components/{name}/` |

If you can describe it without describing its markup, it's probably a pattern or a helper.

## A component's folder

```
components/site-header/
├── styles.css     @utility blocks. The header comment is the API
├── scripts.ts     behaviour, if it has any; registers itself with define()
└── example.html   reference markup: one <template> per example
```

That's all. `components/index.css` and `components/index.ts` import every folder's `styles.css` and `scripts.ts`, and they're generated: don't edit them.

```css
/* components/index.css (generated) */
@import "./site-header/styles.css";
```

```ts
// components/index.ts (generated)
import './site-header/scripts';
```

`css/index.css` imports `components/index.css`, and the demo's script imports `components/index.ts`.

[`tools/component-index.js`](../tools/component-index.js) writes them. In Vite it's a plugin (see `vite.config.ts`) that runs when the dev server starts or a build begins, and again when a component's `styles.css` or `scripts.ts` is added or deleted. In other builds, run `pnpm components` (or `node tools/component-index.js`) before building. Both files are committed, so a fresh clone builds straight away.

Why not a glob `@import "./*/styles.css"`: Vite and `postcss-import` inline imports before any PostCSS plugin could expand the glob, and `import.meta.glob` only exists in Vite. Generated files work everywhere.

## styles.css

The same rules as a pattern ([naming.md](../docs/naming.md), [decision 003](../docs/decisions/003-custom-property-api.md)):

- One block named after the folder, written as `@utility` so variants and `@apply` work: `site-header`, `site-header__nav`, `site-header--compact`.
- A header comment listing the markup, the elements, and the knobs. Keep it accurate; it's the API.
- Read role tokens (`--color-background`, `--color-accent`), never palette colours. A `surface-*` class on the component then recolours it with no overrides.
- Logical properties, `--spacing(n)`, and motion behind `prefers-reduced-motion: no-preference`.
- Compose patterns with `@apply` (`site-header__icon` applies `cross`) or with classes in the markup (`btn` on the toggle).

## scripts.ts

The same rules as a helper in `js/` ([decision 007](../docs/decisions/007-js-dynamic-elements.md)):

- A class taking the root element, registered at the bottom with `define('[data-{name}]', …)`. Import helpers from `../../js/`.
- Hooks are `data-*` attributes named after the component: `data-site-header`, `data-site-header-hidden`.
- Native platform features first. The markup should work before the script runs ([decision 008](../docs/decisions/008-progressive-enhancement.md)); the script adds to it.
- Expose `destroy()` if the component can be removed from the page.

## example.html

The reference markup. The demo's components page (`pnpm dev`, then `/components/`) renders every example in a frame you can resize, with its source underneath.

```html
<!--
One or two sentences on what the component is. Shown under its name.
-->

<template data-example="Default" data-description="What to try in this example.">
    <article class="card">…</article>
</template>

<template data-example="On a surface" data-example-layout="page">
    <header class="site-header surface-blue" data-site-header>…</header>
</template>
```

- `data-example`: the example's title.
- `data-description`: optional, shown above the frame.
- `data-example-layout="page"`: render it at the top of a long, scrolling page, for components that position themselves against the viewport. Without it, the example is rendered alone with some padding.

Write each example as real, accessible markup, with real `href`s and `id`s. It's what projects copy.

## In a project

struts has no templating, so `example.html` is the source a project ports to its own:

- **Astro, Svelte, Vue:** a component per folder. Keep `styles.css` and `scripts.ts` beside it and import them from the global entries, not a scoped `<style>` (scoped CSS can't see the colour utilities).
- **Gust:** `template.php` and a `make()` class from the markup, `example.php` from the examples, `styles.pcss` from `styles.css`, `scripts.js` from `scripts.ts`.

Keep the folder name and class names, so a fix in struts can still be found and carried over by hand.

## Adding one

1. Make the folder with `styles.css` and `example.html`, and `scripts.ts` if it needs behaviour.
2. Check that `components/index.css` (and `index.ts`, with a script) now imports it. With `pnpm dev` running that's automatic; otherwise run `pnpm components`.
3. Check it on the components page: every example at every width, inside a surface, in the dark scheme, with reduced motion, and with the keyboard.
4. Add its hooks to [naming.md](../docs/naming.md).
