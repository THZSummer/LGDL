/**
 * V3-2 TASK-201 / TASK-202 (ADR-V3-020 / ADR-V3-023) — pure-Node unit tests for
 * the reference judge and the reference store.
 *
 * New file: no existing assertion is deleted or downgraded by it (NFR-V3-014).
 * The "DOM" is absent by design — the judge and the store are pure, so the whole
 * fail-closed contract gets a fast feedback channel on a 1.5 GB machine.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  REASON_TEMPLATES,
  UNKNOWN_CAUSE_TEXT,
  evaluateRefValidity,
  isRefUsable,
  reasonFor,
  reasonUnknown,
  refOrdinal,
} from '../src/ui/sidepanel/l1/ref-validity.js';
import type { RefEnv, RefFacts } from '../src/ui/sidepanel/l1/ref-validity.js';
import { SEMANTIC_PATH_MAX, TEXT_DIGEST_MAX, createRefStore, ordinalGlyph, truncate } from '../src/ui/sidepanel/l1/ref-store.js';
import { buildLocalTree, LOCAL_TREE_MAX_NODES } from '../src/ui/sidepanel/l1/local-tree.js';
import { buildL1Receipt, assertNoPlaintext, receiptPiecesPresent, targetDigest } from '../src/ui/sidepanel/l1/receipt.js';
import { L1_PANEL_IDS, L1_GESTURE_COUNT, isDestructiveOption, decisionHistoryLabel } from '../src/ui/sidepanel/view-model.js';
import { COLLAPSIBLE_TARGETS, assertFoldable, DisclosureError } from '../src/ui/sidepanel/disclosure.js';
import type { OwnershipTree } from '../src/insight/ownership-tree.js';

const FACTS: RefFacts = {
  refId: 'ref_1',
  selector: '#target',
  semanticPath: '连接树 › 能力面',
  textDigest: '目标文本',
  origin: 'https://a.test',
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'h1',
  capturedAt: 1_700_000_000_000,
};
const ENV: RefEnv = { currentOrigin: 'https://a.test', authorized: true, documentId: 'doc-1', navSeq: 1, declarationHash: 'h1' };
const RESOLVED = { status: 'resolved' as const, refMark: 'ref_1', nodeCount: 1 };
const good = (patch: Partial<RefEnv> = {}): RefEnv => ({ ...ENV, resolution: RESOLVED, ...patch });

// ── the three verdicts + the ONLY release point ──────────────────────────────
test('v3-2 judge: 三态齐备，且 isRefUsable 只接受显式 valid', () => {
  assert.equal(evaluateRefValidity(FACTS, good()).verdict, 'valid');
  assert.equal(isRefUsable(FACTS, good()), true);
  assert.equal(evaluateRefValidity(FACTS, good({ resolution: { status: 'missing' } })).verdict, 'invalid');
  assert.equal(evaluateRefValidity(FACTS, {}).verdict, 'unknown');
  // Neither `invalid` nor `unknown` may ever pass the single release point.
  assert.equal(isRefUsable(FACTS, good({ resolution: { status: 'missing' } })), false);
  assert.equal(isRefUsable(FACTS, {}), false);
});

// ── the five dimensions, one by one ──────────────────────────────────────────
test('v3-2 judge: 五维逐一注入 → invalid 且维度命中', () => {
  const cases: Array<[string, RefEnv]> = [
    ['dom-gone', good({ resolution: { status: 'missing' } })],
    ['origin-changed', good({ currentOrigin: 'https://b.test' })],
    ['navigated', good({ navSeq: 2 })],
    ['declaration-changed', good({ declarationHash: 'h2' })],
    ['authorization-revoked', good({ authorized: false })],
  ];
  for (const [dimension, env] of cases) {
    const view = evaluateRefValidity(FACTS, env);
    assert.equal(view.verdict, 'invalid', `${dimension} 必须判失效`);
    assert.equal(view.dimension, dimension, `${dimension} 的维度必须命中（实测 ${view.dimension}）`);
    assert.ok((view.readableReason ?? '').length > 0, `${dimension} 必须给出可读原因`);
  }
  // declaration version (V32-O-1: hash ∪ version, either one decides)
  const versioned: RefFacts = { ...FACTS, declarationVersion: 'v1' };
  assert.equal(evaluateRefValidity(versioned, good({ declarationVersion: 'v2' })).dimension, 'declaration-changed');
  assert.equal(evaluateRefValidity(versioned, good({ declarationHash: undefined, declarationVersion: 'v2' })).verdict, 'invalid');
});

test('v3-2 judge: 可读原因逐维逐字（模板 = plan §2.3(4)，{n} 用序号）', () => {
  assert.equal(
    reasonFor(FACTS, 'dom-gone', good()),
    '引用 1 的目标元素已不存在（选择器解析失败或元素被替换）',
  );
  assert.equal(
    reasonFor(FACTS, 'origin-changed', good({ currentOrigin: 'https://b.test' })),
    '引用 1 属于 https://a.test，当前站点已是 https://b.test —— 跨站引用不可用',
  );
  assert.equal(reasonFor(FACTS, 'navigated', good()), '引用 1 捕获后页面已导航（含单页路由切换），目标可能已重建');
  assert.equal(
    reasonFor(FACTS, 'declaration-changed', good({ declarationHash: 'h2' })),
    '引用 1 捕获后站点声明已变化（hash h1 → h2），目标语义可能已改变',
  );
  // N-07（2026-09-16 收口轮）：D4 的另一个子判据（version）必须渲染成 version 变化，
  // 而不是把 hash 前后相同的 `h1 → h1` 当成「变化」展示给用户。
  const versioned: RefFacts = { ...FACTS, declarationVersion: 'v1' };
  assert.equal(
    reasonFor(versioned, 'declaration-changed', good({ declarationVersion: 'v2' })),
    '引用 1 捕获后站点声明已变化（version v1 → v2），目标语义可能已改变',
  );
  assert.equal(reasonFor(FACTS, 'authorization-revoked', good()), '引用 1 所在站点已被撤销授权');
  // the `unknown` template must state the fail-closed rule
  assert.equal(
    reasonUnknown(FACTS, 'page-unreachable'),
    '无法确认引用 1 的目标是否仍然有效（页面侧不可达（未授权 / 探测中 / 内容脚本未响应））—— 按失效处理',
  );
  assert.equal(REASON_TEMPLATES.unknown.includes('按失效处理'), true);
  assert.equal(Object.values(UNKNOWN_CAUSE_TEXT).every((t) => t.length > 0), true);
  // a long id falls back to the raw id rather than rendering an empty ordinal
  assert.equal(refOrdinal('ref_12'), '12');
  assert.equal(refOrdinal('weird'), 'weird');
});

// ── "uncertain ⇒ invalid" is structural ─────────────────────────────────────
test('v3-2 judge: 不确定即失效（事实缺失 / 环境不可得 / 页面不可达 / 歧义 / 被替换）', () => {
  const cases: Array<[string, RefFacts, RefEnv]> = [
    ['事实缺失 selector', { ...FACTS, selector: '' }, good()],
    ['事实缺失 navSeq', { ...FACTS, navSeq: Number.NaN }, good()],
    ['事实缺失 declarationHash', { ...FACTS, declarationHash: '' }, good()],
    ['环境不可得（无当前 origin）', FACTS, { ...ENV, currentOrigin: undefined, resolution: RESOLVED }],
    ['环境不可得（授权状态未知）', FACTS, { ...ENV, authorized: undefined, resolution: RESOLVED }],
    ['页面不可达（无 resolution）', FACTS, good({ resolution: undefined })],
    ['页面不可达（unreachable）', FACTS, good({ resolution: { status: 'unreachable' } })],
    ['选择器歧义', FACTS, good({ resolution: { status: 'ambiguous', nodeCount: 2 } })],
    ['命中多个（nodeCount≠1）', FACTS, good({ resolution: { status: 'resolved', refMark: 'ref_1', nodeCount: 3 } })],
    ['元素被替换为同类新元素', FACTS, good({ resolution: { status: 'resolved', refMark: 'ref_9', nodeCount: 1 } })],
    ['页面导航信息不可得', FACTS, good({ documentId: undefined })],
  ];
  for (const [label, ref, env] of cases) {
    const view = evaluateRefValidity(ref, env);
    assert.equal(view.verdict, 'unknown', `${label} 必须判 unknown（fail-closed）`);
    assert.equal(isRefUsable(ref, env), false, `${label} 必须被阻断`);
    assert.ok((view.readableReason ?? '').includes('按失效处理'), `${label} 的可读原因必须写明按失效处理`);
  }
});

test('v3-2 judge: 判定链只读（同输入同输出，不修改入参）', () => {
  const frozen = Object.freeze({ ...FACTS });
  const env = Object.freeze({ ...ENV, resolution: Object.freeze({ ...RESOLVED }) });
  const before = JSON.stringify([frozen, env]);
  assert.deepEqual(evaluateRefValidity(frozen as RefFacts, env as RefEnv), evaluateRefValidity(frozen as RefFacts, env as RefEnv));
  assert.equal(JSON.stringify([frozen, env]), before, '入参不得被判定修改');
});

// ── the store: single id source, truncation caliber, guarded dispatch ────────
test('v3-2 store: ref_<n> 单调递增且失效后不重用；截断口径 80 / 120', () => {
  const store = createRefStore();
  const raw = { ...FACTS, selector: '#t', textDigest: 'x'.repeat(200), semanticPath: 'y'.repeat(300) };
  const first = store.create(raw);
  const second = store.create(raw);
  assert.equal(first.facts.refId, 'ref_1');
  assert.equal(second.facts.refId, 'ref_2');
  assert.equal(first.facts.textDigest.length, TEXT_DIGEST_MAX + 1, 'textDigest = 80 字符 + …');
  assert.equal(first.facts.semanticPath.length, SEMANTIC_PATH_MAX + 1, 'semanticPath = 120 字符 + …');
  assert.equal(first.facts.textDigest.endsWith('…'), true);
  assert.equal(truncate('短文本', 80), '短文本', '未超长时不得出现省略号');
  assert.equal(truncate('a b\nc', 80), 'abc', '空白必须被剥除');
  // an invalidated id is never handed out again, even after `reset()`
  store.judge({ ...ENV, resolution: { status: 'missing' } });
  assert.equal(store.stale().length, 2);
  store.reset();
  assert.equal(store.create(raw).facts.refId, 'ref_3', 'reset 之后 id 仍不得重用');
  assert.equal(ordinalGlyph('ref_3'), '③');
  assert.equal(ordinalGlyph('ref_88'), '#88');
});

test('v3-2 store: dispatch 是唯一放行点（失效态零发送，含非空转对照）', () => {
  const store = createRefStore();
  const rec = store.create({ ...FACTS, selector: '#t', textDigest: 't', semanticPath: 'p' });
  const env = good({ resolution: { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 } });
  store.judge(env);
  assert.equal(store.dispatch(rec.facts.refId, env).allowed, true, 'valid 必须放行（对照：计数真的会动）');
  assert.equal(store.commandSends(), 1);
  const stale = good({ resolution: { status: 'missing' } });
  const blocked = store.dispatch(rec.facts.refId, stale);
  assert.equal(blocked.allowed, false);
  assert.equal(store.commandSends(), 1, '失效后不得再发送任何命令');
  assert.ok(blocked.reason.length > 0, '阻断必须给出可读原因');
  assert.equal(store.dispatch('ref_missing', env).allowed, false, '不存在的引用必须被阻断');
});

// ── local tree / receipt / view model ───────────────────────────────────────
test('v3-2 store: N-08 退役记录冻结退役当时的可读原因（后续 judge 不改写审计轨迹）', () => {
  const store = createRefStore();
  const rec = store.create({ ...FACTS, selector: '#t', textDigest: 't', semanticPath: 'p' });
  store.judge(good({ resolution: { status: 'missing' } }));
  const original = store.get(rec.facts.refId)?.readableReason ?? '';
  assert.ok(original.includes('目标元素已不存在'), `退役前的原因必须是 dom-gone：${original}`);
  store.retireUnusable();
  // 退役后判据变了（元素被同类新元素替换）→ 记录不丢弃（retired 保留），但原因必须是
  // 退役当时那一个 —— 旧实现会被这次 judge 改写成「已被同类新元素替换」（N-08）。
  store.judge(good({ resolution: { status: 'resolved', refMark: 'ref_999', nodeCount: 1 } }));
  const kept = store.get(rec.facts.refId);
  assert.equal(kept?.retired, true, '退役记录必须保留（不得静默丢弃）');
  assert.equal(kept?.readableReason, original, '退役原因不得被后续 judge 改写');
  assert.equal(store.stale().length, 0, '退役记录不再计入失效告警');
  assert.notEqual(kept?.readableReason, 'x', '非空转对照：原因必须真的存在');
});
test('v3-2 local-tree: 主归属链裁剪 ≤3 且不复制节点', () => {
  const node = (nodeId: string, label: string, path: string[], crossRefLabels: string[] = []) => ({
    id: `n-${nodeId}`,
    kind: 'capability' as const,
    label,
    nodeId,
    ariaLevel: path.length,
    path,
    mainOwner: 'capability' as const,
    crossRefCount: crossRefLabels.length,
    crossRefLabels,
    crossTargets: [],
    badgeSummary: [],
    children: [],
  });
  const tree = {
    root: {
      ...node('root', '连接树', ['连接树']),
      kind: 'root' as const,
      children: [
        {
          ...node('cap', '能力面', ['连接树', '能力面']),
          kind: 'face' as const,
          children: [
            {
              ...node('browser', '浏览器能力', ['连接树', '能力面', '浏览器能力']),
              kind: 'group' as const,
              children: [node('cmd', 'bookmarks.create', ['连接树', '能力面', '浏览器能力', 'bookmarks.create'], ['依赖权限'])],
            },
          ],
        },
      ],
    },
  } as unknown as OwnershipTree;
  const view = buildLocalTree(tree, 'cmd');
  assert.equal(view.count, LOCAL_TREE_MAX_NODES, '四条链必须被裁剪到上限 3');
  assert.equal(view.truncated, true);
  assert.equal(view.labels[view.labels.length - 1], 'bookmarks.create', '当前节点必须在列');
  assert.deepEqual(view.crossRefs, ['依赖权限'], '交叉引用以徽标呈现（不复制节点）');
  assert.equal(view.empty, false);
  const missing = buildLocalTree(tree, 'nope');
  assert.equal(missing.count, 0);
  assert.equal(missing.empty, true);
  assert.equal(buildLocalTree(null, null).count, 0);
});

test('v3-2 receipt: 三件齐备 + 零明文（越界即抛）', () => {
  const receipt = buildL1Receipt({
    ok: true,
    text: '✓ 已完成',
    actionId: 'revoke-origin',
    command: 'revoke',
    ms: 42,
    auditId: 'audit-1',
    evidence: { tool: 'bookmarks', present: false, checkedAt: 1, evidence: '重拉实测（第 1 次）：bookmarks 已不在工具面（deriveTools）' },
    refreshSeq: 1,
    now: 1_700_000_000_000,
  });
  const pieces = receiptPiecesPresent(receipt);
  assert.equal(pieces.summary && pieces.evidence && pieces.audit, true, '三件缺一即 FAIL');
  assert.equal(receipt.rows.length, 8, '证据行 = 白名单字段');
  assert.equal(receiptPiecesPresent(null).summary, false, '无回执时摘要必须为 false（不得默认成功）');
  assert.equal(targetDigest('https://a.test/p?token=secret'), 'https://a.test/p', 'URL 必须去参');
  assert.doesNotThrow(() => assertNoPlaintext([receipt.summary]));
  assert.throws(() => assertNoPlaintext(['apiKey: sk-abcdefgh']), /明文/);
  assert.throws(() => assertNoPlaintext(['https://a.test/x?token=1']), /明文/);
  // 失败的回执不得被渲染成成功
  const failed = buildL1Receipt({ ok: false, text: '✖ 失败', actionId: 'x', evidence: receipt.rows ? { tool: '', present: true, checkedAt: 1, evidence: 'n/a' } : { tool: '', present: true, checkedAt: 1, evidence: 'n/a' }, refreshSeq: 2, now: 1 });
  assert.equal(failed.kind, 'err');
  assert.match(failed.summary, /✖ 失败/);
});

test('v3-2 view-model: L1 八类清单 + 破坏性过滤 + 历史计数标签（纯函数）', () => {
  assert.equal(L1_PANEL_IDS.length, 8);
  assert.equal(new Set(L1_PANEL_IDS).size, 8, '八类 id 不得重复');
  assert.deepEqual(
    [...L1_PANEL_IDS],
    ['l1-status', 'l1-consequences', 'l1-ref-evidence', 'l1-local-tree', 'l1-history', 'l1-receipt', 'l1-gestures', 'l1-more'],
  );
  // V3-4 (FR-V3-070): v3-2 shipped 4 gestures; this leaf completes the implemented set
  // to 6 and renders the table FROM the list, so the count and the table cannot drift.
  assert.equal(L1_GESTURE_COUNT, 6);
  // The destructive filter is the structural rule behind FR-V3-032's「破坏性选项」.
  assert.equal(isDestructiveOption('删除这条记录'), true);
  assert.equal(isDestructiveOption('清空工作台'), true);
  assert.equal(isDestructiveOption('查看站点声明'), false);
  assert.equal(isDestructiveOption('打开设置'), false);
  assert.equal(decisionHistoryLabel(0), '已决策 0 步');
  assert.equal(decisionHistoryLabel(3), '已决策 3 步');
  assert.equal(decisionHistoryLabel(-1), '已决策 0 步', 'N 不得为负');
});

test('v3-2 disclosure: L1 面板进入白名单，但 #risk-rail 仍结构性不可折叠', () => {
  for (const id of ['l1-consequences', 'l1-local-tree', 'l1-history', 'l1-receipt', 'l1-gestures']) {
    assert.ok(COLLAPSIBLE_TARGETS.includes(id as never), `${id} 必须可折叠（经唯一控制器）`);
  }
  assert.equal(assertFoldable('l1-history'), 'l1-history');
  assert.throws(() => assertFoldable('#risk-rail'), DisclosureError, '风险位永不可折叠');
  assert.throws(() => assertFoldable('l0-decision'), DisclosureError);
});
