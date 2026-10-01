/**
 * Site header: hide while scrolling down, peek back on scroll up, and close
 * the popover nav when it should. Markup and styles: example.html and
 * styles.css beside this file.
 *
 *   <header class="site-header" data-site-header>
 *       <button class="site-header__toggle" type="button" popovertarget="site-nav">Menu</button>
 *       <nav id="site-nav" class="site-header__nav" aria-label="Main" popover data-scroll-lock>…</nav>
 *   </header>
 *
 * The nav opens and closes without this (popover + popovertarget). This adds:
 * - [data-site-header-hidden] on the header once the user scrolls down past
 *   it, removed as soon as they scroll up. The CSS slides it out and back.
 * - Closing the nav when a link in it is clicked (same-page links would
 *   otherwise leave it open), when keyboard focus moves out of it, and when
 *   the toggle disappears (the viewport has grown to show the nav inline).
 *
 * Data attributes on the header:
 *   data-site-header-threshold="px"   scroll this far in one direction before
 *                                     hiding or showing, default 8
 */

import { getNumberDataAttribute } from '../../js/data-attributes';
import { debounce } from '../../js/debounce';
import { define } from '../../js/dynamic-elements';

export default class SiteHeader {
    readonly el: HTMLElement;
    readonly nav: HTMLElement | null;
    readonly toggle: HTMLElement | null;
    threshold: number;

    private lastY = 0;
    private frame = 0;

    constructor(element: HTMLElement) {
        this.el = element;
        this.nav = element.querySelector<HTMLElement>('[popover]');
        this.toggle = this.nav?.id
            ? element.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(this.nav.id)}"]`)
            : null;
        this.threshold = getNumberDataAttribute(element, 'siteHeaderThreshold', 8);
        this.lastY = this.scrollY();

        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize);
        this.nav?.addEventListener('click', this.onNavClick);
        this.nav?.addEventListener('focusout', this.onNavFocusout);
        this.nav?.addEventListener('toggle', this.onNavToggle);
    }

    show(): void {
        this.el.toggleAttribute('data-site-header-hidden', false);
    }

    hide(): void {
        this.el.toggleAttribute('data-site-header-hidden', true);
    }

    closeNav(): void {
        if (this.nav?.matches(':popover-open')) this.nav.hidePopover();
    }

    destroy(): void {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
        this.nav?.removeEventListener('click', this.onNavClick);
        this.nav?.removeEventListener('focusout', this.onNavFocusout);
        this.nav?.removeEventListener('toggle', this.onNavToggle);
        this.onResize.cancel();
        cancelAnimationFrame(this.frame);
    }

    /** scrollY clamped to the scrollable range, so overscroll bounces don't count. */
    private scrollY(): number {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return Math.min(Math.max(window.scrollY, 0), max);
    }

    private update(): void {
        const y = this.scrollY();
        const delta = y - this.lastY;
        if (Math.abs(delta) < this.threshold) return;
        this.lastY = y;

        if (delta > 0 && y > this.el.offsetHeight) {
            this.hide();
        } else if (delta < 0) {
            this.show();
        }
    }

    private onScroll = (): void => {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.update();
        });
    };

    private onResize = debounce((): void => {
        if (this.toggle && !this.toggle.checkVisibility()) this.closeNav();
    }, 100);

    private onNavClick = (event: MouseEvent): void => {
        if (event.target instanceof Element && event.target.closest('a[href]')) this.closeNav();
    };

    /** Opening the nav brings the header back, and it stays when the nav closes. */
    private onNavToggle = (event: Event): void => {
        if ((event as ToggleEvent).newState === 'open') this.show();
    };

    private onNavFocusout = (event: FocusEvent): void => {
        const next = event.relatedTarget;
        if (!(next instanceof Node)) return;
        if (this.nav?.contains(next) || this.toggle?.contains(next)) return;
        this.closeNav();
    };
}

define('[data-site-header]', (element) => new SiteHeader(element));
