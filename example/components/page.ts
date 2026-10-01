/**
 * Demo only: the components page. Lists every component with an
 * example.html and renders each example in a resizable frame, with its
 * markup underneath.
 */

import '../main';
import { type Component, components, type Example, frameUrl } from './examples';

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
        <div class="stack-16" aria-labelledby="${id}-title" role="group">
            <div class="stack-8">
                <h3 id="${id}-title" class="type-h3">${escapeHtml(example.title)}</h3>
                ${example.description ? `<p class="max-w-[60ch]">${escapeHtml(example.description)}</p>` : ''}
            </div>
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
            <details class="stack-12">
                <summary class="type-label">Markup</summary>
                <pre class="surface-neutral-600 p-16 rounded-md overflow-x-auto"><code>${escapeHtml(example.source)}</code></pre>
            </details>
        </div>`;
}

function renderComponent(component: Component): string {
    const files = component.files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('');

    return `
        <section id="${component.name}" class="section layout-grid layout-grid--ruled rule-block-start" aria-labelledby="${component.name}-title">
            <div class="stack-48">
                <div class="stack-16">
                    <p class="type-label">Component</p>
                    <h2 id="${component.name}-title" class="type-h1">${escapeHtml(component.title)}</h2>
                    ${component.summary ? `<p class="max-w-[60ch]">${escapeHtml(component.summary)}</p>` : ''}
                    <ul class="flex-list [--gap:--spacing(12)]" aria-label="Files">${files}</ul>
                </div>
                ${component.examples.map((example, index) => renderExample(component, example, index)).join('')}
            </div>
        </section>`;
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

const index = document.querySelector<HTMLElement>('[data-components-index]');
const container = document.querySelector<HTMLElement>('[data-components]');

if (index && container && components.length > 0) {
    index
        .querySelector('ul')
        ?.insertAdjacentHTML(
            'beforeend',
            components
                .map((item) => `<li><a class="tag" href="#${item.name}">${escapeHtml(item.title)}</a></li>`)
                .join('')
        );
    index.hidden = false;
    container.innerHTML = components.map(renderComponent).join('');

    for (const frame of container.querySelectorAll<HTMLIFrameElement>('iframe')) {
        frame.addEventListener('load', () => fitFrame(frame));
    }

    container.addEventListener('click', (event) => {
        const button =
            event.target instanceof Element ? event.target.closest<HTMLElement>('[data-preview-width]') : null;
        const group = button?.closest('[role="group"][aria-labelledby]');
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
