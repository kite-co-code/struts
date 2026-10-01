# 008: Progressive enhancement

## Context

Some patterns only make sense with JS (animate-on-scroll hides items until they play). If those styles apply without JS, content disappears.

## Decision

**The `no-js` → `js` swap.** Put this inline in `<head>`, before any stylesheet that depends on it:

```html
<html lang="en" class="no-js">
<head>
    <script>document.documentElement.classList.replace('no-js', 'js');</script>
```

CSS that needs JS is scoped with `:where(.js)`, so it adds no specificity. Without JS the class never appears and the content stays visible.

Other rules that follow from this:

- **CSS before JS.** Scroll lock is `html:has(dialog:modal)`; trigger labels swap with `[aria-expanded]` selectors; `<details name>` covers simple accordions.
- **Native first.** `<dialog>` for modals, invoker commands (`commandfor`) for opening them, `popover` for the mobile nav (light dismiss and `aria-expanded` for free), `:focus-visible` for focus rings. The JS fills gaps rather than replacing the platform.
- **No polyfills for the platform.** Where a native feature is missing, fall back to something plain that works: without popover, the site header hides its toggle and shows the nav as a list. Keep newer pseudo-classes such as `:popover-open` out of selector lists they share with older ones, because a browser that doesn't know one drops the whole rule.
- **Disclosure targets** start with `hidden` in the markup, so they're hidden before JS runs. If the content must be reachable without JS, leave `hidden` off and let the script collapse it on load, or use `<details>`.
- **Reduced motion.** Animations, smooth scrolling and `interpolate-size` sit behind `prefers-reduced-motion: no-preference`. The disclosure skips its height animation when the user prefers reduced motion.

## Consequences

- Every behaviour has a defined no-JS state; check it when adding one.
- The inline snippet is the one piece of render-blocking script. Keep it to that line.
