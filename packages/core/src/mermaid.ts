/**
 * LGDL -> Mermaid exporter.
 *
 * Maps each LGDL diagram type to Mermaid syntax so diagrams can be
 * pasted into Mermaid Live Editor / rendered by mermaid.js.
 * Supported: flowchart, mindmap, sequence, er, state, gantt.
 * Others (uml-class, arch, datastream) fall back to flowchart-style output.
 */
import type { LgdlDocument, LgdlNode } from './types.js';
import { registerConverter } from './converters.js';

/** Escape text for use inside a Mermaid node label (double quotes). */
function label(s: string | undefined, fallback = ''): string {
  // multiline labels become <br/> so a round-trip keeps the line breaks
  const text = (s ?? fallback).replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
  return text;
}

/** Escape text for edge labels / messages. */
function edgeLabel(s: string | undefined): string {
  return (s ?? '').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

/** Sanitize an id for Mermaid (ids must be alphanumeric + _ -). */
function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

/** Flowchart (also used as fallback for uml-class / arch / datastream). */
function mermaidFlowchart(doc: LgdlDocument): string {
  const lines: string[] = ['flowchart TD'];

  const emitNode = (n: LgdlNode, indent: string): void => {
    // start/end render as circles (flowchart convention); decision stays a
    // diamond. Every non-default kind also gets a machine-readable comment
    // so a convert -> import round-trip never loses the kind (business
    // labels like "开始流程" would otherwise defeat keyword guessing) —
    // mermaid ignores "%%" comment lines.
    const t = label(n.label, n.id);
    // labels containing the wrapper chars must be quoted inside the shape
    // (mermaid supports {"..."} / (("...")) / ["..."]) so the output stays
    // valid and our own importer can read it back
    const shape =
      n.kind === 'decision'
        ? /[{}]/.test(t)
          ? `{"${t}"}`
          : `{${t}}`
        : n.kind === 'start' || n.kind === 'end'
          ? /[()]/.test(t)
            ? `(("${t}"))`
            : `((${t}))`
          : n.kind === 'entity'
            ? /[()]/.test(t)
              ? `[("${t}")]`
              : `[(${t})]`
            : `["${t}"]`;
    if (n.kind && n.kind !== 'process' && n.kind !== 'decision') {
      lines.push(`${indent}%% @lgdl ${safeId(n.id)}: kind=${n.kind}`);
    }
    lines.push(`${indent}${safeId(n.id)}${shape}`);
  };

  // every group becomes a top-level subgraph (nesting is flattened — the
  // CLI warns about it) so no group, label or aggregate edge is dropped;
  // each group's own node members ride inside its subgraph
  const inSubgraph = new Set<string>();
  for (const g of doc.groups) {
    lines.push(`    subgraph ${safeId(g.id)}["${label(g.label, g.id)}"]`);
    for (const m of g.contains ?? []) {
      const child = doc.nodes.find((x) => x.id === m);
      if (child) {
        emitNode(child, '        ');
        inSubgraph.add(m);
      }
    }
    lines.push('    end');
  }
  for (const n of doc.nodes) {
    if (!inSubgraph.has(n.id)) emitNode(n, '    ');
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
  // build children map, find roots (no incoming edges)
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
  // every zero-in-degree node becomes a root — an orphan component must not
  // be silently dropped, and a bad "first root" must not hide the real tree
  const roots = doc.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const all = roots.length > 0 ? roots : [doc.nodes[0]?.id].filter(Boolean);
  if (all.length === 0) return 'mindmap';

  // visited guards against cycles (a cycle cannot be a tree; edges inside
  // it still keep every node reachable exactly once)
  const visited = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = doc.nodes.find((n) => n.id === id);
    const indent = '  '.repeat(depth + 1);
    // carry non-default kinds in a comment so the round-trip keeps them
    if (node?.kind && node.kind !== 'process') {
      lines.push(`${indent}%% @lgdl ${safeId(id)}: kind=${node.kind}`);
    }
    // carry the LGDL id explicitly via mermaid's id((label)) syntax so a
    // mindmap round-trip never loses node ids
    lines.push(`${indent}${safeId(id)}((${label(node?.label, '')}))`);
    for (const c of children.get(id) ?? []) walk(c, depth + 1);
  };
  for (const root of all) walk(root, 1);
  // nodes unreachable from any root (cycles not containing a root, extra
  // components) must not be silently dropped — emit them as extra roots
  for (const n of doc.nodes) {
    if (!visited.has(n.id)) walk(n.id, 1);
  }
  return lines.join('\n');
}

/** Sequence diagram: participants + messages. */
function mermaidSequence(doc: LgdlDocument): string {
  const lines: string[] = ['sequenceDiagram'];
  for (const n of doc.nodes) {
    // aliases with spaces/quotes/parens must be quoted to stay valid mermaid
    const disp =
      n.label && n.label !== n.id
        ? /\s|["():]/.test(n.label)
          ? ` as "${label(n.label, n.id)}"`
          : ` as ${label(n.label, n.id)}`
        : '';
    lines.push(`    participant ${safeId(n.id)}${disp}`);
  }
  for (const e of doc.edges) {
    lines.push(`    ${safeId(e.from)}->>${safeId(e.to)}: ${edgeLabel(e.label)}`);
  }
  return lines.join('\n');
}

/** ER diagram: entities + relationships with cardinality from attrs. */
function mermaidEr(doc: LgdlDocument): string {
  const lines: string[] = ['erDiagram'];
  // entity names are the LGDL ids (stable round-trip); the label rides in
  // mermaid v10+ alias syntax: USERS["用户表"] { — so neither id nor label
  // is ever lost
  for (const n of doc.nodes) {
    const alias = n.label && n.label !== n.id ? `["${label(n.label, n.id)}"]` : '';
    lines.push(`    ${safeId(n.id)}${alias} {`);
    for (const m of n.members ?? []) {
      if (m.kind === 'attribute') {
        // a member without a type must stay typeless — never fabricate
        // "string" (the importer reads a bare name as typeless); names with
        // non-ASCII/spaces are quoted (mermaid allows "type \"quoted name\"")
        const fmtName = /^[A-Za-z0-9_]+$/.test(m.name) ? m.name : `"${m.name.replace(/"/g, '&quot;')}"`;
        lines.push(m.type ? `        ${m.type} ${fmtName}` : `        ${fmtName}`);
      }
    }
    lines.push(`    }`);
  }
  // mermaid er connectors are directional: the token next to each entity
  // encodes that entity's cardinality. Left end: |o zero-or-one, }o
  // zero-or-more, }| one-or-more. Right end: o| zero-or-one, o{ zero-or-more,
  // |{ one-or-more. || exactly one on both ends.
  const cardToLeft = (c: string | undefined): string => {
    const v = c ?? '*';
    if (v === '1') return '||';
    if (v === '0..1') return '|o';
    if (v === '1..*') return '}|';
    return '}o'; // 0..* / *
  };
  const cardToRight = (c: string | undefined): string => {
    const v = c ?? '*';
    if (v === '1') return '||';
    if (v === '0..1') return 'o|';
    if (v === '1..*') return '|{';
    return 'o{'; // 0..* / *
  };
  for (const e of doc.edges) {
    const a = safeId(e.from);
    const b = safeId(e.to);
    // connectors only where a cardinality is actually set — an unset end
    // stays bare ("A -- B"), so a round-trip never fabricates 0..*
    const left = e.cardinalityFrom !== undefined ? cardToLeft(e.cardinalityFrom) : '';
    const right = e.cardinalityTo !== undefined ? cardToRight(e.cardinalityTo) : '';
    // relation labels with spaces/dots must be quoted so the round-trip
    // never splits or truncates them
    const relLabel = e.label ?? '';
    const out = relLabel && /[\s.]/.test(relLabel) ? `"${relLabel.replace(/"/g, '&quot;')}"` : relLabel || 'relates';
    lines.push(`    ${a} ${left}--${right} ${b} : ${out}`);
  }
  return lines.join('\n');
}

/** State diagram. */
function mermaidState(doc: LgdlDocument): string {
  const lines: string[] = ['stateDiagram-v2'];
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  // declare non-terminal states with their label so a round-trip keeps both
  // id and label; terminals stay anonymous [label] (mermaid has no named
  // terminal) and the importer maps them to kind:end nodes
  for (const n of doc.nodes) {
    if (n.kind === 'end') {
      // terminals use mermaid's dedicated [*] syntax (a plain "[label]"
      // renders as a normal state box, not a terminal); the label rides in
      // a comment so the round-trip keeps it
      if (n.label) lines.push(`    %% @lgdl end-label: ${label(n.label, n.id)}`);
      continue;
    }
    if (n.kind === 'start') {
      // initial state: mermaid's [*] --> x pseudo-edge; the importer maps
      // it back to kind: start. The label declaration must follow so the
      // round-trip keeps the label too.
      lines.push(`    [*] --> ${safeId(n.id)}`);
      if (n.label && n.label !== n.id) {
        lines.push(`    state "${label(n.label, n.id)}" as ${safeId(n.id)}`);
      }
      continue;
    }
    if (n.label && n.label !== n.id) {
      lines.push(`    state "${label(n.label, n.id)}" as ${safeId(n.id)}`);
    } else {
      lines.push(`    state ${safeId(n.id)}`);
    }
  }
  for (const e of doc.edges) {
    const from = byId.get(e.from)?.kind === 'end' ? '[*]' : safeId(e.from);
    const to = byId.get(e.to)?.kind === 'end' ? '[*]' : safeId(e.to);
    lines.push(`    ${from} --> ${to}${e.label ? `: ${edgeLabel(e.label)}` : ''}`);
  }
  return lines.join('\n');
}

/** Gantt chart: tasks with attrs.start / attrs.duration. */
function mermaidGantt(doc: LgdlDocument): string {
  const lines: string[] = ['gantt', '    dateFormat YYYY-MM-DD', '    axisFormat %d'];
  // carry the epoch so a round-trip with a custom meta.ganttEpoch keeps the
  // exact dates (import reads it back into meta.ganttEpoch)
  const epoch = typeof doc.meta?.ganttEpoch === 'string' ? doc.meta.ganttEpoch : '2026-01-01';
  lines.push(`    %% @lgdl gantt-epoch: ${epoch}`);
  if (doc.title) lines.push(`    title ${doc.title}`);
  // group tasks by group (sections); ungrouped tasks stay bare — inventing
  // a default "任务" section would drift them into a group on round-trip
  const sections = new Map<string, string[]>();
  const defaultSec: string[] = [];
  const emittedIds = new Set<string>();
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
    if (emittedIds.has(id)) return; // a cross-section dependency may repeat
    const n = doc.nodes.find((x) => x.id === id)!;
    const start = typeof n.attrs?.start === 'number' ? n.attrs.start : 0;
    const dur = typeof n.attrs?.duration === 'number' ? n.attrs.duration : 1;
    // milestones use mermaid's "milestone ..." prefix so the round-trip
    // keeps the node kind; task names with ':'/quotes must be quoted; the
    // task status (done/active/crit) rides before the id
    const prefix = n.kind === 'milestone' ? 'milestone ' : '';
    const name = label(n.label, id);
    const quoted = /[:,"]/.test(name) ? `"${name}"` : name;
    const status = typeof n.attrs?.status === 'string' ? n.attrs.status : undefined;
    const statusPart = status ? `${status}, ` : '';
    // when the start aligns with (or is after) a dependency's end and that
    // dependency was already emitted, use mermaid's `after` form so the
    // dependency edge survives the round-trip; a positive gap is expressible
    // as "after dep <gap>d"
    const dep = doc.edges.find((e) => e.to === id);
    const depNode = dep ? doc.nodes.find((x) => x.id === dep.from) : undefined;
    const depEnd =
      depNode && typeof depNode.attrs?.start === 'number' && typeof depNode.attrs?.duration === 'number'
        ? depNode.attrs.start + depNode.attrs.duration
        : undefined;
    if (dep && depEnd !== undefined && start >= depEnd && emittedIds.has(dep.from)) {
      const gap = start - depEnd;
      lines.push(
        `    ${prefix}${quoted} : ${statusPart}${id}, after ${safeId(dep.from)}${gap > 0 ? ` ${gap}d` : ''}, ${dur}d`,
      );
      emittedIds.add(id);
      return;
    }
    // mermaid gantt needs absolute dates; use the documented epoch
    // (meta.ganttEpoch, default 2026-01-01) + day offsets
    const epoch = typeof doc.meta?.ganttEpoch === 'string' ? doc.meta.ganttEpoch : '2026-01-01';
    const base = new Date(epoch + 'T00:00:00Z');
    const startDate = new Date(base.getTime() + start * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    lines.push(`    ${prefix}${quoted} : ${statusPart}${id}, ${fmt(startDate)}, ${dur}d`);
    emittedIds.add(id);
  };
  // topological order per section: dependencies first, so the `after` form
  // is always available (mermaid requires the referenced task to exist).
  // Dependencies are followed only within the same section — a cross-section
  // dependency must not pull tasks into another section (duplicate output).
  const topoSort = (ids: string[]): string[] => {
    const set = new Set(ids);
    const order: string[] = [];
    const visited = new Set<string>();
    const visit = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const e of doc.edges) if (e.to === id && set.has(e.from)) visit(e.from);
      order.push(id);
    };
    for (const id of ids) visit(id);
    return order;
  };
  if (defaultSec.length > 0) {
    topoSort(defaultSec).forEach(emitTask);
  }
  for (const [gid, ids] of sections) {
    const g = doc.groups.find((x) => x.id === gid);
    const secName = label(g?.label, gid);
    // carry the original group id in a comment so a round-trip keeps it
    // (mermaid sections have no id syntax)
    lines.push(`    %% @lgdl section-id: ${safeId(gid)}`);
    lines.push(`    section ${/[:,"]/.test(secName) ? `"${secName}"` : secName}`);
    topoSort(ids).forEach(emitTask);
  }
  return lines.join('\n');
}

/** UML class diagram: classes with members + typed relationships. */
function mermaidClassDiagram(doc: LgdlDocument): string {
  const lines: string[] = ['classDiagram'];
  const SYM: Record<string, string> = { public: '+', private: '-', protected: '#', package: '~' };
  for (const n of doc.nodes) {
    // the class id IS the mermaid class name (so rendered diagrams and
    // relationship lines agree); the display label rides in a comment that
    // our importer restores on the way back
    const clsName = safeId(n.id);
    if (n.label && n.label !== n.id) {
      lines.push(`    %% @lgdl label: ${label(n.label, n.id)}`);
    }
    if (n.members && n.members.length > 0) {
      lines.push(`    class ${clsName} {`);
      for (const m of n.members ?? []) {
        const sym = m.visibility ? SYM[m.visibility] : '';
        if (m.kind === 'method') {
          const params = m.params ? m.params.replace(/^\(|\)$/g, '') : '';
          lines.push(`        ${sym}${m.name}(${params})${m.type ? ` ${m.type}` : ''}`);
        } else {
          lines.push(`        ${sym}${m.type ? `${m.type} ` : ''}${m.name}`);
        }
      }
      lines.push('    }');
    } else {
      lines.push(`    class ${clsName}`);
    }
  }
  for (const e of doc.edges) {
    const rel = typeof e.attrs?.relation === 'string' ? e.attrs.relation : undefined;
    const conn =
      rel === 'inheritance'
        ? '<|--'
        : rel === 'implementation'
          ? '..|>'
          : rel === 'composition'
            ? '*--'
            : rel === 'aggregation'
              ? 'o--'
              : rel === 'dependency'
                ? '-->'
                : '--';
    // cardinality sits between the class id and the connector:
    // "User "1" -- "1..*" Order : 拥有"
    const fromCard = e.cardinalityFrom !== undefined ? ` "${e.cardinalityFrom}"` : '';
    const toCard = e.cardinalityTo !== undefined ? ` "${e.cardinalityTo}"` : '';
    lines.push(`    ${safeId(e.from)}${fromCard} ${conn}${toCard} ${safeId(e.to)}${e.label ? ` : ${e.label}` : ''}`);
  }
  return lines.join('\n');
}

/** Export an LGDL document as Mermaid markup. */
export function exportMermaid(doc: LgdlDocument): string {
  const body = (() => {
    switch (doc.type) {
      case 'uml-class':
        return mermaidClassDiagram(doc);
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
      case 'arch':
      case 'datastream':
      default:
        return mermaidFlowchart(doc);
    }
  })();
  // carry the title in a comment so a round-trip keeps it (mermaid has no
  // title syntax for these diagram types; gantt has its own "title" line)
  if (doc.title && doc.type !== 'gantt') {
    return `%% @lgdl title: ${doc.title.replace(/\n/g, ' ')}\n${body}`;
  }
  return body;
}

// register the mermaid output format (side-effect on import)
registerConverter('mermaid', exportMermaid);
