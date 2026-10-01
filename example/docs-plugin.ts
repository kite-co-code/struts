/**
 * Demo only: a Vite plugin that assembles the docs pages from their HTML.
 * Everything happens at build time, so the pages work without JS.
 *
 *   <!-- @head -->     the shared <head> tags (example/partials/head.html)
 *   <!-- @header -->   the site header; the link whose data-page matches this
 *                      page's path gets aria-current="page"
 *   <!-- @footer -->   the site footer
 *   <!-- @toc -->      "On this page": every <section id> whose first child is
 *                      an <h2> or <h3>, with h3s nested under the h2 before them
 *
 *   <docs-example>…</docs-example>
 *       A live example. Its markup, as written, is added after it as code.
 *
 *   <docs-source src="css/patterns/button.css js/disclosure.ts"></docs-source>
 *       Replaced with each file's header comment: the pattern's API, straight
 *       from the source so the page can't drift from it.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { dedent, headerComment } from './source-text.ts';

const repo = 'https://github.com/kite-co-code/struts/blob/main';

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function source(root: string, files: string): string {
    return files
        .split(/\s+/)
        .filter(Boolean)
        .map((file) => {
            const comment = headerComment(readFileSync(resolve(root, file), 'utf8'));
            return `<figure class="docs-source">
    <figcaption class="type-label-sm"><a class="link--subtle" href="${repo}/${file}">${file}</a></figcaption>
    <pre class="docs-source__code"><code>${escapeHtml(comment)}</code></pre>
</figure>`;
        })
        .join('\n');
}

function example(markup: string): string {
    return `<details class="docs-markup">
    <summary class="type-label-sm">Markup</summary>
    <pre class="docs-markup__code"><code>${escapeHtml(dedent(markup))}</code></pre>
</details>`;
}

interface TocItem {
    id: string;
    title: string;
    children: TocItem[];
}

function toc(html: string): string {
    const items: TocItem[] = [];
    for (const [, id, level, title] of html.matchAll(
        /<section\b[^>]*\bid="([^"]+)"[^>]*>\s*<h([23])\b[^>]*>([\s\S]*?)<\/h\2>/g
    )) {
        if (!(id && title)) continue;
        const item = { id, title: title.replace(/<[^>]+>/g, '').trim(), children: [] };
        const parent = items.at(-1);
        if (level === '3' && parent) parent.children.push(item);
        else items.push(item);
    }

    const list = (entries: TocItem[], className: string): string =>
        `<ul class="${className}">${entries
            .map(
                (item) =>
                    `<li><a class="docs-toc__link" href="#${item.id}">${escapeHtml(item.title)}</a>${
                        item.children.length ? list(item.children, 'docs-toc__sublist') : ''
                    }</li>`
            )
            .join('')}</ul>`;

    return `<nav class="docs-toc" aria-labelledby="docs-toc-title" data-docs-toc>
    <p id="docs-toc-title" class="type-label-sm">On this page</p>
    ${list(items, 'docs-toc__list')}
</nav>`;
}

/** "/patterns/index.html" → "/patterns/" */
function pagePath(path: string): string {
    return path.replace(/index\.html$/, '');
}

export function docsPages({ root }: { root: string }): Plugin {
    const partial = (name: string) => readFileSync(resolve(root, 'example/partials', `${name}.html`), 'utf8').trim();

    return {
        name: 'struts-docs-pages',
        configureServer(server) {
            // Partials aren't modules, so reload the page when one changes.
            // (A changed header comment shows on the next reload.)
            server.watcher.on('change', (file) => {
                if (file.includes('/example/partials/')) server.ws.send({ type: 'full-reload' });
            });
        },
        transformIndexHtml: {
            order: 'pre',
            handler(html, { path }) {
                const header = partial('header')
                    .replace(`data-page="${pagePath(path)}"`, 'aria-current="page"')
                    .replace(/ data-page="[^"]*"/g, '');

                return html
                    .replace('<!-- @head -->', partial('head'))
                    .replace('<!-- @header -->', header)
                    .replace('<!-- @footer -->', partial('footer'))
                    .replace(/<docs-example\b[^>]*>([\s\S]*?)<\/docs-example>/g, (element, markup: string) => {
                        return `${element}\n${example(markup)}`;
                    })
                    .replace(/<docs-source src="([^"]+)"><\/docs-source>/g, (_, files: string) => source(root, files))
                    .replace('<!-- @toc -->', () => toc(html));
            },
        },
    };
}
