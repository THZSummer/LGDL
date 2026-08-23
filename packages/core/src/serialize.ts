/**
 * LGDL document serializer — writes an LgdlDocument back to .lgdl YAML.
 *
 * Produces clean, deterministic output so diffs between edits are minimal
 * (important for the incremental-edit workflow).
 */
import type { LgdlDocument } from './types.js';

function yamlString(s: unknown): string {
  // never assume the input is a string — a hand-built doc may carry numbers
  const text = typeof s === 'string' ? s : String(s ?? '');
  // an empty string must stay addressable ("label: """) instead of
  // silently collapsing into "no label"
  if (text === '') return '""';
  // Quote if it contains characters that could break YAML
  if (/[:#\[\]{},&*!|>'"%@`]|^\s|\s$|^[-\d]|\n/.test(text)) {
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return text;
}

/** Serialize an attrs object as indented YAML key: value lines. */
function serializeAttrs(attrs: Record<string, unknown>, indent: string): string[] {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(`${indent}${k}:`);
      lines.push(...serializeAttrs(v as Record<string, unknown>, indent + '  '));
    } else if (Array.isArray(v)) {
      lines.push(`${indent}${k}: [${v.map((x) => yamlString(String(x))).join(', ')}]`);
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      lines.push(`${indent}${k}: ${v}`);
    } else {
      lines.push(`${indent}${k}: ${yamlString(String(v))}`);
    }
  }
  return lines;
}

export function serializeLgdl(doc: LgdlDocument): string {
  const lines: string[] = [];

  if (doc.title) {
    lines.push(`title: ${yamlString(doc.title)}`);
  }
  lines.push(`type: ${doc.type}`);
  lines.push('');

  // nodes
  lines.push('nodes:');
  for (const node of doc.nodes) {
    lines.push(`  - id: ${yamlString(node.id)}`);
    if (node.label !== undefined && node.label !== node.id) {
      lines.push(`    label: ${yamlString(node.label)}`);
    }
    if (node.kind && node.kind !== 'process') {
      lines.push(`    kind: ${node.kind}`);
    }
    if (node.members && node.members.length > 0) {
      lines.push(`    members:`);
      for (const m of node.members) {
        lines.push(`      - kind: ${m.kind}`);
        lines.push(`        name: ${yamlString(m.name)}`);
        if (m.visibility !== undefined) lines.push(`        visibility: ${m.visibility}`);
        if (m.type !== undefined) lines.push(`        type: ${yamlString(m.type)}`);
        if (m.params !== undefined) lines.push(`        params: ${yamlString(m.params)}`);
      }
    }
    if (node.attrs && Object.keys(node.attrs).length > 0) {
      lines.push(`    attrs:`);
      lines.push(...serializeAttrs(node.attrs, '      '));
    }
  }

  // edges
  if (doc.edges.length > 0) {
    lines.push('');
    lines.push('edges:');
    for (const edge of doc.edges) {
      lines.push(`  - from: ${yamlString(edge.from)}`);
      lines.push(`    to: ${yamlString(edge.to)}`);
      if (edge.label !== undefined) {
        lines.push(`    label: ${yamlString(edge.label)}`);
      }
      if (edge.cardinalityFrom !== undefined) {
        lines.push(`    cardinalityFrom: ${yamlString(edge.cardinalityFrom)}`);
      }
      if (edge.cardinalityTo !== undefined) {
        lines.push(`    cardinalityTo: ${yamlString(edge.cardinalityTo)}`);
      }
      if (edge.attrs && Object.keys(edge.attrs).length > 0) {
        lines.push(`    attrs:`);
        lines.push(...serializeAttrs(edge.attrs, '      '));
      }
    }
  }

  // groups
  if (doc.groups.length > 0) {
    lines.push('');
    lines.push('groups:');
    for (const group of doc.groups) {
      lines.push(`  - id: ${yamlString(group.id)}`);
      if (group.label !== undefined && group.label !== group.id) {
        lines.push(`    label: ${yamlString(group.label)}`);
      }
      lines.push(`    contains: [${group.contains.map(yamlString).join(', ')}]`);
      if (group.attrs && Object.keys(group.attrs).length > 0) {
        lines.push(`    attrs:`);
        lines.push(...serializeAttrs(group.attrs, '      '));
      }
    }
  }

  // meta
  if (doc.meta && Object.keys(doc.meta).length > 0) {
    lines.push('');
    lines.push('meta:');
    for (const [k, v] of Object.entries(doc.meta)) {
      lines.push(`  ${k}: ${yamlString(String(v))}`);
    }
  }

  return lines.join('\n') + '\n';
}
