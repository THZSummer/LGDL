/**
 * LGDL parser and validator.
 *
 * v0.1 supports YAML via a minimal hand-rolled parser to keep the core
 * dependency-free. In future this can be swapped for a full YAML library
 * without changing the public API.
 */
import type {
  DiagramType,
  LgdlDocument,
  LgdlEdge,
  LgdlGroup,
  LgdlIssue,
  LgdlNode,
  NodeKind,
  ParseResult,
} from './types.js';

const DIAGRAM_TYPES: readonly DiagramType[] = [
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

const NODE_KINDS: readonly NodeKind[] = [
  'start',
  'end',
  'process',
  'decision',
  'entity',
  'note',
  'state',
  'milestone',
];

const MEMBER_KINDS: readonly string[] = ['attribute', 'method'];
const MEMBER_VISIBILITIES: readonly string[] = ['public', 'private', 'protected', 'package'];

/** Parse an LGDL document from YAML text. */
export function parseLgdl(source: string): ParseResult {
  const issues: LgdlIssue[] = [];
  const doc = parseYamlShallow(source, issues);
  return validate(doc, issues);
}

/** Validate an already-parsed (or hand-built) document. */
export function validate(
  doc: Partial<LgdlDocument>,
  issues: LgdlIssue[] = [],
): ParseResult {
  const result: LgdlDocument = {
    type: 'flowchart',
    nodes: [],
    edges: [],
    groups: [],
    ...doc,
  };

  // type
  if (!DIAGRAM_TYPES.includes(result.type as DiagramType)) {
    issues.push({
      severity: 'error',
      message: `Unsupported diagram type: "${result.type}". Supported: ${DIAGRAM_TYPES.join(', ')}`,
      location: 'type',
    });
  }

  // nodes: ids must be unique
  const seenIds = new Set<string>();
  result.nodes.forEach((node, i) => {
    if (!node.id || !/^[A-Za-z0-9_-]+$/.test(node.id)) {
      issues.push({
        severity: 'error',
        message: `Node id must be non-empty and contain only letters, digits, underscore, hyphen (got "${node.id}")`,
        location: `nodes[${i}].id`,
      });
    } else if (seenIds.has(node.id)) {
      issues.push({
        severity: 'error',
        message: `Duplicate node id: "${node.id}"`,
        location: `nodes[${i}].id`,
      });
    }
    seenIds.add(node.id);

    if (node.kind && !NODE_KINDS.includes(node.kind)) {
      issues.push({
        severity: 'error',
        message: `Unknown node kind: "${node.kind}". Supported kinds: ${NODE_KINDS.join(', ')}`,
        location: `nodes[${i}].kind`,
      });
    }

    // members: the explicit class-member field. Strict per-kind/per-type
    // rules — a member on the wrong kind or diagram type is an error, never
    // silently ignored.
    if (node.members !== undefined) {
      if ((node.kind ?? 'process') !== 'entity') {
        issues.push({
          severity: 'error',
          message: `"members" is only valid on kind: entity (node "${node.id}" has kind "${node.kind ?? 'process'}")`,
          location: `nodes[${i}].members`,
        });
      }
      if (result.type !== 'uml-class' && result.type !== 'er') {
        issues.push({
          severity: 'error',
          message: `"members" is only supported in uml-class and er diagrams (node "${node.id}", diagram type "${result.type}")`,
          location: `nodes[${i}].members`,
        });
      }
      node.members.forEach((member, mi) => {
        if (!member || typeof member !== 'object') {
          issues.push({
            severity: 'error',
            message: `Member must be an object with at least "kind" and "name" (node "${node.id}")`,
            location: `nodes[${i}].members[${mi}]`,
          });
          return;
        }
        const loc = `nodes[${i}].members[${mi}]`;
        if (!MEMBER_KINDS.includes(member.kind)) {
          issues.push({
            severity: 'error',
            message: `Unknown member kind: "${member.kind ?? ''}". Supported: ${MEMBER_KINDS.join(', ')}`,
            location: `${loc}.kind`,
          });
        }
        if (typeof member.name !== 'string' || member.name.trim() === '') {
          issues.push({
            severity: 'error',
            message: `Member name is required (node "${node.id}")`,
            location: `${loc}.name`,
          });
        }
        if (member.visibility !== undefined && !MEMBER_VISIBILITIES.includes(member.visibility)) {
          issues.push({
            severity: 'error',
            message: `Unknown member visibility: "${member.visibility}". Supported: ${MEMBER_VISIBILITIES.join(', ')}`,
            location: `${loc}.visibility`,
          });
        }
        if (member.kind === 'attribute' && member.params !== undefined) {
          issues.push({
            severity: 'error',
            message: `Attribute member "${member.name ?? ''}" must not have "params" (params are for methods)`,
            location: `${loc}.params`,
          });
        }
        if (member.kind === 'method' && member.params !== undefined && typeof member.params !== 'string') {
          issues.push({
            severity: 'error',
            message: `Method params must be a string (e.g. "(items: list)") for "${member.name ?? ''}"`,
            location: `${loc}.params`,
          });
        }
      });
    }

    // Strict legacy rejection: entity members must use the `members` field,
    // never newline-packed labels. Old "User\n- id: int\n+ login()" labels
    // are rejected instead of silently degrading.
    if (
      node.members === undefined &&
      (node.kind ?? 'process') === 'entity' &&
      (result.type === 'uml-class' || result.type === 'er') &&
      (node.label ?? '').includes('\n')
    ) {
      issues.push({
        severity: 'error',
        message: `Entity "${node.id}" label must be a plain name — newline-packed members are no longer supported, use the "members" field`,
        location: `nodes[${i}].label`,
      });
    }
  });

  // collect group ids early so edges may reference groups (aggregate edges)
  const groupIds = new Set<string>();
  for (const g of result.groups) {
    if (g.id) groupIds.add(g.id);
  }

  // edges: from/to must reference existing nodes OR groups (aggregate edges)
  result.edges.forEach((edge, i) => {
    if (!seenIds.has(edge.from) && !groupIds.has(edge.from)) {
      issues.push({
        severity: 'error',
        message: `Edge references unknown source node or group: "${edge.from}"`,
        location: `edges[${i}].from`,
      });
    }
    if (!seenIds.has(edge.to) && !groupIds.has(edge.to)) {
      issues.push({
        severity: 'error',
        message: `Edge references unknown target node or group: "${edge.to}"`,
        location: `edges[${i}].to`,
      });
    }
    for (const f of ['cardinalityFrom', 'cardinalityTo'] as const) {
      const v = edge[f];
      if (v !== undefined && typeof v !== 'string') {
        issues.push({
          severity: 'error',
          message: `Edge "${edge.from} -> ${edge.to}" ${f} must be a string (e.g. "1", "*", "0..1")`,
          location: `edges[${i}].${f}`,
        });
      }
    }
    // Strict legacy rejection: multiplicity must live in the explicit
    // cardinalityFrom/To fields, never packed into the label ("拥有 1..*")
    // nor in the attrs escape hatch.
    if (result.type === 'er' || result.type === 'uml-class') {
      if (edge.label !== undefined && /\s+\d+\.\.(\d+|\*)$/.test(edge.label)) {
        issues.push({
          severity: 'error',
          message: `Edge "${edge.from} -> ${edge.to}" label mixes a multiplicity ("${edge.label}") — put the relationship name in "label" and the multiplicities in "cardinalityFrom"/"cardinalityTo"`,
          location: `edges[${i}].label`,
        });
      }
      if ((edge.attrs as { cardinality?: unknown } | undefined)?.cardinality !== undefined) {
        issues.push({
          severity: 'error',
          message: `Edge "${edge.from} -> ${edge.to}" uses attrs.cardinality — the escape hatch no longer carries multiplicity; use "cardinalityFrom"/"cardinalityTo"`,
          location: `edges[${i}].attrs`,
        });
      }
    }
  });

  // groups: ids unique; contains must reference existing nodes OR groups;
  // no member (node or group) in two groups; no containment cycles
  const seenGroupIds = new Set<string>();
  result.groups.forEach((group, i) => {
    if (!group.id || !/^[A-Za-z0-9_-]+$/.test(group.id)) {
      issues.push({
        severity: 'error',
        message: `Group id must be non-empty and contain only letters, digits, underscore, hyphen (got "${group.id}")`,
        location: `groups[${i}].id`,
      });
    } else if (seenGroupIds.has(group.id)) {
      issues.push({
        severity: 'error',
        message: `Duplicate group id: "${group.id}"`,
        location: `groups[${i}].id`,
      });
    }
    seenGroupIds.add(group.id);
  });

  result.groups.forEach((group, i) => {
    group.contains?.forEach((memberId, ci) => {
      if (!seenIds.has(memberId) && !groupIds.has(memberId)) {
        issues.push({
          severity: 'error',
          message: `Group "${group.id}" contains unknown node or group: "${memberId}"`,
          location: `groups[${i}].contains[${ci}]`,
        });
      }
    });
  });

  const groupMembership = new Map<string, string>();
  result.groups.forEach((group, gi) => {
    group.contains?.forEach((memberId, ci) => {
      if (groupMembership.has(memberId)) {
        issues.push({
          severity: 'error',
          message: `"${memberId}" belongs to both "${groupMembership.get(memberId)}" and "${group.id}"`,
          location: `groups[${gi}].contains[${ci}]`,
        });
      }
      groupMembership.set(memberId, group.id);
    });
  });

  // containment cycles: DFS over group -> contained group edges
  const groupAdj = new Map<string, string[]>();
  for (const g of result.groups) {
    groupAdj.set(g.id, (g.contains ?? []).filter((m) => groupIds.has(m)));
  }
  const visitState = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 visiting, 2 done
  const cycleGroups = new Set<string>();
  const visit = (gid: string, stack: string[]): void => {
    const s = visitState.get(gid) ?? 0;
    if (s === 2) return;
    if (s === 1) {
      const start = stack.indexOf(gid);
      if (start !== -1) {
        for (let k = start; k < stack.length; k++) cycleGroups.add(stack[k]);
      }
      return;
    }
    visitState.set(gid, 1);
    for (const child of groupAdj.get(gid) ?? []) {
      visit(child, [...stack, gid]);
    }
    visitState.set(gid, 2);
  };
  for (const gid of groupIds) visit(gid, []);
  for (const gid of cycleGroups) {
    const gi = result.groups.findIndex((g) => g.id === gid);
    issues.push({
      severity: 'error',
      message: `Group containment cycle detected involving group "${gid}"`,
      location: gi === -1 ? undefined : `groups[${gi}]`,
    });
  }

  return { document: result, issues, valid: !issues.some((i) => i.severity === 'error') };
}

/**
 * Minimal YAML subset parser for v0.1:
 * - top-level string keys (title, type)
 * - node/edge/group object lists under indented keys
 * - scalar values (string/number/boolean)
 * - inline lists: [a, b, c]
 * - nested objects (e.g. attrs: { start: ..., end: ... })
 */
function parseYamlShallow(source: string, issues: LgdlIssue[]): Partial<LgdlDocument> {
  const lines = source.split(/\r?\n/);
  const { obj } = parseBlock(lines, 0, 0, issues);
  return obj as Partial<LgdlDocument>;
}

/**
 * Recursively parse a YAML block at a given indentation.
 * Returns the parsed object and the index after the block.
 */
function parseBlock(
  lines: string[],
  start: number,
  indent: number,
  issues: LgdlIssue[],
): { obj: Record<string, unknown>; next: number } {
  const obj: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }
    const li = line.length - line.trimStart().length;
    if (li < indent) break; // dedent: block ended
    if (li > indent) {
      issues.push({ severity: 'error', message: `Unexpected indentation at line ${i + 1}`, location: `line ${i + 1}` });
      i++;
      continue;
    }

    const colon = findTopLevelColon(trimmed);
    if (colon === -1) {
      issues.push({ severity: 'error', message: `Cannot parse line: "${trimmed}"`, location: `line ${i + 1}` });
      i++;
      continue;
    }
    const key = trimmed.slice(0, colon).trim();
    const rawValue = trimmed.slice(colon + 1).trim();
    i++;

    // Empty value with deeper-indented children?
    if (rawValue === '' && i < lines.length && lines[i].trim() && lines[i].length - lines[i].trimStart().length > indent) {
      const childIndent = lines[i].length - lines[i].trimStart().length;
      if (lines[i].trim().startsWith('- ')) {
        // list of items (nodes / edges / groups / members / ...)
        const { items, next } = parseListItems(lines, i, childIndent, issues);
        obj[key] = items;
        i = next;
      } else {
        // nested object (e.g. attrs)
        const sub = parseBlock(lines, i, childIndent, issues);
        obj[key] = sub.obj;
        i = sub.next;
      }
    } else {
      obj[key] = parseScalar(rawValue);
    }
  }

  return { obj, next: i };
}

/**
 * Parse a block of list items at a given indentation.
 * Items may be scalars (`- foo`) or objects (`- key: value` plus deeper
 * fields, and nested objects/lists under those fields — e.g. `members:`).
 */
function parseListItems(
  lines: string[],
  start: number,
  itemIndent: number,
  issues: LgdlIssue[],
): { items: unknown[]; next: number } {
  const items: unknown[] = [];
  let i = start;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || l.trim().startsWith('#')) {
      i++;
      continue;
    }
    const lli = l.length - l.trimStart().length;
    if (lli < itemIndent) break; // dedent: list ended
    if (lli !== itemIndent || !l.trim().startsWith('- ')) {
      issues.push({ severity: 'error', message: `Expected list item at line ${i + 1}`, location: 'list' });
      break;
    }
    const itemText = l.trim().slice(2).trim();
    if (itemText === '' || findTopLevelColon(itemText) !== -1) {
      // object item: "- key: value" possibly followed by more fields
      const item: Record<string, unknown> = {};
      if (itemText !== '') {
        const c = findTopLevelColon(itemText);
        if (c === -1) {
          issues.push({ severity: 'error', message: `Cannot parse list item: "${itemText}"`, location: `line ${i + 1}` });
        } else {
          item[itemText.slice(0, c).trim()] = parseFieldValue(itemText.slice(0, c).trim(), itemText.slice(c + 1).trim());
        }
      }
      i++;
      // consume following fields belonging to this item (deeper indent)
      while (i < lines.length) {
        const nl = lines[i];
        if (!nl.trim() || nl.trim().startsWith('#')) {
          i++;
          continue;
        }
        const ni = nl.length - nl.trimStart().length;
        if (ni <= itemIndent) break;
        const c = findTopLevelColon(nl.trim());
        if (c === -1) {
          issues.push({ severity: 'error', message: `Cannot parse line: "${nl.trim()}"`, location: `line ${i + 1}` });
          i++;
          continue;
        }
        const k = nl.trim().slice(0, c).trim();
        const v = nl.trim().slice(c + 1).trim();
        if (v === '' && i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].length - lines[i + 1].trimStart().length > ni) {
          // nested object (e.g. attrs) or nested list (e.g. members)
          const childIndent = lines[i + 1].length - lines[i + 1].trimStart().length;
          if (lines[i + 1].trim().startsWith('- ')) {
            const nested = parseListItems(lines, i + 1, childIndent, issues);
            item[k] = nested.items;
            i = nested.next;
          } else {
            const sub = parseBlock(lines, i + 1, childIndent, issues);
            item[k] = sub.obj;
            i = sub.next;
          }
        } else {
          item[k] = parseFieldValue(k, v);
          i++;
        }
      }
      items.push(item);
    } else {
      items.push(parseScalar(itemText));
      i++;
    }
  }
  return { items, next: i };
}

function findTopLevelColon(line: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) return i;
  }
  return -1;
}

/**
 * Parse a field value. Identifier fields (id, from, to, and group id)
 * must stay strings — a node id like `1111` is an identifier, not a number.
 * Other fields parse normally (numbers stay numbers, e.g. attrs.duration).
 */
/**
 * Strip an inline comment from a scalar value. A '#' starts a comment only
 * when it is at the start of the value or preceded by whitespace, and is
 * not inside quotes — so `contains: [a, b] # 成员` keeps the list, while
 * `label: "a # b"` keeps the '#'. Whole-line comments are handled earlier.
 */
function stripInlineComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (
      ch === '#' &&
      !inSingle &&
      !inDouble &&
      (i === 0 || raw[i - 1] === ' ' || raw[i - 1] === '\t')
    ) {
      return raw.slice(0, i);
    }
  }
  return raw;
}

function parseFieldValue(key: string, raw: string): unknown {
  // Identifier / multiplicity fields must stay strings — a cardinality like
  // `1` is a multiplicity, not a number.
  if (key === 'id' || key === 'from' || key === 'to' || key === 'cardinalityFrom' || key === 'cardinalityTo') {
    const v = parseScalar(raw);
    return v === undefined ? undefined : String(v);
  }
  return parseScalar(raw);
}

function parseScalar(raw: string): unknown {
  const value = stripInlineComment(raw).trim();
  if (value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\[.*\]$/.test(value)) {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    // double-quoted: process escapes (\n, \t, \", \\)
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

export { LgdlDocument, LgdlEdge, LgdlGroup, LgdlNode };
