/**
 * Dialog: extras on top of native <dialog>.
 *
 *   <button commandfor="signup" command="show-modal">Sign up</button>
 *   <button data-dialog-open="signup" data-dialog-template="signup-form">Sign up</button>
 *
 *   <dialog id="signup" data-dialog aria-labelledby="signup-title">
 *       <h2 id="signup-title">Sign up</h2>
 *       <div data-dialog-slot></div>
 *       <button commandfor="signup" command="close">Close</button>
 *   </dialog>
 *
 *   <template id="signup-form">…</template>
 *
 * Opening:
 * - Invoker commands (commandfor + command="show-modal" | "close" | "request-close")
 *   work natively where supported; this adds them where they aren't.
 * - data-dialog-open="id" and data-dialog-close="id" work anywhere on the page,
 *   and a bare data-dialog-close works inside the dialog.
 *
 * Content: an opener (or the dialog) with data-dialog-template="template-id" has
 * that <template> cloned into [data-dialog-slot] on open. The slot is emptied once
 * the dialog has closed and finished animating, which also stops embedded media.
 *
 * Other data attributes on the dialog:
 *   data-dialog-modal="false"           open with show() instead of showModal()
 *   data-dialog-backdrop-close="false"  don't close on a backdrop click
 *
 * Scroll locking is CSS (css/utilities/scroll-lock.css). Native <dialog> handles
 * focus trapping, Escape and returning focus to the opener.
 */

import { getBooleanDataAttribute } from './data-attributes';
import { define } from './dynamic-elements';

export interface DialogOptions {
    modal: boolean;
    backdropClose: boolean;
}

/** The parts of CommandEvent this uses, so older DOM typings still compile. */
interface CommandEventLike extends Event {
    command: string;
    source: Element | null;
}

const supportsCommands = typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

export default class Dialog {
    readonly el: HTMLDialogElement;
    options: DialogOptions;

    private slot: HTMLElement | null;

    constructor(element: HTMLDialogElement, options: Partial<DialogOptions> = {}) {
        this.el = element;
        this.options = {
            modal: getBooleanDataAttribute(element, 'dialogModal', true),
            backdropClose: getBooleanDataAttribute(element, 'dialogBackdropClose', true),
            ...options,
        };
        this.slot = element.querySelector('[data-dialog-slot]');

        if (!element.id) {
            console.warn('Dialog: the dialog needs an id for its openers to find it', element);
        }

        document.addEventListener('click', this.onDocumentClick);
        element.addEventListener('click', this.onDialogClick);
        element.addEventListener('command', this.onCommand);
        element.addEventListener('close', this.onClose);
    }

    open(source?: Element | null): void {
        this.fill(source);
        if (this.el.open) return;
        if (this.options.modal) {
            this.el.showModal();
        } else {
            this.el.show();
        }
    }

    close(): void {
        this.el.close();
    }

    destroy(): void {
        document.removeEventListener('click', this.onDocumentClick);
        this.el.removeEventListener('click', this.onDialogClick);
        this.el.removeEventListener('command', this.onCommand);
        this.el.removeEventListener('close', this.onClose);
    }

    /** Clone the opener's (or the dialog's) template into the slot. */
    private fill(source?: Element | null): void {
        if (!this.slot) return;

        const templateId =
            (source instanceof HTMLElement ? source.dataset.dialogTemplate : undefined) ??
            this.el.dataset.dialogTemplate;
        if (!templateId) return;

        const template = document.getElementById(templateId);
        if (template instanceof HTMLTemplateElement) {
            this.slot.replaceChildren(template.content.cloneNode(true));
        }
    }

    /** Native commands fire this before acting; fill the slot first. */
    private onCommand = (event: Event): void => {
        const { command, source } = event as CommandEventLike;
        if (command === 'show-modal') this.fill(source);
    };

    private onDocumentClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element && this.el.id)) return;
        const id = this.el.id;

        const opener = event.target.closest(`[data-dialog-open="${CSS.escape(id)}"]`);
        if (opener) {
            event.preventDefault();
            this.open(opener);
            return;
        }

        const closer = event.target.closest(`[data-dialog-close="${CSS.escape(id)}"]`);
        if (closer) {
            this.close();
            return;
        }

        // Invoker command fallback for browsers without commandfor.
        if (supportsCommands) return;
        const invoker = event.target.closest(`[commandfor="${CSS.escape(id)}"]`);
        if (!invoker) return;

        const command = invoker.getAttribute('command');
        if (command === 'show-modal') this.open(invoker);
        if (command === 'close' || command === 'request-close') this.close();
    };

    private onDialogClick = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        // A bare data-dialog-close inside the dialog closes it.
        const closer = target.closest('[data-dialog-close]');
        if (closer && !closer.getAttribute('data-dialog-close') && this.el.contains(closer)) {
            this.close();
            return;
        }

        // Clicks on the backdrop land on the dialog itself, outside its box.
        if (!this.options.backdropClose || target !== this.el || !this.options.modal) return;
        const box = this.el.getBoundingClientRect();
        const inside =
            event.clientX >= box.left &&
            event.clientX <= box.right &&
            event.clientY >= box.top &&
            event.clientY <= box.bottom;
        if (!inside) this.close();
    };

    private onClose = async (): Promise<void> => {
        if (!this.slot) return;
        await Promise.allSettled(this.el.getAnimations({ subtree: true }).map((animation) => animation.finished));
        if (!this.el.open) this.slot.replaceChildren();
    };
}

define<HTMLDialogElement>('dialog[data-dialog]', (element) => new Dialog(element));
