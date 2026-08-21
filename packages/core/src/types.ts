/**
 * LGDL core type definitions.
 * The DSL describes ONLY semantics (nodes, edges, groups) — never layout.
 */

/** Supported diagram types */
export type DiagramType =
  | 'flowchart'
  | 'mindmap'
  | 'uml-class'
  | 'arch'
  | 'datastream'
  | 'sequence';

/** Semantic role of a node; shapes are mapped by the renderer */
export type NodeKind =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'entity'
  | 'note';

export interface LgdlNode {
  /** Unique identifier (letters, digits, underscore) */
  id: string;
  /** Display text; defaults to id */
  label?: string;
  /** Semantic kind; defaults to 'process' */
  kind?: NodeKind;
}

export interface LgdlEdge {
  /** Source node id */
  from: string;
  /** Target node id */
  to: string;
  /** Optional edge label */
  label?: string;
}

export interface LgdlGroup {
  id: string;
  label?: string;
  /** Node ids contained in this group */
  contains: string[];
}

export interface LgdlMeta {
  [key: string]: unknown;
}

/** The parsed LGDL document — semantics only, no layout fields */
export interface LgdlDocument {
  title?: string;
  type: DiagramType;
  nodes: LgdlNode[];
  edges: LgdlEdge[];
  groups: LgdlGroup[];
  meta?: LgdlMeta;
}

/** Validation issue with severity */
export interface LgdlIssue {
  severity: 'error' | 'warning';
  message: string;
  /** Path-like location, e.g. "nodes[3].id" */
  location?: string;
}

export interface ParseResult {
  document: LgdlDocument;
  issues: LgdlIssue[];
  valid: boolean;
}
