/**
 * Optional: expand glob imports such as `@import "./components/** /styles.css";`
 * (no space in the real pattern). Useful when components keep their CSS beside their markup.
 *
 * Must run before anything that inlines imports. Not part of the default preset;
 * pass `globImport: true` to struts() to turn it on.
 *
 * Plain ESM with JSDoc so it can be copied into any build.
 */

import { dirname, relative, resolve } from 'node:path';
import fg from 'fast-glob';

/** @returns {import('postcss').Plugin} */
export default function globImport() {
    return {
        postcssPlugin: 'struts-glob-import',
        prepare(result) {
            const from = result.opts.from;

            return {
                AtRule: {
                    import(atRule) {
                        if (!from) return;

                        const match = atRule.params.match(/^(["'])(.+?)\1(.*)$/);
                        if (!match) return;
                        const [, , pattern = '', rest = ''] = match;
                        if (!fg.isDynamicPattern(pattern)) return;

                        const dir = dirname(from);
                        const files = fg.sync(resolve(dir, pattern).replace(/\\/g, '/')).sort();

                        if (files.length === 0) {
                            atRule.warn(result, `No files match "${pattern}"`);
                            atRule.remove();
                            return;
                        }

                        for (const file of files) {
                            const path = relative(dir, file).replace(/\\/g, '/');
                            const params = `"${path.startsWith('.') ? path : `./${path}`}"${rest}`;
                            atRule.before(atRule.clone({ params }));
                        }
                        atRule.remove();
                    },
                },
            };
        },
    };
}

globImport.postcss = true;
