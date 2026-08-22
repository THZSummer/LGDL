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
  });

  // edges: from/to must reference existing nodes
  result.edges.forEach((edge, i) => {
    if (!seenIds.has(edge.from)) {
      issues.push({
        severity: 'error',
        message: `Edge references unknown source node: "${edge.from}"`,
        location: `edges[${i}].from`,
      });
    }
    if (!seenIds.has(edge.to)) {
      issues.push({
        severity: 'error',
        message: `Edge references unknown target node: "${edge.to}"`,
        location: `edges[${i}].to`,
      });
    }
  });

  // groups: contains must reference existing nodes; no node in two groups
  result.groups.forEach((group, i) => {
    group.contains?.forEach((nodeId) => {
      if (!seenIds.has(nodeId)) {
        issues.push({
          severity: 'error',
          message: `Group "${group.id}" contains unknown node: "${nodeId}"`,
          location: `groups[${i}].contains`,
        });
      }
    });
  });
  const groupMembership = new Map<string, string>();
  result.groups.forEach((group, gi) => {
    group.contains?.forEach((nodeId, ci) => {
      if (groupMembership.has(nodeId)) {
        issues.push({
          severity: 'error',
          message: `Node "${nodeId}" belongs to both "${groupMembership.get(nodeId)}" and "${group.id}"`,
          location: `groups[${gi}].contains[${ci}]`,
        });
      }
      groupMembership.set(nodeId, group.id);
    });
  });

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
        // list of items
        const items: unknown[] = [];
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim() || l.trim().startsWith('#')) {
            i++;
            continue;
          }
          const lli = l.length - l.trimStart().length;
          if (lli <= indent) break;
          if (lli !== childIndent || !l.trim().startsWith('- ')) {
            issues.push({ severity: 'error', message: `Expected list item at line ${i + 1}`, location: key });
            break;
          }
          const itemText = l.trim().slice(2).trim();
          const itemIndent = l.length - l.trimStart().length;
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
            // consume following fields belonging to this item (deeper indent),
            // and possibly nested objects (e.g. attrs)
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
                // nested object (e.g. attrs)
                const sub = parseBlock(lines, i + 1, lines[i + 1].length - lines[i + 1].trimStart().length, issues);
                item[k] = sub.obj;
                i = sub.next;
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
        obj[key] = items;
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
function parseFieldValue(key: string, raw: string): unknown {
  if (key === 'id' || key === 'from' || key === 'to') {
    const v = parseScalar(raw);
    return v === undefined ? undefined : String(v);
  }
  return parseScalar(raw);
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();
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
