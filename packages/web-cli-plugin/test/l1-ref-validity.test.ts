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
  REQUIRED_REF_FACTS,
  UNKNOWN_CAUSE_TEXT,
  currentDeclarationStatus,
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

// ── R4（2026-09-22）：捕获缺陷与「元素不存在」必须**分开报** ──────────────────
/**
 * 缺陷：`resolveRef` 把 CSS 解析器抛错与「0 命中」同吞为 `missing` ⇒ 一条被截断的
 * （非法）选择器被判成 D1 `dom-gone`，文案写「目标元素已不存在」—— 而目标仍在页面上，
 * 引用出生即死。修法：**诊断分离**（`invalid-selector` 独立观测 + 独立维度 + 独立文案）。
 * 结论方向不变（仍 `invalid`，仍 fail-closed）。
 */
test('R4 judge: invalid-selector 是独立维度与独立文案（与 dom-gone 不同词），且仍 fail-closed', () => {
  const env = good({ resolution: { status: 'invalid-selector' } });
  const view = evaluateRefValidity(FACTS, env);
  assert.equal(view.verdict, 'invalid', '非法选择器必须判失效（fail-closed 不放松）');
  assert.equal(view.dimension, 'invalid-selector', '维度必须是 invalid-selector（不得再报 dom-gone）');
  assert.equal(
    view.readableReason,
    '引用 1 的选择器语法非法（捕获缺陷，已自动修复/请重新拾取）',
    '文案必须逐字命中新模板（不得复用 dom-gone 的「目标元素已不存在」）',
  );
  assert.notEqual(view.readableReason, reasonFor(FACTS, 'dom-gone', env), '两种事实不得共用一句文案');
  assert.equal(isRefUsable(FACTS, env), false, '单一放行口只接受 valid（结论未放松）');
  // 反证：把观测退回 `missing` ⇒ 维度/文案必须变回 dom-gone（判据不是恒真）。
  const legacy = evaluateRefValidity(FACTS, good({ resolution: { status: 'missing' } }));
  assert.equal(legacy.dimension, 'dom-gone');
  assert.notEqual(legacy.readableReason, view.readableReason, '退回同吞口径时文案会退回 dom-gone ⇒ 本判据可红');
  // R3 救援元数据同样可挂在捕获缺陷面上（目标疑似仍在）。
  const withRescue = evaluateRefValidity(FACTS, {
    ...env,
    rescue: { refId: 'ref_1', candidates: 1, unique: true, urlChanged: false },
  });
  assert.equal(withRescue.dimension, 'invalid-selector');
  assert.deepEqual(withRescue.rescue, { refId: 'ref_1', candidates: 1, unique: true, urlChanged: false });
  assert.ok((withRescue.readableReason ?? '').endsWith('可一键重锚）'), '捕获缺陷面同样给出恢复出路');
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

test('v3-2 view-model: 内容面清单 + 破坏性过滤 + 历史计数标签（纯函数）', () => {
  // V4.5-1 W3 (TASK-V45-109): the eight v3 classes were hosted by the retired decision
  // shell + L1 group, so the list is restated as the **seven faces that exist in the new
  // form** — one-to-one with `disclosure.ts#COLLAPSIBLE_TARGETS`.
  assert.equal(L1_PANEL_IDS.length, 7);
  assert.equal(new Set(L1_PANEL_IDS).size, 7, '七类 id 不得重复');
  assert.deepEqual(
    [...L1_PANEL_IDS],
    ['l1-more', 'l1-consequences', 'l1-local-tree', 'l1-receipt', 'l1-gestures', 'l2-tree-attribution', 'l2-audit-evidence'],
  );
  assert.deepEqual([...L1_PANEL_IDS].sort(), [...COLLAPSIBLE_TARGETS].sort(), '内容面清单必须与折叠白名单同源');
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

test('v3-2 disclosure: 内容面进入白名单，但 #risk-rail / 退役面仍结构性不可折叠', () => {
  // V4.5-1 W3: the five surviving v3 faces keep their whitepaper entries; `l1-history` /
  // `l1-ref-evidence` retired (history = the stream; the evidence panel lives in the ref
  // card), so folding them is refused instead of silently accepted.
  for (const id of ['l1-consequences', 'l1-local-tree', 'l1-receipt', 'l1-gestures', 'l1-more']) {
    assert.ok(COLLAPSIBLE_TARGETS.includes(id as never), `${id} 必须可折叠（经唯一控制器）`);
  }
  assert.equal(assertFoldable('l1-local-tree'), 'l1-local-tree');
  assert.throws(() => assertFoldable('l1-history'), DisclosureError, '退役的折叠面必须抛错');
  assert.throws(() => assertFoldable('l1-ref-evidence'), DisclosureError, '退役的折叠面必须抛错');
  assert.throws(() => assertFoldable('#risk-rail'), DisclosureError, '风险位永不可折叠');
  assert.throws(() => assertFoldable('l0-decision'), DisclosureError, '退役的决策壳必须抛错');
});

// ── R1（2026-09-17，收口后缺陷修复轮）────────────────────────────────────────
//
// 作者真机反馈：在**没有有效站点声明**的普通站点（deepseek 的 usage 页）拾取的引用
// **出生即死**（「引用捕获事实不完整：缺失 declarationHash —— 按失效处理」）。根因是
// D4 的口径曾是「必须有 declarationHash」，而站点声明是**站点工具面**机制，不是用户
// 拾取的前提。R1 把 D4 改为「捕获时**状态** vs 当刻状态一致」——fail-closed **不放松**：
// 新增的每个出口仍是 invalid / unknown，`valid` 只可能在状态相同（valid 时还要求摘要
// 与 version 相同）时出现；修复前的旧记录维持原判。

/** A capture on a site that declares nothing (the normal case on third-party sites). */
const ABSENT_FACTS: RefFacts = { ...FACTS, declarationHash: '', declaration: { status: 'absent' } };
/** A capture on a site whose declaration exists but does not validate. */
const INVALID_FACTS: RefFacts = { ...FACTS, declarationHash: '', declaration: { status: 'invalid' } };
/** A capture on a site with an adopted declaration (status + real digest). */
const VALID_FACTS: RefFacts = { ...FACTS, declaration: { status: 'valid', hash: 'h1' } };

test('R1 judge: 无有效声明的站点拾取的引用在声明状态不变时有效（缺陷复现——回退即 FAIL）', () => {
  const absentEnv = good({ declarationStatus: 'absent', declarationHash: undefined });
  assert.equal(evaluateRefValidity(ABSENT_FACTS, absentEnv).verdict, 'valid', 'absent → absent 必须放行');
  assert.equal(isRefUsable(ABSENT_FACTS, absentEnv), true);
  const invalidEnv = good({ declarationStatus: 'invalid', declarationHash: undefined });
  assert.equal(evaluateRefValidity(INVALID_FACTS, invalidEnv).verdict, 'valid', 'invalid → invalid 必须放行');
  assert.equal(isRefUsable(INVALID_FACTS, invalidEnv), true);
  // The pre-R1 caliber (`declarationHash: ''` ⇒ missing fact) is exactly the defect:
  // 同一条事实在没有 declaration 时仍是 unknown（历史记录口径不变，见下一条用例）。
  assert.equal(evaluateRefValidity({ ...ABSENT_FACTS, declaration: undefined }, absentEnv).verdict, 'unknown');
  // valid 声明：状态 + 摘要一致才放行。
  const validEnv = good({ declarationStatus: 'valid', declarationHash: 'h1' });
  assert.equal(evaluateRefValidity(VALID_FACTS, validEnv).verdict, 'valid');
  // 状态是**完整事实**：快照口径不再要求 declarationHash 出现在必需事实里。
  assert.equal(REQUIRED_REF_FACTS.includes('declarationHash' as never), false);
  assert.equal(currentDeclarationStatus(validEnv), 'valid');
  assert.equal(currentDeclarationStatus(good({ declarationHash: 'h1' })), 'valid', '只有 hash 的旧 env 蕴含 valid');
  assert.equal(currentDeclarationStatus(good({ declarationHash: undefined })), undefined, '读不到 ⇒ undefined（⇒ unknown）');
});

test('R1 judge: 声明**状态变更** ⇒ invalid 且可读原因提示重新拾取（反证②）', () => {
  const cases: Array<[string, RefFacts, RefEnv, string]> = [
    ['捕获 invalid → 当刻 valid（站点后来修好了声明）', INVALID_FACTS, good({ declarationStatus: 'valid', declarationHash: 'h9' }), '声明状态 无效 → 有效'],
    ['捕获 absent → 当刻 invalid', ABSENT_FACTS, good({ declarationStatus: 'invalid', declarationHash: undefined }), '声明状态 未声明 → 无效'],
    ['捕获 valid → 当刻 absent（声明消失）', VALID_FACTS, good({ declarationStatus: 'absent', declarationHash: undefined }), '声明状态 有效 → 未声明'],
  ];
  for (const [label, ref, env, what] of cases) {
    const view = evaluateRefValidity(ref, env);
    assert.equal(view.verdict, 'invalid', `${label} 必须判失效`);
    assert.equal(view.dimension, 'declaration-changed', `${label} 的维度必须是 declaration-changed`);
    assert.ok((view.readableReason ?? '').includes(what), `${label} 的原因必须写明状态两端：${view.readableReason}`);
    assert.ok((view.readableReason ?? '').includes('重新拾取'), `${label} 的原因必须提示重新拾取：${view.readableReason}`);
    assert.equal(isRefUsable(ref, env), false, `${label} 必须被阻断`);
  }
  // 摘要变化仍走既有的 hash 措辞（N-07 的逐字模板不得被状态措辞覆盖）。
  const digest = evaluateRefValidity(VALID_FACTS, good({ declarationStatus: 'valid', declarationHash: 'h2' }));
  assert.equal(digest.verdict, 'invalid');
  assert.match(digest.readableReason ?? '', /hash h1 → h2/);
  assert.ok(!(digest.readableReason ?? '').includes('重新拾取'), '状态未变（仅摘要变）时不加「重新拾取」后缀');
});

test('R1 judge fail-closed（反证③）：旧记录 / 读不到当刻状态 / valid 缺摘要 三者都必须被阻断', () => {
  // ③ 修复前捕获的旧记录（既无 hash 也无 status）→ 维持原判（unknown ⇒ 按失效）。
  const legacy = { ...FACTS, declarationHash: '' };
  const legacyCases: Array<[string, RefEnv]> = [
    ['旧记录 + 旧 env（无 status 无 hash）', good({ declarationHash: undefined })],
    ['旧记录 + 状态 env（无 hash）', good({ declarationStatus: 'absent', declarationHash: undefined })],
    ['旧记录 + 空 env', {}],
  ];
  for (const [label, env] of legacyCases) {
    const view = evaluateRefValidity(legacy, env);
    assert.equal(view.verdict, 'unknown', `${label} 必须判 unknown（不得因 R1 而放行）`);
    assert.equal(isRefUsable(legacy, env), false, `${label} 必须被阻断`);
    assert.ok((view.readableReason ?? '').includes('按失效处理'));
  }
  // 有状态但读不到当刻状态 ⇒ unknown（缺的仍是「事实」）。
  const noNow = evaluateRefValidity(ABSENT_FACTS, good({ declarationStatus: undefined, declarationHash: undefined }));
  assert.equal(noNow.verdict, 'unknown');
  assert.match(noNow.readableReason ?? '', /按失效处理/);
  assert.equal(isRefUsable(ABSENT_FACTS, good({ declarationStatus: undefined, declarationHash: undefined })), false);
  // valid 声明但**当刻没有摘要** ⇒ 不得放行（状态对不上「可确认未变」）。
  const noDigest = evaluateRefValidity(VALID_FACTS, good({ declarationStatus: 'valid', declarationHash: undefined }));
  assert.notEqual(noDigest.verdict, 'valid', 'valid 声明缺摘要时不得放行');
  assert.equal(isRefUsable(VALID_FACTS, good({ declarationStatus: 'valid', declarationHash: undefined })), false);
  // 捕获 valid 但**捕获时没有摘要**（异常数据）⇒ 亦不得放行。
  const noCapDigest = evaluateRefValidity({ ...FACTS, declaration: { status: 'valid' } }, good({ declarationStatus: 'valid', declarationHash: 'h1' }));
  assert.equal(noCapDigest.verdict, 'invalid');
  assert.equal(isRefUsable({ ...FACTS, declaration: { status: 'valid' } }, good({ declarationStatus: 'valid', declarationHash: 'h1' })), false);
});

test('R1 store: 捕获时的 declaration 事实被原样保留（摄取补全的事实不丢）', () => {
  const store = createRefStore();
  const rec = store.create({ ...ABSENT_FACTS, selector: '#t' });
  assert.deepEqual(rec.facts.declaration, { status: 'absent' }, '摄取补全的 declaration 必须进入捕获事实');
  const env = good({ declarationStatus: 'absent', declarationHash: undefined });
  store.judge(env);
  assert.equal(store.get(rec.facts.refId)?.verdict, 'valid');
  assert.equal(store.dispatch(rec.facts.refId, env).allowed, true);
  // 状态一变即失效（派发被阻断，计数不增）。
  const changed = good({ declarationStatus: 'valid', declarationHash: 'h1' });
  assert.equal(store.dispatch(rec.facts.refId, changed).allowed, false);
  assert.equal(store.commandSends(), 1);
  // 未带 declaration 的旧式 RawRefFacts 不得凭空得到状态。
  const legacy = store.create({ ...FACTS, selector: '#t2', declarationHash: '' });
  assert.equal('declaration' in legacy.facts, false);
});
