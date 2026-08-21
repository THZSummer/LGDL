/**
 * LGDL core package entry point.
 */
export * from './types.js';
export { parseLgdl, validate } from './parser.js';
export { addNode, addEdge, removeNode, removeEdge, updateNode } from './mutations.js';
export type {
  AddNodeOptions,
  AddEdgeOptions,
  UpdateNodeOptions,
  MutationResult,
} from './mutations.js';
export { serializeLgdl } from './serialize.js';
