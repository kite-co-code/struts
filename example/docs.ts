/**
 * Demo only: the docs pages' script. Everything the demo loads, plus marking
 * the "On this page" link for the section being read with aria-current.
 * Without JS the nav is still a list of links.
 */

import './main';

const toc = document.querySelector<HTMLElement>('[data-docs-toc]');
let scheduled = false;

/** The last section whose top has passed a line a quarter of the way down the viewport. */
function update(): void {
    scheduled = false;
    if (!toc) return;

    // Links are in document order, groups before their items, so the last one passed is the deepest.
    const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const line = window.innerHeight / 4;
    let current: HTMLAnchorElement | undefined;

    for (const link of links) {
        const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if (target && target.getBoundingClientRect().top <= line) current = link;
    }
    if (atBottom) current = links.at(-1);

    for (const link of links) {
        if (link === current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    }
}

if (toc) {
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
}

/** Call after adding sections to the page, so the nav catches up. */
export function refreshToc(): void {
    update();
}
