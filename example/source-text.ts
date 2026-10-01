/**
 * Demo only: turn source files into text for the docs pages. Shared by the
 * docs build plugin (Node) and the components page (browser).
 */

/** Strip the indent common to every line, and blank lines at either end. */
export function dedent(text: string): string {
    const lines = text.replace(/^\s*\n|\s+$/g, '').split('\n');
    const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)?.[0].length ?? 0);
    const indent = Math.min(...indents);
    return lines.map((line) => line.slice(indent)).join('\n');
}

/** A file's leading comment, without its delimiters, rules and gutter stars: the file's API. */
export function headerComment(source: string): string {
    const match = source.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
    if (!match?.[1]) return '';
    const lines = match[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\* ?/, '').trimEnd())
        .filter((line) => !/^\s*-+\s*$/.test(line));
    return dedent(lines.join('\n'));
}
