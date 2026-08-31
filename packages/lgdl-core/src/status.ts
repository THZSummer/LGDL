/**
 * status 输出：把 LgdlDocument 渲染为 AI 可读的纯文本图结构。
 * CLI `lgdl status` 与 Web AI 的 `status` 命令共用同一实现。
 */
import type { LgdlDocument } from './types.js';
import { deriveGroups } from './groups.js';

/** 生成 status 纯文本（AI 读图用，与 CLI `lgdl status` 输出一致）。 */
export function formatStatus(doc: LgdlDocument): string {
  const lines: string[] = [];
  const groups = deriveGroups(doc);
  lines.push(`# ${doc.title ?? 'untitled'} [${doc.type}]`);
  lines.push('');
  lines.push('## nodes');
  for (const n of doc.nodes) {
    // group nodes are container boxes (derived from group nodes) — they belong
    // to the `## groups` section, not the ordinary node list
    if (n.kind === 'group') continue;
    lines.push(`  ${n.id}${n.label ? ` (${n.label})` : ''}${n.kind && n.kind !== 'process' ? ` :${n.kind}` : ''}`);
    for (const m of n.members ?? []) {
      const vis = m.visibility ? ` (${m.visibility})` : '';
      const detail =
        m.kind === 'method'
          ? `${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
          : `${m.name}${m.type ? `: ${m.type}` : ''}`;
      lines.push(`    - ${m.kind} ${detail}${vis}`);
    }
  }
  lines.push('');
  lines.push('## edges');
  for (const e of doc.edges) {
    const cards =
      e.cardinalityFrom !== undefined || e.cardinalityTo !== undefined
        ? ` (from=${e.cardinalityFrom ?? '?'} -> to=${e.cardinalityTo ?? '?'})`
        : '';
    const rel = e.attrs?.relation !== undefined ? ` (relation=${e.attrs.relation})` : '';
    lines.push(`  ${e.from} -> ${e.to}${e.label ? ` [${e.label}]` : ''}${cards}${rel}`);
  }
  if (groups.length > 0) {
    lines.push('');
    lines.push('## groups');
    for (const g of groups) {
      lines.push(`  ${g.id}${g.label ? ` (${g.label})` : ''}: ${g.contains.join(', ')}`);
    }
  }
  return lines.join('\n');
}
