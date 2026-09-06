import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultMatrix, createP0DomainTools, createDefaultRouter } from './assembly.js';
import { nodeEnv } from './platform.js';
import type { WebCliToolCall } from './llm.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

test('assembly: 默认矩阵 = P0 八工具（storage/doc/settings/session/context 开 + web-search 条件开）', () => {
  const matrix = buildDefaultMatrix();
  assert.deepEqual(
    matrix.map((r) => r.name),
    ['storage', 'storage-quota', 'settings', 'doc-read', 'doc-edit', 'session', 'context', 'web-search'],
  );
  for (const r of matrix) {
    assert.ok(r.group);
    if (r.name === 'web-search') assert.equal(r.enabled, 'conditional');
    else assert.equal(r.enabled, true);
  }
});

test('assembly: P0 域工具条目依矩阵顺序 + 元数据（group/risk）一致（FR-001/039）', () => {
  const env = nodeEnv({ search: async () => ({ ok: true, results: [] }) });
  const entries = createP0DomainTools({ env });
  assert.deepEqual(
    entries.map((e) => e.name),
    ['storage', 'storage-quota', 'settings', 'doc-read', 'doc-edit', 'session', 'context', 'web-search'],
  );
  const byName = new Map(entries.map((e) => [e.name, e]));
  assert.equal(byName.get('storage')?.group, 'storage');
  assert.equal(byName.get('doc-edit')?.risk, 'write');
  assert.equal(byName.get('web-search')?.risk, 'external');
  assert.equal(byName.get('web-search')?.group, 'net');
});

test('assembly: createDefaultRouter 三链与矩阵一致 + F-23 顺序契约（内建置末）（AC-001/AC-005）', async () => {
  const env = nodeEnv({ search: async () => ({ ok: true, results: [{ title: 't', snippet: '', url: 'https://e.com' }] }) });
  const router = createDefaultRouter({ env });
  // schema 派生：P0 域工具（矩阵序） + 内建置末（web-fetch→sleep→web-cli-help）
  const names = router.deriveTools().map((t) => t.name);
  const matrixNames = buildDefaultMatrix().map((r) => r.name);
  assert.deepEqual(names, [...matrixNames, 'web-fetch', 'sleep', 'web-cli-help']);
  // help 一览含分组（≥2 组 → 组头）与全部 P0 工具
  const list = router.listHelp();
  assert.ok(list.includes('[storage]'));
  assert.ok(list.includes('[doc]'));
  assert.ok(list.includes('[session]'));
  for (const n of matrixNames) assert.ok(list.includes(n), `help 缺 ${n}`);
  // 派发冒烟（自足）：storage 写→读 + doc-read 读 ctx.source + web-search（env.search 注入）
  const w = await router.dispatch(tc('storage', { path: 'smoke.txt', content: 'hi' }, 'write'));
  assert.equal(w.ok, true, w.error);
  const r = await router.dispatch(tc('storage', { path: 'smoke.txt' }, 'read'));
  assert.equal(r.output, 'hi');
  const dr = await router.dispatch(tc('doc-read'), { source: 'doc-source-content' });
  assert.equal(dr.ok, true);
  assert.equal(dr.output, 'doc-source-content');
  const ws = await router.dispatch(tc('web-search', { query: 'x' }));
  assert.equal(ws.ok, true);
  // 未注入 search → web-search 报告配置指引（EC-006），其余工具不受影响
  const router2 = createDefaultRouter({});
  const ws2 = await router2.dispatch(tc('web-search', { query: 'x' }));
  assert.equal(ws2.ok, false);
  assert.match(ws2.output, /未配置/);
  const st2 = await router2.dispatch(tc('storage', { path: 'a', content: '1' }, 'write'));
  assert.equal(st2.ok, true);
});

test('assembly: 场景可注入 backend/sessionStore/policy/audit（组装点单点变更全链可见）', async () => {
  const audit = { events: [] as never[], record: () => {} };
  const policy = { rules: [{ pattern: 'doc-edit', action: 'deny' as const }] };
  const router = createDefaultRouter({ policy, audit: audit as never });
  const denied = await router.dispatch(tc('doc-edit', { old: 'a', new: 'b' }, 'str_replace'), { source: 'abc' });
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
});
