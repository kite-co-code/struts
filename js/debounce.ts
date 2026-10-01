/**
 * Delay calling `fn` until `wait` ms have passed without another call.
 *
 *   window.addEventListener('resize', debounce(measure, 150));
 */

export interface Debounced<A extends unknown[]> {
    (...args: A): void;
    /** Drop a pending call. */
    cancel(): void;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 100): Debounced<A> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const debounced = (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };

    debounced.cancel = () => clearTimeout(timer);

    return debounced;
}
