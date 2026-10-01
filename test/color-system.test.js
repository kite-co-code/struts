import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import colorSystem, {
    colorSchemeFor,
    contextDecls,
    contrastWarnings,
    loadConfig,
    paletteFor,
    schemeDecls,
    themeDecls,
    validate,
} from '../postcss/color-system.js';

/** @type {import('../postcss/color-system.js').ColorConfig} */
const config = {
    colors: {
        white: { color: '#ffffff', foreground: 'ink', vars: { '--color-accent': 'blue' } },
        ink: { color: '#111111', foreground: 'white' },
        blue: { color: '#0707a3', foreground: 'white', vars: { '--color-accent': 'white' } },
        pale: { color: '#eeeeee', foreground: '#dddddd' },
        background: { alias: 'white' },
        foreground: { alias: 'ink' },
        accent: { alias: 'blue' },
        brand: { alias: 'accent' },
    },
    schemes: {
        dark: { background: 'ink', foreground: 'white', accent: 'white', 'accent-foreground': 'ink' },
    },
};

/** @param {import('../postcss/color-system.js').ColorSystemOptions} [options] */
async function run(options = { config }, css = '@theme {}') {
    return postcss([colorSystem(options)]).process(css, { from: undefined });
}

describe('aliases', () => {
    it('follows alias chains to a palette colour', () => {
        expect(paletteFor(config, 'brand')).toBe('blue');
        expect(paletteFor(config, 'white')).toBe('white');
    });

    it('applies scheme overrides before following aliases', () => {
        expect(paletteFor(config, 'brand', config.schemes?.dark)).toBe('white');
    });

    it('emits aliases as var() references, with their foreground', () => {
        const decls = Object.fromEntries(themeDecls(config));
        expect(decls['--color-*']).toBe('initial');
        expect(decls['--color-accent']).toBe('var(--color-blue)');
        expect(decls['--color-accent-foreground']).toBe('var(--color-blue-foreground)');
        expect(decls['--color-brand']).toBe('var(--color-accent)');
        expect(decls['--color-white-foreground']).toBe('var(--color-ink)');
        expect(decls['--color-pale-foreground']).toBe('#dddddd');
    });

    it('rejects missing targets and cycles', () => {
        expect(() => validate({ colors: { a: { alias: 'nope' } } })).toThrow(/not a colour/);
        expect(() => validate({ colors: { a: { alias: 'b' }, b: { alias: 'a' } } })).toThrow(/cycle/);
    });

    it('rejects foreground or vars on an alias', () => {
        expect(() => validate({ colors: { a: { color: '#000' }, b: { alias: 'a', foreground: 'a' } } })).toThrow(
            /can't set "foreground"/
        );
    });

    it('only lets roles change per scheme', () => {
        expect(() => validate({ colors: { a: { color: '#000' } }, schemes: { dark: { a: '#fff' } } })).toThrow(
            /only aliases/
        );
    });
});

describe('contrast', () => {
    it('warns on a pair below 4.5:1', () => {
        const warnings = contrastWarnings(config);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toMatch(/"pale" on its foreground: contrast 1\.\d+:1/);
    });

    it('reports warnings through PostCSS', async () => {
        const result = await run();
        expect(result.warnings().map((w) => w.text)).toEqual([expect.stringContaining('"pale"')]);
    });

    it('passes the shipped config', () => {
        expect(contrastWarnings(loadConfig('./colors.config.json').config)).toEqual([]);
    });
});

describe('color-scheme', () => {
    it('works out light or dark from luminance', () => {
        expect(colorSchemeFor({ color: '#ffffff' })).toBe('light');
        expect(colorSchemeFor({ color: '#0707a3' })).toBe('dark');
        expect(colorSchemeFor({ color: '#eeeeee' })).toBe('light');
    });

    it('honours the config override', () => {
        expect(colorSchemeFor({ color: '#ffffff', colorScheme: 'dark' })).toBe('dark');
    });
});

describe('surface and on- utilities', () => {
    it('sets background, foreground, color-scheme and vars on a surface', () => {
        expect(contextDecls(config, 'blue', { surface: true })).toEqual([
            ['--color-background', 'var(--color-blue)'],
            ['--color-foreground', 'var(--color-blue-foreground)'],
            ['background-color', 'var(--color-background)'],
            ['color', 'var(--color-foreground)'],
            ['color-scheme', 'dark'],
            ['--color-accent', 'var(--color-white)'],
        ]);
    });

    it('sets only foreground and vars for on-', () => {
        expect(contextDecls(config, 'blue', { surface: false })).toEqual([
            ['--color-foreground', 'var(--color-blue-foreground)'],
            ['color', 'var(--color-foreground)'],
            ['--color-accent', 'var(--color-white)'],
        ]);
    });

    it('generates utilities for palette colours and aliases', async () => {
        const { css } = await run();
        expect(css).toContain('@utility surface-blue {');
        expect(css).toContain('@utility on-blue {');
        // An alias resolves to its palette colour so its vars can't feed back into it.
        expect(css).toMatch(/@utility surface-accent \{\s*--color-background: var\(--color-blue\)/);
    });

    it('gives a role that changes in dark mode a dark variant', async () => {
        const { css } = await run();
        expect(css).toMatch(
            /@utility surface-background \{[^@]*@variant dark \{\s*--color-background: var\(--color-ink\)/
        );
    });

    it('writes into @theme static and never emits HSL parts', async () => {
        const { css } = await run();
        expect(css).toContain('@theme static {');
        expect(css).not.toContain('@theme inline');
        expect(css).not.toMatch(/--(hsl|h|s|l)\b/);
    });
});

describe('dark scheme', () => {
    it('maps roles to dark values with their foregrounds', () => {
        expect(schemeDecls(config, 'dark')).toEqual([
            ['--color-background', 'var(--color-ink)'],
            ['--color-background-foreground', 'var(--color-ink-foreground)'],
            ['--color-foreground', 'var(--color-white)'],
            ['--color-foreground-foreground', 'var(--color-white-foreground)'],
            ['--color-accent', 'var(--color-white)'],
            ['--color-accent-foreground', 'var(--color-ink)'],
            ['color-scheme', 'dark'],
        ]);
    });

    it('outputs under the media query, [data-scheme=dark] and [data-scheme=light]', async () => {
        const { css } = await run();
        expect(css).toMatch(
            /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-scheme="light"\]\) \{\s*--color-background: var\(--color-ink\)/
        );
        expect(css).toMatch(/\[data-scheme="dark"\] \{\s*--color-background: var\(--color-ink\)/);
        expect(css).toMatch(/\[data-scheme="light"\] \{\s*--color-background: var\(--color-white\)/);
        expect(css).toContain('@custom-variant dark');
    });

    it('skips scheme output without schemes.dark', async () => {
        const { schemes: _, ...light } = config;
        const { css } = await run({ config: light });
        expect(css).not.toContain('data-scheme');
        expect(css).not.toContain('@custom-variant');
    });
});

describe('plugin behaviour', () => {
    it('leaves non-entry stylesheets alone', async () => {
        const { css } = await run({ config }, '.card { color: red; }');
        expect(css).toBe('.card { color: red; }');
    });

    it('treats a file importing tailwindcss as an entry', async () => {
        const { css } = await run({ config }, '@import "tailwindcss";');
        expect(css).toContain('@theme static');
    });

    it('adds @source inline only when safelist is on', async () => {
        expect((await run()).css).not.toContain('@source');
        const { css } = await run({ config, safelist: true });
        expect(css).toMatch(/^@source inline\("surface-white on-white .*surface-brand on-brand"\)/);
    });

    it('generates extra class names from the classes option', async () => {
        const { css } = await run({
            config,
            classes: { surface: ['surface-{name}', 'has-{name}-background-color'], on: ['has-{name}-color'] },
        });
        expect(css).toContain('@utility has-blue-background-color {');
        expect(css).toContain('@utility has-blue-color {');
        expect(css).not.toContain('@utility on-blue {');
    });

    it('registers the config file as a dependency', async () => {
        const result = await run({ config: './colors.config.json' });
        expect(result.messages).toContainEqual(
            expect.objectContaining({ type: 'dependency', file: expect.stringMatching(/colors\.config\.json$/) })
        );
    });
});
