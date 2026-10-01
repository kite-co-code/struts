import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findComponents, renderIndex, writeComponentIndex } from '../tools/component-index.js';

let dir = '';

/** @param {string} name @param {string[]} files */
function component(name, files) {
    mkdirSync(join(dir, name));
    for (const file of files) writeFileSync(join(dir, name, file), '');
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'struts-components-'));
});

afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe('findComponents', () => {
    it('lists folders with styles and scripts separately, sorted', () => {
        component('tabs', ['styles.css', 'scripts.ts', 'example.html']);
        component('card', ['styles.css', 'example.html']);
        component('empty', []);
        writeFileSync(join(dir, 'index.css'), '');

        expect(findComponents(dir)).toEqual({ styles: ['card', 'tabs'], scripts: ['tabs'] });
    });
});

describe('renderIndex', () => {
    it('imports each component', () => {
        const { css, ts } = renderIndex({ styles: ['card', 'tabs'], scripts: ['tabs'] });

        expect(css).toContain('@import "./card/styles.css";\n@import "./tabs/styles.css";');
        expect(ts).toContain("import './tabs/scripts';");
    });

    it('keeps the script index a module when nothing has a script', () => {
        expect(renderIndex({ styles: ['card'], scripts: [] }).ts).toContain('export {};');
    });
});

describe('writeComponentIndex', () => {
    it('writes both files, and only rewrites them when a component changes', () => {
        component('card', ['styles.css']);

        expect(writeComponentIndex(dir)).toBe(true);
        expect(writeComponentIndex(dir)).toBe(false);
        expect(readFileSync(join(dir, 'index.css'), 'utf8')).toContain('./card/styles.css');

        component('tabs', ['styles.css', 'scripts.ts']);

        expect(writeComponentIndex(dir)).toBe(true);
        expect(readFileSync(join(dir, 'index.ts'), 'utf8')).toContain("import './tabs/scripts';");
    });
});
