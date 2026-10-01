# Moving Gust onto struts

This guide moves the Gust theme (`~/code/my-projects/gust/wp-content/themes/gust`) onto struts. Struts is where Gust's CSS and JS foundation went once it was cleaned up, so most of the job is renaming. Some pieces change shape, and a few are dropped.

Work through it in the order in [Migration order](#4-migration-order). Each step leaves the theme building and working, so you can stop between steps.

- Naming rules: [docs/naming.md](../naming.md)
- Why things changed: [docs/decisions/](../decisions/)
- WordPress class mapping: [css/adapters/wordpress.css](../../css/adapters/wordpress.css)

Usage counts below come from Gust's `components/`, `assets/scripts/`, `Theme/` and root PHP. They leave out Gust's own core styles (`assets/styles/`), which get replaced wholesale, and the dev kit (`Gust/Dev/templates/`). The dev kit holds 8 more `color-context-*` uses and the `grid-simple`/`--cols` demos. Sweep both of those too.

All search patterns are for `rg` (ripgrep). Run them from the theme root:

```bash
rg -n 'pattern' components assets Theme Gust *.php
```

---

## 1. Quick fixes Gust can make first

These are bugs or dead code in Gust today. Fix them before adopting anything, so that changes in look during the migration come from the migration and not from these.

Already done in `fa273fb` ("Fix undefined CSS vars…"): `--radius--lg`, `--transition--duration`/`--transition--ease` defined, `--site-header--bottom`, `--submenu--transition-ease`, the Focusable selector comma, `dynamicElements` per-selector tracking, the `stack-*` override, the custom `sr-only`, and the Disclosure `console.log`s and `localStorage` read.

Still to do:

| Fix | Where | What to do |
|---|---|---|
| Unused duplicate breakpoint | `assets/styles/1-theme/_tailwind-theme.pcss:18` | Delete `--breakpoint-siteheader`. Nothing uses it; `site-header` has 14 uses. |
| Old `theme()` syntax | 62 `theme('screens.*')` in `components/**/styles*.pcss` | Change to `theme(--breakpoint-md)` etc. Pattern: `theme\(['"]screens\.` |
| Forced SVG width | `assets/styles/2-base/_base.pcss:131` (`svg { width: 100% … }`) | Delete the rule. Check that inline SVGs from `Gust/SVG.php` and the social icons have `width`/`height` or a size class, or they fall back to 300×150. |
| `:focus` instead of `:focus-visible` | `_base.pcss:42`, `_button-styles.pcss:64,225`, `breadcrumbs/styles.pcss:17`, `site-header/styles/_menu.pcss:76`, `cookie-consent/styles.pcss:52` | Style `:focus-visible`. Drop the `&:not(:focus-visible)` workaround in `focus-base`. |
| Select arrow is a fixed colour | `assets/styles/3-patterns/_select.pcss:16` (`%231a1a2a`) | It's invisible on dark surfaces. Copy the `currentColor` gradient chevron from `css/patterns/select.css`. |
| Select hover sets a variable nobody reads | `_select.pcss` (`--input--background` with a TODO) | `input` reads `--input--background-color`. Fix the name or delete the line. |
| IE code | `_select.pcss` (`&::-ms-expand`) | Delete. |
| Hover decoration variable typo | `components/site-header/styles.pcss:24` (`--link--text-decoration-hover`) | Core reads `--link--text-decoration--hover`, so this does nothing. |
| HSL colour parts | `components/video-item/styles.pcss:21`, `_base.pcss:61` (`hsla(var(--color-black--hsl), …)`) | `color-mix(in oklab, var(--color-black) 50%, transparent)`. The new colour plugin doesn't emit `--hsl`. |
| `aria-hidden` as show/hide state | `assets/scripts/helpers/Disclosure.js:31,122,197`, `Dialog.js:79,110`, `components/cookie-consent/scripts/CookieConsent.js:78,87,108`, `components/accordion/Accordion.php:67` | Use `hidden` (and `inert` for anything focusable). Disclosure reads its start state from `aria-hidden`, so change the JS and the markup together. |
| Unescaped ids in selectors | `Disclosure.js` (`[aria-controls=${this.el.id}]`, unquoted), `Dialog.js:21,22,38` | Quote the value and wrap it in `CSS.escape()`. Ids starting with a digit break the unquoted form today. |
| lodash for one function | `components/site-header/scripts/SiteHeader.js:1`, `package.json:47` | Swap in `js/debounce.ts`. SiteHeader only uses `debounce(fn, ms)`, so no lodash options are lost. Then remove `lodash.debounce`. |

Check: `pnpm build` passes and the dev kit pages look the same, apart from the select arrow and focus rings, which should only show for keyboard users now.

---

## 2. Rename tables

### Classes

| Gust | struts | Search | Uses |
|---|---|---|---|
| `color-context-{name}` | `surface-{name}` | `color-context-` | 1 (+8 dev kit) |
| `has-{name}-background-color` in theme markup | `surface-{name}`. Post content keeps WP's class; the adapter generates it (see §3) | `has-[a-z0-9-]+-background-color` | 1 |
| `foreground-from-{name}` | `on-{name}` | `foreground-from-` | 0 |
| `content-grid` | `layout-grid` | `content-grid` | 7 |
| `alignwide`, `alignfull`, `aligncenter`, `alignleft`, `alignright` (WP's classes) | Keep them. The adapter maps them to `layout-wide/-full/-narrow/-start/-end` | `\balign(wide\|full\|left\|right\|center)\b` | 27 |
| `alignprose` | `layout-narrow`, or `prose` for the measure | `alignprose` | — |
| `align-wide`, `align-full`, `align-center` (non-grid utilities) | `layout-wide`, `layout-full`, `layout-narrow` | `\balign-(wide\|full\|center\|none)\b` | 2 |
| `align-left`, `align-right` (floats) | No equivalent. `layout-start`/`layout-end` only work inside `layout-grid` | `\balign-(left\|right)\b` | — |
| `col-full`, `col-wide` | `layout-full`, `layout-wide` | `\bcol-(full\|wide)\b` | 0 |
| `col-wide-span-{n}` | Dropped, along with the 12-column system. Use `layout-start`/`layout-end` or a nested grid | `col-wide-span-` | 0 |
| `content-width-{size}`, `content-width-fluid-{size}` | `layout-width-{size}`, which always keeps the gutter clear | `content-width-` | 16 |
| `content-width-full` | `layout-full` | `content-width-full` | — |
| `max-w-fluid-{size}` | `layout-width-{size}` | `max-w-fluid-` | 0 |
| `grid-columns-{n}`, `[--cols:n]`, `style="--cols: n"` | `cols-{n}` (works with variants: `md:cols-3`) | `grid-columns-\|--cols` | 0 + `components/grid` |
| `flex-grid-item` | Gone; `flex-grid` sizes its children | `flex-grid-item` | — |
| `btn--theme-2` | `btn` (see the note below the table) | `btn--theme-2` | 1 |
| `btn` (Gust's pale default) | `btn btn--secondary`, or restyle `.btn` in the project | `\bbtn\b` | many |
| `btn--icon`, `btn--icon-before` | `btn--square` + `<span class="btn__icon"></span>` + `sr-only` text | `btn--icon` | 6 |
| `btn--arrow` | Dropped. Use `btn__icon` with `--btn--icon` and a `group-hover:` nudge | `btn--arrow` | 0 |
| `btn--label` | `btn btn--small type-meta` | `btn--label` | 2 |
| `btn--unstyled` | `button-reset` | `btn--unstyled` | 3 |
| `btn--ghost`, `btn--small`, `btn--square` | Same | | 6 |
| `heading-attributes` | `type-heading` | `heading-attributes` | 0 (core 8) |
| `focus-base` | `focus-ring` | `focus-base` | 0 |
| `no-focus-be-careful` | `focus-none` | `no-focus-be-careful` | 0 |
| `screen-reader`, `screen-reader-text` (theme markup) | `sr-only` (+ `focus:not-sr-only` for skip links) | `\bscreen-reader(-text)?\b` | 15 |
| `screen-reader-text` (from WP core and plugins) | Leave it; the adapter maps it | | |
| `no-scroll` on `<html>` | Nothing for dialogs (`html:has(dialog:modal)` locks scroll). Use `scroll-lock` for anything else | `no-scroll` | 8 (Dialog.js, SiteHeader.js, video-item) |
| `responsive-embed` | `aspect-video` / `aspect-[4/3]`, or `media-embed` for a figure | `responsive-embed` | 2 |
| `content-flow` | `prose` for rich text, `flow` for a column of blocks | `content-flow` | 6 |
| `list-reset-hard` | `list-reset m-0`. struts list items have no margins outside `list-styled` | `list-reset-hard` | 4 |
| `checkbox-field`, `radio-field` (wrapper + label pseudo-elements) | `checkbox` / `radio` on the `<input>`, with the label wrapping it | `(checkbox\|radio)-field` | 3 |
| `input--button-height` | Dropped | | 0 |
| `link--2` | `link--subtle` | `link--2` | 4 |
| `.animate` | `.animate` + `data-animate` | `class="[^"]*\banimate\b` | 3 |
| `animate-element` | `animate__item` | `animate-element` | 12 |
| `animate--play` | `[data-playing]` (set by `animate.ts`) | `animate--play` | 4 |
| `tooltip` | Dropped (it hard-coded the error context). Build it in the component | `\btooltip\b` | 3 |
| `body::before` backdrop | `::backdrop` on the dialog | | |
| `js-*` hooks | `data-*` attributes | `\bjs-[a-z0-9-]+` | 13 in 6 files |
| `dialog-is-open`, `{name}-dialog-is-open` on `<body>` | `body:has(dialog[open])`, `:has(#name[open])` | `dialog-is-open` | 4 |
| `margin-trim(-first\|-last)`, `flex-grid(-auto)`, `flex-list`, `grid-simple`, `grid-auto`, `list-reset`, `list-styled`, `media-embed`, `mask-icon`, `img-fit`, `button-reset`, `cross`, `input`, `input-group`, `select`, `blockquote`, `link`, `link--foreground`, `type-*`, `is-style-type-*` | Unchanged | | |

**Buttons change meaning.** Gust's default `.btn` is a pale `brand-2` fill with accent text, and `btn--theme-2` is the solid accent. In struts the default `.btn` is the solid accent, and `btn--secondary` is an outline. So `btn btn--theme-2` becomes `btn`. Gust's plain `btn` becomes either `btn btn--secondary` (a different look) or keeps its look if the project sets `--btn--background-color: var(--color-secondary); --btn--color: var(--color-accent)` on `.btn`. Decide this before the sweep.

**Icon buttons.** `btn__icon` only draws the mask when the element is empty (`:empty`). `components/site-header/template.php:30` has its `sr-only` text inside the icon span. Move the text out to sit next to the icon.

### Custom properties

| Gust | struts | Search | Uses |
|---|---|---|---|
| `--container-padding` | `--gutter` | `--container-padding` | 12 |
| `--width-fluid-container`, `--width-fluid-{size}` | `layout-width-{size}`, or `min(var(--container-x), 100% - 2 * var(--gutter))` | `--width-fluid-` | 2 |
| `--col-min-width` | `--grid-auto--min-inline-size` (set on `.grid-auto`) | `--col-min-width` | 0 |
| `--cols` on `:root` (responsive default) | `cols-{n}` classes. `--cols` is now registered as non-inheriting with an initial value of 1 | `--cols` | 9 (`components/grid`) |
| `--focus--color` | `--focus-color`. Never declared; set it in a context if needed, otherwise it falls back to the foreground | `--focus--color` | 0 |
| `--base--focus-width`, `--base--focus-offset` | `--focus-width`, `--focus-offset` | `--base--focus` | 0 |
| `--link--color` | Same name, but no longer declared on `:root`. It reads `var(--link--color, var(--color-accent))` | `--link--color\b` | 3 |
| `--link--color-hover` | `--link--color--hover` | `--link--color-hover` | 4 |
| `--link--text-decoration`, `--link--text-decoration--hover` | `--link--text-decoration-line`, `--link--text-decoration-line--hover` | `--link--text-decoration` | 4 |
| `--btn--color-hover` | `--btn--color--hover` | `--btn--color-hover` | 5 |
| `--btn--background-color--hover`, `--btn--border-color--hover`, `--btn--size`, `--btn--icon`, `--btn--icon-size` | Same | | 13 |
| `--btn--font-size` | Dropped; `.btn` inherits its font. Set `font-size` on the button | `--btn--font-size` | 0 |
| `--input--background-color--highlight` | `--input--background-color--hover` | `--input--background-color--highlight` | 0 |
| `--input--color-focus`, `--input--outline-*--focus` | Dropped; the global `:focus-visible` ring does this | `--input--(color-focus\|outline)` | 0 |
| `--input--padding` | `--input--padding-x` / `--input--padding-y` | `--input--padding\b` | 0 |
| `--input--gap`, `--form--label-spacing`, `--form--textarea-height` | Dropped. Use `stack-8` / `gap-*`; textarea height is in `base/forms.css` | `--(input--gap\|form--)` | 2 |
| `--checkbox--padding`, `--checkbox--check-*`, `--radio--padding` | Dropped; see `checkbox.css` / `radio.css` for the new set | `--(checkbox\|radio)--` | 0 |
| `--list--item--spacing` | `--list-styled--gap` | `--list--` | 0 |
| `--list--indent`, `--list--nested-indent` | `--list-styled--padding-inline-start` | | 0 |
| `--list--marker-color` | `--list-styled__marker--color` | | 0 |
| `--fluid-bp`, `--fluid-screen`, `--fluid-min-width`, `--fluid-max-width`, `--breakpoint-fluid-*` | Removed. `fluid()` writes a `clamp()` at build time | `--fluid-\|fluid-(min\|max)` | 0 |
| `--transition--duration`, `--transition--ease` | `--default-transition-duration`, `--default-transition-timing-function` | `--transition--` | 2 |
| `--color-{x}--foreground` | `--color-{x}-foreground` | `--color-[a-z0-9-]+--foreground` | 0 |
| `--color-{x}--hsl`, `--h`, `--s`, `--l` | `color-mix()` or relative colour syntax | `--color-[a-z0-9-]+--(hsl\|h\|s\|l)\b` | 1 |
| `--animate-animation` | `--animate--animation-name` | `--animate-(animation\|duration\|delay\|easing\|item-delay\|key\|translate)` | 24 |
| `--animate-duration`, `--animate-delay`, `--animate-easing` | `--animate--animation-duration`, `--animate--animation-delay`, `--animate--animation-timing-function` | | |
| `--animate-item-delay` + `--animate-key` | `data-animate-stagger="ms"` on the block (sets `--animate__item--animation-delay`) | | |
| `--animate-translateX`, `--animate-translateY` | `--animate--translate: X Y` | | |
| `--prose--max-width` | `--prose--max-inline-size` | `--prose--max-width` | 0 |
| `--hr--color`, `--hr--thickness` | The global `--rule-color`, `--rule-width`: `<hr>` is a keyline like the `rule-*` utilities | `--hr--` | 2 |
| `--heading--margin-top`, `--heading--margin-bottom` | Gone; headings set `--flow-space: 1lh` and `flow`/`prose` space them | `--heading--margin` | 1 |
| `--heading--max-width` | Not carried over. Use `max-w-[17em]` or a project token | `--heading--max-width` | 8 |
| `--section--padding-y` | Same, but declared on `.section`, so it's only readable inside an element with the `section` class | `--section--` | 18 |
| `--section--padding-x` | `--gutter` | | |
| `--section--max-width` | `layout-*` | | |
| `--section--header--margin-bottom`, `--section--footer--margin-top`, `--section--margin-bottom` | Dropped. Use `stack-*` / `flow` | | |
| `--site--scroll-padding-top` | `--scroll-offset` (set it from the header script) | `--site--scroll-padding-top` | 0 |
| `--underline-offset` | Dropped; `html` sets `text-underline-offset: 0.2em` | | 0 |
| `--scrollbar-width` | Dropped; `scrollbar-gutter: stable` | `--scrollbar-width` | 1 |
| `--backdrop--*` | `::backdrop` | | 0 |
| `--rounded-border-radius`, `--rounded-overflow` | Not carried over. Make a project `@theme` token, e.g. `--radius-block` | `--rounded-` | 15 |
| `--base--shadow`, `--base--shadow--hover` | Not carried over. Project `--shadow-*` tokens using `color-mix()` | `--base--shadow` | 12 |
| `--base--border` | Not carried over | `--base--border` | 2 |
| `--z-index-*` | Not carried over. Keep them as project tokens if you need them | `--z-index-` | 3 |
| `--space-base`, `--space-layout`, `--flow-space`, `--col-gap`, `--row-gap` | Same. New: `--gap` is the default for both | | 41 |

**`--flow-space` no longer inherits.** It's registered with `inherits: false`, so each element declares its own space above it. Gust sets it on component roots in `pagination/styles.pcss:2`, `page-header/styles.pcss:177`, `taxonomy-filters` and `editor/_editor.pcss`. Check that each one means "space above me" and not "space for my children".

### Build functions

| Gust | struts | Search | Uses |
|---|---|---|---|
| `space(n)` | `--spacing(n)` | `\bspace\(` | 69 in 13 files |
| `space(n, 'px')` | `npx` written literally | `space\([^)]*px` | 0 |
| `spaceFluid(a, b)`, `rfs(a, b)`, `ru(a, b)` | `fluid(a, b)` | `spaceFluid\(\|\brfs\(\|\bru\(` | 22 |
| `spaceFluid(a)` | `--spacing(a)` | | |
| `rem(px)`, `em(px)` | `to-rem(px)`, `to-em(px[, base])` | `\b(rem\|em)\(` | 1 |
| `strip-unit()` | Removed | `strip-unit\(` | 0 |
| `foreground-color('x')` | `var(--color-x-foreground)` | `foreground-color\(` | 0 (core 1) |
| `transition(…)` | Same name; now reads `--default-transition-*` | `\btransition\(` | 7 |
| `theme('screens.x')` | `theme(--breakpoint-x)` | `theme\(['"]screens` | 62 |

Two behaviour changes come with these:

- `--spacing` goes from `1px` to `0.0625rem`. `p-16` is still 16px at the default font size, but now scales when the user changes theirs. Write px literally for hairlines and borders that shouldn't scale.
- `fluid()` clamps at both ends. Gust's `rfs()` kept shrinking below 320px. Between 320 and 1200 the values are the same (struts tests this at 320, 760 and 1200).

### Colour config

`assets/theme-config.json` → `assets/colors.config.json` (validated by `colors.schema.json`; the path is the preset's `colorsConfig` option).

| Gust | struts |
|---|---|
| `colors.base.{name}` | `colors.{name}` |
| `namedColor` | `alias` |
| `color`, `name` | Same |
| `foreground: "var(--color-white)"` | `foreground: "white"` (a colour name), or any CSS value |
| `properties: { "--link--color": … }` | `vars: { "--color-accent": …, "--color-accent-foreground": … }`. Set roles, not component variables; links, buttons and focus read the roles |
| `block_editor: true` | `meta: { "wordpress": { "editor": true } }` |
| — | `colorScheme: "light" \| "dark"` (overrides the automatic one) |
| — | `schemes.dark: { role: colour }` |
| `brand-2` alias | Optionally `secondary`, as in the struts example config |

The struts `colors.config.json` is Gust's palette already translated. Start from it.

`block_editor` was never read: `Gust/WordPress/Colors.php` lists every non-alias colour. See §3 for the updated function.

### JavaScript

The struts helpers are TypeScript. Vite compiles `.ts` imports with no setup, so Gust can import them directly.

| Gust | struts | Notes |
|---|---|---|
| `helpers/dynamicElements.js` → `dynamicElements.define(sel, cb, opts)` | `js/dynamic-elements.ts` → `define(sel, cb, { loadOnReady, watch, disconnected })` | Defining the same selector twice now throws. |
| `helpers/Disclosure.js` | `js/disclosure.ts` | See below. |
| `helpers/Dialog.js` | `js/dialog.ts` | See below. |
| `Focusable(el).firstFocusable`, `.all`, `.keyboardOnly` | `firstFocusable(el)`, `focusableElements(el)` | `hideAllFromKeyboard`/`resetTabIndex` are gone; use `inert`. |
| `isElementVisible(el)` | `el.checkVisibility()` | `SiteHeader.js:2,182` |
| `helpers/cookies.js` | `js/cookies.ts` | Same `setCookie(name, value, days)` / `getCookie(name)`. Values are now URI-encoded; `deleteCookie` is new. |
| `lodash.debounce` | `js/debounce.ts` | `debounce(fn, ms)` with `.cancel()`. |
| `components/animate/scripts.js` (`.animate`) | `js/animate.ts` (`[data-animate]`) | Through `define()`, so blocks added later also animate. |
| — | `js/data-attributes.ts` | `getBooleanDataAttribute`, `getNumberDataAttribute`, so classes don't each copy them. |

**Disclosure changes**

| Gust | struts |
|---|---|
| Start state from `aria-hidden` | Start state from `hidden`. Remove `aria-hidden` from markup (`Accordion.php:67`) |
| `aria-hidden` + tabindex rewriting while collapsed | `hidden` + `inert` |
| `data-expand-on-hash` | `data-disclosure-expand-on-hash` |
| `disclosureGroup` option | `group` option (`data-disclosure-group` unchanged) |
| `updateChildTabIndexes`, `setHiddenAttribute`, `setInertAttribute` options | Removed |
| `on: { expandend() {…} }` option, `Disclosure.events` export | Listen on the target: `el.addEventListener('expandend', …)` |
| `[data-hide-expanded="id"]` / `[data-show-expanded="id"]` anywhere on the page, toggled by JS | CSS only, and only inside the trigger: `data-show-expanded`, `data-show-collapsed`, `data-hide-expanded`, `data-hide-collapsed` |
| — | `data-disclosure-focusout`, `data-disclosure-focus-within`, Enter/Space on non-button triggers, `destroy()` |

For simple accordions, consider native `<details name="group">` before porting.

**Dialog changes**

| Gust | struts |
|---|---|
| `<dialog data-dialog="name">` | `<dialog id="name" data-dialog>` |
| `data-dialog-open="name"` / `data-dialog-close="name"` | Same attributes, with the dialog's id as the value. Or `commandfor="id" command="show-modal"` |
| `aria-modal="true"` decides modal | Modal by default; `data-dialog-modal="false"` for `show()` |
| `data-dialog-allow-body-scroll` | Removed. Modal dialogs lock scroll in CSS; use a non-modal dialog to keep scrolling |
| `[data-dialog-content]` slot | `[data-dialog-slot]` |
| `data-dialog-content-id` (dialog) / `data-dialog-content-template` (opener) + `[data-dialog-content="x"]` source element | `data-dialog-template="template-id"` on the dialog or opener, pointing at a `<template>` |
| `data-dialog-type` → `data-type` | Removed. Use a class, or a different template per opener |
| `data-dialog-close-transition-duration` | Removed. The slot empties once close animations finish |
| `no-scroll`, `--scrollbar-width`, body classes | CSS (`scroll-lock.css`, `:has()`) |

---

## 3. Adopting the WordPress adapter

struts becomes Gust's own code, not a folder inside it. Each part replaces its Gust counterpart, keeping struts' internal folder and file names so `diff -r` against struts still works:

| struts | Gust | Replaces |
|---|---|---|
| `css/` | `assets/styles/` (`index.css`, `tokens/`, `base/`, `patterns/`, `utilities/`, `adapters/`) | `assets/styles/1-theme` … `4-utilities`, `core.pcss` |
| `postcss/` | `dev-scripts/postcss/` | `dev-scripts/postcss-*.js` |
| `js/*.ts` | `assets/scripts/helpers/` | The `.js` helpers there |
| `colors.config.json`, `colors.schema.json` | `assets/` | `assets/theme-config.json` |

Keep struts' `.css` extensions in `assets/styles/` so the diff lines up. Component styles keep `.pcss`.

Copy the files in unchanged as one commit (step 2 in [Migration order](#4-migration-order)), and record where they came from in `.docs/struts.md`: the struts commit hash, the date and the table above. Tailor them in later commits, so `git log` shows exactly what Gust changed.

Then:

**PostCSS.** Replace `postcss.config.js`:

```js
import { struts } from './dev-scripts/postcss/preset.js';

export default {
    plugins: struts({
        colorsConfig: './assets/colors.config.json',
        fluid: { min: 320, max: 1200 },
        // Post content lives in the database, which Tailwind never scans.
        safelist: true,
        classes: {
            surface: ['surface-{name}', 'has-{name}-background-color'],
            on: ['on-{name}', 'has-{name}-color'],
        },
    }),
};
```

`colorsConfig` resolves from the working directory, which is the theme root when Vite runs. Delete `dev-scripts/postcss-color-system.js`, `postcss-functions-config.js` and `postcss-glob-import.js`.

**Entry files.** `assets/styles/index.css` is the core. Uncomment its `adapters/wordpress.css` import. `assets/main.pcss` and `assets/editor-styles.pcss` import it, then components:

```css
@import "./styles/index.css";
@import "_components.pcss";
```

Turn on `base/forms.css` in `index.css` only where Gravity Forms doesn't bring its own styles.

**Vite.** Keep `laravel-vite-plugin`, `vite-plugin-css-glob-import` and the generated `_components.pcss`. struts' `globImport: true` option does the same job as Gust's `postcss-glob-import.js` if you still need it; no `**` imports are left in `assets/` today. The colour plugin registers the config as a build dependency, so `themeConfigWatcherPlugin` in `vite.config.js` can go. Check this by editing a colour while `pnpm dev` runs.

**Editor palette.** Update `Gust/WordPress/Colors.php`:

```php
$path = \get_theme_file_path('assets/colors.config.json');
// …
foreach ($config['colors'] ?? [] as $slug => $color) {
    if (empty($color['color']) || empty($color['meta']['wordpress']['editor'])) {
        continue;
    }
    $palette[] = ['slug' => $slug, 'name' => $color['name'] ?? ucfirst($slug), 'color' => $color['color']];
}
```

Then mark editor colours in the config with `"meta": { "wordpress": { "editor": true } }`. Gust's old `block_editor` flags (blue, blue-100, charcoal, slate, light) are the starting list.

**What the adapter maps.** `alignfull/wide/center/left/right` → `layout-*`; `is-style-type-*` → `type-*`; `wp-block-list`, `wp-block-quote`, `wp-block-embed`, `wp-block-buttons`, `wp-block-button__link` (+ `is-style-outline`) → struts patterns; and `screen-reader-text` → `sr-only`. These are plain rules in `@layer components`, so they're always output and utilities still override them. `alignleft`/`alignright` only place content inside `layout-grid`; Gust's floated versions outside the grid are gone.

**Component CSS that isn't in the entry.** The generated colours and `surface-*` utilities only exist in a stylesheet that imports Tailwind (`fluid()` and the other functions work in any file). Component `styles.pcss` files are fine: they're pulled into the entry through `_components.pcss`. Standalone entries like `components/admin/admin-bar.pcss`, and any file using `@reference`, should read `var(--color-*)` and avoid `@apply surface-*`.

---

## 4. Migration order

Work on a branch. Before starting, record a baseline: screenshots of the home page, a page using every block, and the dev kit routes, plus the `pnpm build` output.

1. **Quick fixes (§1).**
   Check: build passes; the baseline pages match apart from the intended fixes.

2. **Copy struts in.** Copy the struts files to their Gust homes unchanged (table in §3), and add `.docs/struts.md` recording the struts commit hash, the date and the path table. Nothing imports them yet, so the site doesn't change. Commit this on its own.
   Check: `diff -r ~/code/my-projects/kite-co-struts/css assets/styles` shows only Gust's old files; build passes; site unchanged.

3. **Spacing and functions.** Set `--spacing: 0.0625rem`, then rewrite the function calls in one go (`space(` → `--spacing(`, `spaceFluid(`/`rfs(`/`ru(` → `fluid(`, `rem(` → `to-rem(`, `theme('screens.` → `theme(--breakpoint-`). Switch `postcss.config.js` to the struts preset, without the adapter options yet.
   Check: `rg 'spaceFluid\(|\bspace\(|\brfs\(|\bru\(|\brem\(|strip-unit\(|foreground-color\(|screens\.'` returns nothing. Heading sizes match the baseline at 320, 760 and 1200px wide.

4. **Colour.** Tailor `assets/colors.config.json` (it's already Gust's palette, translated): check the role `vars` against what Gust's `properties` did, and keep or drop `schemes.dark`. Rename `color-context-*` → `surface-*` and `foreground-from-*` → `on-*`, and remove the HSL uses.
   Check: the build prints no contrast warnings. `rg 'color-context-|foreground-from-|--hsl|namedColor'` returns nothing. In the browser, buttons, links and focus rings inside a blue surface read the surface's roles (inspect computed `color`).

5. **Tokens and base.** Replace `1-theme/` and `2-base/` with struts `tokens/` and `base/`. Move project-only tokens (fonts, radius, shadows, z-index, header breakpoint) into a project `@theme` block under their Tailwind namespaces.
   Check: body and heading type match; focus rings show for keyboard only; no SVGs have grown.

6. **Patterns and utilities.** Replace `3-patterns/` and `4-utilities/`, then work through the class and variable tables. Settle the button mapping first.
   Check: the sweep below returns nothing; Lighthouse accessibility is 100 on the baseline pages; visual diff against the baseline.

7. **Adapter.** Add the adapter options and imports, and update `Colors.php` (§3).
   Check: post content with `alignwide`, `alignfull` and `has-*-background-color` renders as before; the editor palette lists the marked colours; block style variations still apply in the editor.

8. **JavaScript.** Swap the helpers, update the markup attributes (Disclosure, Dialog, animate, `js-*` hooks), and replace the `no-scroll` toggling. Delete each old helper in the same commit you switch its imports: struts imports are extensionless, and on macOS' case-insensitive filesystem `./focusable` would resolve to the old `Focusable.js` first.
   Check: accordion grouping and hash-open; site header menu (Escape returns focus, scroll locks, resize); video dialog; cookie consent; animate on scroll. `rg 'lodash|isElementVisible|Focusable\(|aria-hidden="true" data-disclosure|no-scroll'` returns nothing.

9. **Clean up.** Delete the old `dev-scripts/postcss-*.js`, the config watcher plugin, the old helpers and `assets/theme-config.json`; remove `lodash.debounce` from `package.json`.

The final sweep should return nothing (the WP align classes and `screen-reader-text` are left out on purpose):

```bash
rg -n -e 'color-context-|foreground-from-|content-grid|content-width-|max-w-fluid-|grid-columns-' \
      -e 'btn--(theme-2|icon|icon-before|unstyled|label|arrow)\b|heading-attributes|focus-base|no-focus-be-careful' \
      -e '\bscreen-reader\b|no-scroll|responsive-embed|content-flow|list-reset-hard|(checkbox|radio)-field|link--2\b' \
      -e 'animate-element|animate--play|\btooltip\b|\bjs-[a-z]' \
      -e '--container-padding|--width-fluid-|--fluid-bp|--transition--|--link--color-hover|--btn--color-hover' \
      -e '--color-[a-z0-9-]+--(foreground|hsl|h|s|l)\b|--animate-(duration|delay|easing|key|animation)' \
      -e '\bspace\(|spaceFluid\(|\brfs\(|strip-unit\(|foreground-color\(|screens\.' \
      components assets Theme Gust *.php
```
