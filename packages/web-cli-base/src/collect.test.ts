/**
 * collect.test.ts —— CollectBuffer 单测（FR-038~042 / ADR-006；护栏/trust/去重/脱敏单点）。
 *
 * 覆盖：append 创建/增量/多 id / cap 截断（EC-011 保留已采）/ 总量上限中止 /
 * 限速（时钟注入）/ appendReady 预检 / 去重（跨批持久 + 键序归一）/
 * trust 元数据 / 脱敏无明文（FR-024/EC-005）/ list/stats/clear。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCollectBuffer } from './collect.js';
import type { CollectRow } from './collect.js';
import {
  COLLECT_DEFAULT_MAX_ITEMS_PER_APPEND,
  COLLECT_DEFAULT_MAX_TOTAL_ROWS,
  COLLECT_DEFAULT_MIN_INTERVAL_MS,
} from './collect.js';

function makeClock(initial = 1000): { now: number; tick: (ms: number) => void } {
  const c = { now: initial, tick: (ms: number) => void (c.now += ms) };
  return c;
}

const r1 = (n: string): CollectRow => ({ id: n, val: `v-${n}` });

test('collect: append 创建条目 —— meta url/at/trust(untrusted 缺省) + rows 存取', () => {
  const buffer = createCollectBuffer();
  const res = buffer.append('jobs', [r1('a'), r1('b')], { url: 'https://host/list' });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.result.appended, 2);
  assert.equal(res.result.created, true);
  assert.equal(res.result.entryRows, 2);
  assert.equal(res.result.totalRows, 2);
  assert.equal(res.result.truncated, false);
  const e = buffer.get('jobs');
  assert.ok(e);
  assert.deepEqual(e.rows, [r1('a'), r1('b')]);
  assert.equal(e.meta.url, 'https://host/list');
  assert.equal(e.meta.trust, 'untrusted'); // FR-042：采集面缺省 untrusted
  assert.ok(e.meta.at > 0);
  assert.equal(e.stats.appends, 1);
  assert.equal(e.stats.firstAt, e.stats.lastAt);
  assert.equal(buffer.totalRows, 2);
});

test('collect: 翻页增量 append 同 id 累积 + meta.at 刷新 + 多 id 独立', () => {
  const c = makeClock();
  const buffer = createCollectBuffer({ now: () => c.now, minAppendIntervalMs: 0 });
  buffer.append('p', [{ item: '1' }], { url: 'https://host/list' });
  c.tick(500);
  const second = buffer.append('p', [{ item: '2' }], { url: 'https://host/list' });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.result.created, false);
  assert.equal(second.result.entryRows, 2);
  const e = buffer.get('p');
  assert.ok(e);
  assert.equal(e.rows.length, 2);
  assert.equal(e.stats.appends, 2);
  assert.equal(e.meta.at, c.now); // at 刷新为最近采集时间
  assert.equal(e.meta.url, 'https://host/list'); // 首采 url 保持（翻页同源）
  // 多 id 独立
  buffer.append('q', [{ item: 'x' }]);
  assert.equal(buffer.get('q')?.rows.length, 1);
  assert.equal(buffer.totalRows, 3);
});

test('collect: 单次 maxItems 截断 —— 保留前 N 条 + truncated 标记（FR-042/EC-011）', () => {
  const buffer = createCollectBuffer({ maxItemsPerAppend: 3, minAppendIntervalMs: 0 });
  const res = buffer.append('a', [r1('1'), r1('2'), r1('3'), r1('4'), r1('5')]);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.result.appended, 3);
  assert.equal(res.result.dropped, 2);
  assert.equal(res.result.truncated, true);
  const e = buffer.get('a');
  assert.ok(e);
  assert.equal(e.rows.length, 3); // 保留前 3 条，已采数据保留（EC-011）
  assert.deepEqual(e.rows.map((x) => x.id), ['1', '2', '3']);
  assert.equal(e.stats.droppedRows, 2);
  assert.equal(e.stats.truncated, true);
  assert.equal(buffer.stats().truncatedEntries, 1);
  assert.equal(buffer.stats().droppedRows, 2);
});

test('collect: 总量上限 —— 部分收容后 over-cap 中止保留已采（EC-011）', () => {
  const buffer = createCollectBuffer({ maxTotalRows: 4, minAppendIntervalMs: 0 });
  const first = buffer.append('a', [r1('1'), r1('2'), r1('3')]);
  assert.equal(first.ok && first.result.appended, 3);
  // 第二次 3 行只容纳 1 行（剩余容量 1），丢弃 2 → 截断
  const second = buffer.append('a', [r1('4'), r1('5'), r1('6')]);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.result.appended, 1);
  assert.equal(second.result.dropped, 2);
  assert.equal(second.result.cappedOut, true);
  assert.equal(buffer.get('a')?.rows.length, 4);
  // 容量 0 → 后续 append 整批中止（数据保留可导出）
  const third = buffer.append('a', [r1('7')]);
  assert.equal(third.ok, false);
  if (third.ok) return;
  assert.equal(third.block.reason, 'over-cap');
  assert.equal(third.block.maxTotalRows, 4);
  assert.equal(third.block.totalRows, 4);
  assert.equal(buffer.get('a')?.rows.length, 4);
  assert.equal(buffer.totalRows, 4);
});

test('collect: 限速单点（时钟注入）—— 两次 append 最小间隔 300ms（FR-042）', () => {
  const c = makeClock(0);
  const buffer = createCollectBuffer({ now: () => c.now, minAppendIntervalMs: 300 });
  const first = buffer.append('p', [{ i: 1 }]);
  assert.equal(first.ok, true);
  // 100ms 后再 append → rate-limited（需再等 200ms）
  c.tick(100);
  const early = buffer.append('p', [{ i: 2 }]);
  assert.equal(early.ok, false);
  if (early.ok) return;
  assert.equal(early.block.reason, 'rate-limited');
  if (early.block.reason !== 'rate-limited') return;
  assert.equal(early.block.waitMs, 200);
  assert.equal(early.block.intervalMs, 300);
  assert.equal(buffer.get('p')?.rows.length, 1); // 限速不丢数据
  // 预检同步拦截
  const pre = buffer.checkAppendReady('p');
  assert.equal(pre.ok, false);
  // 满 300ms 后可再写
  c.tick(200);
  assert.equal(buffer.checkAppendReady('p').ok, true);
  const ok = buffer.append('p', [{ i: 2 }]);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.result.appended, 1);
});

test('collect: appendReady 预检 —— 无条目即放行；有条目带剩余等待', () => {
  const c = makeClock(100);
  const buffer = createCollectBuffer({ now: () => c.now, minAppendIntervalMs: 500 });
  const fresh = buffer.checkAppendReady('nope');
  assert.deepEqual(fresh, { ok: true, entryExists: false });
  buffer.append('x', [{ v: 1 }]);
  c.tick(300);
  const wait = buffer.checkAppendReady('x');
  assert.equal(wait.ok, false);
  if (wait.ok) return;
  assert.equal(wait.waitMs, 200);
});

test('collect: 去重（跨批持久 + 键序归一）—— 翻页重复页整批跳过（FR-039 无重复）', () => {
  const buffer = createCollectBuffer({ dedupe: true, minAppendIntervalMs: 0 });
  const first = buffer.append('p', [{ a: '1', b: '2' }, { a: '2', b: '2' }]);
  assert.equal(first.ok && first.result.appended, 2);
  // 翻页重复页（键序不同 + 与首页重复行）→ 整批只收新行
  const second = buffer.append('p', [{ b: '2', a: '1' }, { a: '3', b: '3' }]);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.result.appended, 1); // {a:1,b:2} 判重跳过
  assert.equal(second.result.duplicateDropped, 1);
  assert.equal(buffer.get('p')?.rows.length, 3);
  assert.equal(buffer.get('p')?.stats.duplicateDropped, 1);
});

test('collect: 脱敏单点 —— 敏感列/表单字段描述行值脱敏、无明文（FR-024/EC-005）', () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('sec', [
    { item: 'login', password: 's3cr3t-pw', email: 'a@b.example' }, // 列名 password → 脱敏；email 非敏感不受影响
    { name: 'cardNumber', value: '4111 1111 1111 1111' }, // 表单字段描述行：name 启发式 → 脱敏 value
    { name: 'note', value: '普通说明文字' }, // 非敏感描述行：原样
  ]);
  const e = buffer.get('sec');
  assert.ok(e);
  const all = JSON.stringify(e.rows);
  assert.equal(all.includes('s3cr3t-pw'), false);
  assert.equal(all.includes('4111 1111 1111 1111'), false);
  assert.ok(all.includes('值已脱敏'));
  assert.ok(e.rows[0]?.password && typeof e.rows[0].password === 'string' && e.rows[0].password.startsWith('密码'));
  assert.equal(e.rows[0]?.email, 'a@b.example'); // FR-024 尾句：非敏感字段不受影响
  assert.equal(e.rows[0]?.item, 'login');
  const cardCell = e.rows[1]?.value;
  assert.ok(typeof cardCell === 'string' && cardCell.startsWith('卡号') && cardCell.includes('值已脱敏'));
  assert.equal(e.rows[2]?.value, '普通说明文字');
});

test('collect: maskSensitive:false 关闭脱敏（配置面）', () => {
  const buffer = createCollectBuffer({ maskSensitive: false, minAppendIntervalMs: 0 });
  buffer.append('raw', [{ token: 'plain-token-value' }]);
  const e = buffer.get('raw');
  assert.equal(e?.rows[0]?.token, 'plain-token-value');
});

test('collect: list/stats/clear —— 内存态释放面（session 生命周期）', () => {
  const buffer = createCollectBuffer({ minAppendIntervalMs: 0 });
  buffer.append('p', [{ v: 1 }]);
  buffer.append('q', [{ v: 2 }, { v: 3 }]);
  assert.equal(buffer.list().length, 2);
  const s = buffer.stats();
  assert.equal(s.entries, 2);
  assert.equal(s.totalRows, 3);
  assert.equal(s.lastAppendAt > 0, true);
  buffer.clear('p');
  assert.equal(buffer.has('p'), false);
  assert.equal(buffer.has('q'), true);
  assert.equal(buffer.totalRows, 2);
  buffer.clear();
  assert.equal(buffer.list().length, 0);
  assert.equal(buffer.stats().totalRows, 0);
});

test('collect: 0 行 append 不建条目；空 id 安全拒绝', () => {
  const buffer = createCollectBuffer();
  const none = buffer.append('ghost', []);
  assert.equal(none.ok, true);
  if (!none.ok) return;
  assert.equal(none.result.created, false);
  assert.equal(buffer.has('ghost'), false);
  // 空 id 双保险（executor 已默认 'default'；此处只验证不抛异常）
  const bad = buffer.append('', [{ v: 1 }]);
  assert.equal(bad.ok, true);
  if (bad.ok) assert.equal(bad.result.appended, 0);
  assert.equal(buffer.totalRows, 0);
});

test('collect: 默认护栏常量公开（FR-042 预算一致收敛源）', () => {
  assert.equal(COLLECT_DEFAULT_MAX_ITEMS_PER_APPEND, 200);
  assert.equal(COLLECT_DEFAULT_MAX_TOTAL_ROWS, 5000);
  assert.equal(COLLECT_DEFAULT_MIN_INTERVAL_MS, 300);
  // 工厂缺省即默认值（200/5000/300）
  const buffer = createCollectBuffer();
  assert.equal(buffer.options.maxItemsPerAppend, 200);
  assert.equal(buffer.options.maxTotalRows, 5000);
  assert.equal(buffer.options.minAppendIntervalMs, 300);
});
