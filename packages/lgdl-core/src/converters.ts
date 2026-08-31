/**
 * LGDL output converter registry.
 *
 * Format converters turn an LgdlDocument into another textual format
 * (Mermaid, JSON, ...). Adding a new output format = register one
 * converter — the CLI never changes.
 */
import type { LgdlDocument } from './types.js';

export type Converter = (doc: LgdlDocument) => string;

const converters = new Map<string, Converter>();

/** Register a converter for an output format (e.g. 'mermaid'). */
export function registerConverter(format: string, fn: Converter): void {
  converters.set(format, fn);
}

/** List all registered output formats (for help / choices). */
export function listFormats(): string[] {
  return [...converters.keys()];
}

/** Convert a document to the given format; throws on unknown format. */
export function convert(doc: LgdlDocument, format: string): string {
  const fn = converters.get(format);
  if (!fn) {
    throw new Error(`Unknown output format: "${format}". Available: ${listFormats().join(', ')}`);
  }
  return fn(doc);
}
