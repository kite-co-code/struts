import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { componentIndex } from './tools/component-index.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// The demo lives in example/: the homepage, and the components page with its example frame.
// CSS goes through postcss.config.js at the project root. Fonts are served from public/.
// componentIndex() keeps components/index.css and index.ts in step with the component folders.
export default defineConfig({
    root: 'example',
    publicDir: '../public',
    plugins: [componentIndex({ dir: fileURLToPath(new URL('components', import.meta.url)) })],
    css: { postcss: projectRoot },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('example/index.html', import.meta.url)),
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
