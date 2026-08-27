/**
 * Mermaid -> LGDL importer.
 *
 * Parses the Mermaid dialects that exportMermaid produces (flowchart,
 * sequence, mindmap, state, er, gantt) into an LgdlDocument so diagrams
 * can migrate into LGDL. Unsupported/unknown input yields parse issues
 * rather than throwing.
 */
import type { LgdlDocument, LgdlEdge, LgdlGroup, LgdlMember, LgdlNode, LgdlIssue } from './types.js';

export interface MermaidImportResult {
  document: LgdlDocument;
  issues: LgdlIssue[];
  valid: boolean;
}

/** Strip a matching outer pair of quotes from a Mermaid token and decode the
 * HTML entities that exportMermaid emits (" -> &quot; etc.) so a
 * convert -> import round-trip never corrupts quotes in labels. Only a
 * *matching* outer pair is stripped — a quote inside prose ("OK" in a
 * hand-written message) is content and must be kept. */
function unquote(s: string): string {
  let out = s;
  if (out.length >= 2 && out.startsWith('"') && out.endsWith('"')) out = out.slice(1, -1);
  return out
    .replace(/<br\s*\/?>/gi, '\n') // mermaid multiline labels -> newlines
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Extract id + optional label/kind from one flowchart node token.
 * A token is an id optionally followed by a shape: A["开始"], A{判断},
 * A((x)), A[[x]], A([x]), A[/x/], A[\x\]. Unrecognized shapes keep the id
 * so the node is never silently dropped.
 */
function parseFlowToken(token: string): { id: string; label?: string; kind?: string } | null {
  // ids may carry '.'/'/' (db.cluster, user/order) — the importer sanitizes
  // them into legal LGDL ids later; the error message must not blame edges.
  // mermaid ":::class" styling suffixes are presentation-only — stripped.
  token = token.replace(/:::[A-Za-z0-9_-]+$/, '');
  const m = token.match(/^([A-Za-z0-9_\u4e00-\u9fa5\-./]+)\s*(.*)$/);
  if (!m) return null;
  const id = m[1];
  const rest = m[2].trim();
  if (!rest) return { id };
  // diamond: {"label"} (quoted — label may contain { }) or {label}
  // hexagon {{label}} — strip the braces, keep the label (no LGDL hexagon kind)
  let dm = rest.match(/^\{\{\s*"([^"]*)"\s*\}\}$/) ?? rest.match(/^\{\{([^{}]*)\}\}$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined };
  dm = rest.match(/^\{\s*"([^"]*)"\s*\}$/);
  if (dm) return { id, kind: 'decision', label: unquote(dm[1]) || undefined };
  dm = rest.match(/^\{(.*)\}$/);
  if (dm) return { id, kind: 'decision', label: unquote(dm[1]) || undefined };
  // subroutine: [[label]]
  dm = rest.match(/^\[\s*\[\s*"?([^"\]\[]*)"?\s*\]\s*\]$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined };
  // cylinder: [(label)] or [("label")] — mermaid's convention for database
  // tables, mapped to kind: entity (quoted form allows parens inside the
  // label; the bare form grabs everything between [ ( and the final ) ])
  dm = rest.match(/^\[\s*\(\s*"([^"]*)"\s*\)\s*\]$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined, kind: 'entity' };
  dm = rest.match(/^\[\s*\(\s*([\s\S]*?)\s*\)\s*\]$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined, kind: 'entity' };
  // rectangle: ["label"] or [label] — the kind heuristic matches the node
  // id AND exact start/end label keywords (business labels like 结束)
  const rectKind = (l: string | undefined, id: string): string | undefined => {
    if (/^(start|end)$/i.test(id)) return id.toLowerCase();
    const t = (l ?? '').trim();
    if (/^(开始|start|begin)$/.test(t)) return 'start';
    if (/^(结束|end|stop)$/.test(t)) return 'end';
    return undefined;
  };
  // parallelogram: [/label/] or [\label\] — must precede the rectangle
  // branch (which would otherwise swallow the slashes into the label)
  dm = rest.match(/^\[\s*[\\/]\s*"?([^"\\/]*)"?\s*[\\/]\s*\]$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined };
  dm = rest.match(/^\[\s*"([^"]*)"\s*\]$/);
  if (dm) {
    const label = unquote(dm[1]) || undefined;
    return { id, label, kind: rectKind(label, id) };
  }
  dm = rest.match(/^\[\s*([^\]\[]*)\s*\]$/);
  if (dm) {
    const label = unquote(dm[1]) || undefined;
    return { id, label, kind: rectKind(label, id) };
  }
  // circle: (("label")) quoted (label may contain parens) or ((label)) —
  // flowchart convention for start/end; recover the kind from the node id
  // first (like the rectangle branch) and fall back to start/end keywords
  // in the label text
  dm = rest.match(/^\(\s*\(\s*"([^"]*)"\s*\)\s*\)$/);
  if (dm) {
    const l = unquote(dm[1]) || undefined;
    const t = (l ?? '').trim();
    const kind =
      /^(start|end)$/i.test(id)
        ? id.toLowerCase()
        : /^(开始|start|begin)$/i.test(t)
          ? 'start'
          : /^(结束|end|stop)$/i.test(t)
            ? 'end'
            : undefined;
    return { id, label: l, kind };
  }
  dm = rest.match(/^\(\s*\(\s*([^()]*)\s*\)\s*\)$/);
  if (dm) {
    const l = unquote(dm[1]) || undefined;
    const t = (l ?? '').trim();
    const kind =
      /^(start|end)$/i.test(id)
        ? id.toLowerCase()
        : /^(开始|start|begin)$/i.test(t)
          ? 'start'
          : /^(结束|end|stop)$/i.test(t)
            ? 'end'
            : undefined;
    return { id, label: l, kind };
  }
  // stadium: ([label])
  dm = rest.match(/^\(\s*\[\s*"?([^"()]*)"?\s*\]\s*\)$/);
  if (dm) return { id, label: unquote(dm[1]) || undefined };
  // trailing text that is not a known shape — reject so it is never
  // silently interpreted as a bare node id
  return null;
}

/** Flowchart: nodes + edges (chained A --> B --> C, |label| edge labels). */
function importFlowchart(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const groups: LgdlGroup[] = [];
  const seen = new Set<string>();
  // "%% @lgdl <id>: kind=<kind>" comments emitted by exportMermaid — the
  // authoritative kind, better than guessing from id/label keywords
  const commentKinds = new Map<string, string>();
  let groupStack: string[] = []; // active subgraph ids
  const groupById = new Map<string, LgdlGroup>();
  // original (CJK) id -> fallback id, so every reference to the same CJK id
  // reuses one node instead of spawning duplicates
  const uidOf = new Map<string, string>();
  let warnedClassSuffix = false;
  const ensure = (tok: { id: string; label?: string; kind?: string }): string => {
    // a subgraph id is an aggregate-edge endpoint, never a node
    if (groupById.has(tok.id)) return tok.id;
    // CJK ids are not legal LGDL ids — fall back to nodeN, keep the label
    if (!/^[A-Za-z0-9_-]+$/.test(tok.id)) {
      const existing = uidOf.get(tok.id);
      if (existing) {
        // backfill a label if this reference carries one
        if (tok.label) {
          const n = nodes.find((x) => x.id === existing);
          if (n && !n.label) n.label = tok.label;
        }
        return existing;
      }
      issues.push({
        severity: 'warning',
        message: `flowchart node "${tok.id}" is not a legal LGDL id (letters, digits, _ - only) — imported id is a fallback`,
        location: 'mermaid',
      });
      // sanitize to something readable ("db.cluster" -> "db_cluster"); CJK
      // sanitizes to "___" which is unreadable — fall back to nodeN
      const fbBase = tok.id.replace(/[^A-Za-z0-9_-]/g, '_');
      let fb = /^[A-Za-z0-9_-]+$/.test(fbBase) && /^[A-Za-z0-9]/.test(fbBase) ? fbBase : 'node' + (nodes.length + 1);
      let k = 1;
      while (seen.has(fb)) fb = `${fbBase}_${k++}`;
      uidOf.set(tok.id, fb);
      const kind = tok.kind ?? commentKinds.get(tok.id);
      nodes.push({
        id: fb,
        ...(tok.label ? { label: tok.label } : { label: tok.id }),
        ...(kind ? { kind: kind as LgdlNode['kind'] } : {}),
      });
      seen.add(fb);
      const g = groupStack[groupStack.length - 1];
      if (g) groupById.get(g)?.contains.push(fb);
      return fb;
    }
    if (!seen.has(tok.id)) {
      const kind = tok.kind ?? commentKinds.get(tok.id);
      nodes.push({
        id: tok.id,
        ...(tok.label ? { label: tok.label } : {}),
        ...(kind ? { kind: kind as LgdlNode['kind'] } : {}),
      });
      seen.add(tok.id);
      // nodes declared inside a subgraph belong to that group
      const g = groupStack[groupStack.length - 1];
      if (g) groupById.get(g)?.contains.push(tok.id);
    } else {
      if (tok.label) {
        // backfill a label if the node was first seen via an edge
        const n = nodes.find((x) => x.id === tok.id);
        if (n && !n.label) n.label = tok.label;
      }
      // a node created before its subgraph was opened (edge first, subgraph
      // later) must still join the group
      const g = groupStack[groupStack.length - 1];
      if (g) {
        const grp = groupById.get(g);
        if (grp && !grp.contains.includes(tok.id)) grp.contains.push(tok.id);
      }
    }
    return tok.id;
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    // direction on the header ("flowchart LR" / "graph LR") is a layout
    // hint LGDL does not store — warn once instead of silently dropping it
    if (/^(flowchart|graph)\s+(LR|RL|BT)\b/.test(line)) {
      issues.push({
        severity: 'warning',
        message: `direction "${line.split(/\s+/)[1]}" is not preserved (LGDL has no layout — the renderer always lays out top-down)`,
        location: 'mermaid',
      });
      continue;
    }
    if (line.startsWith('flowchart') || line.startsWith('graph')) continue;
    // exportMermaid kind comments
    const cm = line.match(/^%%\s*@lgdl\s+([A-Za-z0-9_-]+):\s*kind=([a-z]+)$/);
    if (cm) {
      commentKinds.set(cm[1], cm[2]);
      continue;
    }
    if (line.startsWith('%%')) continue;
    // layout directive — LGDL has no layout, skip it like the state importer
    if (/^direction\b/.test(line)) continue;
    // subgraphs become groups (contains members; edges may still reference
    // the group id for aggregate edges). Label may be quoted or bare, and
    // the id may be CJK (fallback id + warning):
    // subgraph g1["组1"] / subgraph g1[组1] / subgraph 前端 [前端层] / subgraph g1
    const sg = line.match(/^subgraph\s+([A-Za-z0-9_\u4e00-\u9fa5-]+)(?:\s*\["([^"]*)"\]|\s*\[([^\]]*)\])?\s*$/);
    if (sg) {
      if (groupStack.length > 0) {
        issues.push({
          severity: 'error',
          message: `Nested subgraphs are not supported by the importer: "${line}"`,
          location: 'mermaid',
        });
        continue;
      }
      const sgLabel = sg[2] !== undefined ? unquote(sg[2]) : sg[3] !== undefined ? unquote(sg[3]) : sg[1];
      let gid = sg[1];
      if (!/^[A-Za-z0-9_-]+$/.test(gid)) {
        issues.push({
          severity: 'warning',
          message: `subgraph id "${gid}" is not a legal LGDL id — imported id is a fallback`,
          location: 'mermaid',
        });
        gid = 'sub' + (groups.length + 1);
      }
      const g: LgdlGroup = { id: gid, label: sgLabel, contains: [] };
      groups.push(g);
      groupById.set(g.id, g);
      groupStack.push(g.id);
      continue;
    }
    // bare subgraph with a title but no id: "subgraph 前端" — fall back to
    // a generated group id and keep the title as the label
    const sg2 = line.match(/^subgraph\s+([^\[\]]+?)\s*$/);
    if (sg2 && sg2[1].trim()) {
      if (groupStack.length > 0) {
        issues.push({
          severity: 'error',
          message: `Nested subgraphs are not supported by the importer: "${line}"`,
          location: 'mermaid',
        });
        continue;
      }
      const g: LgdlGroup = { id: 'sub' + (groups.length + 1), label: sg2[1].trim(), contains: [] };
      groups.push(g);
      groupById.set(g.id, g);
      groupStack.push(g.id);
      continue;
    }
    if (line === 'end' && groupStack.length > 0) {
      groupStack.pop();
      continue;
    }
    // Presentation-only directives (style/classDef/class/linkStyle/click)
    // affect colors/links, never node/edge structure — drop them with a
    // warning instead of rejecting the whole diagram
    if (/^(classDef|style|linkStyle|click|class)\b/.test(line)) {
      issues.push({
        severity: 'warning',
        message: `Mermaid flowchart "${line.split(/\s/)[0]}" is dropped (presentation-only, does not affect structure)`,
        location: 'mermaid',
      });
      continue;
    }
    if (line.includes(':::') && !warnedClassSuffix) {
      warnedClassSuffix = true;
      issues.push({
        severity: 'warning',
        message: `line ${li + 1}: mermaid ":::class" styling is dropped (presentation-only)`,
        location: 'mermaid',
      });
    }
    // "A -- 成功 --> B": mermaid's most common labeled-edge form. The label
    // segment must not contain '>' — otherwise a chained "A --> B --> C"
    // (no label) would be misparsed as a labeled edge with a fake label.
    const lm2 = line.match(/^(.+?)\s*--\s*([^>]+?)\s*-->\s*(.+)$/);
    if (lm2) {
      const fromTok = parseFlowToken(lm2[1].trim());
      const toTok = parseFlowToken(lm2[3].trim());
      if (fromTok && toTok) {
        const from = ensure(fromTok);
        const to = ensure(toTok);
        const label = unquote(lm2[2].trim());
        edges.push({ from, to, ...(label ? { label } : {}) });
        continue;
      }
      issues.push({
        severity: 'error',
        message: `Unrecognized Mermaid flowchart edge syntax: "${line}"`,
        location: 'mermaid',
      });
      continue;
    }
    if (line.includes('-->')) {
      const parts = line.split(/-->/);
      let prev: string | null = null;
      let bad = false;
      for (const partRaw of parts) {
        let part = partRaw.trim();
        let label: string | undefined;
        if (part.startsWith('|')) {
          // |"label with | brackets"| (quoted: any chars) or |label| —
          // extracted BEFORE the & fan-out split so &quot; entities survive
          const lm =
            part.match(/^\|"([^"]*)"\|\s*(.*)$/) ?? part.match(/^\|([^|]*)\|\s*(.*)$/);
          if (!lm) {
            bad = true;
            break;
          }
          label = unquote(lm[1]) || undefined;
          part = lm[2].trim();
        }
        // "A --> B & C": the fan-out targets are same-level edges
        const subs = part.split('&').map((t) => t.trim());
        let lastUid: string | null = null;
        for (const sub of subs) {
          const tok = parseFlowToken(sub);
          if (!tok) {
            bad = true;
            break;
          }
          const uid = ensure(tok);
          if (prev) edges.push({ from: prev, to: uid, ...(label ? { label } : {}) });
          lastUid = uid;
        }
        if (bad) break;
        prev = lastUid;
      }
      if (bad) {
        issues.push({ severity: 'error', message: `line ${li + 1}: Unrecognized Mermaid flowchart edge syntax: "${line}"`, location: 'mermaid' });
      }
      continue;
    }
    // other link styles (-.-> dotted, -.text.-> dotted-with-label, ==>
    // bold, --- plain) normalize to a plain edge with a warning — the line
    // style is not representable
    // dotted with a pipe label first: A -.->|弱依赖| B
    let altEdge = line.match(/^(.+?)\s*-\.->\s*\|([^|]*)\|\s*(.+)$/);
    if (!altEdge) altEdge = line.match(/^(.+?)\s*-\.(?:(.+?)\.)?->\s*(.+)$/);
    if (!altEdge) altEdge = line.match(/^(.+?)\s*==>\s*(.+)$/);
    if (!altEdge) altEdge = line.match(/^(.+?)\s*---\s*(.+)$/);
    // aggregation/composition line styles: o--o x--x o-- --o x-- --x
    if (!altEdge) altEdge = line.match(/^(.+?)\s*(?:o--o|x--x|o--|--o|x--|--x)\s*(.+)$/);
    if (altEdge) {
      const fromTok = parseFlowToken(altEdge[1].trim());
      const toTok = parseFlowToken((altEdge[3] ?? altEdge[2]).trim());
      if (fromTok && toTok) {
        issues.push({
          severity: 'warning',
          message: `flowchart edge style on "${line}" is normalized to a plain edge (line style is not representable in LGDL)`,
          location: 'mermaid',
        });
        const from = ensure(fromTok);
        const to = ensure(toTok);
        // only the dotted-with-label form carries a label (group 2 present)
        const label = altEdge[3] !== undefined && altEdge[2] !== undefined ? unquote(altEdge[2].trim()) : undefined;
        edges.push({ from, to, ...(label ? { label } : {}) });
        continue;
      }
    }
    // Other link styles that still failed to parse — reject loudly.
    if (/[-=]\.?[-=]?>/.test(line) || line.includes('---') || line.includes('===')) {
      issues.push({
        severity: 'error',
        message: `line ${li + 1}: Unrecognized Mermaid flowchart edge syntax: "${line}" (only "-->" links are supported by the importer)`,
        location: 'mermaid',
      });
      continue;
    }
    // plain node declaration
    const node = parseFlowToken(line);
    if (node) {
      ensure(node);
      continue;
    }
    // Unknown lines degrade to a warning so one typo or exotic syntax in an
    // otherwise valid diagram does not abort the whole import.
    issues.push({
      severity: 'warning',
      message: `line ${li + 1}: Unrecognized Mermaid flowchart syntax skipped: "${line}"`,
      location: 'mermaid',
    });
  }

  // groups are now nodes (kind === 'group'), not a separate document field
  const allNodes: LgdlNode[] = [...nodes];
  for (const g of groups) {
    allNodes.push({ id: g.id, label: g.label, kind: 'group', contains: [...g.contains], attrs: g.attrs });
  }
  return {
    type: 'flowchart',
    nodes: allNodes,
    edges,
  };
}

/** Sequence diagram: participants + messages. */
function importSequence(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const uidOf = new Map<string, string>(); // original (possibly CJK) id -> legal id
  // CJK participant ids are legal in mermaid but not in LGDL (id charset is
  // ASCII); the label keeps the CJK text while the id is sanitized — same
  // approach as the er importer.
  const ensure = (id: string, label?: string, declaring = false): string => {
    const existing = uidOf.get(id);
    if (existing) return existing;
    let base = id.replace(/[^A-Za-z0-9_-]/g, '');
    if (!base) base = 'p' + (nodes.length + 1);
    let uid = base;
    let n = 1;
    while ([...uidOf.values()].includes(uid)) uid = `${base}_${n++}`;
    uidOf.set(id, uid);
    nodes.push({ id: uid, ...((label ?? id) ? { label: label ?? id } : {}) });
    return uid;
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line || line.startsWith('sequenceDiagram') || line.startsWith('%%')) continue;
    // participant ids support CJK too (consistent with er entity names)
    const pm = line.match(/^participant\s+([A-Za-z0-9_\u4e00-\u9fa5-]+)(?:\s+as\s+(.+))?$/);
    if (pm) {
      ensure(pm[1], pm[2] ? unquote(pm[2]) : undefined);
      continue;
    }
    const am = line.match(/^actor\s+([A-Za-z0-9_\u4e00-\u9fa5-]+)(?:\s+as\s+(.+))?$/);
    if (am) {
      ensure(am[1], am[2] ? unquote(am[2]) : undefined);
      continue;
    }
    // Message ids may contain '-' (a participant declared as "my-service"),
    // so the source id is matched non-greedily up to the arrow: "John-->>Alice"
    // gives id "John", not "John-". All standard mermaid arrows (->, -->,
    // ->>, -->>, -), --), -x, --x) normalize to a plain LGDL edge; only the
    // canonical ->> is silent, everything else warns.
    const mm = line.match(/^(.+?)\s*(-+)(>>|\)|x|>)\s*([A-Za-z0-9_\u4e00-\u9fa5-]+)\s*(?::\s*(.*))?$/);
    if (mm) {
      if (mm[1] === mm[4]) {
        issues.push({
          severity: 'error',
          message: `line ${li + 1}: self-loop ${mm[1]} -> ${mm[1]} is not supported (LGDL edges cannot be self-loops)`,
          location: 'mermaid',
        });
        continue;
      }
      const arrow = `${mm[2]}${mm[3]}`;
      if (arrow !== '->>') {
        issues.push({
          severity: 'warning',
          message: `line ${li + 1}: sequence arrow "${arrow}" is normalized to a plain edge — LGDL has no arrow-type field yet`,
          location: 'mermaid',
        });
      }
      const from = ensure(mm[1]);
      const to = ensure(mm[4]);
      edges.push({ from, to, label: mm[5] ? unquote(mm[5].trim()) : undefined });
      continue;
    }
    if (line.includes('->') || line.includes('--') || line.includes('-)')) {
      issues.push({
        severity: 'error',
        message: `Unrecognized Mermaid sequence message: "${line}" (participant/message ids support ASCII and CJK; check the arrow syntax)`,
        location: 'mermaid',
      });
      continue;
    }
    if (/^(Note|activate|deactivate)\b/i.test(line)) {
      // annotations/activation bars do not change the message flow — drop
      // them with a warning instead of rejecting the whole diagram
      issues.push({
        severity: 'warning',
        message: `line ${li + 1}: sequence "${line.split(/\s/)[0]}" is dropped (annotations/activation are not representable in LGDL)`,
        location: 'mermaid',
      });
      continue;
    }
    if (/^(loop|alt|opt|par|break|critical|rect|else)\b/i.test(line) || line === 'end') {
      // block structure is not representable — flatten it: the messages
      // inside are kept as plain edges, only the block markers are dropped
      issues.push({
        severity: 'warning',
        message: `line ${li + 1}: sequence block "${line.split(/\s/)[0]}" is flattened (loops/branches are not representable in LGDL) — the messages inside are kept`,
        location: 'mermaid',
      });
      continue;
    }
    issues.push({ severity: 'error', message: `Unrecognized Mermaid sequence syntax: "${line}"`, location: 'mermaid' });
  }

  return { type: 'sequence', nodes, edges };
}

/** Mindmap: indented tree -> nodes + edges. */
function importMindmap(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  const stack: { id: string; depth: number }[] = [];
  const commentKinds = new Map<string, string>(); // "%% @lgdl id: kind=x"

  const ensure = (id: string, label: string, kind?: string): string => {
    // ids must be [A-Za-z0-9_-]; keep fully legal ids (including "__x__"
    // style) as-is, only sanitize CJK/illegal tokens
    let base = id;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      base = id.replace(/[^A-Za-z0-9_-]/g, '_');
      // a CJK label sanitizes to "___" — unreadable; fall back to nodeN
      // (same treatment as the state importer)
      if (!/^[A-Za-z0-9]/.test(base)) {
        if (/[\u4e00-\u9fa5]/.test(id)) {
          issues.push({
            severity: 'warning',
            message: `mindmap node "${label}" has no ASCII id — use "id((label))" syntax to keep a stable id (got fallback id)`,
            location: 'mermaid',
          });
        }
        base = 'node' + (nodes.length + 1);
      }
    }
    // dedupe
    let uid = base;
    let n = 1;
    while (seen.has(uid)) uid = `${base}_${n++}`;
    seen.add(uid);
    const k = kind ?? commentKinds.get(id);
    nodes.push({ id: uid, label, ...(k ? { kind: k as LgdlNode['kind'] } : {}) });
    return uid;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const cm = line.trim().match(/^%%\s*@lgdl\s+([A-Za-z0-9_-]+):\s*kind=([a-z]+)$/);
    if (cm) {
      commentKinds.set(cm[1], cm[2]);
      continue;
    }
    if (!line.trim() || line.trim().startsWith('mindmap') || line.trim().startsWith('%%')) continue;
    const depth = line.length - line.trimStart().length;
    // strip bullet markers, mermaid shape wrappers and icon annotations:
    //   "root((项目))" / "root(项目)" / "root[项目]" -> label 项目, id root
    //   "root((项目))::icon(fa fa-home)" -> icon annotation dropped
    let text = line.trim().replace(/^[-*]\s*/, '').replace(/::(?:icon|fa)\([^)]*\)\s*$/, '');
    // label content may itself contain parens ("根节点(重要)"), so shape
    // groups are matched greedily up to the closing wrapper; ids may be CJK
    const shape = text.match(
      /^([A-Za-z0-9_\u4e00-\u9fa5\-./]+)\s*(?:\(\(([\s\S]*)\)\)|\(([\s\S]*)\)|\[\[([^\]]*)\]\]|\[([^\]]*)\]|\{([^}]*)\})?\s*$/,
    );
    let shapeLabel: string | undefined;
    if (shape) {
      text = shape[1];
      const inner = shape[2] ?? shape[3] ?? shape[4] ?? shape[5] ?? shape[6];
      if (inner !== undefined && inner.trim()) shapeLabel = unquote(inner.trim());
    } else if (/[(\[{]/.test(text)) {
      // leftover shape syntax we cannot parse — reject loudly instead of
      // emitting a garbage id/label
      issues.push({
        severity: 'error',
        message: `Unrecognized Mermaid mindmap syntax: "${line.trim()}"`,
        location: 'mermaid',
      });
      continue;
    }
    const label = shapeLabel ?? text;
    if (!label) continue;
    const id = ensure(text, label);
    // pop deeper stack entries
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length > 0) {
      edges.push({ from: stack[stack.length - 1].id, to: id });
    }
    stack.push({ id, depth });
  }

  return { type: 'mindmap', nodes, edges };
}

/** State diagram: A --> B or A --> B: label; terminals as [name]. */
function importState(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const idByLabel = new Map<string, string>(); // label -> node id (reuse)
  let endLabel: string | undefined; // "%% @lgdl end-label: ..." from exportMermaid
  const ensure = (token: string, terminal: boolean, explicitLabel?: string): string => {
    // the token may already be a declared id ("state x as id" + edge x --> y,
    // or "[*] --> s0" before `state "初始" as s0`); a declaration line with
    // an explicit label is authoritative and backfills the label
    const existingNode = nodes.find((x) => x.id === token);
    if (existingNode) {
      if (explicitLabel !== undefined) existingNode.label = unquote(explicitLabel);
      return existingNode.id;
    }
    const label = unquote(explicitLabel ?? token.replace(/^\[|\]$/g, '')).trim();
    // reuse existing node by label
    const existing = idByLabel.get(label);
    if (existing) return existing;
    // id comes from the token (an explicit "state x as id" id), never from
    // the label — otherwise CJK labels sanitize to unreadable ids. A fully
    // legal id (including "__start__" style) is kept as-is.
    let id = token;
    if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      id = token.replace(/[^A-Za-z0-9_-]/g, '_');
      // a CJK token sanitizes to "___" — unreadable; fall back to a
      // numbered state/end id instead
      if (!/^[A-Za-z0-9]/.test(id)) id = (terminal ? 'end' : 'state') + (nodes.length + 1);
    }
    // dedupe id collisions with different labels
    let uid = id;
    let n = 1;
    while (nodes.some((x) => x.id === uid)) uid = `${id}_${n++}`;
    nodes.push({ id: uid, label, ...(terminal ? { kind: 'end' as const } : { kind: 'state' as const }) });
    idByLabel.set(label, uid);
    return uid;
  };

  let inNote = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inNote) {
      if (/^end note\b/i.test(line)) inNote = false;
      continue;
    }
    if (/^note\b/i.test(line)) {
      issues.push({
        severity: 'warning',
        message: `state "note" blocks are dropped (annotations are not representable in LGDL)`,
        location: 'mermaid',
      });
      inNote = true;
      continue;
    }
    if (!line || line.startsWith('stateDiagram')) continue;
    const el = line.match(/^%%\s*@lgdl\s+end-label:\s*(.+)$/);
    if (el) {
      endLabel = unquote(el[1].trim());
      continue;
    }
    if (line.startsWith('%%')) continue;
    if (/^direction\b/.test(line)) continue; // layout directive — LGDL has no layout
    // A --> B  or  A --> B: label  (B may be [terminal] or [*])
    const m = line.match(/^(.+?)\s*-->\s*(.+?)(?::\s*(.*))?$/);
    if (m) {
      const fromTok = m[1].trim();
      const toTok = m[2].trim();
      const label = m[3] ? unquote(m[3].trim()) : undefined;
      // [*] marks the initial/terminal pseudo-state — it is not a real node.
      // LGDL infers the initial state from "the only node with no incoming
      // edge", so [*] is dropped and the other end keeps its semantics.
      const fromIsPseudo = fromTok === '[*]';
      const toIsPseudo = toTok === '[*]';
      if (fromIsPseudo && toIsPseudo) continue;
      // [*] at the source marks the initial pseudo-state: the target
      // becomes the initial state (kind: start) and no edge is emitted —
      // LGDL infers the initial state from "the only node with no incoming
      // edge".
      let from: string | null = null;
      let to: string | null = null;
      if (!fromIsPseudo) from = ensure(fromTok, false);
      if (toIsPseudo) {
        // [*] at the target marks the terminal pseudo-state: unlike the
        // initial state there is no inference mechanism, so a shared
        // kind:end node keeps the terminating edge (and its semantics).
        const existing = nodes.find((n) => n.id === '__end__');
        if (existing) {
          to = '__end__';
        } else {
          nodes.push({ id: '__end__', kind: 'end', ...(endLabel ? { label: endLabel } : {}) });
          to = '__end__';
        }
      } else {
        to = ensure(toTok, /^\[.*\]$/.test(toTok));
        if (fromIsPseudo) {
          const tn = nodes.find((x) => x.id === to);
          if (tn && tn.kind === 'state') tn.kind = 'start';
        }
      }
      if (from && to) edges.push({ from, to, ...(label ? { label } : {}) });
      continue;
    }
    // "state A" / state "label" as A / state A as "label" declarations
    const sm = line.match(/^state\s+(.+)$/);
    if (sm) {
      const decl = sm[1].trim();
      if (decl.endsWith('{')) {
        issues.push({
          severity: 'error',
          message: `Composite states are not supported by the importer ("state X { ... }") — flatten the inner states into top-level states first`,
          location: 'mermaid',
        });
        continue;
      }
      const as1 = decl.match(/^"([^"]*)"\s+as\s+([A-Za-z0-9_-]+)$/);
      const as2 = decl.match(/^([A-Za-z0-9_-]+)\s+as\s+"([^"]*)"$/);
      const q = decl.match(/^"([^"]*)"$/);
      if (as1) {
        ensure(as1[2], false, as1[1]);
      } else if (as2) {
        ensure(as2[1], false, as2[2]);
      } else if (q) {
        ensure(q[1], false);
      } else if (/^[A-Za-z0-9_-]+$/.test(decl)) {
        ensure(decl, false);
      } else {
        issues.push({ severity: 'error', message: `Unrecognized Mermaid state declaration: "${line}"`, location: 'mermaid' });
      }
      continue;
    }
    // bare state declaration: A  or  A: label
    const dm = line.match(/^(.+?)(?::\s*(.*))?$/);
    if (dm && dm[1].trim() && !/^(note|end)\b/i.test(dm[1])) {
      ensure(dm[1].trim(), /^\[.*\]$/.test(dm[1].trim()), dm[2]?.trim());
      continue;
    }
    issues.push({ severity: 'error', message: `Unrecognized Mermaid state syntax: "${line}"`, location: 'mermaid' });
  }

  return { type: 'state', nodes, edges };
}

/** ER diagram: entities with attributes + relationships. */
function importEr(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  let current: string | null = null;
  const attrs = new Map<string, { name: string; type?: string }[]>();
  const idByEntity = new Map<string, string>(); // entity name -> legal id

  const ensure = (name: string, alias?: string): string => {
    const clean = unquote(name);
    const existing = idByEntity.get(clean);
    if (existing) return existing;
    // entity names may be CJK — LGDL ids must be [A-Za-z0-9_-]; fully legal
    // ids (including "__x__" style) are kept as-is
    let base = clean;
    if (!/^[A-Za-z0-9_-]+$/.test(clean)) {
      base = clean.replace(/[^A-Za-z0-9_-]/g, '');
      // a CJK name sanitizes to empty/underscores — unreadable; fall back
      // to entityN with a warning (same treatment as mindmap/state)
      if (!/^[A-Za-z0-9]/.test(base)) {
        issues.push({
          severity: 'warning',
          message: `ER entity "${clean}" has no ASCII id — imported id is a fallback`,
          location: 'mermaid',
        });
        base = 'entity' + (nodes.length + 1);
      }
    }
    let id = base;
    let n = 1;
    while (nodes.some((x) => x.id === id)) id = `${base}_${n++}`;
    idByEntity.set(clean, id);
    nodes.push({ id, label: alias ?? clean, kind: 'entity' });
    attrs.set(id, []);
    return id;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('erDiagram') || line.startsWith('%%')) continue;
    // entity block: Name {  /  "Quoted Name" {  /  USERS["用户表"] {
    // (mermaid v10+ alias syntax keeps id + label)
    const openA = line.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5-]*)\s*\["([^"]*)"\]\s*\{\s*$/);
    if (openA) {
      current = ensure(openA[1], unquote(openA[2]));
      continue;
    }
    const open = line.match(/^"([^"]*)"\s*\{\s*$/);
    if (open) {
      current = ensure(open[1]);
      continue;
    }
    const open2 = line.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5-]*)\s*\{\s*$/);
    if (open2) {
      current = ensure(open2[1]);
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    // attribute inside entity: type name (mermaid standard), type "quoted
    // name" (names with spaces/CJK), type name PK|FK (key markers), or a
    // bare typeless name
    if (current) {
      const am = line.match(/^([A-Za-z_]+)\s+([\u4e00-\u9fa5A-Za-z0-9_]+)$/);
      const bq = line.match(/^([A-Za-z_]+)\s+"([^"]*)"$/);
      const bare = line.match(/^([\u4e00-\u9fa5A-Za-z0-9_]+)$/);
      const bareQ = line.match(/^"([^"]*)"$/); // typeless quoted name
      const keyed = line.match(/^([A-Za-z_]+)\s+([\u4e00-\u9fa5A-Za-z0-9_]+)\s+(PK|FK)$/);
      if (keyed) {
        issues.push({
          severity: 'warning',
          message: `ER attribute "${line}" has a key marker (${keyed[3]}) which LGDL members do not model — the key marker is dropped`,
          location: 'mermaid',
        });
        attrs.get(current)?.push({ name: keyed[2], type: keyed[1] });
      } else if (am) {
        // "name string" (intuitive order) is ambiguous vs "string name".
        // When the first word is not a known type, warn so the AI can check
        // instead of silently swapping name/type.
        if (!KNOWN_ER_TYPES.has(am[1].toLowerCase())) {
          issues.push({
            severity: 'warning',
            message: `ER attribute "${line}" — first word is not a known type; parsed as "type name" (mermaid standard). If you meant "name type", rename the attribute.`,
            location: 'mermaid',
          });
        }
        attrs.get(current)?.push({ name: am[2], type: am[1] });
      } else if (bq) {
        attrs.get(current)?.push({ name: bq[2], type: bq[1] });
      } else if (bare) {
        // typeless attribute — keep it typeless, never invent "string"
        attrs.get(current)?.push({ name: bare[1] });
      } else if (bareQ) {
        attrs.get(current)?.push({ name: bareQ[1] });
      } else {
        issues.push({ severity: 'error', message: `Unrecognized Mermaid erDiagram attribute syntax: "${line}"`, location: 'mermaid' });
      }
      continue;
    }
    // relationship: A ||--o{ B : label  (connectors optional — "A -- B" has
    // no cardinality and must not fabricate 0..* on import; entity names
    // may be quoted). Connector semantics are directional (left |o = 0..1,
    // right o| = 0..1; left }| = 1..*, right |{ = 1..*; ...).
    const TOKEN = String.raw`(?:"([^"]*)"|(\S+))`;
    const CONN = String.raw`(\|\||o\{|o\||\|\{|\}\||\}o|\|o|\{o|\.o)`;
    const rm = line.match(
      new RegExp(
        `^${TOKEN}\\s+(?:${CONN}\\s*)?(?:--|\\.\\.)\\s*(?:${CONN}\\s*)?${TOKEN}(?:\\s*:\\s*(.+))?$`,
      ),
    );
    if (rm) {
      const a = ensure(rm[1] ?? rm[2]);
      const b = ensure(rm[5] ?? rm[6]);
      const label = rm[7] ? unquote(rm[7].trim()) : undefined;
      const cardOfLeft = (conn: string | undefined): string | undefined => {
        if (!conn) return undefined;
        if (conn === '||') return '1';
        if (conn === '|o') return '0..1';
        if (conn === '}|') return '1..*';
        return '0..*'; // }o / o{ / {o / .o
      };
      const cardOfRight = (conn: string | undefined): string | undefined => {
        if (!conn) return undefined;
        if (conn === '||') return '1';
        if (conn === 'o|') return '0..1';
        if (conn === '|{') return '1..*';
        return '0..*'; // o{ / {o / .o
      };
      const from = cardOfLeft(rm[3]);
      const to = cardOfRight(rm[4]);
      edges.push({
        from: a,
        to: b,
        ...(label ? { label } : {}),
        ...(from !== undefined ? { cardinalityFrom: from } : {}),
        ...(to !== undefined ? { cardinalityTo: to } : {}),
      });
      continue;
    }
    issues.push({ severity: 'error', message: `Unrecognized Mermaid erDiagram syntax: "${line}"`, location: 'mermaid' });
  }

  // apply collected attributes to the structured members field
  for (const n of nodes) {
    const mem = attrs.get(n.id) ?? [];
    if (mem.length > 0) {
      n.members = mem.map((a) => ({
        kind: 'attribute',
        name: a.name,
        ...(a.type ? { type: a.type } : {}),
      }));
    }
  }

  return { type: 'er', nodes, edges };
}

/** Common ER data types — used to detect "name type" attribute order. */
const KNOWN_ER_TYPES = new Set([
  'int', 'integer', 'bigint', 'smallint', 'tinyint', 'serial',
  'float', 'double', 'decimal', 'numeric', 'number', 'real',
  'string', 'varchar', 'char', 'text', 'blob', 'clob',
  'bool', 'boolean', 'date', 'datetime', 'timestamp', 'time',
  'uuid', 'json', 'jsonb', 'xml', 'enum', 'money',
]);

/** Gantt: sections + tasks. */
function importGantt(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const groups: LgdlGroup[] = [];
  const seen = new Set<string>();
  const taskById = new Map<string, LgdlNode>(); // for `after` dependency starts

  /** Generate a legal task id from a label ("Another task" -> "Another_task"). */
  const genId = (label: string): string => {
    let base = label.replace(/[^A-Za-z0-9_-]/g, '_');
    if (!/^[A-Za-z0-9]/.test(base)) base = 'task' + (nodes.length + 1);
    let uid = base;
    let n = 1;
    while (seen.has(uid)) uid = `${base}_${n++}`;
    seen.add(uid);
    return uid;
  };

  // raw (possibly CJK) id -> legal id, so `after` references resolve too
  const idMap = new Map<string, string>();
  const resolveId = (raw: string): string => idMap.get(raw) ?? raw;
  const legalize = (raw: string, label: string): string => {
    if (/^[A-Za-z0-9_-]+$/.test(raw)) return raw;
    issues.push({
      severity: 'warning',
      message: `gantt task id "${raw}" is not a legal LGDL id — imported id is a fallback`,
      location: 'gantt',
    });
    // note: does NOT reserve the id in `seen` — the calling branch does that
    let base = label.replace(/[^A-Za-z0-9_-]/g, '_');
    if (!/^[A-Za-z0-9]/.test(base)) base = 'task' + (nodes.length + 1);
    let finalId = base;
    let n = 1;
    while (seen.has(finalId)) finalId = `${base}_${n++}`;
    idMap.set(raw, finalId);
    return finalId;
  };
  let currentSection: string | null = null;
  const sectionIds = new Map<string, string>();
  let title: string | undefined;
  // mermaid gantt date formats (default YYYY-MM-DD); dates are parsed
  // according to the declared format so "DD-MM-YYYY" etc. never become NaN
  let dateFmt = 'YYYY-MM-DD';

  /** Parse "01-02-2025" against a format like "DD-MM-YYYY". */
  const parseGanttDate = (s: string, fmt: string): Date | null => {
    const tokens: Array<'y' | 'm' | 'd'> = [];
    const reParts: string[] = [];
    let i = 0;
    while (i < fmt.length) {
      const rest = fmt.slice(i);
      if (rest.startsWith('YYYY')) {
        tokens.push('y');
        reParts.push('(\\d{4})');
        i += 4;
      } else if (rest.startsWith('MM')) {
        tokens.push('m');
        reParts.push('(\\d{1,2})');
        i += 2;
      } else if (rest.startsWith('DD')) {
        tokens.push('d');
        reParts.push('(\\d{1,2})');
        i += 2;
      } else {
        reParts.push(fmt[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        i++;
      }
    }
    const m = s.match(new RegExp('^' + reParts.join('') + '$'));
    if (!m) return null;
    const vals: Record<'y' | 'm' | 'd', number> = { y: 1970, m: 1, d: 1 };
    tokens.forEach((t, idx) => {
      vals[t] = parseInt(m[idx + 1], 10);
    });
    if (vals.y < 1970 || vals.m < 1 || vals.m > 12 || vals.d < 1 || vals.d > 31) return null;
    return new Date(Date.UTC(vals.y, vals.m - 1, vals.d));
  };

  // days since the gantt epoch (recorded in meta.ganttEpoch so the .lgdl
  // file is self-describing; "%% @lgdl gantt-epoch:" comments from
  // exportMermaid restore a custom epoch); dates before the base stay
  // negative so the round-trip never rewrites the date
  let ganttEpoch = '2026-01-01';
  const daysSinceBase = (startDate: string): number => {
    const base = new Date(ganttEpoch + 'T00:00:00Z');
    const start = parseGanttDate(startDate, dateFmt);
    if (!start) return NaN;
    return Math.round((start.getTime() - base.getTime()) / 86400000);
  };

  let pendingSectionId: string | undefined; // "%% @lgdl section-id:" from exportMermaid

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line || line.startsWith('gantt')) continue;
    const sid = line.match(/^%%\s*@lgdl\s+section-id:\s*([A-Za-z0-9_-]+)$/);
    if (sid) {
      pendingSectionId = sid[1];
      continue;
    }
    const ge = line.match(/^%%\s*@lgdl\s+gantt-epoch:\s*([\d-]+)$/);
    if (ge) {
      ganttEpoch = ge[1];
      continue;
    }
    if (line.startsWith('%%')) continue;
    if (/^(axisFormat|todayMarker|tickInterval|inclusiveEndDates|weekday)\b/.test(line)) continue;
    if (/^excludes\b/.test(line)) {
      issues.push({ severity: 'warning', message: `line ${li + 1}: "excludes" is dropped — non-working-day semantics are not preserved, dates are treated as calendar days`, location: 'gantt' });
      continue;
    }
    const dfm = line.match(/^dateFormat\s+(.+)$/);
    if (dfm) {
      dateFmt = dfm[1].trim();
      continue;
    }
    const tm = line.match(/^title\s+(.+)$/);
    if (tm) {
      title = tm[1].trim();
      continue;
    }
    const sm = line.match(/^section\s+(.+)$/);
    if (sm) {
      const name = unquote(sm[1].trim());
      // restore the original group id carried by the exportMermaid comment
      const gid =
        pendingSectionId !== undefined && !groups.some((g) => g.id === pendingSectionId)
          ? pendingSectionId
          : 'sec' + (sectionIds.size + 1);
      pendingSectionId = undefined;
      sectionIds.set(name, gid);
      groups.push({ id: gid, label: name, contains: [] });
      currentSection = name;
      continue;
    }
    // no-id task: "Task three :2023-01-12, 12d" — generate the id from the label
    const tmNoId = line.match(/^(.+?)\s*:\s*([\d-]+)\s*,\s*(\d+(?:\.\d+)?)\s*([dDwWMh])?\s*$/);
    if (tmNoId) {
      const label = unquote(tmNoId[1].trim()).replace(/,\s*$/, '');
      const id = genId(label);
      const unit = (tmNoId[4] ?? 'd').toLowerCase();
      const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : unit === 'h' ? 1 / 24 : 1;
      const dur = parseFloat(tmNoId[3]) * mult;
      const dayOffset = daysSinceBase(tmNoId[2]);
      if (Number.isNaN(dayOffset)) {
        issues.push({ severity: 'error', message: `line ${li + 1}: Invalid date "${tmNoId[2]}" for gantt task "${id}" (dateFormat ${dateFmt})`, location: 'gantt' });
        continue;
      }
      nodes.push({ id, label, attrs: { start: dayOffset, duration: dur } });
      taskById.set(id, nodes[nodes.length - 1]);
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // milestone: milestone name : id, date [, dur]  (mermaid standard also
    // writes "milestone 2.0 release, : id, ..." with a trailing comma)
    const ms = line.match(/^milestone\s+(.+?)\s*:\s*([A-Za-z0-9_\u4e00-\u9fa5-]+)\s*,\s*([\d-]+)(?:\s*,\s*(\d+)\s*([dDwWM])?)?$/);
    if (ms) {
      const label = unquote(ms[1].trim()).replace(/,\s*$/, '');
      // mermaid's date-style milestone writes the literal id "milestone"
      // ("里程碑 :milestone, 2026-03-08, 0d") — generate a unique id from the
      // label instead of colliding every milestone into one node
      let id = ms[2];
      if (id === 'milestone') id = legalize(label, label);
      else id = legalize(id, label);
      const startDate = ms[3];
      // keep an explicit duration if the mermaid line carries one
      const unit = (ms[5] ?? 'd').toLowerCase();
      const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : 1;
      const dur = ms[4] ? parseInt(ms[4], 10) * mult : 0;
      if (seen.has(id)) {
        issues.push({ severity: 'warning', message: `Duplicate gantt task id: "${id}"`, location: `gantt` });
        continue;
      }
      seen.add(id);
      const dayOffset = daysSinceBase(startDate);
      if (Number.isNaN(dayOffset)) {
        issues.push({
          severity: 'error',
          message: `Invalid date "${startDate}" for gantt task "${id}" (dateFormat ${dateFmt})`,
          location: 'gantt',
        });
        continue;
      }
      nodes.push({ id, label, kind: 'milestone', attrs: { start: dayOffset, duration: dur } });
      taskById.set(id, nodes[nodes.length - 1]);
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // task: label : id, date, dur[unit]  (units: d days, w weeks, M months)
    const tm2 = line.match(/^(.+?)\s*:\s*(?:(done|active|crit)(?:\s*,\s*(done|active|crit))?\s*,\s*)?([A-Za-z0-9_\u4e00-\u9fa5-]+)\s*,\s*([\d-]+)\s*,\s*(?:(\d+(?:\.\d+)?)\s*([dDwWMh])?|([\d-]+))(?:\s*,\s*(done|active|crit)(?:\s*,\s*(done|active|crit))?)?\s*$/);
    if (tm2) {
      const label = unquote(tm2[1].trim());
      let id = tm2[4];
      let kind: LgdlNode['kind'] | undefined;
      if (id === 'milestone') {
        kind = 'milestone';
        id = legalize(label, label);
      } else {
        id = legalize(id, label);
      }
      const startDate = tm2[5];
      // duration may be "3d"/"24h"/"2w", or a date range "2014-01-06, 2014-01-08"
      let dur: number | undefined;
      if (tm2[6] !== undefined) {
        const unit = (tm2[7] ?? 'd').toLowerCase();
        const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : unit === 'h' ? 1 / 24 : 1;
        dur = parseFloat(tm2[6]) * mult;
      } else if (tm2[8] !== undefined) {
        const d1 = parseGanttDate(startDate, dateFmt);
        const d2 = parseGanttDate(tm2[8], dateFmt);
        if (d1 && d2) dur = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        if (dur !== undefined && dur < 0) {
          issues.push({ severity: 'error', message: `gantt task "${id}" has a reversed date range (start after end)`, location: 'gantt' });
          continue;
        }
      }
      if (dur === undefined) {
        issues.push({ severity: 'error', message: `gantt task "${id}" has no parsable duration`, location: 'gantt' });
        continue;
      }
      // mermaid task status may precede the id ("任务 :done, t1, date, dur")
      // or trail it ("任务 : t1, date, dur, done, crit"); combine
      const statusParts = [tm2[2], tm2[3], tm2[9], tm2[10]].filter(Boolean);
      const status = statusParts.length > 0 ? statusParts.join(',') : undefined;
      if (seen.has(id)) {
        issues.push({ severity: 'warning', message: `Duplicate gantt task id: "${id}"`, location: `gantt` });
        continue;
      }
      seen.add(id);
      const dayOffset = daysSinceBase(startDate);
      if (Number.isNaN(dayOffset)) {
        issues.push({
          severity: 'error',
          message: `Invalid date "${startDate}" for gantt task "${id}" (dateFormat ${dateFmt})`,
          location: 'gantt',
        });
        continue;
      }
      nodes.push({ id, label, ...(kind ? { kind } : {}), attrs: { start: dayOffset, duration: dur, ...(status ? { status } : {}) } });
      taskById.set(id, nodes[nodes.length - 1]);
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // task with an `after` dependency: 编码 : a2, after a1, 5d  (adjacent)
    // or mermaid-standard spaced gap form: 编码 : a2, after a1 3d, 5d.
    // A "milestone 名 : id, after dep, dur" line is a milestone with a
    // dependency — strip the prefix and keep kind: milestone.
    const td = line.match(/^(.+?)\s*:\s*(?:(done|active|crit)(?:\s*,\s*(done|active|crit))?\s*,\s*)?([A-Za-z0-9_\u4e00-\u9fa5-]+)\s*,\s*after\s+([A-Za-z0-9_\u4e00-\u9fa5-]+)(?:\s+(\d+)\s*([dDwWMh]))?\s*,\s*(\d+(?:\.\d+)?)\s*([dDwWMh])?(?:\s*,\s*(done|active|crit)(?:\s*,\s*(done|active|crit))?)?\s*$/);
    if (td) {
      let label = unquote(td[1].trim()).replace(/,\s*$/, '');
      let kind: LgdlNode['kind'] | undefined;
      if (/^milestone\s+/i.test(label)) {
        label = label.replace(/^milestone\s+/i, '').trim();
        kind = 'milestone';
      }
      // attribute-style milestone: "上线发布 : milestone, after 测试, 1d" —
      // the token "milestone" is a kind marker, not the task id
      const statusParts = [td[2], td[3], td[10], td[11]].filter(Boolean);
      const status = statusParts.length > 0 ? statusParts.join(',') : undefined;
      let id = td[4];
      if (id === 'milestone') {
        kind = 'milestone';
        id = legalize(label, label);
      } else {
        id = legalize(id, label);
      }
      const dep = resolveId(td[5]);
      const gapUnit = (td[7] ?? 'd').toLowerCase();
      const gapMult = gapUnit === 'w' ? 7 : gapUnit === 'm' ? 30 : gapUnit === 'h' ? 1 / 24 : 1;
      const gap = td[6] ? parseFloat(td[6]) * gapMult : 0;
      const unit = (td[9] ?? 'd').toLowerCase();
      const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : unit === 'h' ? 1 / 24 : 1;
      const dur = parseFloat(td[8]) * mult;
      if (seen.has(id)) {
        issues.push({ severity: 'warning', message: `Duplicate gantt task id: "${id}"`, location: `gantt` });
        continue;
      }
      seen.add(id);
      // start = end of the dependency (+ optional gap); the dependency must
      // be declared earlier in the file
      const depNode = taskById.get(dep);
      const depEnd =
        depNode && typeof depNode.attrs?.start === 'number' && typeof depNode.attrs?.duration === 'number'
          ? depNode.attrs.start + depNode.attrs.duration
          : undefined;
      if (depEnd === undefined) {
        issues.push({
          severity: 'warning',
          message: `gantt task "${id}" depends on "${dep}" which is not declared before it — start falls back to 0`,
          location: 'gantt',
        });
      }
      const start = (depEnd ?? 0) + gap;
      nodes.push({ id, label, ...(kind ? { kind } : {}), attrs: { start, duration: dur, ...(status ? { status } : {}) } });
      taskById.set(id, nodes[nodes.length - 1]);
      edges.push({ from: dep, to: id });
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // legacy milestone: name : milestone, id, date
    const msOld = line.match(/^(.+?)\s*:\s*milestone,\s*([A-Za-z0-9_\u4e00-\u9fa5-]+)\s*,\s*([\d-]+)(?:\s*,\s*\d+(?:\.\d+)?[dDwWMh]?)?\s*$/);
    if (msOld) {
      const label = unquote(msOld[1].trim());
      let id = msOld[2];
      if (id === 'milestone') id = legalize(label, label);
      else id = legalize(id, label);
      if (seen.has(id)) {
        issues.push({ severity: 'warning', message: `Duplicate gantt task id: "${id}"`, location: `gantt` });
        continue;
      }
      seen.add(id);
      const dayOffset = daysSinceBase(msOld[3]);
      if (Number.isNaN(dayOffset)) {
        issues.push({
          severity: 'error',
          message: `Invalid date "${msOld[3]}" for gantt task "${id}" (dateFormat ${dateFmt})`,
          location: 'gantt',
        });
        continue;
      }
      nodes.push({ id, label, kind: 'milestone', attrs: { start: dayOffset, duration: 0 } });
      taskById.set(id, nodes[nodes.length - 1]);
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // shorthand dependency: "Another task :after a1, 20d" (no explicit id)
    const tds = line.match(/^(.+?)\s*:after\s+([A-Za-z0-9_\u4e00-\u9fa5-]+)(?:\s+(\d+)\s*([dDwWM]))?\s*,\s*(\d+)\s*([dDwWM])?$/);
    if (tds) {
      const label = unquote(tds[1].trim()).replace(/,\s*$/, '');
      const id = genId(label);
      const dep = resolveId(tds[2]);
      const gapUnit = (tds[4] ?? 'd').toLowerCase();
      const gapMult = gapUnit === 'w' ? 7 : gapUnit === 'm' ? 30 : 1;
      const gap = tds[3] ? parseInt(tds[3], 10) * gapMult : 0;
      const unit = (tds[6] ?? 'd').toLowerCase();
      const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : 1;
      const dur = parseInt(tds[5], 10) * mult;
      const depNode = taskById.get(dep);
      const depEnd =
        depNode && typeof depNode.attrs?.start === 'number' && typeof depNode.attrs?.duration === 'number'
          ? depNode.attrs.start + depNode.attrs.duration
          : undefined;
      if (depEnd === undefined) {
        issues.push({
          severity: 'warning',
          message: `gantt task "${id}" depends on "${dep}" which is not declared before it — start falls back to 0`,
          location: 'gantt',
        });
      }
      const start = (depEnd ?? 0) + gap;
      nodes.push({ id, label, attrs: { start, duration: dur } });
      taskById.set(id, nodes[nodes.length - 1]);
      edges.push({ from: dep, to: id });
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // duration-only task: "another task : 24d" (no id, no date)
    const tmOnly = line.match(/^(.+?)\s*:\s*(\d+)\s*([dDwWM])?$/);
    if (tmOnly) {
      const label = unquote(tmOnly[1].trim()).replace(/,\s*$/, '');
      const id = genId(label);
      const unit = (tmOnly[3] ?? 'd').toLowerCase();
      const mult = unit === 'w' ? 7 : unit === 'm' ? 30 : 1;
      const dur = parseInt(tmOnly[2], 10) * mult;
      nodes.push({ id, label, attrs: { start: 0, duration: dur } });
      taskById.set(id, nodes[nodes.length - 1]);
      if (currentSection) {
        const g = groups.find((x) => x.label === currentSection);
        if (g) g.contains.push(id);
      }
      continue;
    }
    // milestone / crit / after / dependency — not representable, reject loudly
    issues.push({ severity: 'error', message: `line ${li + 1}: Unrecognized Mermaid gantt syntax: "${line}"`, location: 'mermaid' });
  }

  // groups are now nodes (kind === 'group'), not a separate document field
  const allNodes: LgdlNode[] = [...nodes];
  for (const g of groups) {
    allNodes.push({ id: g.id, label: g.label, kind: 'group', contains: [...g.contains], attrs: g.attrs });
  }
  return { type: 'gantt', nodes: allNodes, edges, meta: { ganttEpoch }, ...(title ? { title } : {}) };
}

/** Class diagram: classes with members + relationships. */
function importClassDiagram(lines: string[], issues: LgdlIssue[]): LgdlDocument {
  const nodes: LgdlNode[] = [];
  const edges: LgdlEdge[] = [];
  const seen = new Set<string>();
  // quoted class names ("User Account") reuse one node by their label;
  // "%% @lgdl class-id:" comments from exportMermaid restore the original id
  const labelToId = new Map<string, string>();
  let pendingClassId: string | undefined;
  let pendingLabel: string | undefined;
  const ensure = (id: string, label?: string, declaring = false): string => {
    let finalId = id;
    if (!/^[A-Za-z0-9_]+$/.test(finalId)) {
      const existing = labelToId.get(id);
      if (existing) return existing;
      issues.push({
        severity: 'warning',
        message: `line: class name "${id}" is not a legal LGDL id — imported id is a fallback`,
        location: 'mermaid',
      });
      let n = 1;
      finalId = '__cls' + (nodes.length + 1);
      while (seen.has(finalId)) finalId = '__cls' + (++n);
      labelToId.set(id, finalId);
    }
    const resolved = pendingClassId ?? finalId;
    pendingClassId = undefined;
    // a real class whose id is already taken (e.g. by an earlier fallback)
    // gets a suffixed id — but only when DECLARING; a reference (relationship
    // line) must always reuse the existing node, never fork a duplicate
    if (seen.has(resolved)) {
      const existing = nodes.find((x) => x.id === resolved);
      if (declaring && existing && existing.label !== (label ?? id)) {
        issues.push({
          severity: 'warning',
          message: `class "${id}" collides with id "${resolved}" (used by a fallback) — imported id gets a suffix`,
          location: 'mermaid',
        });
        let n = 1;
        let alt = `${resolved}_${++n}`;
        while (seen.has(alt)) alt = `${resolved}_${++n}`;
        nodes.push({ id: alt, label: label ?? id, kind: 'entity' });
        seen.add(alt);
        return alt;
      }
      return resolved;
    }
    nodes.push({ id: resolved, label: label ?? id, kind: 'entity' });
    seen.add(resolved);
    if (resolved !== finalId) labelToId.set(id, resolved);
    return resolved;
  };
  const visOf = (sym: string): string | undefined =>
    ({ '+': 'public', '-': 'private', '#': 'protected', '~': 'package' })[sym];
  let current: string | null = null;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line || line.startsWith('classDiagram')) continue;
    const cid = line.match(/^%%\s*@lgdl\s+class-id:\s*([A-Za-z0-9_]+)$/);
    if (cid) {
      pendingClassId = cid[1];
      continue;
    }
    const cl = line.match(/^%%\s*@lgdl\s+label:\s*(.+)$/);
    if (cl) {
      pendingLabel = unquote(cl[1].trim());
      continue;
    }
    if (line.startsWith('%%')) continue;
    // class Name { ... } block  (or a bare "class Name" declaration)
    const open = line.match(/^class\s+(?:"([^"]*)"|([A-Za-z0-9_]+))\s*\{?\s*$/);
    if (open) {
      const rawName = open[1] ?? open[2];
      const finalId = ensure(rawName, pendingLabel ?? unquote(rawName), true);
      pendingLabel = undefined;
      // only a "{" form opens a member block — a bare declaration must not
      // swallow the relationship lines that follow it
      current = /{\s*$/.test(line) ? finalId : null;
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    if (current) {
      // method: +login(pwd: string) bool  /  -checkout()  /
      //          +void calcTotal()  (type-first layout, Java-style)
      const mm = line.match(/^([+#~-]?)\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*([A-Za-z0-9_]+))?$/);
      if (mm) {
        const member: LgdlMember = {
          kind: 'method',
          name: mm[2],
          ...(mm[1] ? { visibility: visOf(mm[1]) as LgdlMember['visibility'] } : {}),
          ...(mm[3] ? { params: `(${mm[3].trim()})` } : {}),
          ...(mm[4] ? { type: mm[4] } : {}),
        };
        const n = nodes.find((x) => x.id === current)!;
        n.members = [...(n.members ?? []), member];
        continue;
      }
      const mm2 = line.match(/^([+#~-]?)\s*([A-Za-z0-9_]+(?:<[^>]+>)?)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*([A-Za-z0-9_]+))?$/);
      if (mm2) {
        const member: LgdlMember = {
          kind: 'method',
          name: mm2[3],
          ...(mm2[1] ? { visibility: visOf(mm2[1]) as LgdlMember['visibility'] } : {}),
          ...(mm2[4] ? { params: `(${mm2[4].trim()})` } : {}),
          ...(mm2[2] ? { type: mm2[2] } : {}),
          ...(mm2[5] ? { type: mm2[5] } : {}),
        };
        const n = nodes.find((x) => x.id === current)!;
        n.members = [...(n.members ?? []), member];
        continue;
      }
      // attribute: +int id  /  #string name  /  bare name (typeless)
      const ma = line.match(/^([+#~-]?)\s*([A-Za-z0-9_]+(?:<[^>]+>)?)\s+([A-Za-z0-9_]+)$/);
      if (ma) {
        const member: LgdlMember = {
          kind: 'attribute',
          name: ma[3],
          ...(ma[1] ? { visibility: visOf(ma[1]) as LgdlMember['visibility'] } : {}),
          type: ma[2],
        };
        const n = nodes.find((x) => x.id === current)!;
        n.members = [...(n.members ?? []), member];
        continue;
      }
      const bareAttr = line.match(/^([+#~-]?)\s*([A-Za-z0-9_]+)$/);
      if (bareAttr) {
        const member: LgdlMember = {
          kind: 'attribute',
          name: bareAttr[2],
          ...(bareAttr[1] ? { visibility: visOf(bareAttr[1]) as LgdlMember['visibility'] } : {}),
        };
        const n = nodes.find((x) => x.id === current)!;
        n.members = [...(n.members ?? []), member];
        continue;
      }
      issues.push({ severity: 'warning', message: `line ${li + 1}: unrecognized class member skipped: "${line}"`, location: 'mermaid' });
      continue;
    }
    // relationship: A <|-- B (inheritance), ..|> (implementation), *--
    // (composition), o-- (aggregation), --> (dependency), -- (association),
    // <-- / <..> / <.. / ..> (reverse or dotted variants)
    const rm = line.match(/^(?:"([^"]*)"|([A-Za-z0-9_]+))(?:\s+"([^"]*)")?\s*(<\|--|\.\.\|>|\*--|o--|-->|--|<--|<\.\.>|<\.\.|\.\.>|--\|>|\.\.)\s*(?:"([^"]*)")?\s*(?:"([^"]*)"|([A-Za-z0-9_]+))(?:\s*:\s*(.+))?$/);
    if (rm) {
      const conn = rm[4];
      let a = ensure(rm[1] ?? rm[2], rm[1] ?? rm[2]);
      let b = ensure(rm[6] ?? rm[7], rm[6] ?? rm[7]);
      let fromCard = rm[3];
      let toCard = rm[5];
      // reverse connectors (<--, <.., <..>) point at the left class — swap
      // endpoints AND their cardinalities so "E "1" <.. "0..*" F" keeps the
      // right multiplicities on the right ends
      if (conn === '<--' || conn === '<..' || conn === '<..>') {
        [a, b] = [b, a];
        [fromCard, toCard] = [toCard, fromCard];
      }
      const rel = { '<|--': 'inheritance', '..|>': 'implementation', '*--': 'composition', 'o--': 'aggregation', '-->': 'dependency', '--': 'association', '<--': 'association', '<..>': 'association', '<..': 'dependency', '..>': 'dependency', '--|>': 'inheritance', '..': 'association' }[conn];
      // mermaid class cardinality labels are free text — normalize the
      // common synonyms to LGDL's supported set
      const normCard = (c: string | undefined): string | undefined =>
        c === 'many' || c === 'n' || c === 'zero or more' ? '*' : c;
      edges.push({
        from: a,
        to: b,
        ...(rm[8] ? { label: rm[8].trim() } : {}),
        ...(fromCard !== undefined ? { cardinalityFrom: normCard(fromCard) } : {}),
        ...(toCard !== undefined ? { cardinalityTo: normCard(toCard) } : {}),
        attrs: { relation: rel },
      });
      continue;
    }
    issues.push({ severity: 'warning', message: `line ${li + 1}: unrecognized classDiagram syntax skipped: "${line}"`, location: 'mermaid' });
  }
  return { type: 'uml-class', nodes, edges };
}

/** Parse Mermaid text into an LGDL document. */
export function importMermaid(source: string): MermaidImportResult {
  // strip a UTF-8 BOM — otherwise the first line becomes "\uFEFFflowchart TD"
  // and the diagram type is reported as an unreadable garbage string
  source = source.replace(/^\uFEFF/, '');
  const lines = source.split(/\r?\n/);
  // skip YAML frontmatter ("---\ntitle: ...\n---") emitted by mermaid.live /
  // mermaid-cli — it is configuration, not a diagram type
  if (lines.length > 0 && lines[0].trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end !== -1) lines.splice(0, end + 1);
  }
  const issues: LgdlIssue[] = [];
  // "%% @lgdl title: ..." comment emitted by exportMermaid — restore it on
  // any diagram type that has no native title syntax
  const titleComment = lines
    .map((l) => l.trim())
    .find((l) => /^%%\s*@lgdl\s+title:\s*.+$/.test(l));
  const first = lines.find((l) => l.trim() && !l.trim().startsWith('%%'))?.trim() ?? '';
  const trimmed = first.replace(/[{}\[\]"]/g, '').trim();

  let doc: LgdlDocument;
  if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
    doc = importFlowchart(lines, issues);
  } else if (trimmed.startsWith('sequenceDiagram')) {
    doc = importSequence(lines, issues);
  } else if (trimmed.startsWith('classDiagram')) {
    doc = importClassDiagram(lines, issues);
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
      message: `Unsupported Mermaid diagram type: "${trimmed || 'empty'}". Supported: flowchart, sequenceDiagram, classDiagram, mindmap, stateDiagram-v2, erDiagram, gantt`,
      location: 'mermaid',
    });
    return { document: { type: 'flowchart', nodes: [], edges: [], }, issues, valid: false };
  }

  if (titleComment && !doc.title) {
    doc.title = unquote(titleComment.replace(/^%%\s*@lgdl\s+title:\s*/, '').trim());
  }

  return { document: doc, issues, valid: issues.every((i) => i.severity !== 'error') };
}
