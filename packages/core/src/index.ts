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
} from './mutations.js';
export type {
  AddNodeOptions,
  AddEdgeOptions,
  UpdateNodeOptions,
  UpdateEdgeOptions,
  AddGroupOptions,
  MutationResult,
} from './mutations.js';
export { serializeLgdl } from './serialize.js';
export { exportMermaid } from './mermaid.js';
export { importMermaid } from './mermaid-import.js';
export type { MermaidImportResult } from './mermaid-import.js';
