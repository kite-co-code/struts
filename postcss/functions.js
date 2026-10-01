/**
 * Build-time CSS functions, run through postcss-functions.
 *
 *   to-rem(24)         → 1.5rem
 *   to-em(24)          → 1.5em
 *   to-em(24, 12)      → 2em
 *   fluid(28, 36)      → clamp(1.75rem, 1.5682rem + 0.9091vw, 2.25rem)
 *   transition(color, opacity)
 *                      → color var(--default-transition-duration) var(--default-transition-timing-function), …
 *
 * All sizes are written as unitless px (a trailing "px" is allowed). Use Tailwind's
 * --spacing(n) for spacing; these cover what --spacing() can't.
 *
 * Plain ESM with JSDoc so it can be copied into any build.
 */

const ROOT_FONT_SIZE = 16;

/** Default viewport range for fluid(), in px. */
export const DEFAULT_FLUID_RANGE = { min: 320, max: 1200 };

/**
 * Parse a unitless or px value into a number.
 * @param {string | number} value
 * @param {string} fn - Calling function name, for error messages.
 * @returns {number}
 */
function toNumber(value, fn) {
    const text = String(value).trim();
    if (!/^-?\d*\.?\d+(px)?$/.test(text)) {
        throw new Error(`${fn}(): expected a unitless or px number, got "${text}"`);
    }
    return Number.parseFloat(text);
}

/**
 * Round to 4 decimal places and drop trailing zeros.
 * @param {number} value
 * @returns {string}
 */
function round(value) {
    return String(Number.parseFloat(value.toFixed(4)));
}

/**
 * px → rem.
 * @param {string | number} px
 * @returns {string}
 */
export function toRem(px) {
    return `${round(toNumber(px, 'to-rem') / ROOT_FONT_SIZE)}rem`;
}

/**
 * px → em, relative to a base size in px (default 16).
 * @param {string | number} px
 * @param {string | number} [base]
 * @returns {string}
 */
export function toEm(px, base = ROOT_FONT_SIZE) {
    return `${round(toNumber(px, 'to-em') / toNumber(base, 'to-em'))}em`;
}

/**
 * A clamp() that scales linearly from `min` at the start of the viewport range to `max` at
 * the end, and holds outside it. If `min` is larger than `max` (a shrinking value) the clamp
 * bounds are swapped so the output stays valid.
 *
 * The preferred value is in rem + vw, so the result still responds to the user's font size.
 *
 * @param {string | number} min - Size at the narrow end of the range, in px.
 * @param {string | number} [max] - Size at the wide end of the range, in px. Omit for a static rem value.
 * @param {{ min: number, max: number }} [range] - Viewport range in px.
 * @returns {string}
 */
export function fluid(min, max, range = DEFAULT_FLUID_RANGE) {
    const from = toNumber(min, 'fluid');
    if (max === undefined) return toRem(from);

    const to = toNumber(max, 'fluid');
    if (from === to) return toRem(from);

    const slope = (to - from) / (range.max - range.min);
    const intercept = from - slope * range.min;
    const preferred = `${round(intercept / ROOT_FONT_SIZE)}rem + ${round(slope * 100)}vw`;
    const [lower, upper] = from < to ? [from, to] : [to, from];

    return `clamp(${toRem(lower)}, ${preferred.replace('+ -', '- ')}, ${toRem(upper)})`;
}

/**
 * A transition list using the theme's default duration and easing.
 * @param {...string} properties
 * @returns {string}
 */
export function transition(...properties) {
    if (properties.length === 0) throw new Error('transition(): pass at least one property');
    return properties
        .map((prop) => `${prop.trim()} var(--default-transition-duration) var(--default-transition-timing-function)`)
        .join(', ');
}

/**
 * Options object for postcss-functions.
 * @param {{ fluid?: { min: number, max: number } }} [options]
 */
export default function functionsConfig(options = {}) {
    const range = { ...DEFAULT_FLUID_RANGE, ...options.fluid };

    return {
        functions: {
            'to-rem': toRem,
            'to-em': toEm,
            /** @param {string} min @param {string} [max] */
            fluid: (min, max) => fluid(min, max, range),
            transition,
        },
    };
}
