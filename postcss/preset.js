/**
 * The struts PostCSS preset. Returns the plugin array in the order it must run:
 *
 *   glob-import (optional) → color-system → postcss-functions → @tailwindcss/postcss
 *
 * Imports must be inlined before this runs so the functions see every file. Vite does that
 * for you; in other builds put postcss-import first.
 *
 * @example
 * // postcss.config.js
 * import { struts } from './postcss/preset.js';
 * export default { plugins: struts({ colorsConfig: './colors.config.json' }) };
 */

import tailwindcss from '@tailwindcss/postcss';
import postcssFunctions from 'postcss-functions';
import colorSystem from './color-system.js';
import functionsConfig from './functions.js';
import globImport from './glob-import.js';

/**
 * @param {{
 *   colorsConfig?: string | import('./color-system.js').ColorConfig,
 *   fluid?: { min: number, max: number },
 *   safelist?: boolean,
 *   minContrast?: number,
 *   classes?: import('./color-system.js').ColorSystemOptions['classes'],
 *   globImport?: boolean,
 *   tailwind?: Parameters<typeof tailwindcss>[0],
 * }} [options]
 * @returns {import('postcss').AcceptedPlugin[]}
 */
export function struts(options = {}) {
    const { colorsConfig, fluid, safelist, minContrast, classes, tailwind } = options;

    return [
        ...(options.globImport ? [globImport()] : []),
        colorSystem({ config: colorsConfig, safelist, minContrast, classes }),
        postcssFunctions(functionsConfig({ fluid })),
        tailwindcss(tailwind),
    ];
}

export default struts;
