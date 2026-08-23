/**
 * LGDL core package entry point.
 */
export * from './types.js';
export { parseLgdl, validate } from './parser.js';
export {
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  updateGroup,
} from './mutations.js';
export type {
  AddNodeOptions,
  AddEdgeOptions,
  UpdateNodeOptions,
  UpdateEdgeOptions,
  AddGroupOptions,
  UpdateGroupOptions,
  MutationResult,
} from './mutations.js';
export { serializeLgdl } from './serialize.js';
export {
  applyOperation,
  applyOperations,
  describeOperation,
} from './operations.js';
export type { LgdlOperation, OperationBatchResult } from './operations.js';
export { parseCliCommand, parseCommandBatch, tokenize } from './cli-parser.js';
export type { ParsedCommand, ParsedBatch } from './cli-parser.js';
export { formatStatus } from './status.js';
export { exportMermaid } from './mermaid.js';
import './plantuml.js'; // registers the plantuml converter (side-effect)
import './json.js'; // registers the json converter (side-effect)
export { registerConverter, convert, listFormats } from './converters.js';
export type { Converter } from './converters.js';
export { importMermaid } from './mermaid-import.js';
export type { MermaidImportResult } from './mermaid-import.js';
