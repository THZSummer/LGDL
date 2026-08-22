/**
 * LGDL -> JSON converter.
 *
 * Exports the semantic document as JSON — useful for programmatic
 * consumption, storage, or round-tripping through other tooling.
 */
import type { LgdlDocument } from './types.js';
import { registerConverter } from './converters.js';

function toJson(doc: LgdlDocument): string {
  return JSON.stringify(doc, null, 2);
}

// register side-effect
registerConverter('json', toJson);
