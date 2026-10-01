# Adopting struts into a project

This is a task for an agent (or a person) bringing struts into a project. struts is a starter: its files become the project's own, then get tailored. Don't install it as a dependency, don't keep it in its own folder, and don't try to keep the copy in sync.

Work in phases that each leave a working build: copy unchanged (section 2), wire up the build (section 3), then tailor one step at a time (section 4). Commit at the end of each phase.

## 1. Read first

- [docs/naming.md](docs/naming.md), all of it.
- [docs/decisions/002-color-contexts.md](docs/decisions/002-color-contexts.md) and [003-custom-property-api.md](docs/decisions/003-custom-property-api.md). These are the two ideas most likely to be undone by accident.
- Skim `example/index.html` to see the markup each pattern expects.

Then look at the target project: its build tool, where its CSS entry is, what it already has for colours, type and layout, and which behaviours it needs (disclosures, dialogs, animation).

## 2. Copy

struts becomes the project's own CSS and JS. Don't put it in a `struts/` folder: that reads as a vendored dependency, people stop editing it, and overrides pile up beside it. Put each part where the project already keeps that kind of file, replacing what's there.

| From struts | To the project | Notes |
| --- | --- | --- |
| `css/` | The project's styles folder, e.g. `src/styles/` | Replaces the existing core styles. `index.css` becomes the core entry |
| `postcss/` | Where the project keeps build scripts | Plain ESM JS. Leave `glob-import.js` out unless you need glob imports |
| `colors.config.json`, `colors.schema.json` | Next to the CSS, or the project root | Keep the `$schema` line pointing at the schema |
| `public/fonts/` | The folder the project serves at `/` (`public/` in Vite and Astro) | `base/fonts.css` points at `/fonts/…`. Keep `OFL.txt` with the font files |
| `js/*.ts` | The project's scripts or helpers folder | Only the helpers you need, plus what they import: `dynamic-elements.ts`, `data-attributes.ts`, `focusable.ts` |

Three habits keep the link to struts without making it a dependency:

1. **Keep struts' structure inside each folder:** the same subfolders (`tokens/`, `base/`, `patterns/`, `utilities/`) and file names. Then `diff -r path/to/struts/css src/styles` still shows what the project changed, and fixes can travel either way by hand.
2. **Copy unchanged first, as its own commit.** Tailor in later commits, so `git log` separates struts from the project's changes.
3. **Record where it came from** in the project's docs (e.g. `docs/struts.md`): the struts commit hash, the date, and where each struts folder went.

Dev dependencies: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `postcss-functions`, `culori`. Add `fast-glob` only with `glob-import.js`.

## 3. Wire up the build

```js
// postcss.config.js
import { struts } from './postcss/preset.js';
export default { plugins: struts({ colorsConfig: './colors.config.json' }) };
```

- **Vite and Vite-based frameworks (Astro, SvelteKit, Nuxt):** that's all; Vite inlines imports before PostCSS plugins run and picks up `postcss.config.js`. The colour plugin registers the config file as a dependency, so dev reloads when it changes.
- **Other builds:** put `postcss-import` before the preset so the functions see every file.
- **Component-scoped CSS** (`<style>` in Astro/Vue/Svelte, CSS modules): the colour plugin only acts on the entry stylesheet, so generated colours and `surface-*`/`on-*` exist only there. Component CSS can use `fluid()`, `to-rem()`, `--spacing()` and `var(--color-*)`. To `@apply` patterns, add `@reference` to the entry; put `surface-*` classes in the markup rather than applying them.

Add the no-JS swap to the document `<head>`, before the stylesheet:

```html
<html lang="en" class="no-js">
<head>
    <script>document.documentElement.classList.replace('no-js', 'js');</script>
```

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
8. **Adapters**: for WordPress, import `css/adapters/wordpress.css` and set `safelist` and `classes` as its header describes.

## 5. Keep the conventions

When adding to the project afterwards:

- Name variables with [naming.md](docs/naming.md). Modifiers set their block's variables; they never declare new ones.
- Never declare a knob a context might set (read it with a fallback instead), and never put component variables on `:root`.
- Never add `.surface-x .component` overrides. If a component looks wrong on a surface, the surface is missing a role in `vars`, or the component isn't reading roles.
- Derive states with `color-mix()` from the base value.
- JS hooks are `data-*` attributes.
- New behaviour has a no-JS state and respects `prefers-reduced-motion`.

Copy `CLAUDE.md`'s conventions section into the project's own agent instructions so they survive.

## 6. Check

- The build prints no warnings (contrast included).
- A button, a link and a focused element look right inside every surface you use, and inside `[data-scheme=dark]` if there's a dark mode. Check computed styles, not just screenshots.
- `layout-*` classes land on the right tracks inside `layout-grid` and cap correctly outside it, at a narrow and a wide viewport.
- Disclosures: `aria-expanded`, `hidden` and `inert` update; Escape returns focus to the trigger.
- With reduced motion on, nothing animates and scrolling isn't smooth.
- A Lighthouse accessibility audit passes, in both schemes.
