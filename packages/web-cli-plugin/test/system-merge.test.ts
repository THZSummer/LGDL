/**
 * V4-4 R2（2026-09-19，leaf `specs-tree-v4-4-ref-system-nextstep`）—— **自动归并**的机器门禁。
 *
 * ── 为什么这个文件存在 ───────────────────────────────────────────────────────
 *
 * TASK-803（FR-CHAT-054 / ADR-V4-036 §5 归并矩阵）要求 6+ 条瞬时通道**自动**归并进唯一
 * 系统事件通道。R1 只落了「入口 + 文案单源 + 测试 seam」（`{type:'system'}` / 
 * `window.__v3.testing.systemRow`），两条**自动**通道（导航失效、`#notice` 覆盖槽）被显式
 * 推迟（登记偏差 KL-V44-01）。R2 按编排器裁决把它们接上，于是需要一条**可以红**的机器证据：
 *
 *   ① 导航失效（`state.invalidated` 的 **false→true 跳变**）⇒ 恰一条 `nav` 系统行；
 *      重复的 `invalidated:true` 刷新**不得**再追加（TASK-033 的 v1 语义：不覆盖更新的 notice）；
 *      跳变再次发生（窗口外）⇒ 追加**第二条**行（事实不丢，只在窗口内不重复）。
 *   ② `#notice` 覆盖槽（`{type:'notice'}`）⇒ 追加一条 `notice` 系统行，**同时**保留
 *      `state.notice` 的 v1 可读槽（`index.html#notice` 由保护门禁 `binding.mjs` 读取）。
 *   ③ 去重窗口由**唯一通道**统一施加：窗口内同一 `kind:text` 不追加；窗口后追加并带
 *      「持续：」前缀（事实不丢）。速率上限的 `dropped` 计数在状态栏可读（禁静默）。
 *   ④ 归并矩阵的**通道种类**必须落在 `SYSTEM_EVENT_KINDS` 闭集内，且 ①/② 两条的 kind
 *      分别是 `nav` / `notice`（不是别的通道顶替）。
 *
 * 每一条都断言**两个方向**：该追加时必须恰好多一行，不该追加时必须一行不多。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, reduce } from '../src/ui/sidepanel/chat-state.js';
import {
  SYSTEM_COPY,
  SYSTEM_CONTINUED_PREFIX,
  SYSTEM_DEDUPE_WINDOW_MS,
  SYSTEM_EVENT_KINDS,
  SYSTEM_ROWS_PER_MINUTE_CAP,
  continuedSystemText,
} from '../src/ui/sidepanel/system-events.js';
import type { SidepanelState } from '../src/ui/sidepanel/chat-state.js';

/** Every rendered system row's text, in append order (the single channel's readable face). */
function systemRows(state: SidepanelState): string[] {
  return state.stream.events
    .filter((e) => e.kind === 'system')
    .map((e) => String(e.payload.text ?? ''));
}

/** A settled fixture: one authorized origin, no pending turn. */
function base(): SidepanelState {
  let s = createInitialState();
  s = reduce(s, { type: 'state', origin: 'https://merge.test', discoveryState: 'supported', invalidated: false, at: 0 });
  return s;
}

// ── ① 导航失效：false→true 跳变 ──────────────────────────────────────────────

test('V4-4 自动归并①：导航失效 false→true 跳变 ⇒ 恰一条 nav 系统行（系统文案单源）', () => {
  let s = base();
  assert.deepEqual(systemRows(s), [], '前置：未跳变时零系统行（判据不得恒真）');
  s = reduce(s, { type: 'state', invalidated: true, at: 1000 });
  const rows = systemRows(s);
  assert.equal(rows.length, 1, `跳变必须恰追加一行，实际 ${JSON.stringify(rows)}`);
  assert.equal(rows[0], SYSTEM_COPY.navInvalidated, '文案必须取自 SYSTEM_COPY 单源（不得是第二处字面量）');
  // TASK-033 的 v1 可读槽语义**保留**：`#notice` 元素仍读到同一条事实。
  assert.match(s.notice ?? '', /导航/);
  // kind 必须是 `nav`（不是别的通道顶替）。
  const navEvent = s.stream.events.find((e) => e.kind === 'system');
  assert.ok(SYSTEM_EVENT_KINDS.includes('nav'), '`nav` 必须在通道闭集内');
  assert.equal(navEvent?.payload.label, SYSTEM_COPY.navInvalidated, '持久化 label 走同一文案单源');
});

test('V4-4 自动归并①：重复 invalidated:true 刷新**不得**再追加（TASK-033 语义保留）', () => {
  let s = base();
  s = reduce(s, { type: 'state', invalidated: true, at: 1000 });
  const after = systemRows(s).length;
  assert.equal(after, 1);
  // 用户在跳变后做了别的事（授权回执）…
  s = reduce(s, { type: 'notice', text: '已授权 https://merge.test', at: 1500 });
  // …随后的自动探测推送仍带 invalidated:true（**不是**跳变）。
  s = reduce(s, { type: 'state', origin: 'https://merge.test', invalidated: true, at: 2000 });
  s = reduce(s, { type: 'state', origin: 'https://merge.test', invalidated: true, at: 2500 });
  assert.equal(systemRows(s).filter((t) => t === SYSTEM_COPY.navInvalidated).length, 1, '非跳变刷新不得重复追加 nav 行');
  assert.equal(s.notice, '已授权 https://merge.test', 'v1 可读槽不得被陈旧 invalidation 覆盖（TASK-033）');
});

test('V4-4 自动归并①：窗口外再次跳变 ⇒ 追加第二条行（事实不丢，只在窗口内不重复）', () => {
  let s = base();
  s = reduce(s, { type: 'state', invalidated: true, at: 0 });
  s = reduce(s, { type: 'state', invalidated: false, at: 100 });
  s = reduce(s, { type: 'state', invalidated: true, at: SYSTEM_DEDUPE_WINDOW_MS + 1 });
  const rows = systemRows(s);
  assert.equal(rows.length, 2, `窗口外二次跳变必须追加新行，实际 ${JSON.stringify(rows)}`);
  assert.equal(rows[1], continuedSystemText(SYSTEM_COPY.navInvalidated), '窗口后的同事实行必须带「持续：」前缀');
  assert.equal(rows[0], SYSTEM_COPY.navInvalidated, '首行保持原样（历史不被改写）');
});

test('V4-4 自动归并①：窗口内的二次跳变被去重（不追加，也不伪造「持续」行）', () => {
  let s = base();
  s = reduce(s, { type: 'state', invalidated: true, at: 0 });
  s = reduce(s, { type: 'state', invalidated: false, at: 10 });
  s = reduce(s, { type: 'state', invalidated: true, at: SYSTEM_DEDUPE_WINDOW_MS });
  assert.deepEqual(systemRows(s), [SYSTEM_COPY.navInvalidated], '窗口内同 key 不得追加');
});

// ── ② `#notice` 覆盖槽 ───────────────────────────────────────────────────────

test('V4-4 自动归并②：notice 动作 ⇒ 追加 notice 系统行 ∧ 保留 v1 可读槽', () => {
  let s = base();
  s = reduce(s, { type: 'notice', text: '✓ 分组配置已更新（分组只共享对话，不代表互相授权）。', at: 1000 });
  assert.equal(s.notice, '✓ 分组配置已更新（分组只共享对话，不代表互相授权）。', 'v1 覆盖槽语义不变（#notice 元素仍可读）');
  const rows = systemRows(s);
  assert.equal(rows.length, 1, `notice 必须自动归并进唯一通道，实际 ${JSON.stringify(rows)}`);
  assert.equal(rows[0], s.notice, '两条通道承载同一事实（通道归并 ≠ 二次编造）');
});

test('V4-4 自动归并②：窗口内重复 notice 去重；窗口外追加「持续：」行', () => {
  let s = base();
  const text = '✖ 保存自动授权失败：后台无响应';
  s = reduce(s, { type: 'notice', text, at: 0 });
  s = reduce(s, { type: 'notice', text, at: 100 });
  assert.deepEqual(systemRows(s), [text], '窗口内同一条失败不得刷屏（去重窗口统一施加）');
  s = reduce(s, { type: 'notice', text, at: SYSTEM_DEDUPE_WINDOW_MS + 1 });
  assert.deepEqual(systemRows(s), [text, `${SYSTEM_CONTINUED_PREFIX}${text}`], '窗口后必须追加带「持续：」的行（事实不丢）');
});

test('V4-4 自动归并②：不同 notice 各自追加（去重键 = kind + 归一化文本，不是「kind 内只留一条」）', () => {
  let s = base();
  s = reduce(s, { type: 'notice', text: '甲', at: 0 });
  s = reduce(s, { type: 'notice', text: '乙', at: 1 });
  assert.deepEqual(systemRows(s), ['甲', '乙'], '不同事实必须各自留痕（只追加、不被覆盖）');
});

// ── ③ 唯一通道的共同纪律（去重 / 速率上限 / 净化）─────────────────────────────

test('V4-4 自动归并③：速率上限对所有自动来源生效 ⇒ dropped 计数 +1 且不追加（禁静默）', () => {
  let s = base();
  // 用 20 条**互不相同**的 notice 填满一分钟窗口（去重窗口拦不住它们）。
  for (let i = 0; i < SYSTEM_ROWS_PER_MINUTE_CAP; i += 1) {
    s = reduce(s, { type: 'notice', text: `第 ${i} 条不同事实`, at: i });
  }
  assert.equal(systemRows(s).length, SYSTEM_ROWS_PER_MINUTE_CAP, `窗口内应恰好 ${SYSTEM_ROWS_PER_MINUTE_CAP} 条`);
  const before = s.systemChannel.dropped;
  s = reduce(s, { type: 'notice', text: '第 21 条不同事实', at: SYSTEM_ROWS_PER_MINUTE_CAP });
  assert.equal(s.systemChannel.dropped, before + 1, '超限行必须计入 dropped（状态栏可读，禁静默丢弃）');
  assert.equal(systemRows(s).length, SYSTEM_ROWS_PER_MINUTE_CAP, '超限行不得追加到流内');
});

test('V4-4 自动归并③：自动来源同样走净化 fail-closed（明文不得入流）', () => {
  const s = base();
  assert.throws(
    () => reduce(s, { type: 'notice', text: 'https://evil.test/cb?token=SECRET', at: 0 }),
    '含 URL query / secret 的 notice 必须在构造系统行时抛错（净化不是可选步骤）',
  );
});

// ── ④ 归并矩阵的通道闭集 ─────────────────────────────────────────────────────

test('V4-4 自动归并④：通道闭集覆盖归并矩阵的每一个来源（且不含未登记通道）', () => {
  const required = [
    'env',
    'site',
    'firstRun',
    'notice',
    'send',
    'nav',
    'probe',
    'session',
    'decision',
    'ref',
    'turn',
  ];
  for (const kind of required) {
    assert.ok(SYSTEM_EVENT_KINDS.includes(kind as never), `归并矩阵来源 \`${kind}\` 必须在 SYSTEM_EVENT_KINDS 内`);
  }
  assert.equal(SYSTEM_EVENT_KINDS.length, required.length, '通道闭集不得多于归并矩阵（未登记通道不允许存在）');
  assert.equal(new Set(SYSTEM_EVENT_KINDS).size, SYSTEM_EVENT_KINDS.length, '通道闭集不得有重复项');
});
