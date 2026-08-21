/**
 * LGDL document serializer — writes an LgdlDocument back to .sdg YAML.
 *
 * Produces clean, deterministic output so diffs between edits are minimal
 * (important for the incremental-edit workflow).
 */
import type { LgdlDocument } from './types.js';

function yamlString(s: string): string {
  // Quote if it contains characters that could break YAML
  if (/[:#\[\]{},&*!|>'"%@`]|^\s|\s$|^[-\d]|\n/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return s;
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
