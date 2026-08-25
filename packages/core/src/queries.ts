/**
 * 只读查询 —— lgdl-cli 与 lgdl-web-cli 共享的"读"命令实现。
 *
 * 实际业务读多写少：AI/用户应先通过这些命令了解图，再增量修改。
 * 业务逻辑（查询格式化）唯一实现在此，两端各自做输入适配。
 */
import { NODE_KINDS, NODE_KIND_LABELS, type LgdlDocument } from './types.js';
import { formatStatus } from './status.js';

/** status：完整图结构文本（AI 读图首选）。 */
export function queryStatus(doc: LgdlDocument): string {
  return formatStatus(doc);
}

/** 全部节点 kind 清单。 */
export function listNodeKinds(): string {
  const list = NODE_KINDS.map((k) => `${k}（${NODE_KIND_LABELS[k]}）`).join(' / ');
  return `节点 kind（${NODE_KINDS.length} 种）：${list}`;
}

/** 文档概览：类型/规模/kind 分布/meta。 */
export function queryDocInfo(doc: LgdlDocument): string[] {
  const lines: string[] = [];
  lines.push(`文档：${doc.title ?? '（未命名）'} [${doc.type}]`);
  // group nodes are container boxes (doc.groups), not ordinary nodes — the
  // "规模" count reports the box count so it is not inflated by group boxes
  const boxCount = doc.nodes.filter((n) => n.kind !== 'group').length;
  lines.push(`规模：${boxCount} 节点 / ${doc.edges.length} 边 / ${doc.groups.length} 分组`);
  const usedKinds = new Map<string, number>();
  for (const n of doc.nodes) {
    const k = n.kind ?? 'process';
    usedKinds.set(k, (usedKinds.get(k) ?? 0) + 1);
  }
  lines.push(`节点 kind 分布：${[...usedKinds.entries()].map(([k, c]) => `${k}×${c}`).join(', ') || '（无）'}`);
  if (doc.meta) lines.push(`meta：${JSON.stringify(doc.meta)}`);
  return lines;
}

/** 单节点详情（含成员/attrs）。未找到返回 null。 */
export function queryNode(doc: LgdlDocument, id: string): string[] | null {
  const node = doc.nodes.find((n) => n.id === id);
  if (!node) return null;
  const lines: string[] = [];
  lines.push(`节点 ${node.id}（${node.label ?? node.id}）:${node.kind ?? 'process'}`);
  // 所属分组
  const groups = doc.groups.filter((g) => g.contains.includes(id)).map((g) => g.id);
  if (groups.length > 0) lines.push(`  分组: ${groups.join(', ')}`);
  if (node.members && node.members.length > 0) {
    lines.push(`  成员 ${node.members.length} 个:`);
    for (const m of node.members) {
      const vis = m.visibility ? ` (${m.visibility})` : '';
      const detail = m.kind === 'method'
        ? `${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
        : `${m.name}${m.type ? `: ${m.type}` : ''}`;
      lines.push(`    - ${m.kind} ${detail}${vis}`);
    }
  }
  if (node.attrs && Object.keys(node.attrs).length > 0) {
    lines.push(`  attrs: ${JSON.stringify(node.attrs)}`);
  }
  return lines;
}

/** 按 from/to/label 查询边。 */
export function queryEdge(
  doc: LgdlDocument,
  from?: string,
  to?: string,
  label?: string,
): string[] | null {
  let edges = doc.edges.filter((e) => (!from || e.from === from) && (!to || e.to === to));
  if (label !== undefined) edges = edges.filter((e) => e.label === label);
  if (edges.length === 0) return null;
  const lines: string[] = [];
  for (const e of edges) {
    const cards = e.cardinalityFrom !== undefined || e.cardinalityTo !== undefined
      ? ` (from=${e.cardinalityFrom ?? '?'} -> to=${e.cardinalityTo ?? '?'})`
      : '';
    const rel = e.attrs?.relation !== undefined ? ` (relation=${e.attrs.relation})` : '';
    lines.push(`边 ${e.from} -> ${e.to}${e.label ? ` [${e.label}]` : ''}${cards}${rel}`);
    if (e.attrs && Object.keys(e.attrs).length > 0) {
      lines.push(`  attrs: ${JSON.stringify(e.attrs)}`);
    }
  }
  return lines;
}

/** 按 label/id 包含匹配搜索节点。 */
export function findNodes(doc: LgdlDocument, q: string): string[] {
  const matches = doc.nodes.filter(
    (n) => (n.label ?? n.id).includes(q) || n.id.includes(q),
  );
  if (matches.length === 0) return [`未找到包含 "${q}" 的节点`];
  const lines = [`找到 ${matches.length} 个节点（匹配 "${q}"）：`];
  for (const n of matches) {
    lines.push(`  ${n.id}（${n.label ?? n.id}）:${n.kind ?? 'process'}`);
  }
  return lines;
}
