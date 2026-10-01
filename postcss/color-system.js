/**
 * PostCSS colour system.
 *
 * Reads colors.config.json and appends to the Tailwind entry stylesheet:
 *
 *   @theme static { --color-*: initial; --color-{name}; --color-{name}-foreground; … }
 *   @utility surface-{name}   background, foreground, color-scheme and the colour's vars
 *   @utility on-{name}        foreground and vars, no background
 *   @custom-variant dark      follows the scheme (OS preference or [data-scheme])
 *   @layer base { … }         dark/light role maps for schemes.dark
 *   @source inline(…)         every surface-/on- class, only when `safelist` is on
 *
 * It also warns when a colour and its foreground fall below 4.5:1 contrast.
 *
 * Plain ESM with JSDoc so it can be copied into any build.
 *
 * @typedef {{
 *   color?: string,
 *   alias?: string,
 *   name?: string,
 *   foreground?: string,
 *   colorScheme?: 'light' | 'dark',
 *   vars?: Record<string, string>,
 * }} ColorEntry
 *
 * @typedef {{
 *   colors: Record<string, ColorEntry>,
 *   schemes?: { dark?: Record<string, string> },
 * }} ColorConfig
 *
 * @typedef {{
 *   config?: string | ColorConfig,
 *   safelist?: boolean,
 *   minContrast?: number,
 *   classes?: { surface?: string[], on?: string[] },
 * }} ColorSystemOptions
 *
 * `classes` sets the class names generated per colour, with {name} as the colour.
 * Defaults to surface-{name} and on-{name}; the WordPress adapter adds
 * has-{name}-background-color and has-{name}-color.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, wcagContrast } from 'culori';

const PLUGIN_NAME = 'struts-color-system';
const DEFAULT_CONFIG = './colors.config.json';
const MIN_CONTRAST = 4.5;

/**
 * Load and validate a colour config.
 * @param {string | ColorConfig} source - Path (relative to cwd) or an inline object.
 * @returns {{ config: ColorConfig, file: string | null }}
 */
export function loadConfig(source = DEFAULT_CONFIG) {
    if (typeof source === 'object') return { config: validate(source), file: null };
    const file = resolve(process.cwd(), source);
    return { config: validate(JSON.parse(readFileSync(file, 'utf-8'))), file };
}

/**
 * Throw on config mistakes the schema can't catch (references between entries).
 * @param {ColorConfig} config
 * @returns {ColorConfig}
 */
export function validate(config) {
    if (!config || typeof config.colors !== 'object') {
        throw new Error(`[${PLUGIN_NAME}] config needs a "colors" object`);
    }

    for (const [name, entry] of Object.entries(config.colors)) {
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
            throw new Error(`[${PLUGIN_NAME}] "${name}": names must be lowercase kebab-case`);
        }
        if (Boolean(entry.color) === Boolean(entry.alias)) {
            throw new Error(`[${PLUGIN_NAME}] "${name}": set exactly one of "color" or "alias"`);
        }
        if (entry.alias) {
            if (!config.colors[entry.alias]) {
                throw new Error(`[${PLUGIN_NAME}] "${name}": alias "${entry.alias}" is not a colour`);
            }
            for (const key of ['foreground', 'vars', 'colorScheme']) {
                if (key in entry) {
                    throw new Error(
                        `[${PLUGIN_NAME}] "${name}": an alias can't set "${key}"; set it on "${entry.alias}"`
                    );
                }
            }
        }
    }

    // Catch alias cycles early.
    for (const name of Object.keys(config.colors)) paletteFor(config, name);

    for (const role of Object.keys(config.schemes?.dark ?? {})) {
        const base = role.replace(/-foreground$/, '');
        if (!config.colors[base]?.alias) {
            throw new Error(
                `[${PLUGIN_NAME}] schemes.dark."${role}": only aliases (roles) and their "-foreground" can change per scheme`
            );
        }
    }

    return config;
}

/**
 * Follow aliases to the palette colour a name ends at.
 * @param {ColorConfig} config
 * @param {string} name
 * @param {Record<string, string>} [overrides] - A scheme's role map, applied before following aliases.
 * @returns {string | null} Palette name, or null if a scheme maps it to a raw CSS value.
 */
export function paletteFor(config, name, overrides = {}) {
    const seen = new Set();
    let current = name;

    while (true) {
        if (seen.has(current)) throw new Error(`[${PLUGIN_NAME}] alias cycle: ${[...seen, current].join(' → ')}`);
        seen.add(current);

        const next = overrides[current] ?? config.colors[current]?.alias;
        if (next === undefined) return current;
        if (!config.colors[next]) return null;
        current = next;
    }
}

/**
 * A config value is either a colour name (→ var()) or any CSS value (passed through).
 * @param {ColorConfig} config
 * @param {string} value
 * @returns {string}
 */
export function toCss(config, value) {
    return config.colors[value] ? `var(--color-${value})` : value;
}

/**
 * Resolve a config value to something culori can parse, or null.
 * @param {ColorConfig} config
 * @param {string} value
 * @returns {string | null}
 */
function literal(config, value) {
    if (config.colors[value]) {
        const palette = paletteFor(config, value);
        return palette ? (config.colors[palette]?.color ?? null) : null;
    }
    return parse(value) ? value : null;
}

/**
 * light or dark, from the config override or the colour's luminance.
 * @param {ColorEntry} entry
 * @returns {'light' | 'dark'}
 */
export function colorSchemeFor(entry) {
    if (entry.colorScheme) return entry.colorScheme;
    const color = entry.color ?? '#fff';
    return wcagContrast(color, '#000') >= wcagContrast(color, '#fff') ? 'light' : 'dark';
}

/**
 * Every colour/foreground pair below the minimum contrast.
 * @param {ColorConfig} config
 * @param {number} [min]
 * @returns {string[]} Human-readable warnings.
 */
export function contrastWarnings(config, min = MIN_CONTRAST) {
    const warnings = [];

    /** @param {string} label @param {string} bg @param {string} fg */
    const check = (label, bg, fg) => {
        const a = literal(config, bg);
        const b = literal(config, fg);
        if (!(a && b)) return;
        const ratio = wcagContrast(a, b);
        if (ratio < min) {
            warnings.push(`${label}: contrast ${ratio.toFixed(2)}:1 is below ${min}:1`);
        }
    };

    for (const [name, entry] of Object.entries(config.colors)) {
        if (entry.color && entry.foreground) check(`"${name}" on its foreground`, name, entry.foreground);
    }

    const dark = config.schemes?.dark;
    if (dark) {
        const roleValue = (/** @type {string} */ role) => dark[role] ?? role;
        check('schemes.dark background/foreground', roleValue('background'), roleValue('foreground'));
    }

    return warnings;
}

/**
 * Declarations for a surface-/on- utility, for one palette colour.
 * @param {ColorConfig} config
 * @param {string} palette
 * @param {{ surface: boolean }} options
 * @returns {[string, string][]}
 */
export function contextDecls(config, palette, { surface }) {
    const entry = /** @type {ColorEntry} */ (config.colors[palette]);
    /** @type {[string, string][]} */
    const decls = [];

    if (surface) decls.push(['--color-background', `var(--color-${palette})`]);
    if (entry.foreground) decls.push(['--color-foreground', `var(--color-${palette}-foreground)`]);
    if (surface) decls.push(['background-color', 'var(--color-background)']);
    if (entry.foreground) decls.push(['color', 'var(--color-foreground)']);
    if (surface) decls.push(['color-scheme', colorSchemeFor(entry)]);

    for (const [prop, value] of Object.entries(entry.vars ?? {})) {
        decls.push([prop, toCss(config, value)]);
    }

    return decls;
}

/**
 * Theme declarations: reset the namespace, then palette colours and aliases.
 * @param {ColorConfig} config
 * @returns {[string, string][]}
 */
export function themeDecls(config) {
    /** @type {[string, string][]} */
    const decls = [['--color-*', 'initial']];

    for (const [name, entry] of Object.entries(config.colors)) {
        if (entry.alias) {
            decls.push([`--color-${name}`, `var(--color-${entry.alias})`]);
            if (hasForeground(config, entry.alias)) {
                decls.push([`--color-${name}-foreground`, `var(--color-${entry.alias}-foreground)`]);
            }
        } else {
            decls.push([`--color-${name}`, /** @type {string} */ (entry.color)]);
            if (entry.foreground) decls.push([`--color-${name}-foreground`, toCss(config, entry.foreground)]);
        }
    }

    return decls;
}

/**
 * @param {ColorConfig} config
 * @param {string} name
 */
function hasForeground(config, name) {
    const palette = paletteFor(config, name);
    return Boolean(palette && config.colors[palette]?.foreground);
}

/**
 * Role declarations for a scheme. Light reads the aliases' own targets; dark reads schemes.dark.
 * @param {ColorConfig} config
 * @param {'light' | 'dark'} scheme
 * @returns {[string, string][]}
 */
export function schemeDecls(config, scheme) {
    const dark = config.schemes?.dark ?? {};
    /** @type {[string, string][]} */
    const decls = [];

    for (const role of Object.keys(dark)) {
        if (role.endsWith('-foreground')) continue;

        const value = scheme === 'dark' ? dark[role] : config.colors[role]?.alias;
        if (!value) continue;

        decls.push([`--color-${role}`, toCss(config, value)]);

        const explicitForeground = scheme === 'dark' ? dark[`${role}-foreground`] : undefined;
        if (explicitForeground) {
            decls.push([`--color-${role}-foreground`, toCss(config, explicitForeground)]);
        } else if (config.colors[value] && hasForeground(config, value)) {
            decls.push([`--color-${role}-foreground`, `var(--color-${value}-foreground)`]);
        }
    }

    // A foreground set without its role.
    if (scheme === 'dark') {
        for (const [role, value] of Object.entries(dark)) {
            if (role.endsWith('-foreground') && !(role.replace(/-foreground$/, '') in dark)) {
                decls.push([`--color-${role}`, toCss(config, value)]);
            }
        }
    }

    const background = paletteFor(config, 'background', scheme === 'dark' ? dark : {});
    const backgroundEntry = background ? config.colors[background] : undefined;
    decls.push(['color-scheme', backgroundEntry ? colorSchemeFor(backgroundEntry) : scheme]);

    return decls;
}

/**
 * The dark variant: the OS preference unless inside [data-scheme=light], or inside [data-scheme=dark]
 * (but not a light region nested in it). Matches the role maps written to @layer base.
 */
const DARK_VARIANT = `{
    @media (prefers-color-scheme: dark) {
        &:not(:where([data-scheme="light"], [data-scheme="light"] *)) {
            @slot;
        }
    }
    &:where([data-scheme="dark"], [data-scheme="dark"] *):not(:where([data-scheme="dark"] [data-scheme="light"], [data-scheme="dark"] [data-scheme="light"] *)) {
        @slot;
    }
}`;

/**
 * Is this the Tailwind entry stylesheet (rather than a component file or @reference)?
 * @param {import('postcss').Root} root
 */
function isEntry(root) {
    let found = false;
    root.walkAtRules((rule) => {
        if (rule.name === 'theme' || (rule.name === 'import' && /["']tailwindcss["']/.test(rule.params))) {
            found = true;
            return false;
        }
    });
    return found;
}

/**
 * @param {ColorSystemOptions} [options]
 * @returns {import('postcss').Plugin}
 */
export default function colorSystem(options = {}) {
    const { config: configSource = DEFAULT_CONFIG, safelist = false, minContrast = MIN_CONTRAST } = options;
    const classPatterns = {
        surface: options.classes?.surface ?? ['surface-{name}'],
        on: options.classes?.on ?? ['on-{name}'],
    };

    return {
        postcssPlugin: PLUGIN_NAME,
        Once(root, { result, postcss }) {
            if (!isEntry(root)) return;

            // Re-read on every run so config edits show up in dev, and tell the bundler to watch it.
            const { config, file } = loadConfig(configSource);
            if (file) result.messages.push({ type: 'dependency', plugin: PLUGIN_NAME, file, parent: result.opts.from });

            for (const warning of contrastWarnings(config, minContrast)) {
                result.warn(warning, { plugin: PLUGIN_NAME });
            }

            // Give every generated node a source so bundlers don't warn about missing `from`.
            const source = root.source;
            /** @param {[string, string][]} decls */
            const toNodes = (decls) => decls.map(([prop, value]) => postcss.decl({ prop, value, source }));
            const atRule = (/** @type {string} */ name, /** @type {string} */ params) =>
                postcss.atRule({ name, params, source });
            const rule = (/** @type {string} */ selector) => postcss.rule({ selector, source });

            // Theme
            root.append(atRule('theme', 'static').append(toNodes(themeDecls(config))));

            // Dark variant and scheme role maps
            const dark = config.schemes?.dark;
            if (dark) {
                const variant = postcss.parse(`@custom-variant dark ${DARK_VARIANT}`, { from: undefined });
                variant.walk((node) => {
                    node.source = source;
                });
                root.append(variant.nodes);
            }

            const base = atRule('layer', 'base');
            base.append(
                rule(':root').append(toNodes(schemeDecls(config, 'light').filter(([p]) => p === 'color-scheme')))
            );
            if (dark) {
                const darkDecls = schemeDecls(config, 'dark');
                base.append(
                    atRule('media', '(prefers-color-scheme: dark)').append(
                        rule(':root:not([data-scheme="light"])').append(toNodes(darkDecls))
                    ),
                    rule('[data-scheme="dark"]').append(toNodes(darkDecls)),
                    rule('[data-scheme="light"]').append(toNodes(schemeDecls(config, 'light'))),
                    rule('[data-scheme]').append(
                        toNodes([
                            ['background-color', 'var(--color-background)'],
                            ['color', 'var(--color-foreground)'],
                        ])
                    )
                );
            }
            root.append(base);

            // Surface and on- utilities
            /** @type {string[]} */
            const classes = [];
            for (const name of Object.keys(config.colors)) {
                const palette = paletteFor(config, name);
                if (!palette) continue;
                const darkPalette = dark ? paletteFor(config, name, dark) : palette;

                for (const surface of [true, false]) {
                    for (const pattern of surface ? classPatterns.surface : classPatterns.on) {
                        const className = pattern.replaceAll('{name}', name);
                        const utility = atRule('utility', className).append(
                            toNodes(contextDecls(config, palette, { surface }))
                        );

                        // A role that changes in dark mode gets the dark colour's declarations too.
                        if (darkPalette && darkPalette !== palette) {
                            utility.append(
                                atRule('variant', 'dark').append(
                                    toNodes(contextDecls(config, darkPalette, { surface }))
                                )
                            );
                        }

                        root.append(utility);
                        classes.push(className);
                    }
                }
            }

            if (safelist) root.prepend(atRule('source', `inline("${classes.join(' ')}")`));
        },
    };
}

colorSystem.postcss = true;
