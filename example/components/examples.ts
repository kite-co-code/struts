/**
 * Demo only: read every components/{name}/example.html.
 *
 * An example file is an optional leading comment (the component's summary)
 * and one <template> per example:
 *
 *   <template data-example="Title" data-description="…" data-example-layout="page">…</template>
 *
 * data-example-layout="page" renders the example at the top of a long page,
 * for components that position themselves against the viewport. Otherwise
 * it's rendered on its own with some padding.
 */

export interface Example {
    title: string;
    description: string;
    layout: 'page' | 'padded';
    /** The template's source as written, dedented: what the page shows as code. */
    source: string;
    content: DocumentFragment;
}

export interface Component {
    /** The folder name */
    name: string;
    title: string;
    summary: string;
    files: string[];
    examples: Example[];
}

const sources = import.meta.glob<string>('../../components/*/example.html', {
    query: '?raw',
    import: 'default',
    eager: true,
});

// Keys only; nothing is loaded.
const allFiles = Object.keys(import.meta.glob('../../components/*/*.{css,ts,html}'));

/** "site-header" → "Site header" */
function toTitle(name: string): string {
    const words = name.replace(/-/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function dedent(text: string): string {
    const lines = text.replace(/^\s*\n|\n\s*$/g, '').split('\n');
    const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)?.[0].length ?? 0);
    const indent = Math.min(...indents);
    return lines.map((line) => line.slice(indent)).join('\n');
}

function parse(name: string, raw: string): Component {
    const holder = document.createElement('template');
    holder.innerHTML = raw;

    const first = [...holder.content.childNodes].find(
        (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()
    );
    const summary = first?.nodeType === Node.COMMENT_NODE ? (first.textContent ?? '').replace(/\s+/g, ' ').trim() : '';

    // The parsed templates give the attributes and content; the raw text gives the source as written.
    const templates = [...holder.content.children].filter(
        (element): element is HTMLTemplateElement =>
            element instanceof HTMLTemplateElement && element.hasAttribute('data-example')
    );
    const rawBodies = [...raw.matchAll(/<template\b[^>]*\bdata-example\b[^>]*>([\s\S]*?)<\/template>/g)];

    const examples = templates.map((template, index) => ({
        title: template.dataset.example || `Example ${index + 1}`,
        description: template.dataset.description ?? '',
        layout: template.dataset.exampleLayout === 'page' ? ('page' as const) : ('padded' as const),
        source: dedent(rawBodies[index]?.[1] ?? template.innerHTML),
        content: template.content,
    }));

    const files = allFiles
        .filter((path) => path.startsWith(`../../components/${name}/`))
        .map((path) => path.replace('../../', ''))
        .sort();

    return { name, title: toTitle(name), summary, files, examples };
}

export const components: Component[] = Object.entries(sources)
    .map(([path, raw]) => parse(path.split('/').at(-2) ?? path, raw))
    .sort((a, b) => a.name.localeCompare(b.name));

export function frameUrl(component: string, example: number): string {
    return `./frame.html?component=${encodeURIComponent(component)}&example=${example}`;
}
