import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEventBus,
  DEFAULT_BUDGETS,
  isJitterType,
  busFilterMatch,
  type BusEvent,
  type EventBusAuditEvent,
  type IngestEvent,
} from './event-bus.js';

/** 手动时钟 + 事件总线构建（测试确定性）。 */
function makeBus(opts: { mergeWindowMs?: number; audit?: (ev: EventBusAuditEvent) => void } = {}) {
  let t = 1000;
  const now = () => t;
  const bus = createEventBus({ now, ...(opts.mergeWindowMs !== undefined ? { mergeWindowMs: opts.mergeWindowMs } : {}), ...(opts.audit ? { auditHook: opts.audit } : {}) });
  const advance = (ms: number) => {
    t += ms;
  };
  return { bus, now: () => t, advance };
}

// ---- 预算常量单一数据源（ADR-004/D-001） ----

test('event-bus: DEFAULT_BUDGETS 单一数据源 = ADR-004 表（缓冲 200/1000、累计 2000、并发 8、速率 200、窗口 800、N=10、4KB）', () => {
  assert.equal(DEFAULT_BUDGETS.bufferLimit, 200);
  assert.equal(DEFAULT_BUDGETS.bufferLimitMax, 1000);
  assert.equal(DEFAULT_BUDGETS.cumulativeBudget, 2000);
  assert.equal(DEFAULT_BUDGETS.maxSubscriptions, 8);
  assert.equal(DEFAULT_BUDGETS.ratePerSec, 200);
  assert.equal(DEFAULT_BUDGETS.mergeWindowMs, 800);
  assert.equal(DEFAULT_BUDGETS.summaryN, 10);
  assert.equal(DEFAULT_BUDGETS.payloadBudgetChars, 4096);
});

test('event-bus: 抖动类类型集合 = scroll/resize/mousemove/mouseover', () => {
  for (const ty of ['scroll', 'resize', 'mousemove', 'mouseover']) assert.equal(isJitterType(ty), true);
  for (const ty of ['click', 'keydown', 'input', 'submit']) assert.equal(isJitterType(ty), false);
  assert.equal(isJitterType(undefined), false);
});

// ---- 全局开关默认关 = 零常驻（NFR-007） ----

test('event-bus: 全局开关默认关 → ingest 零入缓冲（disabledDropped 计数），switch(true) 后事件流', () => {
  const { bus } = makeBus();
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  const st0 = bus.status();
  assert.equal(st0.enabled, false);
  assert.equal(st0.subscriptionCount, 1);

  bus.ingest({ kind: 'dom', type: 'click', target: '#a' });
  let r = bus.pull(sub.subId);
  assert.equal(r.ok, true);
  assert.equal(r.events.length, 0, '默认关 → 事件不入缓冲');
  assert.equal(bus.status().disabledDropped, 1);

  bus.switch(true);
  bus.ingest({ kind: 'dom', type: 'click', target: '#a' });
  r = bus.pull(sub.subId);
  assert.equal(r.events.length, 1);
});

// ---- 订阅生命周期（FR-008） ----

test('event-bus: subscribe 唯一 subId；unsubscribe/pause/resume/clear 语义正确', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const a = bus.subscribe({ kind: 'dom', label: 'A' });
  const b = bus.subscribe({ kind: 'console', label: 'B' });
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;
  assert.notEqual(a.subId, b.subId);

  advance(1);
  bus.ingest({ kind: 'dom', type: 'click' });
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'x', meta: { level: 'error' } });

  // pause: 暂停后事件不入缓冲
  const p = bus.pause(a.subId);
  assert.deepEqual(p, { ok: true });
  advance(1);
  bus.ingest({ kind: 'dom', type: 'click' });
  assert.equal(bus.pull(a.subId).events.length, 1, 'pause 后新事件不投递');

  // resume: 恢复投递
  bus.resume(a.subId);
  advance(1);
  bus.ingest({ kind: 'dom', type: 'click' });
  assert.equal(bus.pull(a.subId).events.length, 1, 'resume 后新事件继续投递');

  // clear: 清空缓冲（游标保持）
  const subC = bus.subscribe({ kind: 'dom' });
  if (!subC.ok) return;
  advance(1);
  bus.ingest({ kind: 'dom', type: 'scroll' });
  assert.equal(bus.pull(subC.subId).events.length, 1);
  assert.deepEqual(bus.clear(subC.subId), { ok: true });
  assert.equal(bus.pull(subC.subId).events.length, 0);

  // unsubscribe: 退订后事件不再投递、list 不含
  assert.deepEqual(bus.unsubscribe(b.subId), { ok: true });
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'y' });
  assert.equal(bus.list().length, 2, '退订后剩余 2 订阅');
  const ids = bus.list().map((s) => s.subId);
  assert.ok(!ids.includes(b.subId));
});

test('event-bus: 多订阅并发互不干扰（事件按订阅过滤独立投递）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const domAll = bus.subscribe({ kind: 'dom' });
  const clickOnly = bus.subscribe({ kind: 'dom', filter: { types: ['click'] } });
  const consoleOnly = bus.subscribe({ kind: 'console' });
  assert.ok(domAll.ok && clickOnly.ok && consoleOnly.ok);
  if (!domAll.ok || !clickOnly.ok || !consoleOnly.ok) return;

  advance(1);
  bus.ingest({ kind: 'dom', type: 'click', target: '#a' });
  advance(1);
  bus.ingest({ kind: 'dom', type: 'keydown', target: '#b' });
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'boom', meta: { level: 'error' } });

  assert.equal(bus.pull(domAll.subId).events.length, 2);
  const clickR = bus.pull(clickOnly.subId);
  assert.equal(clickR.events.length, 1);
  assert.equal(clickR.events[0].type, 'click');
  assert.equal(bus.pull(consoleOnly.subId).events.length, 1);
});

// ---- 缓冲满最旧丢弃 + 计数（EC-002）；单事件超 4KB 截断（FR-013） ----

test('event-bus: 缓冲满 → 最旧丢弃 + dropped 计数准确（不静默丢）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom', budget: { bufferLimit: 3 } });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  for (let i = 0; i < 5; i++) {
    advance(1);
    bus.ingest({ kind: 'dom', type: 'click', target: `#e${i}` });
  }
  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 3, '缓冲保留最近 3 条');
  assert.deepEqual(
    r.events.map((e) => e.target),
    ['#e2', '#e3', '#e4'],
  );
  assert.equal(r.dropped, 2, '最旧丢弃计数准确');
  assert.ok(!r.events.some((e) => e.target === '#e0' || e.target === '#e1'));
});

test('event-bus: 单事件超 4KB → 截断 + truncated 标记（FR-013）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'console' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'x'.repeat(5000) });
  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 1);
  const ev = r.events[0];
  assert.equal(ev.text?.length, DEFAULT_BUDGETS.payloadBudgetChars);
  assert.equal(ev.truncated, true);
});

// ---- pull {lastId} 增量：无重复无遗漏（AC-002） ----

test('event-bus: pull{lastId} 增量无重复无遗漏（本地游标 = 已拉最大 seq）；全量与增量并存', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  for (let i = 0; i < 5; i++) {
    advance(1);
    bus.ingest({ kind: 'dom', type: 'click', target: `#e${i}` });
  }
  // 全量拉取
  const all = bus.pull(sub.subId);
  assert.equal(all.events.length, 5);
  const seqsAll = all.events.map((e) => e.seq);
  assert.deepEqual(seqsAll, [1, 2, 3, 4, 5]);
  assert.equal(all.lastId, 5);

  // 增量拉取（lastId=3）→ 只回 4/5
  advance(1);
  bus.ingest({ kind: 'dom', type: 'click', target: '#e5' });
  const inc = bus.pull(sub.subId, { lastId: 3 });
  assert.deepEqual(
    inc.events.map((e) => e.seq),
    [4, 5, 6],
    '增量无重复无遗漏',
  );
  assert.equal(inc.lastId, 6);

  // 无新事件 → 空增量（游标不变）
  const empty = bus.pull(sub.subId, { lastId: 6 });
  assert.equal(empty.events.length, 0);
  assert.equal(empty.lastId, 6);
});

test('event-bus: pull max 截断 + 缓冲内事件冻结不可变（ADR-003）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  for (let i = 0; i < 4; i++) {
    advance(1);
    bus.ingest({ kind: 'dom', type: 'click' });
  }
  const r = bus.pull(sub.subId, { max: 2 });
  assert.equal(r.events.length, 2);
  assert.equal(r.lastId, 2, 'max 截断后游标 = 已返回最大 seq（下次可续拉）');
  const again = bus.pull(sub.subId);
  assert.deepEqual(
    again.events.map((e) => e.seq),
    [3, 4],
    'max 截断无遗漏（续拉补齐）',
  );
  const ev = r.events[0];
  assert.equal(Object.isFrozen(ev), true);
  assert.throws(() => {
    (ev as { type?: string }).type = 'hacked';
  });
});

// ---- 抖动合并窗口（ADR-003） ----

test('event-bus: 抖动类同类型同目标窗口内合并为单条 count（含 first/last ts）；非抖动不合并', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  // 窗口内三次 scroll 同目标 → 单条 count=3
  bus.ingest({ kind: 'dom', type: 'scroll', target: '#list' }); // t=1000
  advance(300);
  bus.ingest({ kind: 'dom', type: 'scroll', target: '#list' }); // t=1300
  advance(300);
  bus.ingest({ kind: 'dom', type: 'scroll', target: '#list' }); // t=1600 (1600-1000<=800)
  // 窗口内不同目标 → 不合并
  advance(100);
  bus.ingest({ kind: 'dom', type: 'scroll', target: '#other' }); // t=1700
  // 非抖动 click → 不合并
  bus.ingest({ kind: 'dom', type: 'click', target: '#list' }); // t=1700

  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 3, '合并 scroll×3 + scroll other + click');
  const merged = r.events.find((e) => e.type === 'scroll' && e.target === '#list');
  assert.ok(merged);
  if (merged) {
    assert.equal(merged.count, 3);
    assert.equal(merged.ts, 1000, '合并事件 ts = 窗口首事件');
    assert.equal(merged.lastTs, 1600, 'lastTs = 窗口末事件');
  }
  const other = r.events.find((e) => e.type === 'scroll' && e.target === '#other');
  assert.equal(other?.count, undefined);
  const click = r.events.find((e) => e.type === 'click');
  assert.equal(click?.count, undefined);
});

test('event-bus: 窗口关闭后同目标新合并批次；mergeWindowMs=0 关闭合并', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // t=1000
  advance(900); // 900 > 800 → 窗口关
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // t=1900
  advance(500);
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // t=2400 (2400-1900<=800)

  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 2, '两批：批1 单条 + 批2 合并');
  const [e1, e2] = r.events;
  assert.equal(e1.count, undefined);
  assert.equal(e2.count, 2);
  assert.equal(e2.ts, 1900);
  assert.equal(e2.lastTs, 2400);

  // 0 = 关合并
  const bus2 = makeBus({ mergeWindowMs: 0 });
  bus2.bus.switch(true);
  const sub2 = bus2.bus.subscribe({ kind: 'dom' });
  assert.ok(sub2.ok);
  if (!sub2.ok) return;
  bus2.bus.ingest({ kind: 'dom', type: 'scroll', target: '#a' });
  bus2.advance(100);
  bus2.bus.ingest({ kind: 'dom', type: 'scroll', target: '#a' });
  const r2 = bus2.bus.pull(sub2.subId);
  assert.equal(r2.events.length, 2, '窗口 0 = 不合并（保真）');
});

test('event-bus: 已 pull 的合并尾部不再原地累计 —— pull 后同窗口抖动事件新建条目，增量准确不重复不遗漏（C23/EC-002 洪峰语义）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  // 窗口内 3 次同目标 mousemove → 合并为单条 count=3（seq=1；t=1000/1200/1400，seq2/seq3 并入）
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // seq=1 t=1000
  advance(200);
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // seq=2 t=1200（并入 seq1 批次）
  advance(200);
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // seq=3 t=1400（并入 seq1 批次）
  const r1 = bus.pull(sub.subId);
  assert.equal(r1.events.length, 1);
  assert.equal(r1.events[0].seq, 1);
  assert.equal(r1.events[0].count, 3);
  assert.equal(r1.events[0].lastTs, 1400);
  assert.equal(r1.lastId, 1);

  // pull 后（AI 已取走 seq=1）同窗口（距批首 ts=1000 ≤800ms）继续到达同目标抖动事件：
  // 修复前 = seq4 原地累加进已投递尾部（count→4，不可见）+ seq5 因窗口超限另起新条 →
  //   AI 漏看 seq4 对应的一次抖动到达（计数滞后）；修复后 = 已投递尾部关窗，seq4 新建条目、
  //   seq5 与之合并 → 下次增量可准确取回（count=2，无重复无遗漏）
  advance(300); // t=1700（1700-1000 ≤ 800 仍在窗口内）
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // seq=4 t=1700
  advance(200); // t=1900
  bus.ingest({ kind: 'dom', type: 'mousemove', target: '#a' }); // seq=5 t=1900（1900-1700 ≤ 800 与 seq4 合并）
  const r2 = bus.pull(sub.subId);
  assert.equal(r2.events.length, 1, '增量返回新合并批次（不重复不遗漏）');
  assert.equal(r2.events[0].seq, 4, '新批次以关窗后首事件 seq 呈现（非已投递 seq=1）');
  assert.equal(r2.events[0].count, 2, '新批次合并计数准确（seq4+seq5 两次到达不漏）');
  assert.equal(r2.events[0].ts, 1700, '新批次 ts = 窗口内首事件');
  assert.equal(r2.events[0].lastTs, 1900);
  assert.ok(!r2.events.some((e) => e.seq === 1), '已投递尾部不回放（无重复）');
  assert.equal(r2.lastId, 4, '合并条目 seq = 批次首事件 seq');

  // 已投递原条目保持 pull 时冻结快照（count 不被后续 ingest 改写）
  assert.equal(r1.events[0].count, 3, '已投递冻结事件不被后续合并改写');

  // 消费完成后空增量（确认无遗漏残留）
  const r3 = bus.pull(sub.subId);
  assert.equal(r3.events.length, 0);
  assert.equal(r3.lastId, 4);
});

// ---- 全局单调 seq / 过滤（ADR-003/005） ----

test('event-bus: 全局单调 seq 跨源总序（dom+console 混合到达 = 到达序）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const d = bus.subscribe({ kind: 'dom' });
  const c = bus.subscribe({ kind: 'console' });
  assert.ok(d.ok && c.ok);
  if (!d.ok || !c.ok) return;
  bus.ingest({ kind: 'dom', type: 'click' });
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'a' });
  advance(1);
  bus.ingest({ kind: 'dom', type: 'keydown' });
  const ds = bus.pull(d.subId).events.map((e) => e.seq);
  const cs = bus.pull(c.subId).events.map((e) => e.seq);
  assert.deepEqual(ds, [1, 3]);
  assert.deepEqual(cs, [2]);
  assert.ok(ds[0] < cs[0] && cs[0] < ds[1], '跨源总序 = 到达序');
});

test('event-bus: busFilterMatch 过滤 = 类型 ∩ level ∩ URL glob ∩ selector（命中/未命中）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const f = bus.subscribe({
    kind: 'network',
    filter: { types: ['fetch'], levels: [], urlPattern: 'https://api.example.com/*', selector: undefined },
  });
  assert.ok(f.ok);
  if (!f.ok) return;
  advance(1);
  bus.ingest({ kind: 'network', type: 'fetch', meta: { url: 'https://api.example.com/v1/users?token=SECRET', status: 200 } });
  advance(1);
  bus.ingest({ kind: 'network', type: 'xhr', meta: { url: 'https://api.example.com/v1/x', status: 500 } });
  advance(1);
  bus.ingest({ kind: 'network', type: 'fetch', meta: { url: 'https://other.com/', status: 200 } });
  const r = bus.pull(f.subId);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].meta?.url, 'https://api.example.com/v1/users?token=SECRET');
});

test('event-bus: 订阅类型/level/selector 过滤命中与未命中', () => {
  // level 过滤
  const levelEv = (): { ev: IngestEvent; hit: boolean } => ({ ev: { kind: 'console', type: 'error', text: 'x', meta: { level: 'error' } }, hit: true });
  void levelEv;
  const consoleSub = busFilterMatch({ levels: ['error'] }, { seq: 1, ts: 1, kind: 'console', type: 'error', text: 'x', meta: { level: 'error' } });
  assert.equal(consoleSub, true);
  const consoleMiss = busFilterMatch({ levels: ['warn'] }, { seq: 1, ts: 1, kind: 'console', type: 'error', text: 'x', meta: { level: 'error' } });
  assert.equal(consoleMiss, false);
  // selector（css: / text=）命中与未命中
  assert.equal(busFilterMatch({ selector: 'css:#submit' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: '#submit' }), true);
  assert.equal(busFilterMatch({ selector: '#submit' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: '#submit' }), true);
  assert.equal(busFilterMatch({ selector: 'css:#other' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: '#submit' }), false);
  assert.equal(busFilterMatch({ selector: 'text=保存' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: 'button "保存修改"' }), true);
  assert.equal(busFilterMatch({ selector: 'text*=删除' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: 'button "确认删除此项"' }), true);
  assert.equal(busFilterMatch({ selector: 'text=取消' }, { seq: 1, ts: 1, kind: 'dom', type: 'click', target: 'button "确认删除"' }), false);
  // 缺省过滤器 = 全量
  assert.equal(busFilterMatch(undefined, { seq: 1, ts: 1, kind: 'dom' }), true);
});

// ---- 预算：自动暂停 / 并发上限 / 速率护栏 / setBudget（FR-014） ----

test('event-bus: 每订阅累计预算超限 → 自动暂停 + 提示；resume 恢复（FR-014）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom', budget: { autoPauseAt: 3 } });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  for (let i = 0; i < 4; i++) {
    advance(1);
    bus.ingest({ kind: 'dom', type: 'click' });
  }
  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 3, '第 4 条触发自动暂停不投递');
  assert.equal(r.autoPaused, true);
  assert.match(r.note ?? '', /自动暂停/);
  // 自动暂停期间事件不投递
  advance(1);
  bus.ingest({ kind: 'dom', type: 'click' });
  assert.equal(bus.pull(sub.subId).events.length, 0);
  // resume 恢复
  bus.resume(sub.subId);
  advance(1);
  bus.ingest({ kind: 'dom', type: 'click' });
  assert.equal(bus.pull(sub.subId).events.length, 1);
});

test('event-bus: 并发订阅上限 8 → 第 9 个拒注册 + 可读错误', () => {
  const { bus } = makeBus();
  for (let i = 0; i < DEFAULT_BUDGETS.maxSubscriptions; i++) {
    const r = bus.subscribe({ kind: 'dom' });
    assert.ok(r.ok);
  }
  const overflow = bus.subscribe({ kind: 'dom' });
  assert.equal(overflow.ok, false);
  if (!overflow.ok) assert.match(overflow.error, /已满/);
});

test('event-bus: 速率护栏 200 条/s 超限丢弃 + 计数；setBudget 调整缓冲上限', () => {
  const { bus } = makeBus();
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  // 同一秒内灌 205 条 → 前 200 入缓冲，后 5 条速率丢弃
  for (let i = 0; i < 205; i++) bus.ingest({ kind: 'dom', type: 'click' });
  const r = bus.pull(sub.subId);
  assert.equal(r.events.length, 200);
  assert.equal(r.dropped, 0, '非缓冲满丢弃');
  assert.equal(bus.status().rateDropped, 5);

  // setBudget 提高缓冲上限（速率桶已翻秒）
  const sb = bus.setBudget(sub.subId, { bufferLimit: 10 });
  assert.deepEqual(sb, { ok: true });
  const bad = bus.setBudget(sub.subId, { bufferLimit: 5000 });
  assert.equal(bad.ok, false);
});

// ---- 审计钩子（FR-007 窄接口；无敏感明文） ----

test('event-bus: 审计钩子窄接口 = subscribe/unsubscribe/delivery-summary（subId/kind/计数，无明文）', () => {
  const seen: EventBusAuditEvent[] = [];
  const { bus, advance } = makeBus({ audit: (ev) => seen.push(ev) });
  bus.switch(true);
  const sub = bus.subscribe({ kind: 'dom', sensitive: true });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  advance(1);
  bus.ingest({ kind: 'dom', type: 'input', text: 'sensitive-value-should-not-leak', sensitiveDetail: 'sensitive-value-should-not-leak' });
  bus.pull(sub.subId);
  bus.unsubscribe(sub.subId);

  const hooks = seen.map((e) => e.hook);
  assert.deepEqual(hooks, ['subscribe', 'delivery-summary', 'unsubscribe']);
  const join = JSON.stringify(seen);
  assert.ok(!join.includes('sensitive-value-should-not-leak'), '审计钩子无明文负载');
  const subEv = seen[0];
  assert.equal(subEv.hook, 'subscribe');
  if (subEv.hook === 'subscribe') {
    assert.equal(subEv.subId, sub.subId);
    assert.equal(subEv.kind, 'dom');
    assert.equal(subEv.sensitive, true);
  }
});

// ---- 敏感明细侧库（pull-sensitive 通道） ----

test('event-bus: sensitive 订阅 ingest 保留明细细侧库；pullSensitive 按 seq 取回（越权拒）', () => {
  const { bus, advance } = makeBus();
  bus.switch(true);
  const sen = bus.subscribe({ kind: 'console', sensitive: true });
  const plain = bus.subscribe({ kind: 'console' });
  assert.ok(sen.ok && plain.ok);
  if (!sen.ok || !plain.ok) return;
  advance(1);
  bus.ingest({ kind: 'console', type: 'error', text: 'console 摘要', sensitiveDetail: '完整明文 console 内容含 token=abc123' });
  const r = bus.pull(sen.subId);
  assert.equal(r.events.length, 1);
  const ev = r.events[0];
  assert.equal(ev.text, 'console 摘要', '普通缓冲只见脱敏摘要');
  const detail = bus.pullSensitive(sen.subId, ev.seq);
  assert.equal(detail.ok, true);
  if (detail.ok) assert.equal(detail.detail, '完整明文 console 内容含 token=abc123');
  // 非 sensitive 订阅越权拉取 → 拒
  const deny = bus.pullSensitive(plain.subId, ev.seq);
  assert.equal(deny.ok, false);
});

// ---- 失效/错误语义（EC-001/012） ----

test('event-bus: 失效订阅 pull/unsubscribe → 可读错误不中断', () => {
  const { bus } = makeBus();
  const sub = bus.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  bus.unsubscribe(sub.subId);
  const r = bus.pull(sub.subId);
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /不存在或已失效/);
  const u = bus.unsubscribe(sub.subId);
  assert.equal(u.ok, false);
});
