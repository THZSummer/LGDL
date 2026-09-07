/**
 * cookie-tools.test.ts —— cookie 工具的 node 注入面测试（TASK-007；fake ops + 纯解析）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCookieToolEntry, executeCookieTool, cookieHelp, COOKIE_SUBCOMMANDS } from './cookie-tools.js';
import { parseCookieString } from './platform-dom.js';
import type { PlatformDomOps, PlatformDomOpResult, PlatformEnv } from './platform.js';
import { createMemoryAudit } from './audit.js';
import type { MemoryAuditSink } from './audit.js';
import { createCommandRouter } from './router.js';

// ---- 纯解析（document.cookie 可达面语义） ----

test('cookie: parseCookieString 解析 name=value 对 + 解码 + size（FR-019 可达面）', () => {
  const items = parseCookieString('theme=dark; sid=abc%20def; lang=zh-CN');
  assert.deepEqual(
    items.map((i) => i.name),
    ['theme', 'sid', 'lang'],
  );
  assert.equal(items[1].value, 'abc def');
  assert.equal(parseCookieString('').length, 0);
  assert.equal(parseCookieString('noequalsign').length, 0);
});

// ---- fake ops 注入面 ----

function fakeOps(opts: {
  readResult?: PlatformDomOpResult;
  readDetailCalls?: { includeValue: boolean }[];
  writeSpy?: Array<{ name: string; value: string }>;
  writeResult?: PlatformDomOpResult;
  deleteSpy?: string[];
  deleteResult?: PlatformDomOpResult;
}): PlatformDomOps {
  const readDetailCalls = opts.readDetailCalls ?? [];
  return {
    readState: async () => ({ ok: true, output: '' }),
    click: async () => ({ ok: true, output: '' }),
    hover: async () => ({ ok: true, output: '' }),
    scroll: async () => ({ ok: true, output: '' }),
    zoom: async () => ({ ok: true, output: '' }),
    fullscreen: async () => ({ ok: true, output: '' }),
    snapshot: async () => ({ ok: true, output: '' }),
    cookieRead: async (o?: { includeValue?: boolean }) => {
      readDetailCalls.push({ includeValue: o?.includeValue === true });
      return opts.readResult ?? { ok: true, output: '  sid=•••（5 B）\n（值缺省掩码）' };
    },
    cookieWrite: async (w: { name: string; value: string }) => {
      opts.writeSpy?.push({ name: w.name, value: w.value });
      return opts.writeResult ?? { ok: true, output: `✓ cookie 已写入：${w.name}` };
    },
    cookieDelete: async (d: { name: string }) => {
      opts.deleteSpy?.push(d.name);
      return opts.deleteResult ?? { ok: true, output: `✓ cookie 已删除：${d.name}` };
    },
  };
}

function envWith(ops: PlatformDomOps): PlatformEnv {
  return { kind: 'browser', fetch: (async () => new Response()) as typeof fetch, dom: { state: { snapshot: async () => ({}) }, ops } };
}

// ---- 元数据 + 子命令 ----

test('cookie: 元数据面 —— 4 子命令 + subcommandRisks（read=read、read-detail/write/delete=write）', () => {
  const entry = createCookieToolEntry(envWith(fakeOps({})));
  assert.equal(entry.name, 'cookie');
  assert.equal(entry.group, 'cookie');
  assert.deepEqual(entry.subcommandRisks, { read: 'read', 'read-detail': 'write', write: 'write', delete: 'write' });
  assert.deepEqual(COOKIE_SUBCOMMANDS, ['read', 'read-detail', 'write', 'delete']);
});

// ---- read：缺省掩码 / read-detail：trusted + ask 门禁入审计 ----

test('cookie: read 输出（值缺省掩码）；read-detail 需 --trusted true → 明细 + 审计', async () => {
  const detailCalls: { includeValue: boolean }[] = [];
  const ops = fakeOps({ readDetailCalls: detailCalls });
  const env = envWith(ops);
  const audit = createMemoryAudit();
  const r = await executeCookieTool(env, 'read', {}, { services: { audit } });
  assert.equal(r.ok, true);
  assert.match(r.output, /掩码/);

  const deny = await executeCookieTool(env, 'read-detail', {}, { services: { audit } });
  assert.equal(deny.ok, false);
  assert.match(deny.output, /trusted/);
  assert.ok(detailCalls.every((c) => c.includeValue === false), 'untrusted 拒后无 includeValue=true 调用');

  const ok = await executeCookieTool(env, 'read-detail', { trusted: 'true' }, { services: { audit } });
  assert.equal(ok.ok, true);
  assert.equal(detailCalls.length, 2, 'read + read-detail 共 2 次 ops 调用');
  assert.equal(detailCalls[1].includeValue, true, '明细路径 includeValue=true');
  const cookieAudits = audit.events.filter((e) => e.type === 'cookie');
  assert.ok(cookieAudits.length >= 3);
  const detailEv = cookieAudits.find((e) => e.action === 'read-detail');
  assert.ok(detailEv);
  assert.ok(!JSON.stringify(audit.events).includes('明文值'), '审计无明文');
});

// ---- write/delete：untrusted 拒 + trusted 放行 + spy 断言（回读在 ops 面） ----

test('cookie: write 缺省 untrusted 拒（deny 后 ops 不被调用）；--trusted true 放行写入', async () => {
  const writeSpy: Array<{ name: string; value: string }> = [];
  const ops = fakeOps({ writeSpy });
  const env = envWith(ops);
  const audit = createMemoryAudit();
  const deny = await executeCookieTool(env, 'write', { name: 'sid', value: 'leak-me' }, { services: { audit } });
  assert.equal(deny.ok, false);
  assert.equal(writeSpy.length, 0, 'deny 后值不变（ops 未调用）');
  const ok = await executeCookieTool(env, 'write', { name: 'sid', value: 'abc', trusted: 'true' }, { services: { audit } });
  assert.equal(ok.ok, true);
  assert.equal(writeSpy.length, 1);
  assert.deepEqual(writeSpy[0], { name: 'sid', value: 'abc' });
  // 缺参校验
  assert.equal((await executeCookieTool(env, 'write', { trusted: 'true' }, { services: { audit } })).ok, false);
  assert.equal((await executeCookieTool(env, 'write', { name: 'sid', trusted: 'true' }, { services: { audit } })).ok, false);
});

test('cookie: delete 需 --trusted true + spy 断言（删后回读在 ops 面）', async () => {
  const deleteSpy: string[] = [];
  const ops = fakeOps({ deleteSpy });
  const env = envWith(ops);
  const audit = createMemoryAudit();
  assert.equal((await executeCookieTool(env, 'delete', { name: 'sid' }, { services: { audit } })).ok, false);
  assert.equal(deleteSpy.length, 0);
  const ok = await executeCookieTool(env, 'delete', { name: 'sid', trusted: 'true' }, { services: { audit } });
  assert.equal(ok.ok, true);
  assert.deepEqual(deleteSpy, ['sid']);
});

// ---- 未注入 / 受限转译透传 / HttpOnly 归属位 ----

test('cookie: ops 未注入 → 可读错误不崩溃；受限标志转译（EC-007）/HttpOnly 归属透传 ops 输出', async () => {
  const env: PlatformEnv = { kind: 'node', fetch: (async () => new Response()) as typeof fetch };
  const r = await executeCookieTool(env, 'read', {});
  assert.equal(r.ok, false);
  assert.match(r.output, /操作面未注入|未注入/);

  // ops 面受限转译（Secure 仅 HTTPS）→ 工具透传可读
  const ops = fakeOps({});
  ops.cookieWrite = async () => ({ ok: false, output: '✖ cookie 写入受限：Secure cookie 仅在 HTTPS（或 localhost）页面可写（EC-007 分类转译）', error: 'secure cookie requires https' });
  const env2 = envWith(ops);
  const rr = await executeCookieTool(env2, 'write', { name: 'sid', value: 'x', trusted: 'true' });
  assert.equal(rr.ok, false);
  assert.match(rr.output, /EC-007/);

  // HttpOnly/跨域/域级批量 → ops 面不支持 + 归属（占位与 TASK-010 一致：chrome.cookies）
  ops.cookieRead = async () => ({ ok: false, output: '✖ HttpOnly cookie 页面不可读 / 跨域与域级批量管理不可达 —— 归属 chrome.cookies = F-14 扩展宿主（FR-025 契约预留）', error: 'httpOnly unsupported' });
  const env3 = envWith(ops);
  const r3 = await executeCookieTool(env3, 'read', {});
  assert.equal(r3.ok, false);
  assert.match(r3.output, /chrome.cookies/);
});

// ---- 经 router：write 档默认 ask → 无桥 deny（FR-005 无旁路） ----

test('cookie: 经 router 派发 —— write（risk write）无 onAsk → deny fail-closed，ops 不被调用', async () => {
  const writeSpy: Array<{ name: string; value: string }> = [];
  const env = envWith(fakeOps({ writeSpy }));
  const router = createCommandRouter({ policy: {} });
  router.register(createCookieToolEntry(env));
  const denied = await router.dispatch({ name: 'cookie', subcommand: 'write', args: { name: 'sid', value: 'x', trusted: 'true' }, id: 'c1' } as never, {});
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  assert.equal(writeSpy.length, 0);
});

test('cookie: help 面 —— 掩码缺省/trusted 双闸/EC-007 转译/chrome.cookies 归属', () => {
  const h = cookieHelp();
  assert.match(h, /缺省掩码/);
  assert.match(h, /trusted/);
  assert.match(h, /EC-007/);
  assert.match(h, /chrome.cookies/);
  assert.match(h, /名掩码/);
});
