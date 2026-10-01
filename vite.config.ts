import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// The demo page lives in example/. CSS goes through postcss.config.js at the project root.
// Fonts are served from public/ at the project root.
export default defineConfig({
    root: 'example',
    publicDir: '../public',
    css: { postcss: projectRoot },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    test: {
        root: projectRoot,
        include: ['test/**/*.test.js'],
    },
});
