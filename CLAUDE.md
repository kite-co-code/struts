# CLAUDE.md

struts is a CSS/JS starter and reference built on Tailwind v4. Projects copy it and tailor it, so the docs and header comments matter as much as the code.

## Commands

```bash
pnpm dev       # demo page (example/)
pnpm test      # Vitest: postcss functions and colour plugin
pnpm check     # tsc --noEmit
pnpm lint      # Biome
pnpm build     # build the demo; must print no warnings
```

## Conventions

- **Naming:** follow [docs/naming.md](docs/naming.md). Global knobs use Tailwind's single-dash shape; pattern variables are `--{block}[__{element}]--{property}[--{state}]` with CSS property names. Modifiers never own variables.
- **Where variables are declared** ([decision 003](docs/decisions/003-custom-property-api.md)): variant-only knobs on the block; context-settable knobs never declared, read with a fallback; states derived with `color-mix()`. Never put component variables on `:root`.
- **Colour:** surfaces set role tokens, never component variables. No `.surface-x .thing` overrides.
- **Patterns** are `@utility` blocks with a header comment listing their markup and knobs. Keep that comment accurate; it's the API.
- **Logical properties** throughout (`inline-size`, `margin-block-start`, `inset-inline-start`).
- **Spacing:** `--spacing(n)` in CSS; `px` only for things that shouldn't scale; `fluid(min, max)` for fluid values.
- **JS:** TypeScript strict, `data-*` hooks, register with `define()` from `js/dynamic-elements.ts`. Native platform features first.
- **Build plugins** in `postcss/` stay plain ESM JS with JSDoc, no TypeScript, so they copy into any build.
- **Accessibility:** `:focus-visible` only; every behaviour has a no-JS state and respects reduced motion.
- When a change affects how a project adopts struts, update `ADOPT.md`. When it changes a decision, update or add a doc in `docs/decisions/`.
