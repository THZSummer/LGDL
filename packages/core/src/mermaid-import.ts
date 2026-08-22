/**
 * Mermaid -> LGDL importer.
 *
 * Parses the Mermaid dialects that exportMermaid produces (flowchart,
 * sequence, mindmap, state, er, gantt) into an LgdlDocument so diagrams
 * can migrate into LGDL. Unsupported/unknown input yields parse issues
 * rather than throwing.
 */
import type { LgdlDocument, LgdlEdge, LgdlGroup, LgdlNode, LgdlIssue } from './types.js';

export interface MermaidImportResult {
  document: LgdlDocument;
  issues: LgdlIssue[];
  valid: boolean;
}

/** Extract a node id + optional label from a flowchart node line. */
function parseFlowNode(line: string): { id: string; label?: string; kind?: string } | null {
  const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*(.*)$/);
  if (!m) return null;
  const id = m[1];
  let rest = m[2].trim();
  let kind: string | undefined;
  let label: string | undefined;
  // diamond: {label}
  let dm = rest.match(/^\{(.*)\}$/);
  if (dm) {
    kind = 'decision';
    label = dm[1].replace(/"/g, '').trim();
    return { id, label, kind };
  }
  // bracketed: ["label"] or [label]
  dm = rest.match(/^\["?([^"]*)"?\]$/);
  if (dm) {
    label = dm[1].trim() || undefined;
    // heuristic: if id looks like a start/end word, mark kind
    if (/^(start|end)$/i.test(id)) kind = id.toLowerCase();
    return { id, label, kind };
  }
  // subgraph / plain node
  if (rest.startsWith('-->') || rest === '') {
    return { id };
  }
  return { id, label, kind };
}

/** Flowchart: nodes + edges. Also used for mindmap-flat fallback? no. */
function importFlowchart(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('flowchart') || line.startsWith('graph')) continue;
    // edge: A -->|"label"| B  or  A --> B
    const edgeMatch = line.match(/^([A-Za-z0-9_-]+)\s*-->\|?"?([^"|]*)"?\|?\s*([A-Za-z0-9_-]+)$/);
    if (edgeMatch) {
      const from = edgeMatch[1];
      const to = edgeMatch[3];
      const label = edgeMatch[2].trim() || undefined;
      if (!seen.has(from)) {
        nodes.push({ id: from });
        seen.add(from);
      }
      if (!seen.has(to)) {
        nodes.push({ id: to });
        seen.add(to);
      }
      edges.push({ from, to, label });
      continue;
    }
    // plain node declaration
    const node = parseFlowNode(line);
    if (node && !seen.has(node.id)) {
      nodes.push({ id: node.id, ...(node.label ? { label: node.label } : {}), ...(node.kind ? { kind: node.kind as LgdlNode['kind'] } : {}) });
      seen.add(node.id);
    } else if (node && seen.has(node.id) && node.label) {
      // update label if first seen via edge
      const n = nodes.find((x) => x.id === node.id);
      if (n && !n.label) n.label = node.label;
    }
  }

  return {
    type: 'flowchart',
    nodes,
    edges,
    groups: [],
    ...(issues.length > 0 ? {} : {}),
  };
}

/** Sequence diagram: participants + messages. */
function importSequence(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  const ensure = (id: string, label?: string) => {
    if (!seen.has(id)) {
      nodes.push({ id, ...(label ? { label } : {}) });
      seen.add(id);
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('sequenceDiagram')) continue;
    const pm = line.match(/^participant\s+([A-Za-z0-9_-]+)(?:\s+as\s+(.+))?$/);
    if (pm) {
      ensure(pm[1], pm[2]?.trim());
      continue;
    }
    const mm = line.match(/^([A-Za-z0-9_-]+)\s*-+>>\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (mm) {
      ensure(mm[1]);
      ensure(mm[2]);
      edges.push({ from: mm[1], to: mm[2], label: mm[3].trim() || undefined });
      continue;
    }
  }

  return { type: 'sequence', nodes, edges, groups: [] };
}

/** Mindmap: indented tree -> nodes + edges. */
function importMindmap(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  const stack: { id: string; depth: number }[] = [];

  const ensure = (label: string): string => {
    let id = label.replace(/[^A-Za-z0-9_-]/g, '_');
    if (!id) id = 'node' + nodes.length;
    // dedupe
    let uid = id;
    let n = 1;
    while (seen.has(uid)) uid = `${id}_${n++}`;
    seen.add(uid);
    nodes.push({ id: uid, label });
    return uid;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (!line.trim() || line.trim().startsWith('mindmap')) continue;
    const depth = line.length - line.trimStart().length;
    const label = line.trim().replace(/^[-*]\s*/, '');
    if (!label) continue;
    const id = ensure(label);
    // pop deeper stack entries
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length > 0) {
      edges.push({ from: stack[stack.length - 1].id, to: id });
    }
    stack.push({ id, depth });
  }

  return { type: 'mindmap', nodes, edges, groups: [] };
}

/** State diagram: A --> B or A --> B: label; terminals as [name]. */
function importState(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const idByLabel = new Map<string, string>(); // label -> node id (reuse)
  const ensure = (token: string, terminal: boolean): string => {
    const label = token.replace(/^\[|\]$/g, '').trim();
    // reuse existing node by label
    const existing = idByLabel.get(label);
    if (existing) return existing;
    let id = label.replace(/[^A-Za-z0-9_-]/g, '_');
    if (!id) id = 'state' + nodes.length;
    // dedupe id collisions with different labels
    let uid = id;
    let n = 1;
    while (nodes.some((x) => x.id === uid)) uid = `${id}_${n++}`;
    nodes.push({ id: uid, label, ...(terminal ? { kind: 'end' as const } : { kind: 'state' as const }) });
    idByLabel.set(label, uid);
    return uid;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('stateDiagram')) continue;
    // A --> B  or  A --> B: label  (B may be [terminal])
    const m = line.match(/^(.+?)\s*-->\s*(.+?)(?::\s*(.*))?$/);
    if (m) {
      const fromTok = m[1].trim();
      const toTok = m[2].trim();
      const label = m[3]?.trim();
      const from = ensure(fromTok, /^\[.*\]$/.test(fromTok));
      const to = ensure(toTok, /^\[.*\]$/.test(toTok));
      edges.push({ from, to, ...(label ? { label } : {}) });
    }
  }

  return { type: 'state', nodes, edges, groups: [] };
}

/** ER diagram: entities with attributes + relationships. */
function importEr(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  let current: string | null = null;
  const attrs = new Map<string, string[]>();
  const idByEntity = new Map<string, string>(); // entity name -> legal id

  const ensure = (name: string): string => {
    const existing = idByEntity.get(name);
    if (existing) return existing;
    // entity names may be CJK — LGDL ids must be [A-Za-z0-9_-]
    let base = name.replace(/[^A-Za-z0-9_-]/g, '');
    if (!base) base = 'entity';
    let id = base;
    let n = 1;
    while (nodes.some((x) => x.id === id)) id = `${base}_${n++}`;
    idByEntity.set(name, id);
    nodes.push({ id, label: name, kind: 'entity' });
    attrs.set(id, []);
    return id;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('erDiagram')) continue;
    // entity block: Name {
    const open = line.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s*\{\s*$/);
    if (open) {
      current = ensure(open[1]);
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    // attribute inside entity: type name
    if (current) {
      const am = line.match(/^([A-Za-z_]+)\s+([A-Za-z0-9_]+)$/);
      if (am) {
        attrs.get(current)?.push(`${am[2]} ${am[1]}`);
      }
      continue;
    }
    // relationship: A ||--o{ B : label  (connector = left -- right, no spaces)
    const rm = line.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s+(\|\||o\{|o\||\|\{)(?:--)(\|\||o\{|o\||\|\{)\s+([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)(?:\s*:\s*(.+))?$/);
    if (rm) {
      const a = ensure(rm[1]);
      const b = ensure(rm[4]);
      const label = rm[5]?.trim();
      // cardinality from connectors: || = 1, o{ = many, o| = zero-or-one
      const left = rm[2];
      const right = rm[3];
      const leftCard = left === '||' ? '1' : left === 'o|' ? '0..1' : '0..*';
      const rightCard = right === '||' ? '1' : right === 'o|' ? '0..1' : '0..*';
      edges.push({
        from: a,
        to: b,
        ...(label ? { label } : {}),
        cardinalityFrom: leftCard,
        cardinalityTo: rightCard,
      });
    }
  }

  // apply collected attributes to the structured members field
  for (const n of nodes) {
    const mem = attrs.get(n.id) ?? [];
    if (mem.length > 0) {
      n.members = mem.map((line) => {
        const [name, type] = line.split(' ');
        return { kind: 'attribute', name, ...(type ? { type } : {}) };
      });
    }
  }

  return { type: 'er', nodes, edges, groups: [] };
}

/** Gantt: sections + tasks. */
function importGantt(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const groups: LgdlGroup[] = [];
  const seen = new Set<string>();
  let currentSection: string | null = null;
  const sectionIds = new Map<string, string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('gantt') || line.startsWith('dateFormat') || line.startsWith('axisFormat')) continue;
    const sm = line.match(/^section\s+(.+)$/);
    if (sm) {
      const name = sm[1].trim();
      const gid = 'sec' + (sectionIds.size + 1);
      sectionIds.set(name, gid);
      groups.push({ id: gid, label: name, contains: [] });
      currentSection = name;
      continue;
    }
    // task: label : id, date, dur
    const tm = line.match(/^(.+?)\s*:\s*([A-Za-z0-9_-]+)\s*,\s*([\d-]+)\s*,\s*(\d+)d$/);
    if (tm) {
      const label = tm[1].trim();
      const id = tm[2];
      const startDate = tm[3];
      const dur = parseInt(tm[4], 10);
      if (seen.has(id)) {
        issues.push({ severity: 'warning', message: `Duplicate gantt task id: "${id}"`, location: `gantt` });
        continue;
      }
      seen.add(id);
      // days since 2026-01-01
      const base = new Date('2026-01-01T00:00:00Z');
      const start = new Date(startDate + 'T00:00:00Z');
      const dayOffset = Math.round((start.getTime() - base.getTime()) / 86400000);
      nodes.push({ id, label, attrs: { start: Math.max(0, dayOffset), duration: dur } });
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
  }

  return { type: 'gantt', nodes, edges, groups };
}

/** Parse Mermaid text into an LGDL document. */
export function importMermaid(source: string): MermaidImportResult {
  const lines = source.split(/\r?\n/);
  const issues: LgdlIssue[] = [];
  const first = lines.find((l) => l.trim() && !l.trim().startsWith('%%'))?.trim() ?? '';
  const trimmed = first.replace(/[{}\[\]"]/g, '').trim();

  let doc: LgdlDocument;
  if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
    doc = importFlowchart(lines, issues);
  } else if (trimmed.startsWith('sequenceDiagram')) {
    doc = importSequence(lines, issues);
  } else if (trimmed.startsWith('mindmap')) {
    doc = importMindmap(lines, issues);
  } else if (trimmed.startsWith('stateDiagram')) {
    doc = importState(lines, issues);
  } else if (trimmed.startsWith('erDiagram')) {
    doc = importEr(lines, issues);
  } else if (trimmed.startsWith('gantt')) {
    doc = importGantt(lines, issues);
  } else {
    issues.push({
      severity: 'error',
      message: `Unsupported Mermaid diagram type: "${trimmed || 'empty'}". Supported: flowchart, sequenceDiagram, mindmap, stateDiagram-v2, erDiagram, gantt`,
      location: 'mermaid',
    });
    return { document: { type: 'flowchart', nodes: [], edges: [], groups: [] }, issues, valid: false };
  }

  return { document: doc, issues, valid: issues.every((i) => i.severity !== 'error') };
}
