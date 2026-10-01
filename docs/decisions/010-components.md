# 010: Components

## Context

struts had patterns (CSS for things that appear everywhere) and helpers (JS for any markup). The mobile menu was neither. It's a site header whose styles, script and markup only make sense together, and it was split across `css/patterns/site-header.css`, `js/site-header.ts` and the demo page. To find out how to use it, you had to read all three.

Gust keeps that kind of thing in `components/{name}/`: a class and template, `styles.pcss`, `scripts.js` and an `example.php` that its dev kit renders at `/_dev/components/`.

## Decision

struts gets the same shape, minus the templating it doesn't have:

- **`components/{name}/`** holds `styles.css` (`@utility` BEM blocks, with the header comment as the API), `scripts.ts` (a class registered with `define()`) and `example.html` (reference markup, one `<template data-example>` per example).
- **Patterns and helpers stay where they are.** A component is markup plus styles plus (usually) behaviour that only work together. Styles or behaviour that work on any markup are still a pattern or a helper.
- **Generated indexes.** `components/index.css` and `components/index.ts` import every component; `css/index.css` imports the first. `tools/component-index.js` writes them from the folders, like Gust's generated `_components.pcss`: as a Vite plugin in dev and at build time, or from the command line (`pnpm components`) in other builds. A glob `@import` can't work: Vite and `postcss-import` inline imports before any PostCSS plugin could expand it. The old `globImport` preset option was removed for that reason.
- **`example.html` is the template.** Projects port it to Astro, PHP or whatever they render with. It's real, accessible markup, not a sketch.
- **The components page** (`example/components/`) bundles every `example.html` with `import.meta.glob` and renders each example in the browser, in an iframe with width presets, with its source underneath. Frames isolate page-level components (sticky headers, scroll locks, popovers against the viewport), which can't be shown inline in a page about them.

`site-header` is the first component. It moved from `css/patterns/site-header.css` and `js/site-header.ts` into `components/site-header/`. Its classes and hooks are unchanged; it gained `site-header__bar` and `site-header__brand`, so the component owns its row layout instead of leaving it to utilities in the markup.

## Consequences

- A component's whole API is in one folder: the header comment for classes and knobs, the examples for markup, the script's header for behaviour.
- Adding a component is adding a folder. The index files are committed so any build works from a fresh clone; outside Vite, someone has to run `pnpm components` after adding or deleting one.
- The components page needs JS: it builds itself from the example files. The frames always run with JS on, so a component's no-JS state has to be checked on a real page (the demo homepage uses `site-header`).
- Projects that adopt struts copy `components/` and port the examples. They keep the folder and class names so fixes can travel by hand.
