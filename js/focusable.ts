/**
 * Keyboard-focusable elements inside a container, in DOM order. Skips
 * disabled, inert and hidden elements (checkVisibility covers display: none,
 * content-visibility and ancestors).
 */

const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    'iframe',
    'object',
    'embed',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]',
].join(', ');

export function focusableElements(container: ParentNode = document): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) =>
            element.tabIndex > -1 &&
            !element.matches(':disabled') &&
            !element.closest('[inert]') &&
            element.checkVisibility({ visibilityProperty: true })
    );
}

export function firstFocusable(container: ParentNode = document): HTMLElement | undefined {
    return focusableElements(container)[0];
}

export function lastFocusable(container: ParentNode = document): HTMLElement | undefined {
    return focusableElements(container).at(-1);
}
