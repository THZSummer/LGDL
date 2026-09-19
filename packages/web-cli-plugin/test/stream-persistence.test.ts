/**
 * V4-2 TASK-609 (leaf `specs-tree-v4-2-chat-stream-model`) — the **digest /
 * persistence** gate (node, zero Chromium).
 *
 * The four acceptance clauses of TASK-605 / TASK-606:
 *
 *   ① whitelist schema, field by field (an extra free-text field ⇒ FAIL);
 *   ② zero-plaintext, with ≥2 reverse cases (URL query / command argument body)
 *      that MUST throw;
 *   ③ LRU 20 aligned with the SW's `MAX_SESSIONS`, idempotent upsert;
 *   ④ degraded rebuild（正文 =「（历史摘要）」, `seq`/`ts`/`terminal`/`tool`/`ok`/`ms`
 *      preserved, never invented text）.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIGEST_DEGRADED_BODY,
  DIGEST_FIELDS,
  DIGEST_LABEL_MAX,
  DIGEST_PREFIX,
  MAX_DIGEST_SESSIONS,
  assertDigestSafe,
  assertNoPlaintext,
  digestEntryOf,
  digestForViews,
  digestKey,
  digestToEvents,
  evictDigests,
  readDigest,
  sanitizeLabel,
  upsertDigest,
} from '../src/ui/sidepanel/stream-digest.js';
import type { DigestStore } from '../src/ui/sidepanel/stream-digest.js';
import { appendEvent, createStreamState, project } from '../src/ui/sidepanel/stream-model.js';

/** An in-memory store with the same surface the production facade exposes. */
function memoryStore(seed: Record<string, unknown> = {}): DigestStore {
  const map = new Map<string, unknown>(Object.entries(seed));
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
    async keys() {
      return [...map.keys()];
    },
  };
}

// ── ① schema / whitelist ─────────────────────────────────────────────────────

test('v4-2 摘要 ① 白名单逐字段：DIGEST_FIELDS 恰为 11 个登记字段', () => {
  assert.deepEqual(
    [...DIGEST_FIELDS],
    ['seq', 'ts', 'kind', 'cardId', 'terminal', 'label', 'tool', 'ok', 'ms', 'refNum', 'askRequestId'],
    '白名单字段集合必须与 ADR-V4-028 decision 3 逐字一致',
  );
});

test('v4-2 摘要 ① digestEntryOf 只产出白名单字段（多一个自由文本字段 ⇒ FAIL）', () => {
  const entry = digestEntryOf({
    cardId: 'c1',
    kind: 'tool',
    ts: 1_700_000_000_000,
    firstSeq: 7,
    terminal: 'completed',
    payload: { tool: 'site_notes-list', ok: true, ms: 123, text: 'BODY-MUST-NOT-BE-PERSISTED' },
  });
  for (const key of Object.keys(entry)) {
    assert.ok(DIGEST_FIELDS.includes(key), `产出字段 ${key} 必须在白名单内`);
  }
  assert.equal(JSON.stringify(entry).includes('BODY-MUST-NOT-BE-PERSISTED'), false, '正文不得出现在摘要里');
  assert.equal(entry.tool, 'site_notes-list');
  assert.equal(entry.ok, true);
  assert.equal(entry.ms, 123);
  assert.equal(entry.terminal, 'completed');
});

test('v4-2 摘要 ① assertDigestSafe：白名单外字段必须抛错', () => {
  assert.throws(
    () => assertDigestSafe({ seq: 1, ts: 2, kind: 'ai', cardId: 'c', sneakyText: 'hello' } as never),
    /白名单外字段/,
  );
});

test('v4-2 摘要 ① label 永不从 payload.text 回退（无 label ⇒ 无文本）', () => {
  const entry = digestEntryOf({
    cardId: 'c2',
    kind: 'system',
    ts: 1,
    firstSeq: 1,
    payload: { text: '这是一句正文' },
  });
  assert.equal('label' in entry, false, '没有显式 label 时不得凭空造出文本');
  assert.equal(JSON.stringify(entry).includes('这是一句正文'), false);
});

// ── ② 零明文 ─────────────────────────────────────────────────────────────────

test('v4-2 摘要 ② 正例：已净化 label（命令名 / 工具名）通过', () => {
  assert.doesNotThrow(() => assertNoPlaintext(['site_notes-list', '会话已切换：alpha.test', '读取页面标题']));
  assert.equal(sanitizeLabel('site_notes-list'), 'site_notes-list');
});

test('v4-2 摘要 ② 反向用例 1：URL query 注入 ⇒ assertNoPlaintext 必须抛错', () => {
  assert.throws(
    () => assertNoPlaintext(['https://a.test/page?token=abc123']),
    /URL query/,
    'URL 参数是零明文红线，必须抛错',
  );
  assert.throws(
    () => digestEntryOf({
      cardId: 'c', kind: 'system', ts: 1, firstSeq: 1,
      payload: { label: 'web-fetch https://a.test/x?q=secret' },
    }),
    /URL query/,
  );
});

test('v4-2 摘要 ② 反向用例 2：命令参数体注入 ⇒ assertNoPlaintext 必须抛错', () => {
  assert.throws(
    () => assertNoPlaintext(['site_notes-list --doc main --limit 20']),
    /命令参数体/,
    '命令参数体不得落摘要',
  );
  assert.throws(
    () => digestEntryOf({
      cardId: 'c', kind: 'command', ts: 1, firstSeq: 1,
      payload: { label: 'site_notes-list -doc main' },
    }),
    /命令参数体/,
  );
});

test('v4-2 摘要 ② 反向用例 3：密钥 / 原始标记注入 ⇒ 抛错', () => {
  assert.throws(() => assertNoPlaintext(['sk-abcdefgh12345678']), /密钥/);
  assert.throws(() => assertNoPlaintext(['<b>bold</b>']), /原始标记/);
});

test('v4-2 摘要 ② label 截断到 80 字符且注入不静默剥离（抛错而非拼接）', () => {
  const long = 'x'.repeat(200);
  assert.equal(sanitizeLabel(long).length, DIGEST_LABEL_MAX);
  assert.throws(() => sanitizeLabel(`thing --flag value`), /命令参数体/);
});

/**
 * F-03（v4-2 收口轮，validate R1）—— `sanitizeLabel` 已改为「**先全串扫描再截断**」。
 *
 * validate 的复现用例（probe-zero-plaintext V3-②b / F-V3-01）：`'x'.repeat(71) + 'sk-ABCDEFGHIJKLMNOP'`
 * 在旧顺序（先 `slice(0,80)` 再扫描）下落库 label 尾部含 `sk-ABCDEF`（密钥前 9 字符：
 * `SECRET` 正则要求 `sk-` 后 ≥8 字符，前缀片段因此不触发）。反转顺序后完整串命中 ⇒
 * **fail-closed 抛错**，任何形式的密钥前缀都不可能落库。
 *
 * 判据可 FAIL：把 `sanitizeLabel` 回退为「截断后再扫描」⇒ 第一段「不得出现 `sk-` 前缀」
 * 与第二段 `assert.throws` 同时判红。
 */
test('v4-2 摘要 ② F-03 label 边界：截断前对完整 label 扫描（71 位跨界密钥不再留前缀）', () => {
  const key = 'sk-ABCDEFGHIJKLMNOP'; // 19 chars，命中 SECRET
  // ── validate R1 复现用例：71×'x' + 密钥（跨界）────────────────────────────────
  const straddle = 'x'.repeat(71) + key;
  let storedStraddle: string | null = null;
  try {
    storedStraddle = sanitizeLabel(straddle);
  } catch {
    storedStraddle = null;
  }
  assert.ok(
    storedStraddle === null || !storedStraddle.includes('sk-'),
    `跨界密钥不得以任何形式落库（旧实现落库 80 字符且尾部含 'sk-ABCDEF'；实测 ${JSON.stringify(storedStraddle)}）`,
  );
  assert.throws(() => sanitizeLabel(straddle), /密钥/, '顺序反转后：完整串命中 ⇒ fail-closed 抛错（不再截断成前缀）');

  // ── 79 / 80 / 81 位起点：密钥前缀（含 'sk-'）无论落在哪一侧都不得落库 ──────────
  for (const n of [79, 80, 81]) {
    const label = 'x'.repeat(n) + key;
    let stored: string | null = null;
    try {
      stored = sanitizeLabel(label);
    } catch {
      stored = null;
    }
    assert.ok(
      stored === null || !stored.includes('sk-'),
      `label 起点 ${n}：截断结果不得含任何密钥前缀（实测 ${JSON.stringify(stored)}）`,
    );
    assert.throws(() => sanitizeLabel(label), /密钥/, `label 起点 ${n}：完整串命中 ⇒ 必须抛错`);
  }

  // ── 完整命中在 80 内 ⇒ 抛错（正例，前后一致）────────────────────────────────
  assert.throws(() => sanitizeLabel('x'.repeat(60) + key), /密钥/);
  // ── 80 字符整串仍在界内 ⇒ 触发子在界内 ⇒ 抛错（收紧，非放宽）────────────────
  assert.throws(() => sanitizeLabel('x'.repeat(80) + key), /密钥/, '完全在界外的触发子同样 fail-closed（已登记的口径收紧）');
  // ── 无触发子的长串仍按 80 截断（判据不恒真/不靠抛错通过）──────────────────────
  assert.equal(sanitizeLabel('y'.repeat(400)).length, DIGEST_LABEL_MAX);
  assert.equal(sanitizeLabel(`正常工具名\n第二行`), '正常工具名');
});

// ── ③ LRU / upsert ───────────────────────────────────────────────────────────

test('v4-2 摘要 ③ MAX_DIGEST_SESSIONS 与既有 MAX_SESSIONS 对齐（= 20）', () => {
  assert.equal(MAX_DIGEST_SESSIONS, 20);
});

test('v4-2 摘要 ③ 存储键 = web-cli/stream-digest:<sessionId>', () => {
  assert.equal(DIGEST_PREFIX, 'web-cli/stream-digest:');
  assert.equal(digestKey('https://a.test'), 'web-cli/stream-digest:https://a.test');
});

test('v4-2 摘要 ③ upsert 幂等 + read 回读一致', async () => {
  const store = memoryStore();
  const entry = digestEntryOf({ cardId: 'c1', kind: 'ai', ts: 1, firstSeq: 1, payload: {} });
  await upsertDigest(store, 's1', [entry], 100);
  await upsertDigest(store, 's1', [entry], 200);
  const back = await readDigest(store, 's1');
  assert.deepEqual(back, [entry], '重复 upsert 必须等价（替换而非追加）');
});

test('v4-2 摘要 ③ LRU 20：只保留最近更新的 20 个会话', async () => {
  const store = memoryStore();
  for (let i = 0; i < 25; i += 1) {
    await upsertDigest(store, `s${String(i).padStart(2, '0')}`, [], i);
  }
  const evicted = await evictDigests(store, MAX_DIGEST_SESSIONS);
  assert.equal(evicted.length, 5, `必须淘汰 5 个（实测 ${evicted.length}）`);
  const remaining = (await store.keys()).filter((k) => k.startsWith(DIGEST_PREFIX));
  assert.equal(remaining.length, 20, `剩余必须 20（实测 ${remaining.length}）`);
  assert.equal(remaining.includes(digestKey('s00')), false, '最旧的必须被淘汰');
  assert.equal(remaining.includes(digestKey('s24')), true, '最新的必须保留');
});

test('v4-2 摘要 ③ 未超上限时不淘汰', async () => {
  const store = memoryStore();
  await upsertDigest(store, 'only', [], 1);
  assert.deepEqual(await evictDigests(store, MAX_DIGEST_SESSIONS), []);
});

// ── ④ 降级重建 ───────────────────────────────────────────────────────────────

test('v4-2 摘要 ④ 降级重建：正文 =「（历史摘要）」，事实字段全部保留，不编造正文', () => {
  const events = digestToEvents(
    [
      {
        seq: 3,
        ts: 1_700_000_000_000,
        kind: 'tool',
        cardId: 'k1',
        terminal: 'completed',
        tool: 'site_notes-list',
        ok: true,
        ms: 123,
        label: 'site_notes-list',
      },
      { seq: 4, ts: 1_700_000_001_000, kind: 'askuser', cardId: 'q1', terminal: 'answered', askRequestId: 'ask-7' },
    ],
    'https://a.test',
  );
  assert.equal(events.length, 2);
  assert.equal(events[0].payload.text, DIGEST_DEGRADED_BODY);
  assert.equal(events[0].payload.tool, 'site_notes-list');
  assert.equal(events[0].payload.ok, true);
  assert.equal(events[0].payload.ms, 123);
  assert.equal(events[0].terminal, 'completed');
  assert.equal(events[0].seq, 3, 'seq 必须保留');
  assert.equal(events[0].ts, 1_700_000_000_000, 'ts 必须保留');
  assert.equal(events[1].payload.requestId, 'ask-7');
  assert.equal(events[1].terminal, 'answered');
  assert.equal(events[1].sessionId, 'https://a.test');
});

test('v4-2 摘要 ④ 端到端：project(摘要事件) 复现时间线且正文为占位符', async () => {
  const store = memoryStore();
  let s = createStreamState('https://a.test');
  s = appendEvent(s, { kind: 'user', ts: 1, cardId: 'u', payload: { text: 'REAL-USER-BODY' } });
  s = appendEvent(s, { kind: 'tool', ts: 2, cardId: 't', payload: { tool: 'tabs', ok: true, ms: 5, text: 'TOOL-BODY' }, terminal: 'completed' });
  const entries = digestForViews(project(s));
  await upsertDigest(store, 'https://a.test', entries, 1);
  const back = await readDigest(store, 'https://a.test');
  const rebuilt = digestToEvents(back, 'https://a.test');
  const cards = project({ events: rebuilt, seq: 99, sessionId: 'https://a.test', openAsks: [], dropped: 0, mergeSkipped: 0 });
  assert.equal(cards.length, 2, '必须复现两张卡');
  assert.equal(cards[0].payload.text, DIGEST_DEGRADED_BODY);
  assert.equal(cards[1].payload.tool, 'tabs');
  assert.equal(cards[1].terminal, 'completed');
  const serialized = JSON.stringify(back);
  assert.equal(serialized.includes('REAL-USER-BODY'), false, '正文零落库');
  assert.equal(serialized.includes('TOOL-BODY'), false, '工具正文零落库');
});

test('v4-2 摘要 ④ 空摘要：readDigest 返回空数组（不抛错、不编造）', async () => {
  const store = memoryStore();
  assert.deepEqual(await readDigest(store, 'missing'), []);
});

test('v4-2 摘要 ④ 读回时再次校验：落库被篡改（含 URL query）⇒ 抛错', async () => {
  const store = memoryStore({
    [digestKey('s1')]: { v: 1, updatedAt: 1, entries: [{ seq: 1, ts: 1, kind: 'system', cardId: 'c', label: 'x?a=b' }] },
  });
  await assert.rejects(() => readDigest(store, 's1'), /URL query/);
});
