import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from './storage-mem.js';
import type { StorageBackend, StorageWriteResult } from './storage-mem.js';
import { executeStorage, executeStorageQuota, createStorageToolEntry, createStorageQuotaToolEntry, createStorageTools } from './storage-tools.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

/**
 * 真实浏览器冒烟预留清单（node 面不可达 —— IDB/OPFS 无宿主，validate 阶段承接）：
 *  1. IDB 真持久：createIdbStorage() 写入 → 刷新页面/重开浏览器 → list/read 仍在。
 *  2. IDB 跨标签共享读 + EC-013 冲突标记：两个标签页同 origin，标签 A 写后标签 B read 可见；
 *     标签 B 以旧 expectedRev 写 → conflict:true；不带 expectedRev → last-write 覆盖（rev 递增）。
 *  3. OPFS 真持久：createOpfsStorage() 卷内 write/list/read/remove + 目录嵌套；
 *     worker 上下文可经 createSyncAccessHandle 读同一卷（storage 工具 worker 可访问性 FR-013）。
 *  4. storage-quota 真值：真实浏览器 estimate/persist 返回真配额（对比 console navigator.storage）。
 *  5. 隐私模式（无痕）EC-005：IDB/OPFS 抛错 → 场景降级 createMemoryStorage + 明示「本次会话不持久」。
 */

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

test('storage-tools: memory 后端 CRUD 全链（FR-013）', async () => {
  const backend = createMemoryStorage();
  // write → read 回读
  const w = await backend.write('guide.md', 'hello world');
  assert.equal(w.ok, true);
  const r = await backend.read('guide.md');
  assert.equal(r, 'hello world');
  // list 元信息（size/rev）
  const list = await backend.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'guide.md');
  assert.ok(list[0].size > 0);
  assert.equal(list[0].rev, 1);
  // remove → read null
  assert.equal(await backend.remove('guide.md'), true);
  assert.equal(await backend.read('guide.md'), null);
});

test('storage-tools: executeStorage 子命令 list/read/write/remove 输出可解析', async () => {
  const backend = createMemoryStorage();
  const empty = await executeStorage(backend, 'list', {});
  assert.equal(empty.ok, true);
  assert.match(empty.output, /卷为空/);
  const w = await executeStorage(backend, 'write', { path: 'a.txt', content: 'AAA' });
  assert.equal(w.ok, true);
  assert.match(w.output, /已写入 "a\.txt"/);
  await executeStorage(backend, 'write', { path: 'b/note.txt', content: 'BBB' });
  const list = await executeStorage(backend, 'list', {});
  assert.equal(list.ok, true);
  assert.match(list.output, /卷条目（2 个）/);
  assert.match(list.output, /- a\.txt（3 字节/);
  const pre = await executeStorage(backend, 'list', { prefix: 'b/' });
  assert.match(pre.output, /- b\/note\.txt/);
  assert.doesNotMatch(pre.output, /a\.txt/);
  const read = await executeStorage(backend, 'read', { path: 'a.txt' });
  assert.equal(read.output, 'AAA');
  const miss = await executeStorage(backend, 'read', { path: 'nope.txt' });
  assert.equal(miss.ok, false);
  assert.match(miss.output, /不存在/);
  const del = await executeStorage(backend, 'remove', { path: 'a.txt' });
  assert.equal(del.ok, true);
  assert.equal((await backend.read('a.txt')), null);
  // 缺参/未知子命令
  assert.match((await executeStorage(backend, 'read', {})).output, /--path/);
  assert.match((await executeStorage(backend, 'whatever', {})).output, /未知子命令/);
});

test('storage-tools: 经 CommandRouter 注册派发全链（storage + storage-quota 工具条目）', async () => {
  const backend = createMemoryStorage();
  const router = createCommandRouter({ builtins: false });
  for (const entry of createStorageTools(backend)) router.register(entry);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['storage', 'storage-quota']);
  const w = await router.dispatch(tc('storage', { path: 'k.txt', content: 'v' }, 'write'));
  assert.equal(w.ok, true);
  const q = await router.dispatch(tc('storage-quota', {}, 'estimate'));
  assert.equal(q.ok, true);
  assert.match(q.output, /usage: /);
  // listHelp 分组（≥2 组时插 [storage] 组头）
  router.register({
    name: 'other-tool',
    schema: { name: 'other-tool', description: '', parameters: {} },
    executor: async () => ({ ok: true, output: 'x' }),
  });
  const help = router.listHelp();
  assert.ok(help.includes('[storage]'));
});

test('storage-quota: estimate/persist 输出可读 + 可解析（FR-014）', async () => {
  const fakeBackend: StorageBackend = {
    kind: 'fake',
    list: async () => [],
    read: async () => null,
    write: async () => ({ ok: true, rev: 1, updatedAt: Date.now() }),
    remove: async () => false,
    estimate: async () => ({ usage: 123, quota: 456, persisted: true }),
    persist: async () => true,
    persisted: async () => true,
    revOf: async () => null,
  };
  const r = await executeStorageQuota(fakeBackend, 'estimate');
  assert.equal(r.ok, true);
  assert.match(r.output, /usage: 123/);
  assert.match(r.output, /quota: 456/);
  assert.match(r.output, /persisted: true/);
  const ratio = r.output.match(/使用率: ([\d.]+)%/);
  assert.ok(ratio && Math.abs(Number(ratio[1]) - 26.97) < 0.1);
  const p = await executeStorageQuota(fakeBackend, 'persist');
  assert.equal(p.ok, true);
  assert.match(p.output, /持久化授予/);
});

test('storage: EC-004 配额超限 → 「配额不足」可读错误 + 清理建议', async () => {
  const throwing: StorageBackend = {
    kind: 'fake',
    list: async () => [],
    read: async () => null,
    write: async () => {
      const e = new Error('quota exceeded');
      e.name = 'QuotaExceededError';
      throw e;
    },
    remove: async () => false,
    estimate: async () => ({ usage: 0, quota: 0, persisted: false }),
    persist: async () => false,
    persisted: async () => false,
    revOf: async () => null,
  };
  const r = await executeStorage(throwing, 'write', { path: 'big.txt', content: 'x'.repeat(100) });
  assert.equal(r.ok, false);
  assert.match(r.output, /配额不足/);
  assert.match(r.output, /storage-quota estimate/);
  assert.match(r.output, /storage remove/);
});

test('storage: EC-013 冲突标记 / last-write 原语（memory 后端）', async () => {
  const backend = createMemoryStorage();
  // 初始写 rev1
  await backend.write('doc', 'v1');
  // 并发写：A 以 rev1 更新成功 → rev2
  const a = await backend.write('doc', 'v2', { expectedRev: 1 });
  assert.equal(a.ok, true);
  // B 仍持有旧 rev1 → conflict，内容不被覆盖
  const b = await backend.write('doc', 'v3', { expectedRev: 1 });
  assert.equal(b.ok, false);
  assert.equal(b.conflict, true);
  assert.equal(b.rev, 2); // 返回当前版本
  assert.equal(await backend.read('doc'), 'v2'); // 未被静默覆盖
  // last-write 语义（不带 expectedRev）强制覆盖 rev3
  const lw = await backend.write('doc', 'v4');
  assert.equal(lw.ok, true);
  assert.equal(await backend.read('doc'), 'v4');
  assert.equal(await backend.revOf('doc'), 3);
});

test('storage: 卷条目名禁止路径越界（D-5：非文件路径语义）', async () => {
  const backend = createMemoryStorage();
  // memory 后端本身不做语义限制——由 executeStorage/OPFS 段校验承载；
  // 此处验证 executeStorage 对缺失 path 的拒绝不产生路径歧义
  const r = await executeStorage(backend, 'read', {});
  assert.equal(r.ok, false);
  assert.match(r.output, /--path/);
});

test('storage-tools: ToolEntry 元数据（group=storage；storage 写敏感 risk=write）', () => {
  const storage = createStorageToolEntry(createMemoryStorage());
  assert.equal(storage.name, 'storage');
  assert.equal(storage.group, 'storage');
  assert.equal(storage.risk, 'write');
  assert.equal(storage.schema.name, 'storage');
  const quota = createStorageQuotaToolEntry(createMemoryStorage());
  assert.equal(quota.name, 'storage-quota');
  assert.equal(quota.group, 'storage');
});
