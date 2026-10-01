# Adopting struts into a project

This is a task for an agent (or a person) bringing struts into a project. struts is a starter: its files become the project's own, then get tailored. Don't install it as a dependency, don't keep it in its own folder, and don't try to keep the copy in sync.

Work in phases that each leave a working build: copy unchanged (section 2), wire up the build (section 3), then tailor one step at a time (section 4). Commit at the end of each phase.

## Any stack

struts doesn't assume a framework, CMS, bundler or package manager. It needs **Tailwind CSS v4** and **a build step that can run PostCSS plugins**. Everything else is CSS, HTML and TypeScript that compiles to plain JS.

So this file says what each step has to achieve. Where it names a tool (Vite, pnpm, Astro, Gust), that's an example: do the equivalent with the project's own tools. If a step doesn't fit the project's stack, keep its outcome and change the method. Note what you changed in the project's docs.

## 1. Read first

- [docs/naming.md](docs/naming.md), all of it.
- [docs/decisions/002-color-contexts.md](docs/decisions/002-color-contexts.md) and [003-custom-property-api.md](docs/decisions/003-custom-property-api.md). These are the two ideas most likely to be undone by accident.
- Skim `example/index.html` to see the markup each pattern expects.
- [components/README.md](components/README.md), and each component's `example.html`. To see them working, run the struts demo in the clone (`pnpm install`, `pnpm dev`, then open `/components/`). That's struts' own tooling; the project doesn't need it.

Then look at the target project: its build tool and whether it can run PostCSS, whether it uses TypeScript, where its CSS entry is, what it already has for colours, type and layout, which behaviours it needs (disclosures, dialogs, animation), and which struts components it needs (a site header). Note how it renders markup (components in a framework, server templates, plain HTML): that's where component examples get ported to.

## 2. Copy

struts becomes the project's own CSS and JS. Don't put it in a `struts/` folder: that reads as a vendored dependency, people stop editing it, and overrides pile up beside it. Put each part where the project already keeps that kind of file, replacing what's there.

| From struts | To the project | Notes |
| --- | --- | --- |
| `css/` | The project's styles folder, e.g. `src/styles/` | Replaces the existing core styles. `index.css` becomes the core entry |
| `postcss/` | Where the project keeps build scripts | Plain ESM JS |
| `tools/component-index.js` | Beside `postcss/` | Plain ESM JS. Writes the component index files |
| `colors.config.json`, `colors.schema.json` | Next to the CSS, or the project root | Keep the `$schema` line pointing at the schema |
| `public/fonts/` | The folder the project serves at `/` (e.g. `public/` in Vite and Astro) | `base/fonts.css` points at `/fonts/…`. Keep `OFL.txt` with the font files |
| `public/` icons: `favicon.ico`, `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest` | The same served folder | Only if the project has no icons yet. They're a plain struts-blue square; replace them, and the manifest's `name` and colours, with the project's own. Link them from the `<head>` as `example/index.html` does |
| `js/*.ts` | The project's scripts or helpers folder | Only the helpers you need, plus what they import: `dynamic-elements.ts`, `data-attributes.ts`, `focusable.ts`. Without TypeScript, copy compiled JS |
| `components/` | Where the project keeps its components (Gust and most frameworks already have `components/`) | One folder per component. Only the components you need: delete the other folders, then regenerate the indexes. `css/index.css` imports `../components/index.css`, and component scripts import `../../js/`; fix both paths if the folders don't end up siblings |

Three habits keep the link to struts without making it a dependency:

1. **Keep struts' structure inside each folder:** the same subfolders (`tokens/`, `base/`, `patterns/`, `utilities/`), component folder names and file names. Then `diff -r path/to/struts/css src/styles` still shows what the project changed, and fixes can travel either way by hand.
2. **Copy unchanged first, as its own commit.** Tailor in later commits, so `git log` separates struts from the project's changes.
3. **Record where it came from** in the project's docs (e.g. `docs/struts.md`): the struts commit hash, the date, and where each struts folder went.

Dev dependencies, installed with the project's package manager: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `postcss-functions`, `culori`. Add `postcss-import` if the build doesn't inline CSS imports itself (see section 3).

## 3. Wire up the build

Whatever the build tool, it needs to do five things. Each item below says what must happen. The tool-specific blocks after it are examples; do the equivalent in the project's own setup.

1. **Inline CSS imports, then run the struts preset, then Tailwind.** `postcss/preset.js` returns the plugins in order (colour system → functions → Tailwind). The preset's plugins must see one flattened stylesheet, so whatever inlines `@import`s runs before them.
2. **Point the colour plugin at `colors.config.json`.** It reads the config at build time and appends the colours, `surface-*` and `on-*` classes to the entry stylesheet.
3. **Regenerate the component indexes** (`components/index.css` and `index.ts`) before each build, and whenever a component folder is added or deleted. `tools/component-index.js` does this from the command line or as a Vite plugin.
4. **Compile the TypeScript** in `js/` and `components/` to plain JS, and load the main script entry, which imports `components/index.ts` and any helpers from `js/` it needs. Without TypeScript in the project, compile them once, copy in the JS output (`scripts.js` in each component), and run the index tool with `--js` (or `{ language: 'js' }`) so it writes `index.js`.
5. **Serve `/fonts/`** from wherever the font files went.

### Examples

These are suggestions, not requirements.

**PostCSS config**, read by most tools that run PostCSS:

```js
// postcss.config.js
import { struts } from './postcss/preset.js';
export default { plugins: struts({ colorsConfig: './colors.config.json' }) };
```

**Vite and Vite-based frameworks (Astro, SvelteKit, Nuxt).** Vite inlines imports before PostCSS plugins run and picks up `postcss.config.js` on its own. The colour plugin registers its config as a dependency, so the dev server reloads when it changes. Add the component index plugin. Pass `dir` if `components/` isn't in the working directory.

```js
// vite.config.js
import { componentIndex } from './tools/component-index.js';
export default { plugins: [componentIndex()] };
```

**webpack, Rollup, Parcel and others.** Put `postcss-import` before the preset in the PostCSS plugins, and run `node tools/component-index.js [dir]` before each build (a `prebuild` script, a task-runner step, a CI step).

**No bundler, or a build that can't run PostCSS** (a CMS theme with its own asset pipeline, a static-site generator): build the CSS as its own step with `postcss-cli` and `postcss-import`, and compile the scripts with `tsc` or `esbuild`. Then hand both outputs to the existing pipeline.

**Component-scoped CSS** (`<style>` in Astro, Vue or Svelte, CSS modules): the colour plugin only acts on the entry stylesheet, so generated colours and `surface-*`/`on-*` exist only there. Scoped CSS can use `fluid()`, `to-rem()`, `--spacing()` and `var(--color-*)`. To `@apply` patterns, add `@reference` to the entry; put `surface-*` classes in the markup rather than applying them.

### The no-JS swap

Add this to the document `<head>`, before the stylesheet, however the project renders its pages:

```html
<html lang="en" class="no-js">
<head>
    <script>document.documentElement.classList.replace('no-js', 'js');</script>
```

With the swap in place, `[data-animate-item]` elements start hidden, so any page that uses them must also load `js/animate.ts`. Otherwise they never appear.

## 4. Tailor

Work through these in order and run the build after each one.

1. **Colours** (`colors.config.json`):
   - Replace the palette. Every colour used as a surface needs a `foreground`, and `vars` setting each role that doesn't work on it (at least `--color-accent` and `--color-accent-foreground`).
   - Keep the roles `background` and `foreground`; rename or add others (`accent`, `secondary`, `error`) to suit. Components read roles, so a renamed role means updating the patterns that read it.
   - Add `schemes.dark` only if the project has a dark mode. Delete it otherwise; the dark variant and `[data-scheme]` rules go with it.
   - Fix every contrast warning the build prints.
2. **Tokens** (`css/tokens/theme.css`): fonts, the type scale (`--text-*` with `fluid()`, each with its line height and letter spacing), containers, breakpoints, easing. Swap the `@font-face` rules in `base/fonts.css`; keep root-absolute URLs, since imports are flattened before `url()`s resolve.
3. **Globals** (`css/tokens/globals.css`): `--gutter`, `--space-base`, `--space-layout`, `--gap`, focus width and offset, `--rule-width`.
4. **Layout roles** (`css/patterns/layout.css`): point `--layout--wide`, `--layout--content` and `--layout--narrow` at the right containers, and set `--layout--inset`. The defaults give Kite Co.'s left-aligned frame; a narrower `--layout--content` centres the column instead.
5. **Fluid range**: `struts({ fluid: { min, max } })` if the design's narrowest and widest frames differ from 320 and 1200.
6. **Patterns**: restyle by changing each block's declared knobs first, and only then its rules. Delete patterns the project won't use: remove the import from `index.css` and the file.
7. **Forms**: turn on `base/forms.css` in `index.css` if the project owns its form markup. Leave it off if a form plugin brings its own styles, and use the `input`/`checkbox`/`radio`/`select` classes instead.
8. **Components**: port each component's `example.html` to however the project renders markup (for example an Astro component, or a Gust `template.php` with a `make()` class and an `example.php`), keeping its class names and `data-*` hooks. Restyle through its knobs and the role tokens, as with patterns. See [components/README.md](components/README.md#in-a-project).
9. **Adapters**: for WordPress, import `css/adapters/wordpress.css` and set `safelist` and `classes` as its header describes.

## 5. Keep the conventions

When adding to the project afterwards:

- Name variables with [naming.md](docs/naming.md). Modifiers set their block's variables; they never declare new ones.
- Never declare a knob a context might set (read it with a fallback instead), and never put component variables on `:root`.
- Never add `.surface-x .component` overrides. If a component looks wrong on a surface, the surface is missing a role in `vars`, or the component isn't reading roles.
- Derive states with `color-mix()` from the base value.
- JS hooks are `data-*` attributes.
- New behaviour has a no-JS state and respects `prefers-reduced-motion`.
- UI whose markup, styles and behaviour only work together is a component: a folder in `components/` with `styles.css`, `scripts.ts` and an example ([components/README.md](components/README.md)). The index files are generated; never edit them. Styles or behaviour that work on any markup stay a pattern or a helper.

Copy `CLAUDE.md`'s conventions section into the project's own agent instructions so they survive.

## 6. Check

- The build prints no warnings (contrast included).
- A button, a link and a focused element look right inside every surface you use, and inside `[data-scheme=dark]` if there's a dark mode. Check computed styles, not just screenshots.
- `layout-*` classes land on the right tracks inside `layout-grid` and cap correctly outside it, at a narrow and a wide viewport.
- Disclosures: `aria-expanded`, `hidden` and `inert` update; Escape returns focus to the trigger.
- Site header, below md: the Menu button reports expanded and collapsed; Escape, a click outside, a link click and tabbing past the last link all close the menu; the page doesn't scroll behind it. The bar hides on scroll down and returns on scroll up. With JS off the menu still opens and closes. From md up the nav sits inline and the button is gone.
- With reduced motion on, nothing animates and scrolling isn't smooth.
- Animate on scroll: items play on the way down and replay after scrolling back above them; they're visible with JS off and in print preview.
- An accessibility audit (Lighthouse, axe or similar) passes, in both schemes.
