/**
 * Minimal first-party cookie helpers. Names and values are URI-encoded, so
 * any string is safe to store.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Set a cookie for the whole site, lasting `days` days. */
export function setCookie(name: string, value: string, days: number): void {
    const parts = [
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        `expires=${new Date(Date.now() + days * DAY).toUTCString()}`,
        'path=/',
        'SameSite=Strict',
    ];
    if (location.protocol === 'https:') parts.push('Secure');

    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and not yet everywhere.
    document.cookie = parts.join('; ');
}

/** A cookie's value, or an empty string if it isn't set. */
export function getCookie(name: string): string {
    const key = `${encodeURIComponent(name)}=`;
    for (const part of document.cookie.split(';')) {
        const cookie = part.trim();
        if (cookie.startsWith(key)) return decodeURIComponent(cookie.slice(key.length));
    }
    return '';
}

export function deleteCookie(name: string): void {
    setCookie(name, '', -1);
}
