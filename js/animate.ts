/**
 * Animate on scroll. Sets [data-playing] on [data-animate-item] elements when
 * their trigger scrolls into view; css/patterns/animate.css does the rest.
 *
 *   <div data-animate data-animate-stagger="80">
 *       <p data-animate-item>…</p>
 *   </div>
 *
 *   <h2 data-animate-item>…</h2>                 no trigger: plays itself
 *
 *   <section id="intro" data-animate>…</section>
 *   <img data-animate-item="intro" …>            played by #intro, wherever it is
 *
 * An item's trigger is the element its value names by id, else its nearest
 * [data-animate] ancestor (not itself), else the item itself. Each item has
 * exactly one trigger, so nested triggers play only their own items, and an
 * element can be an item of an outer trigger and a trigger for its own
 * (data-animate data-animate-item). A named trigger must be in the DOM when
 * the item is set up; if it isn't, the item plays itself.
 *
 * Items that start together play one after another in document order, across
 * triggers: each waits the stagger of the one before (its trigger's
 * data-animate-stagger, default 100ms), capped at 600ms from now so a fast
 * scroll never queues a backlog. The wait goes in --animate__item--animation-delay.
 *
 * Items replay when their trigger goes back below the viewport (the user
 * scrolled up past it), not when it scrolls off the top. A trigger already
 * above the viewport (an anchor link, a restored scroll) plays straight away,
 * off screen, without holding up the queue.
 *
 * Needs the no-js → js class swap in <head> so items start hidden only when
 * this script will run.
 */

import { getNumberDataAttribute } from './data-attributes';
import { define } from './dynamic-elements';

const STAGGER = 100; // ms between items that start together, unless the trigger sets one
const MAX_WAIT = 600; // ms cap on any item's wait
const LINE = 30; // px above the viewport's bottom edge that a trigger must cross

const itemsOf = new Map<HTMLElement, Set<HTMLElement>>();
const triggerOf = new WeakMap<HTMLElement, HTMLElement>();
/** Triggers at or above the line, whose items have played. */
const reached = new Set<HTMLElement>();
/** When the queue's next slot starts, on the performance.now() clock. */
let nextSlot = 0;

function start(item: HTMLElement, wait: number): void {
    item.style.setProperty('--animate__item--animation-delay', `${Math.round(wait)}ms`);
    item.toggleAttribute('data-playing', true);
}

function reset(item: HTMLElement): void {
    item.toggleAttribute('data-playing', false);
    item.style.removeProperty('--animate__item--animation-delay');
}

/** Start items in document order, each in the next free slot. */
function play(items: HTMLElement[]): void {
    const now = performance.now();
    items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    for (const item of items) {
        const slot = Math.min(Math.max(now, nextSlot), now + MAX_WAIT);
        nextSlot = slot + getNumberDataAttribute(triggerOf.get(item) ?? item, 'animateStagger', STAGGER);
        start(item, slot - now);
    }
}

const isBelowViewport = (element: Element) => element.getBoundingClientRect().top >= window.innerHeight;

const triggerObserver = new IntersectionObserver(
    (entries) => {
        const queue: HTMLElement[] = [];
        for (const entry of entries) {
            const trigger = entry.target as HTMLElement;
            const items = [...(itemsOf.get(trigger) ?? [])];
            if (entry.isIntersecting) {
                reached.add(trigger);
                const waiting = items.filter((item) => !item.hasAttribute('data-playing'));
                if (entry.boundingClientRect.bottom > 0) queue.push(...waiting);
                else for (const item of waiting) start(item, 0);
            } else if (entry.boundingClientRect.top > 0) {
                // Back below the line. Reset items already out of sight;
                // itemObserver resets the rest as they leave.
                reached.delete(trigger);
                for (const item of items.filter(isBelowViewport)) reset(item);
            }
        }
        play(queue);
    },
    // Extend the root a full viewport upwards, so triggers scrolled past stay played.
    { rootMargin: `100% 0px -${LINE}px 0px` }
);

// Items, for what triggerObserver can't see:
// - A remote item can come into view with its trigger far above (the reader
//   jumped down the page, then scrolled up). It plays if its trigger is above the line.
// - An item that drops below the viewport while its trigger is below the line
//   is hidden again, so it replays on the way down. A remote item below a
//   trigger that's still in view stays played.
const itemObserver = new IntersectionObserver((entries) => {
    const queue: HTMLElement[] = [];
    for (const entry of entries) {
        const item = entry.target as HTMLElement;
        const trigger = triggerOf.get(item);
        if (!trigger) continue;
        if (entry.isIntersecting) {
            const aboveLine = trigger.getBoundingClientRect().top < window.innerHeight - LINE;
            if (aboveLine && !item.hasAttribute('data-playing')) queue.push(item);
        } else if (entry.boundingClientRect.top > 0 && !reached.has(trigger)) {
            reset(item);
        }
    }
    play(queue);
});

function findTrigger(item: HTMLElement): HTMLElement {
    const id = item.dataset.animateItem;
    if (id) {
        const named = document.getElementById(id);
        if (named) return named;
        console.warn(`Animate: no #${id} trigger found, so the item plays itself`, item);
        return item;
    }
    return item.parentElement?.closest<HTMLElement>('[data-animate]') ?? item;
}

define(
    '[data-animate-item]',
    (item) => {
        const trigger = findTrigger(item);
        triggerOf.set(item, trigger);

        let items = itemsOf.get(trigger);
        if (!items) {
            items = new Set();
            itemsOf.set(trigger, items);
            triggerObserver.observe(trigger);
        }
        items.add(item);
        itemObserver.observe(item);

        // Added after its trigger played
        if (reached.has(trigger)) play([item]);
    },
    {
        disconnected: (item) => {
            itemObserver.unobserve(item);
            const trigger = triggerOf.get(item);
            const items = trigger ? itemsOf.get(trigger) : undefined;
            if (!(trigger && items)) return;
            items.delete(item);
            if (items.size > 0) return;
            itemsOf.delete(trigger);
            reached.delete(trigger);
            triggerObserver.unobserve(trigger);
        },
    }
);
