import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { docsPages } from './example/docs-plugin.ts';
import { componentIndex } from './tools/component-index.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// The demo lives in example/: a docs page per layer (Approach, Foundations, Patterns, Utilities,
// Components), plus the frame the components page loads examples into. docsPages() fills in their
// shared header, "On this page" nav, example markup and header comments (example/docs-plugin.ts).
// CSS goes through postcss.config.js at the project root. Fonts are served from public/.
// componentIndex() keeps components/index.css and index.ts in step with the component folders.
export default defineConfig({
    root: 'example',
    publicDir: '../public',
    plugins: [
        componentIndex({ dir: fileURLToPath(new URL('components', import.meta.url)) }),
        docsPages({ root: projectRoot }),
    ],
    css: { postcss: projectRoot },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('example/index.html', import.meta.url)),
                foundations: fileURLToPath(new URL('example/foundations/index.html', import.meta.url)),
                patterns: fileURLToPath(new URL('example/patterns/index.html', import.meta.url)),
                utilities: fileURLToPath(new URL('example/utilities/index.html', import.meta.url)),
                components: fileURLToPath(new URL('example/components/index.html', import.meta.url)),
                frame: fileURLToPath(new URL('example/components/frame.html', import.meta.url)),
            },
        },
    },
    test: {
        root: projectRoot,
        include: ['test/**/*.test.js'],
    },
});
