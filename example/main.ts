import './styles.css';
import '../js/animate';
import '../js/dialog';
import '../js/disclosure';
import '../components';

// Demo only: the colour scheme switcher in the header. One button cycles
// auto → light → dark; hidden without JS, where the OS setting applies.
type Scheme = 'auto' | 'light' | 'dark';
const next: Record<Scheme, Scheme> = { auto: 'light', light: 'dark', dark: 'auto' };
const labels: Record<Scheme, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

const toggle = document.querySelector<HTMLButtonElement>('[data-scheme-toggle]');
const label = toggle?.querySelector<HTMLElement>('[data-scheme-label]');
let current: Scheme = 'auto';

function setScheme(scheme: Scheme): void {
    current = scheme;
    if (scheme === 'auto') {
        delete document.documentElement.dataset.scheme;
    } else {
        document.documentElement.dataset.scheme = scheme;
    }
    if (label) label.textContent = labels[scheme];
}

if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => setScheme(next[current]));
}

// Demo only: copy the adopt prompt. Hidden without JS or the Clipboard API,
// where the text is still there to select.
const copyControls = document.querySelector<HTMLElement>('[data-copy-controls]');
const copyButton = copyControls?.querySelector<HTMLButtonElement>('[data-copy]');
const copyStatus = copyControls?.querySelector<HTMLElement>('[data-copy-status]');
const copySource = copyButton && document.getElementById(copyButton.dataset.copy ?? '');

if (copyControls && copyButton && copySource && navigator.clipboard) {
    copyControls.hidden = false;
    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(copySource.textContent ?? '');
            if (copyStatus) copyStatus.textContent = 'Copied';
        } catch {
            if (copyStatus) copyStatus.textContent = 'Couldn’t copy. Select the text instead.';
        }
    });
}
