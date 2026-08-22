const converters = new Map();
/** Register a converter for an output format (e.g. 'mermaid'). */
export function registerConverter(format, fn) {
    converters.set(format, fn);
}
/** List all registered output formats (for help / choices). */
export function listFormats() {
    return [...converters.keys()];
}
/** Convert a document to the given format; throws on unknown format. */
export function convert(doc, format) {
    const fn = converters.get(format);
    if (!fn) {
        throw new Error(`Unknown output format: "${format}". Available: ${listFormats().join(', ')}`);
    }
    return fn(doc);
}
