/**
 * Animate on scroll. Sets [data-playing] on [data-animate] elements as they
 * scroll into view; css/patterns/animate.css does the rest.
 *
 *   <div class="animate" data-animate data-animate-stagger="80">
 *       <p class="animate__item">…</p>
 *   </div>
 *
 * data-animate-stagger="ms" delays each .animate__item by its index × ms.
 *
 * The animation replays only when the block goes back below the viewport
 * (the user scrolled up past it), not when it scrolls off the top.
 *
 * Needs the no-js → js class swap in <head> so items start hidden only when
 * this script will run.
 */

import { getNumberDataAttribute } from './data-attributes';
import { define } from './dynamic-elements';

const observer = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) {
                element.toggleAttribute('data-playing', true);
            } else if (entry.boundingClientRect.top > 0) {
                element.toggleAttribute('data-playing', false);
            }
        }
    },
    // Extend the root a full viewport upwards, so blocks scrolled past stay played.
    { rootMargin: '100% 0px -30px 0px' }
);

function stagger(element: HTMLElement): void {
    const step = getNumberDataAttribute(element, 'animateStagger', 0);
    if (!step) return;

    element.querySelectorAll<HTMLElement>('.animate__item').forEach((item, index) => {
        item.style.setProperty('--animate__item--animation-delay', `${index * step}ms`);
    });
}

define(
    '[data-animate]',
    (element) => {
        stagger(element);
        observer.observe(element);
    },
    { disconnected: (element) => observer.unobserve(element) }
);
