/**
 * Read a boolean data attribute. Present means true (whatever the value),
 * except an explicit "false". Missing means the default.
 *
 *   <div data-animate>                → true
 *   <div data-animate="false">        → false
 *   <div>                             → defaultValue
 *
 * @param name - The dataset key, e.g. "disclosureAnimate" for data-disclosure-animate.
 */
export function getBooleanDataAttribute(element: HTMLElement, name: string, defaultValue = false): boolean {
    const value = element.dataset[name];
    if (value === undefined) return defaultValue;
    return value !== 'false';
}

/** Read a numeric data attribute, or the default if it's missing or not a number. */
export function getNumberDataAttribute(element: HTMLElement, name: string, defaultValue: number): number {
    const value = Number.parseFloat(element.dataset[name] ?? '');
    return Number.isFinite(value) ? value : defaultValue;
}
