# 011: The docs pages follow the layers

## Context

The demo was one long homepage, ordered by topic (colour, type, layout, forms, behaviour), plus a components page. It showed every pattern but didn't say which layer anything belonged to, and the markup it showed was written out by hand beside the CSS, so the two could drift.

Gust's dev kit splits into Globals, Utilities, Components and Content. That doesn't fit struts:

- **Globals** is already the name of one struts file, `tokens/globals.css` (the shared `:root` knobs).
- **Gust's Utilities page** mixes patterns and utilities. struts keeps them apart on purpose (decision 001).
- **Content** isn't a layer. It's base element styles plus the `prose` pattern.
- **Scripts have no home** in that split.

## Decision

One page per layer, in the order they build on each other:

| Page | Layer | Folders |
| --- | --- | --- |
| Approach (`/`) | Principles, the layers, naming, decisions, getting started | `docs/` |
| Foundations (`/foundations/`) | What every page gets before a single class | `css/tokens/`, `css/base/`, `colors.config.json` |
| Patterns (`/patterns/`) | Reusable blocks with a custom-property API | `css/patterns/`, and scripts in `js/` |
| Utilities (`/utilities/`) | Single-purpose helpers | `css/utilities/`, and scripts in `js/` |
| Components (`/components/`) | Markup, styles and behaviour that only work together | `components/` |

**A layer is decided by what a thing is for, not what it's written in.** Disclosure, dialog and animate on scroll are patterns that have a script, so they sit with the CSS patterns. `define()`, `debounce()` and the other helpers are utilities. The files don't move: decision 010 still holds for where they live.

Each page has an "On this page" nav. It sits beside the content from `lg` up and above it below that. Below `lg` it lists only the groups. `example/docs.ts` marks the section being read with `aria-current`.

The pages are plain HTML, assembled at build time by `example/docs-plugin.ts`:

- **Shared partials** (`example/partials/`) for the head tags, header and footer. The header's current page is marked from the page's path.
- **The nav** is generated from the page's `<section id>` + heading pairs, so it works without JS and can't fall out of step with the page.
- **`<docs-example>`** holds a live example. Its markup, as written, is added beneath it, so the example and the code shown are the same text.
- **`<docs-source src="…">`** is replaced with each file's header comment, so the API shown is the file's own and can't drift from it.

The components page builds itself from `example.html` files in the browser (decision 010), so it fills in its own nav and its header comments from the same sources.

## Consequences

- The header comment is now published as well as read in the editor. Keep it accurate: it's what the docs pages show.
- A new pattern or utility needs a section on its page, with an example where one helps. The nav picks it up.
- There's no single page with everything on it. Checking a change across the whole system means visiting each page.
- Header-comment changes show on the next page reload in dev; the CSS itself still hot-reloads.
