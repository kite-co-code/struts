/**
 * dynamicElements: run setup code for every element matching a selector, now
 * and whenever one is added later. Like customElements.define(), but for any
 * markup.
 *
 *   import { define } from './dynamic-elements';
 *   define('[data-disclosure]', (el) => new Disclosure(el));
 *
 * - Elements already in the DOM are set up on DOMContentLoaded (or straight
 *   away if that has passed).
 * - A MutationObserver sets up elements added later, checking each added node
 *   and its descendants.
 * - Each element is set up once per selector, so one element can match several.
 * - `disconnected` runs when a set-up element leaves the DOM (not when it's
 *   moved), and the element is set up again if it comes back.
 */

export interface DefineOptions<E extends Element> {
    /** Set up matching elements already in the DOM. Default true. */
    loadOnReady?: boolean;
    /** Set up matching elements added later. Default true. */
    watch?: boolean;
    /** Runs when a set-up element is removed from the DOM. */
    disconnected?: (element: E) => void;
}

interface Definition {
    connected: (element: Element) => void;
    disconnected?: (element: Element) => void;
    watch: boolean;
    /** Elements this selector has set up. Keyed per selector, so a string can be the key. */
    initialised: WeakSet<Element>;
    /** Strong refs for disconnect tracking; only kept when there's a disconnected callback. */
    live: Set<Element>;
}

const registry = new Map<string, Definition>();
let observer: MutationObserver | null = null;

/** The node itself, if it matches, followed by its matching descendants. */
function matching(node: Element, selector: string): Element[] {
    const found = [...node.querySelectorAll(selector)];
    return node.matches(selector) ? [node, ...found] : found;
}

function connect(element: Element, definition: Definition): void {
    if (definition.initialised.has(element)) return;
    definition.initialised.add(element);
    if (definition.disconnected) definition.live.add(element);
    definition.connected(element);
}

function handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            for (const [selector, definition] of registry) {
                if (!definition.watch) continue;
                for (const element of matching(node, selector)) connect(element, definition);
            }
        }

        if (mutation.removedNodes.length === 0) continue;
        for (const definition of registry.values()) {
            if (!definition.disconnected) continue;
            for (const element of definition.live) {
                // Moved nodes are connected again by the time this runs.
                if (element.isConnected) continue;
                definition.live.delete(element);
                definition.initialised.delete(element);
                definition.disconnected(element);
            }
        }
    }
}

function observe(): void {
    if (observer) return;
    observer = new MutationObserver(handleMutations);
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

function whenReady(callback: () => void): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

export function define<E extends Element = HTMLElement>(
    selector: string,
    connected: (element: E) => void,
    options: DefineOptions<E> = {}
): void {
    const { loadOnReady = true, watch = true, disconnected } = options;

    if (registry.has(selector)) {
        throw new Error(`dynamicElements: "${selector}" is already defined`);
    }

    const definition: Definition = {
        connected: connected as (element: Element) => void,
        disconnected: disconnected as ((element: Element) => void) | undefined,
        watch,
        initialised: new WeakSet(),
        live: new Set(),
    };
    registry.set(selector, definition);

    if (loadOnReady) {
        whenReady(() => {
            for (const element of document.querySelectorAll(selector)) connect(element, definition);
        });
    }

    if (watch || disconnected) observe();
}

export default { define };
