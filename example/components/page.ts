/**
 * Demo only: the components page. Lists every component with an
 * example.html and renders each example in a resizable frame, with its
 * markup underneath, then the header comments of its styles and script.
 * The page is built here, so its "On this page" nav is filled in here too.
 */

import { refreshToc } from '../docs';
import { type Component, components, type Example, frameUrl } from './examples';

const repo = 'https://github.com/kite-co-code/struts/blob/main';

const widths = [
    { label: 'Mobile', value: '390px' },
    { label: 'Tablet', value: '768px' },
    { label: 'Desktop', value: '100%' },
] as const;

function escapeHtml(text: string): string {
    const element = document.createElement('span');
    element.textContent = text;
    return element.innerHTML;
}

function renderExample(component: Component, example: Example, index: number): string {
    const id = `${component.name}-${index}`;
    const url = frameUrl(component.name, index);
    const buttons = widths
        .map(
            (width) =>
                `<button class="btn btn--small btn--secondary" type="button" aria-pressed="${width.value === '100%'}" data-preview-width="${width.value}">${width.label}</button>`
        )
        .join('');

    return `
        <section id="${id}" class="docs-item" data-preview>
            <h3>${escapeHtml(example.title)}</h3>
            ${example.description ? `<p>${escapeHtml(example.description)}</p>` : ''}
            <div class="flex flex-wrap items-center gap-x-16 gap-y-8">
                <div class="flex-list [--gap:--spacing(8)]" role="group" aria-label="Frame width">${buttons}</div>
                <a class="type-label-sm" href="${url}">Open on its own</a>
            </div>
            <div class="preview">
                <iframe
                    class="preview__frame ${example.layout === 'page' ? 'preview__frame--page' : ''}"
                    src="${url}"
                    title="${escapeHtml(`${component.title}: ${example.title}`)}"
                    loading="lazy"
                ></iframe>
            </div>
            <details class="docs-markup">
                <summary class="type-label-sm">Markup</summary>
                <pre class="docs-markup__code"><code>${escapeHtml(example.source)}</code></pre>
            </details>
        </section>`;
}

function renderComponent(component: Component): string {
    const files = component.files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('');
    const sources = component.sources
        .map(
            (source) => `
            <figure class="docs-source">
                <figcaption class="type-label-sm"><a class="link--subtle" href="${repo}/${source.file}">${escapeHtml(source.file)}</a></figcaption>
                <pre class="docs-source__code"><code>${escapeHtml(source.comment)}</code></pre>
            </figure>`
        )
        .join('');

    return `
        <section id="${component.name}" class="docs-group">
            <h2>${escapeHtml(component.title)}</h2>
            ${component.summary ? `<p>${escapeHtml(component.summary)}</p>` : ''}
            <ul class="flex-list [--gap:--spacing(12)]" aria-label="Files">${files}</ul>
            ${component.examples.map((example, index) => renderExample(component, example, index)).join('')}
            ${sources ? `<section id="${component.name}-api" class="docs-item"><h3>API</h3>${sources}</section>` : ''}
        </section>`;
}

/** The nav the build gives every docs page, with each component and its examples. */
function renderToc(): string {
    return components
        .map((component) => {
            const items = component.examples.map(
                (example, index) =>
                    `<li><a class="docs-toc__link" href="#${component.name}-${index}">${escapeHtml(example.title)}</a></li>`
            );
            if (component.sources.length) {
                items.push(`<li><a class="docs-toc__link" href="#${component.name}-api">API</a></li>`);
            }
            return `<li><a class="docs-toc__link" href="#${component.name}">${escapeHtml(component.title)}</a><ul class="docs-toc__sublist">${items.join('')}</ul></li>`;
        })
        .join('');
}

/** Fit padded frames to their content. Page frames keep a fixed height and scroll inside. */
function fitFrame(frame: HTMLIFrameElement): void {
    if (frame.classList.contains('preview__frame--page')) return;
    const root = frame.contentDocument?.querySelector<HTMLElement>('[data-frame-root]');
    if (!root) return;
    const resize = () => {
        frame.style.blockSize = `${root.offsetHeight}px`;
    };
    new ResizeObserver(resize).observe(root);
    resize();
}

const toc = document.querySelector<HTMLElement>('[data-docs-toc] ul');
const container = document.querySelector<HTMLElement>('[data-components]');

if (toc && container && components.length > 0) {
    toc.innerHTML = renderToc();
    container.innerHTML = components.map(renderComponent).join('');
    refreshToc();

    for (const frame of container.querySelectorAll<HTMLIFrameElement>('iframe')) {
        frame.addEventListener('load', () => fitFrame(frame));
    }

    container.addEventListener('click', (event) => {
        const button =
            event.target instanceof Element ? event.target.closest<HTMLElement>('[data-preview-width]') : null;
        const group = button?.closest('[data-preview]');
        const frame = group?.querySelector<HTMLIFrameElement>('iframe');
        if (!(button && group && frame)) return;

        frame.style.inlineSize = button.dataset.previewWidth ?? '100%';
        for (const other of group.querySelectorAll('[data-preview-width]')) {
            other.setAttribute('aria-pressed', String(other === button));
        }
    });

    // The page was rendered after load, so jump to a #component in the URL now.
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
}
