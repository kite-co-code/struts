import postcss from 'postcss';
import postcssFunctions from 'postcss-functions';
import { describe, expect, it } from 'vitest';
import functionsConfig, { fluid, toEm, toRem, transition } from '../postcss/functions.js';

/**
 * Evaluate "clamp(Arem, Brem + Cvw, Drem)" at a viewport width, in px.
 * @param {string} value
 * @param {number} width
 */
function evaluateClamp(value, width) {
    const match = value.match(/^clamp\(([\d.]+)rem, (-?[\d.]+)rem ([+-]) ([\d.]+)vw, ([\d.]+)rem\)$/);
    if (!match) throw new Error(`Unexpected clamp: ${value}`);
    const [, lower, intercept, sign, vw, upper] = match;
    const slope = (sign === '-' ? -1 : 1) * Number(vw);
    const preferred = Number(intercept) * 16 + (slope * width) / 100;
    return Math.min(Math.max(preferred, Number(lower) * 16), Number(upper) * 16);
}

/** Gust's rfs(): calc(min/16 rem + (max - min) * (screen - 320px) / (1200 - 320)), capped at 1200. */
function oldRfs(min, max, width) {
    const screen = Math.min(width, 1200);
    return min + ((max - min) * (screen - 320)) / (1200 - 320);
}

describe('to-rem / to-em', () => {
    it('converts px to rem', () => {
        expect(toRem(16)).toBe('1rem');
        expect(toRem('24px')).toBe('1.5rem');
        expect(toRem('1')).toBe('0.0625rem');
    });

    it('converts px to em with an optional base', () => {
        expect(toEm(24)).toBe('1.5em');
        expect(toEm(24, 12)).toBe('2em');
    });

    it('rejects values with other units', () => {
        expect(() => toRem('2rem')).toThrow(/unitless or px/);
    });
});

describe('fluid()', () => {
    it('builds a clamp() for fluid(28, 36)', () => {
        expect(fluid(28, 36)).toBe('clamp(1.75rem, 1.5682rem + 0.9091vw, 2.25rem)');
    });

    it.each([320, 760, 1200])('matches the old rfs() formula at %ipx', (width) => {
        expect(evaluateClamp(fluid(28, 36), width)).toBeCloseTo(oldRfs(28, 36, width), 1);
        expect(evaluateClamp(fluid(12, 16), width)).toBeCloseTo(oldRfs(12, 16, width), 1);
    });

    it('holds at the bounds outside the range', () => {
        expect(evaluateClamp(fluid(28, 36), 200)).toBe(28);
        expect(evaluateClamp(fluid(28, 36), 1600)).toBe(36);
    });

    it('swaps the bounds for shrinking values', () => {
        const value = fluid(40, 24);
        expect(value).toMatch(/^clamp\(1\.5rem, .+, 2\.5rem\)$/);
        expect(evaluateClamp(value, 320)).toBeCloseTo(40, 1);
        expect(evaluateClamp(value, 1200)).toBeCloseTo(24, 1);
    });

    it('returns a static rem for one argument or equal bounds', () => {
        expect(fluid(16)).toBe('1rem');
        expect(fluid(16, 16)).toBe('1rem');
    });

    it('uses the range passed in options', () => {
        expect(fluid(16, 32, { min: 400, max: 1600 })).toBe('clamp(1rem, 0.6667rem + 1.3333vw, 2rem)');
    });
});

describe('transition()', () => {
    it('uses the default duration and easing', () => {
        expect(transition('color', 'opacity')).toBe(
            'color var(--default-transition-duration) var(--default-transition-timing-function), ' +
                'opacity var(--default-transition-duration) var(--default-transition-timing-function)'
        );
    });
});

describe('through postcss-functions', () => {
    it('replaces functions in declarations', async () => {
        const css = '.a { padding: to-rem(24); font-size: fluid(28, 36); transition: transition(color); }';
        const result = await postcss([postcssFunctions(functionsConfig())]).process(css, { from: undefined });
        expect(result.css).toContain('padding: 1.5rem');
        expect(result.css).toContain('font-size: clamp(1.75rem, 1.5682rem + 0.9091vw, 2.25rem)');
        expect(result.css).toContain('transition: color var(--default-transition-duration)');
    });
});
