/**
 * V4-2 TASK-608 (leaf `specs-tree-v4-2-chat-stream-model`) — the **stream model**
 * gate (node, zero Chromium).
 *
 * Six groups, each mapped to an acceptance clause of TASK-601 / TASK-606 / FR-CHAT-020
 * / FR-CHAT-025 / NFR-CHAT-001:
 *
 *   ① 不可变 ② `seq` 单调不复用（含跨会话切换）③ 回放等价（双向）
 *   ④ 终态冻结 ⑤ 无「置 null 消失」路径 ⑥ `boundStreamEvents` 淘汰规则
 *
 * Plus the taxonomy assertion (`CARD_TYPES` = 12 = 7 primary + 5 process and
 * `CARD_KIND_LAYER` total) that ADR-V4-029 decision 5 requires.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_KIND_LAYER,
  CARD_TYPES,
  PRIMARY_CARD_TYPES,
  PROCESS_CARD_TYPES,
  STREAM_EVENT_KINDS,
  appendEvent,
  boundStreamEvents,
  createStreamState,
  formatClock,
  lastOpenCardId,
  liveCardIds,
  project,
  switchStreamSession,
} from '../src/ui/sidepanel/stream-model.js';
import type { StreamState } from '../src/ui/sidepanel/stream-model.js';

/** A tiny helper: append a `system` row (the bound's only evictable kind). */
function sys(state: StreamState, ts: number): StreamState {
  return appendEvent(state, { kind: 'system', ts, payload: { label: `sys-${ts}` } });
}

// ── Taxonomy (ADR-V4-029 decision 5 / FR-CHAT-021 / FR-CHAT-036) ──────────────

test('v4-2 taxonomy: CARD_TYPES = 12 (7 primary first, design-contract order + 5 process)', () => {
  assert.equal(CARD_TYPES.length, 12, `CARD_TYPES 必须 12 项（实测 ${CARD_TYPES.length}）`);
  assert.deepEqual(CARD_TYPES.slice(0, 7), [...PRIMARY_CARD_TYPES], '前 7 项必须逐字等于 7 主类（顺序敏感）');
  assert.deepEqual(CARD_TYPES.slice(7), [...PROCESS_CARD_TYPES], '后 5 项必须为过程卡族');
  assert.deepEqual(
    [...PRIMARY_CARD_TYPES],
    ['ai', 'user', 'nextstep', 'askuser', 'auth', 'system', 'ref'],
    '7 主类必须与设计契约 shim#CARD_TYPES 逐字一致',
  );
  assert.equal(new Set(CARD_TYPES).size, 12, '12 项不得重复');
});

test('v4-2 taxonomy: CARD_KIND_LAYER covers every kind with a layer', () => {
  for (const kind of STREAM_EVENT_KINDS) {
    const layer = CARD_KIND_LAYER[kind];
    assert.ok(layer === 'primary' || layer === 'process', `${kind} 必须有 layer（实测 ${layer}）`);
  }
  assert.equal(Object.keys(CARD_KIND_LAYER).length, 12, 'layer 表必须覆盖全部 12 项');
  for (const kind of PRIMARY_CARD_TYPES) assert.equal(CARD_KIND_LAYER[kind], 'primary', `${kind} 必须是 primary`);
  for (const kind of PROCESS_CARD_TYPES) assert.equal(CARD_KIND_LAYER[kind], 'process', `${kind} 必须是 process`);
});

// ── ① 不可变 ─────────────────────────────────────────────────────────────────

test('v4-2 ① 不可变：appendEvent 返回新 state，旧 state/旧事件不被改写，事件对象被冻结', () => {
  const s0 = createStreamState('https://a.test');
  const s1 = appendEvent(s0, { kind: 'user', ts: 1_000, payload: { text: 'hello' } });
  assert.notEqual(s0, s1, '必须返回新 state（不得原地改写）');
  assert.equal(s0.events.length, 0, '旧 state 的事件数组不得被追加');
  assert.equal(s1.events.length, 1);
  assert.equal(Object.isFrozen(s1.events[0]), true, '事件对象必须被 Object.freeze');
  assert.equal(Object.isFrozen(s1.events), true, '事件数组必须被 Object.freeze');
  assert.throws(() => {
    // @ts-expect-error — runtime immutability proof (the type system already forbids it).
    s1.events[0].seq = 999;
  }, '冻结的事件在运行时也不可写');
  assert.equal(s1.events[0].seq, 1, '写入尝试必须无效');
});

/**
 * F-01（v4-2 收口轮，validate R1）—— `Object.freeze` 是**浅**冻结，所以
 * `payload.options` / `payload.chips` 这类数组曾经可以被**三处**改写：① 事件引用
 * ② `project()` 返回的 `CardView` ③ 调用方持有的原数组（validate 已逐条证明）。
 * 本用例对三条路径逐条设卡；`deepFreeze` 被回退（改回 `Object.freeze` 浅冻结）时
 * 三条断言均会判红。
 */
test('v4-2 ① F-01 深冻结：payload.options/chips 的三条改写路径全部堵死', () => {
  const options = ['选项一', '选项二'];
  const chips = ['site_notes-list', 'tabs list'];
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'askuser', ts: 1, cardId: 'q1', payload: { prompt: '继续？', options } });
  s = appendEvent(s, { kind: 'nextstep', ts: 2, cardId: 'n1', payload: { chips } });

  // ① 事件引用（appendEvent 之后事件里的数组必须是冻结的**自有副本**）
  const ev = s.events[0];
  assert.equal(Object.isFrozen(ev.payload.options), true, '事件载荷的 options 数组必须被冻结（F-01）');
  assert.equal(Object.isFrozen(s.events[1].payload.chips), true, '事件载荷的 chips 数组必须被冻结（F-01）');
  assert.throws(() => {
    (ev.payload.options as string[])[0] = 'HACK';
  }, TypeError, '写事件里的 options[0] 必须抛 TypeError');
  assert.throws(() => {
    (ev.payload.options as string[]).push('HACK');
  }, TypeError, 'push 事件里的 options 必须抛 TypeError');
  assert.deepEqual([...ev.payload.options!], ['选项一', '选项二'], '值必须不变');

  // ② CardView 投影（project 交出的是它自己的深冻结副本）
  const view = project(s)[0];
  assert.equal(Object.isFrozen(view.payload.options), true, 'CardView.payload.options 必须被冻结（F-01）');
  assert.throws(() => {
    (view.payload.options as string[])[0] = 'HACK';
  }, TypeError, '写 CardView 里的 options[0] 必须抛 TypeError');
  assert.throws(() => {
    (project(s)[1].payload.chips as string[])[0] = 'HACK';
  }, TypeError, '写 CardView 里的 chips[0] 必须抛 TypeError');
  assert.equal(project(s)[0].payload.options![0], '选项一', '投影值必须不变');

  // ③ 调用方持有的原数组（事件不得别名调用方的对象）
  options[0] = 'HACK';
  chips.push('HACK');
  assert.equal(ev.payload.options![0], '选项一', '事件不得与调用方数组共享引用（F-01③）');
  assert.deepEqual([...project(s)[0].payload.options!], ['选项一', '选项二'], '投影不得随调用方改写而变');
  assert.deepEqual([...project(s)[1].payload.chips!], ['site_notes-list', 'tabs list'], 'chips 同理');
});

test('v4-2 ① F-01 深冻结：嵌套数组/对象逐层冻结（不遗留可写内层）', () => {
  // The payload type only admits scalars / `readonly string[]`; the freeze chain must
  // nevertheless be DEEP (arrays of arrays / plain objects), so this drives it at runtime.
  let s = createStreamState('s1');
  s = appendEvent(s, {
    kind: 'askuser',
    ts: 1,
    payload: { options: [['内层']] } as never,
  });
  const inner = (s.events[0].payload.options as unknown as string[][])[0];
  assert.equal(Object.isFrozen(s.events[0].payload.options), true);
  assert.equal(Object.isFrozen(inner), true, '数组元素（嵌套数组）也必须逐层冻结（F-01）');
  assert.throws(() => {
    inner[0] = 'HACK';
  }, TypeError, '写嵌套内层必须抛 TypeError');
  assert.equal(inner[0], '内层', '嵌套内层值必须不变');
  const projected = project(s)[0].payload.options as unknown as string[][];
  assert.equal(Object.isFrozen(projected), true);
  assert.equal(Object.isFrozen(projected[0]), true, '投影侧同样逐层冻结');
  assert.throws(() => {
    projected[0][0] = 'HACK';
  }, TypeError);
});

// ── ② seq 单调不复用（含跨会话切换） ──────────────────────────────────────────

test('v4-2 ② seq 单调递增、永不复用', () => {
  let s = createStreamState('https://a.test');
  for (let i = 0; i < 10; i += 1) s = appendEvent(s, { kind: 'ai', ts: i, payload: { text: `t${i}` } });
  const seqs = s.events.map((e) => e.seq);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `seq 必须从 1 起严格递增（实测 ${seqs.join(',')}）`);
  assert.equal(new Set(seqs).size, seqs.length, 'seq 不得复用');
  assert.equal(s.seq, 11, 'state.seq 必须是下一个可用值');
});

test('v4-2 ②/④ 会话切换不重置 seq：切换后严格大于切换前最大值，旧段事件保留', () => {
  let s = createStreamState('https://a.test');
  s = appendEvent(s, { kind: 'tool', ts: 10, payload: { tool: 'site_notes-list', ok: true, ms: 123, text: 'out' }, terminal: 'completed' });
  const maxBefore = Math.max(...s.events.map((e) => e.seq));
  const countBefore = s.events.length;
  s = switchStreamSession(s, 'https://b.test', 'b.test');
  assert.equal(s.sessionId, 'https://b.test');
  assert.ok(s.events.length > countBefore, '切换必须追加（不清空）');
  const seg = s.events.filter((e) => e.sessionId === 'https://a.test');
  assert.equal(seg.length, countBefore, '旧段事件必须原样保留（FR-CHAT-024）');
  const maxAfterSwitch = Math.max(...s.events.slice(0, countBefore).map((e) => e.seq));
  assert.equal(maxAfterSwitch, maxBefore, '切换不得改写旧段 seq');
  const fresh = appendEvent(s, { kind: 'ai', ts: 20, payload: { text: 'x' } });
  assert.ok(fresh.events[fresh.events.length - 1].seq > maxBefore, '切换后的新事件 seq 必须严格更大（不重置）');
});

test('v4-2 ② 切换回已有段：不重复追加历史（switch-back 不产生重复行）', () => {
  let s = createStreamState('https://a.test');
  s = appendEvent(s, { kind: 'ai', ts: 1, payload: { text: 'A' } });
  const aRealRows = s.events.filter((e) => e.kind !== 'system').length;
  s = switchStreamSession(s, 'https://b.test', 'b.test');
  s = appendEvent(s, { kind: 'ai', ts: 2, payload: { text: 'B' } });
  s = switchStreamSession(s, 'https://a.test', 'a.test');
  // A pure re-activation (the caller checks `hasSegment`) must not append history:
  // only the switch separator itself is added, never the conversation rows again.
  assert.equal(
    s.events.filter((e) => e.sessionId === 'https://a.test' && e.kind !== 'system').length,
    aRealRows,
    '旧段真实行数不得翻倍',
  );
});

// ── ③ 回放等价（双向） ────────────────────────────────────────────────────────

test('v4-2 ③ 回放等价：同一事件序列 ⇒ 同一 CardView[]（逐项相等）', () => {
  const build = (): StreamState => {
    let s = createStreamState('s1');
    s = appendEvent(s, { kind: 'user', ts: 100, cardId: 'u1', payload: { text: 'hi' } });
    s = appendEvent(s, { kind: 'thinking', ts: 100, cardId: 't1', payload: { label: '思考' } });
    s = appendEvent(s, { kind: 'thinking', ts: 1_600, cardId: 't1', payload: { ms: 1_500 }, terminal: 'completed' });
    s = appendEvent(s, { kind: 'ai', ts: 1_700, cardId: 'a1', payload: { text: 'hello' } });
    return s;
  };
  assert.deepEqual(project(build()), project(build()), '同输入必须同输出（可回放）');
  assert.equal(project(build()).length, 3, 'user / thinking / ai = 3 张卡');
});

test('v4-2 ③ 回放等价反向：不同输入 ⇒ 不同卡（判据不恒真）', () => {
  let a = createStreamState('s1');
  a = appendEvent(a, { kind: 'ai', ts: 1, payload: { text: 'one' } });
  let b = createStreamState('s1');
  b = appendEvent(b, { kind: 'ai', ts: 1, payload: { text: 'two' } });
  assert.notDeepEqual(project(a), project(b), '不同 payload 必须产生不同投影');
  assert.equal(project(a)[0].payload.text, 'one');
});

test('v4-2 ③ project() 纯函数：不改写 state、不读钟（同一 state 连续投影恒定）', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'ai', ts: 5, payload: { text: 'x' } });
  const snapshot = JSON.stringify(s.events);
  const first = project(s);
  const second = project(s);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(s.events), snapshot, 'project() 不得改写事件');
});

// ── ④ 终态冻结 ───────────────────────────────────────────────────────────────

test('v4-2 ④ 终态冻结：同 cardId 追加后续事件后 terminal / terminalSeq 不变（payload 也不再折叠）', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'tool', ts: 10, cardId: 'k1', payload: { tool: 't', text: 'v1' } });
  s = appendEvent(s, { kind: 'tool', ts: 20, cardId: 'k1', payload: { ok: true, ms: 12, text: 'v2' }, terminal: 'completed' });
  const frozen = project(s)[0];
  assert.equal(frozen.terminal, 'completed');
  const terminalSeq = frozen.terminalSeq;
  const payloadAtFreeze = JSON.stringify(frozen.payload);
  // A later event on the SAME cardId (an illegal rewrite attempt) must be ignored.
  s = appendEvent(s, { kind: 'tool', ts: 30, cardId: 'k1', payload: { ok: false, ms: 99, text: 'v3' }, terminal: 'cancelled' });
  const after = project(s)[0];
  assert.equal(after.terminal, 'completed', '终态不得被后续事件改写');
  assert.equal(after.terminalSeq, terminalSeq, 'terminalSeq 不得改写');
  assert.equal(JSON.stringify(after.payload), payloadAtFreeze, '终态后的事件不得折叠进 payload');
  assert.equal(after.frozen, true);
});

test('v4-2 ④ 终态冻结：终态由第一个 terminal 事件唯一决定（后续 terminal 无效）', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'askuser', ts: 1, cardId: 'q1', payload: { prompt: 'p' } });
  s = appendEvent(s, { kind: 'askuser', ts: 2, cardId: 'q1', payload: { answer: 'a' }, terminal: 'answered' });
  s = appendEvent(s, { kind: 'askuser', ts: 3, cardId: 'q1', payload: { answer: 'b' }, terminal: 'cancelled' });
  const card = project(s)[0];
  assert.equal(card.terminal, 'answered');
  assert.equal(card.payload.answer, 'a', '终态事件携带的 answer 必须是最终值');
});

test('v4-2 ④ 单行类（system / notice）无终态但生来冻结', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'system', ts: 1, payload: { text: '会话已切换：x', label: '会话已切换：x' } });
  s = appendEvent(s, { kind: 'notice', ts: 2, payload: { text: 'n' } });
  for (const card of project(s)) {
    assert.equal(card.terminal, undefined, `${card.kind} 不得有终态字段`);
    assert.equal(card.frozen, true, `${card.kind} 必须生来冻结（单行只追加）`);
  }
});

// ── ⑤ 无「置 null 消失」路径 ─────────────────────────────────────────────────

test('v4-2 ⑤ 取消 / 取代后原卡仍在 project() 结果中（无置 null 消失）', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'askuser', ts: 1, cardId: 'q1', payload: { prompt: '继续？' } });
  assert.equal(s.openAsks.includes('q1'), true, '未终态 ask 必须进入 openAsks（v4-3 结算输入）');
  s = appendEvent(s, { kind: 'askuser', ts: 2, cardId: 'q1', payload: {}, terminal: 'cancelled' });
  const views = project(s);
  assert.equal(views.length, 1, '取消后卡必须仍在（不得消失）');
  assert.equal(views[0].cardId, 'q1');
  assert.equal(views[0].terminal, 'cancelled');
  assert.equal(s.openAsks.includes('q1'), false, '终态后必须从 openAsks 移除');
});

test('v4-2 ⑤ 三类终态（answered / cancelled / rejected）都留下同一张卡', () => {
  for (const [kind, terminal] of [
    ['askuser', 'answered'],
    ['askuser', 'cancelled'],
    ['auth', 'rejected'],
  ] as const) {
    let s = createStreamState('s1');
    s = appendEvent(s, { kind, ts: 1, cardId: 'k', payload: { prompt: 'p' } });
    s = appendEvent(s, { kind, ts: 2, cardId: 'k', payload: {}, terminal });
    const views = project(s);
    assert.equal(views.length, 1, `${kind}/${terminal} 必须留下 1 张卡`);
    assert.equal(views[0].terminal, terminal);
  }
});

// ── ⑥ boundStreamEvents ──────────────────────────────────────────────────────

test('v4-2 ⑥ bound：只淘汰非当前段的已终结 system/notice 行，dropped 计数可见', () => {
  let s = createStreamState('https://old.test');
  for (let i = 0; i < 8; i += 1) s = sys(s, i);
  s = switchStreamSession(s, 'https://now.test', 'now.test');
  s = sys(s, 100);
  const nowRowsBefore = s.events.filter((e) => e.sessionId === 'https://now.test').length;
  const bounded = boundStreamEvents(s, 5);
  assert.equal(bounded.events.length, 5, `淘汰后必须 ≤ cap（实测 ${bounded.events.length}）`);
  assert.equal(bounded.dropped, s.events.length - 5, 'dropped 必须等于实际淘汰数');
  const survivors = bounded.events.filter((e) => e.sessionId === 'https://old.test');
  assert.ok(survivors.length < 8, '旧段的 system 行必须被淘汰');
  assert.equal(
    bounded.events.filter((e) => e.sessionId === 'https://now.test').length,
    nowRowsBefore,
    '当前段的 system 行永不淘汰',
  );
});

test('v4-2 ⑥ bound：ask/auth 终态卡、tool 卡、ref 卡、当前段**逐类**不被淘汰', () => {
  let s = createStreamState('https://old.test');
  // ① ask/auth terminal cards ② tool cards ③ ref cards — all in the OLD segment.
  s = appendEvent(s, { kind: 'askuser', ts: 1, cardId: 'ask', payload: { prompt: 'p' } });
  s = appendEvent(s, { kind: 'askuser', ts: 2, cardId: 'ask', payload: {}, terminal: 'answered' });
  s = appendEvent(s, { kind: 'auth', ts: 3, cardId: 'auth', payload: { prompt: 'a' } });
  s = appendEvent(s, { kind: 'auth', ts: 4, cardId: 'auth', payload: {}, terminal: 'approved' });
  s = appendEvent(s, { kind: 'tool', ts: 5, cardId: 'tool', payload: { tool: 't', ok: true, ms: 1 }, terminal: 'completed' });
  s = appendEvent(s, { kind: 'ref', ts: 6, cardId: 'ref', payload: { refNum: 1, refState: 'stale' } });
  // Plus many evictable old-segment rows to force eviction.
  for (let i = 0; i < 20; i += 1) s = sys(s, 10 + i);
  // Move the ACTIVE segment to a fresh one so the old rows become evictable.
  s = switchStreamSession(s, 'https://now.test', 'now.test');
  s = appendEvent(s, { kind: 'system', ts: 999, cardId: 'cur', payload: { label: 'cur' } });
  const capped = boundStreamEvents(s, 6);
  const ids = new Set(capped.events.map((e) => e.cardId));
  for (const protectedId of ['ask', 'auth', 'tool', 'ref', 'cur']) {
    assert.equal(ids.has(protectedId), true, `受保护卡 ${protectedId} 不得被淘汰`);
  }
  assert.ok(capped.dropped > 0, '必须真的发生了淘汰（否则本用例空转）');
});

test('v4-2 ⑥ bound：未超 cap 时完全不动（dropped 保持）', () => {
  let s = createStreamState('s1');
  s = sys(s, 1);
  const same = boundStreamEvents(s, 2000);
  assert.equal(same, s, '未超 cap 必须返回同一 state（零副作用）');
});

// ── helpers ──────────────────────────────────────────────────────────────────

test('v4-2 helpers: liveCardIds / lastOpenCardId / formatClock', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'thinking', ts: 0, cardId: 't1', payload: {} });
  s = appendEvent(s, { kind: 'ai', ts: 0, cardId: 'a1', payload: {} });
  assert.deepEqual([...liveCardIds(s)].sort(), ['a1', 't1']);
  assert.equal(lastOpenCardId(s, 'thinking'), 't1');
  s = appendEvent(s, { kind: 'thinking', ts: 10, cardId: 't1', payload: { ms: 10 }, terminal: 'completed' });
  assert.equal(lastOpenCardId(s, 'thinking'), undefined, '终态后不再有未终态 thinking');
  assert.equal(formatClock(new Date(2026, 0, 1, 9, 5, 7).getTime()), '09:05:07');
  assert.match(formatClock(Date.now()), /^\d{2}:\d{2}:\d{2}$/);
});

// ── V5-3 TASK-V5-156/157/158 (ADR-V5-002 §3 · FR-ALLN-012) ───────────────────

test('V5-3 `error.payload.recovery`：出生铸造面流经 reduce/render 不被裁剪（缺省 ⇒ 零回归）', () => {
  const recovery = Object.freeze([Object.freeze({ text: '授权当前站点', opId: 'op.authorize' })]);
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'error', ts: 7, cardId: 'e1', payload: { text: '✖ 未授权站点', recovery } });
  const [card] = project(s).filter((v) => v.kind === 'error');
  assert.deepEqual(card.payload.recovery, [{ text: '授权当前站点', opId: 'op.authorize' }], 'recovery 必须在卡片 payload 上原样可见（出生铸造面）');
  // 缺省 ⇒ payload 上根本没有该字段（渲染零变化，回滚 = 不传）。
  let bare = createStreamState('s1');
  bare = appendEvent(bare, { kind: 'error', ts: 7, cardId: 'e2', payload: { text: '✖ 一般错误' } });
  const [bareCard] = project(bare).filter((v) => v.kind === 'error');
  assert.equal('recovery' in bareCard.payload, false, '非阻塞类 error 不得带 recovery 字段');
});

test('V5-3 出生冻结不破：error 卡出生后再追加事件也不能补上 / 改写 recovery（append-only）', () => {
  let s = createStreamState('s1');
  s = appendEvent(s, { kind: 'error', ts: 7, cardId: 'e1', payload: { text: '✖ 阻塞' } });
  const born = project(s).find((v) => v.kind === 'error');
  assert.ok(born, '前置：error 卡必须存在');
  assert.equal('recovery' in born.payload, false, '前置：出生时无 recovery');
  // 事后追加同 cardId 的事件：error 属 BORN_FROZEN_KINDS ⇒ payload 不再折叠（无法事后 patch 出恢复区）。
  s = appendEvent(s, { kind: 'error', ts: 8, cardId: 'e1', payload: { text: '✖ 阻塞', recovery: [{ text: 'x', opId: 'op.help' }] } });
  const after = project(s).find((v) => v.kind === 'error');
  assert.ok(after, 'error 卡必须仍在');
  assert.equal('recovery' in after.payload, false, '出生后不得出现 recovery（无 patch 路径）');
});
