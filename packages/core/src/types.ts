/**
 * LGDL core type definitions.
 * LGDL describes ONLY semantics, unified into two first-class concepts:
 *   - node  (a box/shape, including `kind: 'group'` container nodes)
 *   - edge  (a directed relationship between two nodes)
 * `group` is NOT a separate field — it is a special node kind. A group node
 * carries `contains` (its member node/group ids) and participates in layering
 * exactly like any node, so the layout engine never has to special-case groups.
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

/** All supported diagram types (single source of truth for tooling). */
export const DIAGRAM_TYPES: readonly DiagramType[] = [
  'flowchart',
  'mindmap',
  'uml-class',
  'arch',
  'datastream',
  'sequence',
  'er',
  'state',
  'gantt',
];

/** Human-readable (Chinese) labels per diagram type. */
export const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: '流程图',
  mindmap: '思维导图',
  'uml-class': '类图',
  arch: '架构图',
  datastream: '数据流图',
  sequence: '时序图',
  er: '实体关系图',
  state: '状态图',
  gantt: '甘特图',
};

/** Semantic role of a node; shapes are mapped by the renderer. `group` is a
 * container node that holds other node ids via `contains`. */
export type NodeKind =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'entity'
  | 'note'
  | 'state'
  | 'milestone'
  | 'group';

/** All node kinds (single source of truth for tooling). */
export const NODE_KINDS: readonly NodeKind[] = [
  'start',
  'end',
  'process',
  'decision',
  'entity',
  'note',
  'state',
  'milestone',
  'group',
];

/** Human-readable (Chinese) labels per node kind. */
export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  start: '开始',
  end: '结束',
  process: '处理',
  decision: '判断',
  entity: '实体',
  note: '便签',
  state: '状态',
  milestone: '里程碑',
  group: '分组',
};

/** Kind of a class member (uml-class `entity` nodes) */
export type MemberKind = 'attribute' | 'method';

/**
 * UML visibility. The explicit enum replaces the in-string `+`/`-`/`#`
 * convention — the renderer never has to parse markers out of text.
 *   public (+), private (-), protected (#), package (~)
 */
export type MemberVisibility = 'public' | 'private' | 'protected' | 'package';

/**
 * A structured class member (attribute or method) for uml-class `entity`
 * nodes. Every field is explicit — nothing is inferred from the label.
 */
export interface LgdlMember {
  /** attribute | method — explicit, never guessed from '(' */
  kind: MemberKind;
  /** Member name (required) */
  name: string;
  /** UML visibility marker */
  visibility?: MemberVisibility;
  /** Attribute data type, or method return type */
  type?: string;
  /** Method parameter list, e.g. "(items: list)"; attributes must not set it */
  params?: string;
}

/** UML visibility → display symbol. Single source shared by layout + renderers. */
export const VIS_SYMBOL: Record<MemberVisibility, string> = {
  public: '+',
  private: '-',
  protected: '#',
  package: '~',
};

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
  /** Semantic kind; defaults to 'process'. `group` marks a container node. */
  kind?: NodeKind;
  /**
   * Structured class members — only valid on `kind: entity` nodes in
   * `uml-class` diagrams. Other kinds/types are rejected by the validator.
   */
  members?: LgdlMember[];
  /**
   * Member ids contained in this group node (node ids and/or other group ids).
   * Only meaningful when `kind === 'group'`; ignored otherwise.
   */
  contains?: string[];
  /** Diagram-specific extension attributes */
  attrs?: LgdlAttrs;
}

export interface LgdlEdge {
  /** Source node id — or group id for aggregate edges */
  from: string;
  /** Target node id — or group id for aggregate edges */
  to: string;
  /** Relationship name (pure business semantics — no cardinality mixed in) */
  label?: string;
  /**
   * ER / UML multiplicity at the source end, e.g. "1", "*", "0..1".
   * Explicit fields — the renderer never parses cardinality out of the label.
   */
  cardinalityFrom?: string;
  /** ER / UML multiplicity at the target end, e.g. "1", "*", "0..*". */
  cardinalityTo?: string;
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

/** The parsed LGDL document — semantics only, no layout fields.
 *
 * The model is UNIFIED: a group is a node with `kind === 'group'` carrying
 * `contains`. There is no separate group list on the document; consumers derive
 * the group container list from `nodes` (e.g. via the `deriveGroups` helper).
 */
export interface LgdlDocument {
  title?: string;
  type: DiagramType;
  nodes: LgdlNode[];
  edges: LgdlEdge[];
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
