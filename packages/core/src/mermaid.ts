/**
 * LGDL -> Mermaid exporter.
 *
 * Maps each LGDL diagram type to Mermaid syntax so diagrams can be
 * pasted into Mermaid Live Editor / rendered by mermaid.js.
 * Supported: flowchart, mindmap, sequence, er, state, gantt.
 * Others (uml-class, arch, datastream) fall back to flowchart-style output.
 */
import type { LgdlDocument } from './types.js';
import { registerConverter } from './converters.js';

/** Escape text for use inside a Mermaid node label (double quotes). */
function label(s: string | undefined, fallback = ''): string {
  const text = (s ?? fallback).replace(/"/g, '&quot;').replace(/\n/g, ' ');
  return text;
}

/** Escape text for edge labels / messages. */
function edgeLabel(s: string | undefined): string {
  return (s ?? '').replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

/** Sanitize an id for Mermaid (ids must be alphanumeric + _ -). */
function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

/** Flowchart (also used as fallback for uml-class / arch / datastream). */
function mermaidFlowchart(doc: LgdlDocument): string {
  const lines: string[] = ['flowchart TD'];
  for (const n of doc.nodes) {
    const shape = n.kind === 'decision' ? `{${label(n.label, n.id)}}` : `["${label(n.label, n.id)}"]`;
    lines.push(`    ${safeId(n.id)}${shape}`);
  }
  for (const e of doc.edges) {
    const lbl = e.label;
    if (lbl) {
      lines.push(`    ${safeId(e.from)} -->|"${edgeLabel(lbl)}"| ${safeId(e.to)}`);
    } else {
      lines.push(`    ${safeId(e.from)} --> ${safeId(e.to)}`);
    }
  }
  return lines.join('\n');
}

/** Mindmap: root + indented branches. */
function mermaidMindmap(doc: LgdlDocument): string {
  const lines: string[] = ['mindmap'];
  // build children map, find root (no incoming edges)
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of doc.nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of doc.edges) {
    children.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const root = doc.nodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id ?? doc.nodes[0]?.id;
  if (!root) return 'mindmap';

  const walk = (id: string, depth: number) => {
    const node = doc.nodes.find((n) => n.id === id);
    const indent = '  '.repeat(depth + 1);
    lines.push(`${indent}${label(node?.label, id)}`);
    for (const c of children.get(id) ?? []) walk(c, depth + 1);
  };
  lines.push(`  ${label(doc.nodes.find((n) => n.id === root)?.label, root)}`);
  for (const c of children.get(root) ?? []) walk(c, 1);
  return lines.join('\n');
}

/** Sequence diagram: participants + messages. */
function mermaidSequence(doc: LgdlDocument): string {
  const lines: string[] = ['sequenceDiagram'];
  for (const n of doc.nodes) {
    lines.push(`    participant ${safeId(n.id)} as ${label(n.label, n.id)}`);
  }
  for (const e of doc.edges) {
    lines.push(`    ${safeId(e.from)}->>${safeId(e.to)}: ${edgeLabel(e.label)}`);
  }
  return lines.join('\n');
}

/** ER diagram: entities + relationships with cardinality from attrs. */
function mermaidEr(doc: LgdlDocument): string {
  const lines: string[] = ['erDiagram'];
  // entity display name: first token of label, or the id itself (kept as-is
  // so CJK labels render; Mermaid allows non-ASCII entity names)
  const entityName = (id: string): string => {
    const n = doc.nodes.find((x) => x.id === id);
    const first = (n?.label ?? '').split(/[\s\n]/)[0] || id;
    return first || id;
  };
  const emitted = new Set<string>();
  for (const n of doc.nodes) {
    const name = entityName(n.id);
    if (emitted.has(name)) continue;
    emitted.add(name);
    lines.push(`    ${name} {`);
    const parts = (n.label ?? '').split('\n').slice(1);
    for (const p of parts) {
      const m = p.match(/^\s*[+-]?\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+([A-Za-z_]+))?/);
      if (m) {
        const attr = m[1] ?? 'attr';
        const type = m[2] ?? 'string';
        lines.push(`        ${type} ${attr}`);
      }
    }
    lines.push(`    }`);
  }
  for (const e of doc.edges) {
    const a = entityName(e.from);
    const b = entityName(e.to);
    const card = (e.attrs?.cardinality as string) ?? '1..*';
    const leftCard = card.split('..')[0]?.trim() || '1';
    const rightCard = card.split('..')[1]?.trim() || '*';
    // mermaid er: A ||--o{ B  (left cardinality, right cardinality)
    // cardinality is expressed by the connector; the label must be a
    // simple word (dots like '1..*' are not allowed in relation labels)
    const left = leftCard === '1' ? '||' : '}o';
    const right = rightCard === '1' ? '||' : rightCard === '*' ? 'o{' : 'o{';
    const relLabel = (e.label ?? '').split(/[\s.]+/)[0] || 'relates';
    lines.push(`    ${a} ${left}--${right} ${b} : ${relLabel}`);
  }
  return lines.join('\n');
}

/** State diagram. */
function mermaidState(doc: LgdlDocument): string {
  const lines: string[] = ['stateDiagram-v2'];
  const isTerminal = (id: string) => doc.nodes.find((n) => n.id === id)?.kind === 'end';
  for (const e of doc.edges) {
    const from = isTerminal(e.from) ? `[${label(doc.nodes.find((n) => n.id === e.from)?.label, e.from)}]` : safeId(e.from);
    const to = isTerminal(e.to) ? `[${label(doc.nodes.find((n) => n.id === e.to)?.label, e.to)}]` : safeId(e.to);
    lines.push(`    ${from} --> ${to}${e.label ? `: ${edgeLabel(e.label)}` : ''}`);
  }
  return lines.join('\n');
}

/** Gantt chart: tasks with attrs.start / attrs.duration. */
function mermaidGantt(doc: LgdlDocument): string {
  const lines: string[] = ['gantt', '    dateFormat YYYY-MM-DD', '    axisFormat %d'];
  // group tasks by group (sections); ungrouped tasks go to a default section
  const sections = new Map<string, string[]>();
  const defaultSec: string[] = [];
  for (const n of doc.nodes) {
    const g = doc.groups.find((gr) => gr.contains.includes(n.id));
    if (g) {
      if (!sections.has(g.id)) sections.set(g.id, []);
      sections.get(g.id)!.push(n.id);
    } else {
      defaultSec.push(n.id);
    }
  }
  const emitTask = (id: string) => {
    const n = doc.nodes.find((x) => x.id === id)!;
    const start = typeof n.attrs?.start === 'number' ? n.attrs.start : 0;
    const dur = typeof n.attrs?.duration === 'number' ? n.attrs.duration : 1;
    // mermaid gantt needs absolute dates; use a base date + day offsets
    const base = new Date('2026-01-01T00:00:00Z');
    const startDate = new Date(base.getTime() + start * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    lines.push(`    ${label(n.label, id)} : ${id}, ${fmt(startDate)}, ${dur}d`);
  };
  if (defaultSec.length > 0) {
    lines.push('    section 任务');
    defaultSec.forEach(emitTask);
  }
  for (const [gid, ids] of sections) {
    const g = doc.groups.find((x) => x.id === gid);
    lines.push(`    section ${label(g?.label, gid)}`);
    ids.forEach(emitTask);
  }
  return lines.join('\n');
}

/** Export an LGDL document as Mermaid markup. */
export function exportMermaid(doc: LgdlDocument): string {
  switch (doc.type) {
    case 'mindmap':
      return mermaidMindmap(doc);
    case 'sequence':
      return mermaidSequence(doc);
    case 'er':
      return mermaidEr(doc);
    case 'state':
      return mermaidState(doc);
    case 'gantt':
      return mermaidGantt(doc);
    case 'flowchart':
    case 'uml-class':
    case 'arch':
    case 'datastream':
    default:
      return mermaidFlowchart(doc);
  }
}

// register the mermaid output format (side-effect on import)
registerConverter('mermaid', exportMermaid);
