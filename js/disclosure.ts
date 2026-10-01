/**
 * Disclosure: show and hide any element from one or more triggers.
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 *   <button aria-controls="faq-1" aria-expanded="false">Question</button>
 *   <div id="faq-1" data-disclosure hidden>Answer</div>
 *
 * The target is hidden with `hidden` and made `inert` while collapsed, so its
 * contents leave the tab order and the accessibility tree without touching
 * tabindex. Triggers get aria-expanded; a non-button trigger also gets
 * role="button", a tab stop and Enter/Space.
 *
 * For a simple accordion, prefer native <details name="group">: it needs no JS.
 * Use this when the trigger and target can't be <summary> and <details>, or you
 * need escape-to-close, focus-out, hash or grouping behaviour.
 *
 * Data attributes on the target (all optional):
 *   data-disclosure-animate            animate height (skipped for reduced motion)
 *   data-disclosure-group="name"       expanding one collapses the others in the group
 *   data-disclosure-focusout           collapse when focus or a click leaves it
 *   data-disclosure-focus-within       move focus into the target on expand
 *   data-disclosure-expand-on-hash="false"   don't expand when the URL hash is its id
 *
 * Show or hide parts of a trigger by state with data-show-expanded and friends
 * (css/utilities/aria-expanded.css).
 *
 * Events, dispatched on the target and bubbling: expandbegin, expandend,
 * collapsebegin, collapseend.
 */

import { getBooleanDataAttribute } from './data-attributes';
import { define } from './dynamic-elements';
import { firstFocusable } from './focusable';

export interface DisclosureOptions {
    animate: boolean;
    animateDuration: number;
    animateEasing: string;
    collapseOnEscape: boolean;
    collapseOnFocusout: boolean;
    collapseAncestorsOnEscape: boolean;
    collapseOnAncestorCollapse: boolean;
    focusWithinOnExpand: boolean;
    allowClose: boolean;
    expandOnHash: boolean;
    group: string | null;
    /** Collapse when any of these elements starts to expand. */
    collapseOnOtherElementsExpand: Element[] | null;
}

export type DisclosureEvent = 'expandbegin' | 'expandend' | 'collapsebegin' | 'collapseend';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default class Disclosure {
    readonly el: HTMLElement;
    options: DisclosureOptions;
    triggers: HTMLElement[] = [];
    isExpanded: boolean;

    private lastTrigger: HTMLElement | null = null;
    private animation: Animation | null = null;

    constructor(element: HTMLElement, options: Partial<DisclosureOptions> = {}) {
        this.el = element;
        this.isExpanded = !element.hidden;

        this.options = {
            animate: getBooleanDataAttribute(element, 'disclosureAnimate'),
            animateDuration: 200,
            animateEasing: 'ease',
            collapseOnEscape: true,
            collapseOnFocusout: getBooleanDataAttribute(element, 'disclosureFocusout'),
            collapseAncestorsOnEscape: false,
            collapseOnAncestorCollapse: false,
            focusWithinOnExpand: getBooleanDataAttribute(element, 'disclosureFocusWithin'),
            allowClose: true,
            expandOnHash: getBooleanDataAttribute(element, 'disclosureExpandOnHash', true),
            group: element.dataset.disclosureGroup ?? null,
            collapseOnOtherElementsExpand: null,
            ...options,
        };

        if (!element.id) {
            console.warn('Disclosure: the target needs an id', element);
            return;
        }

        this.triggers = [...document.querySelectorAll<HTMLElement>(`[aria-controls~="${CSS.escape(element.id)}"]`)];
        if (this.triggers.length === 0) {
            console.warn(`Disclosure: no [aria-controls="${element.id}"] trigger found`, element);
            return;
        }

        for (const trigger of this.triggers) {
            if (!(trigger instanceof HTMLButtonElement)) {
                trigger.setAttribute('role', 'button');
                if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
                trigger.addEventListener('keydown', this.onTriggerKeydown);
            }
            trigger.addEventListener('click', this.onTriggerClick);
        }

        this.render();

        element.addEventListener('keydown', this.onKeydown);
        element.addEventListener('focusout', this.onFocusout);
        document.addEventListener('click', this.onDocumentClick);
        document.addEventListener('expandbegin', this.onOtherExpand);
        document.addEventListener('collapseend', this.onOtherCollapse);

        if (this.options.expandOnHash) {
            window.addEventListener('hashchange', this.onHashChange);
            this.onHashChange();
        }
    }

    updateConfig(options: Partial<DisclosureOptions>): void {
        this.options = { ...this.options, ...options };
    }

    toggle(): void {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand(): void {
        if (this.isExpanded) return;
        this.isExpanded = true;
        this.dispatch('expandbegin');
        this.render();

        this.run(['0px', `${this.el.scrollHeight}px`], () => {
            this.dispatch('expandend');
            if (this.options.focusWithinOnExpand) firstFocusable(this.el)?.focus();
        });
    }

    collapse(): void {
        if (!(this.isExpanded && this.options.allowClose)) return;
        this.isExpanded = false;
        this.dispatch('collapsebegin');

        // Keep the element visible while it animates closed; render() hides it at the end.
        this.setExpandedState();
        this.el.inert = true;

        this.run([`${this.el.offsetHeight}px`, '0px'], () => {
            this.render();
            this.dispatch('collapseend');
        });
    }

    /** Stop listening. The element keeps its current state. */
    destroy(): void {
        for (const trigger of this.triggers) {
            trigger.removeEventListener('click', this.onTriggerClick);
            trigger.removeEventListener('keydown', this.onTriggerKeydown);
        }
        this.el.removeEventListener('keydown', this.onKeydown);
        this.el.removeEventListener('focusout', this.onFocusout);
        document.removeEventListener('click', this.onDocumentClick);
        document.removeEventListener('expandbegin', this.onOtherExpand);
        document.removeEventListener('collapseend', this.onOtherCollapse);
        window.removeEventListener('hashchange', this.onHashChange);
        this.animation?.cancel();
    }

    /** Sync hidden, inert and aria-expanded with isExpanded. */
    private render(): void {
        this.el.hidden = !this.isExpanded;
        this.el.inert = !this.isExpanded;
        this.setExpandedState();
    }

    private setExpandedState(): void {
        for (const trigger of this.triggers) trigger.setAttribute('aria-expanded', String(this.isExpanded));
    }

    /** Animate height between two values (or finish straight away), then call `done`. */
    private run(height: [string, string], done: () => void): void {
        this.animation?.cancel();

        if (!this.options.animate || prefersReducedMotion()) {
            done();
            return;
        }

        this.el.style.overflow = 'hidden';
        const animation = this.el.animate(
            { height },
            { duration: this.options.animateDuration, easing: this.options.animateEasing }
        );
        this.animation = animation;

        animation.onfinish = () => {
            this.el.style.overflow = '';
            this.animation = null;
            done();
        };
        animation.oncancel = () => {
            this.el.style.overflow = '';
        };
    }

    private dispatch(type: DisclosureEvent): void {
        this.el.dispatchEvent(new Event(type, { bubbles: true }));
    }

    private onTriggerClick = (event: MouseEvent): void => {
        this.lastTrigger = event.currentTarget as HTMLElement;
        this.toggle();
    };

    /** Buttons get Enter and Space for free; other triggers need them added. */
    private onTriggerKeydown = (event: KeyboardEvent): void => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.lastTrigger = event.currentTarget as HTMLElement;
        this.toggle();
    };

    private onKeydown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape' || !this.options.collapseOnEscape || !this.isExpanded) return;

        this.collapse();
        (this.lastTrigger ?? this.triggers[0])?.focus();
        this.lastTrigger = null;

        if (!this.options.collapseAncestorsOnEscape) event.stopPropagation();
    };

    private onFocusout = (event: FocusEvent): void => {
        if (!(this.options.collapseOnFocusout && this.isExpanded)) return;
        const next = event.relatedTarget;
        if (!(next instanceof Node)) return;
        if (this.el.contains(next) || this.triggers.some((trigger) => trigger.contains(next))) return;
        this.collapse();
    };

    private onDocumentClick = (event: MouseEvent): void => {
        if (!(this.options.collapseOnFocusout && this.isExpanded)) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (this.el.contains(target) || this.triggers.some((trigger) => trigger.contains(target))) return;
        this.collapse();
    };

    private onOtherExpand = (event: Event): void => {
        const other = event.target;
        if (!this.isExpanded || other === this.el || !(other instanceof HTMLElement)) return;

        const sameGroup = this.options.group !== null && other.dataset.disclosureGroup === this.options.group;
        const listed = this.options.collapseOnOtherElementsExpand?.includes(other) ?? false;
        if (sameGroup || listed) this.collapse();
    };

    private onOtherCollapse = (event: Event): void => {
        const other = event.target;
        if (!this.options.collapseOnAncestorCollapse || other === this.el || !(other instanceof Node)) return;
        if (other.contains(this.el)) this.collapse();
    };

    private onHashChange = (): void => {
        if (window.location.hash === `#${this.el.id}`) this.expand();
    };
}

define('[data-disclosure]', (element) => new Disclosure(element));
