/**
 * Demo only: render one component example, chosen by query string, with all
 * of struts' styles and scripts. The components page loads this in iframes.
 *
 *   frame.html?component=site-header&example=0
 */

import '../main';
import { components } from './examples';

const params = new URLSearchParams(window.location.search);
const component = components.find((item) => item.name === params.get('component'));
const example = component?.examples[Number(params.get('example') ?? 0)];
const root = document.querySelector<HTMLElement>('[data-frame-root]');

/** Filler for page-layout examples, so there's something to scroll and link to. */
function pageContent(): string {
    const paragraph =
        '<p>Page content, so the frame has something to scroll. Scroll down to hide the header, then up a little to bring it back.</p>';
    const sections = ['Work', 'Services', 'About', 'Contact']
        .map((title) => `<h2 id="${title.toLowerCase()}">${title}</h2>${paragraph.repeat(4)}`)
        .join('');
    return `<main id="main" class="section layout-grid"><div class="flow">${sections}</div></main>`;
}

if (root && component && example) {
    document.title = `${component.title}: ${example.title} · struts`;

    if (example.layout === 'page') {
        root.append(example.content.cloneNode(true));
        root.insertAdjacentHTML('beforeend', pageContent());
    } else {
        root.classList.add('p-(--gutter)');
        root.append(example.content.cloneNode(true));
    }
} else if (root) {
    root.innerHTML = '<p class="p-(--gutter)">No example here. Check the component and example in the URL.</p>';
}
