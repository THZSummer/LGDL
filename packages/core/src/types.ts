/**
 * LGDL core type definitions.
 * LGDL describes ONLY semantics (nodes, edges, groups) — never layout.
 */

/** Supported diagram types */
export type DiagramType =
  | 'flowchart'
  | 'mindmap'
  | 'uml-class'
  | 'arch'
  | 'datastream'
  | 'sequence'
  | 'er'
  | 'state'
  | 'gantt';

/** Semantic role of a node; shapes are mapped by the renderer */
export type NodeKind =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'entity'
  | 'note'
  | 'state'
  | 'milestone';

/**
 * Extension attributes — the "escape hatch" for diagram-specific fields
 * (e.g. gantt start/duration, ER cardinality). Never breaks the core model:
 * unknown keys are preserved verbatim by the parser and serializer.
 */
export type LgdlAttrs = Record<string, unknown>;

export interface LgdlNode {
  /** Unique identifier (letters, digits, underscore, hyphen) */
  id: string;
  /** Display text; defaults to id */
  label?: string;
  /** Semantic kind; defaults to 'process' */
  kind?: NodeKind;
  /** Diagram-specific extension attributes */
  attrs?: LgdlAttrs;
}

export interface LgdlEdge {
  /** Source node id — or group id for aggregate edges */
  from: string;
  /** Target node id — or group id for aggregate edges */
  to: string;
  /** Optional edge label */
  label?: string;
  /** Diagram-specific extension attributes (e.g. ER cardinality) */
  attrs?: LgdlAttrs;
}

export interface LgdlGroup {
  id: string;
  label?: string;
  /** Member ids contained in this group — node ids and/or nested group ids */
  contains: string[];
  /** Diagram-specific extension attributes */
  attrs?: LgdlAttrs;
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
