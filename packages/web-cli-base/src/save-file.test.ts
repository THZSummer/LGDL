import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveFileToolEntry } from './save-file.js';
import type { PlatformEnv, PlatformFilePicker } from './platform.js';
import { nodeEnv } from './platform.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

function makePicker(over: Partial<PlatformFilePicker> = {}): { picker: PlatformFilePicker; calls: string[] } {
  const calls: string[] = [];
  const picker: PlatformFilePicker = {
    save: async (o) => {
      calls.push(`save:${o.suggestedName}`);
      return { ok: true };
    },
    download: async (o) => {
      calls.push(`download:${o.filename}`);
    },
    ...over,
  };
  return { picker, calls };
}

function envOf(picker: PlatformFilePicker): PlatformEnv {
  return { ...nodeEnv(), filePicker: picker };
}

test('save-file: FSA 保存成功路径（授权桩 granted）', async () => {
  const { picker, calls } = makePicker();
  const entry = createSaveFileToolEntry(envOf(picker));
  const r = await entry.executor({ subcommand: 'save', args: { filename: 'out.lgdl', content: 'title: t' } }, {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /已保存到用户文件 "out\.lgdl"/);
  assert.deepEqual(calls, ['save:out.lgdl']);
});

test('save-file: 用户拒绝/取消两路（授权桩）→ 可读结果，不中断', async () => {
  const cancelPicker: PlatformFilePicker = {
    save: async () => ({ ok: false, canceled: true }),
    download: async () => {},
  };
  const cancelEntry = createSaveFileToolEntry(envOf(cancelPicker));
  const c = await cancelEntry.executor({ subcommand: 'save', args: { filename: 'a.txt', content: 'x' } }, {});
  assert.equal(c.ok, false);
  assert.match(c.output, /用户取消保存/);

  const denyPicker: PlatformFilePicker = {
    save: async () => {
      const e = new Error('Permission denied by user');
      e.name = 'NotAllowedError';
      throw e;
    },
    download: async () => {},
  };
  const denyEntry = createSaveFileToolEntry(envOf(denyPicker));
  const d = await denyEntry.executor({ subcommand: 'save', args: { filename: 'a.txt', content: 'x' } }, {});
  assert.equal(d.ok, false);
  assert.match(d.output, /授权被拒绝/);
  assert.match(d.error ?? '', /Permission denied by user/);
});

test('save-file: blob 下载链冒烟 + 缺 filename/未知子命令', async () => {
  const { picker, calls } = makePicker();
  const entry = createSaveFileToolEntry(envOf(picker));
  const dl = await entry.executor({ subcommand: 'download', args: { filename: 'out.svg', content: '<svg/>' } }, {});
  assert.equal(dl.ok, true);
  assert.match(dl.output, /已触发下载/);
  assert.deepEqual(calls, ['download:out.svg']);
  const noName = await entry.executor({ subcommand: 'download', args: { content: 'x' } }, {});
  assert.equal(noName.ok, false);
  assert.match(noName.output, /--filename/);
  const bad = await entry.executor({ subcommand: 'rename', args: { filename: 'a' } }, {});
  assert.equal(bad.ok, false);
  // 未注入 filePicker
  const bare = createSaveFileToolEntry(nodeEnv());
  const r = await bare.executor({ subcommand: 'save', args: { filename: 'a', content: 'x' } }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /文件保存/); // node 面 filePicker 桩 → NotFoundError 转译
});

test('save-file: 经 CommandRouter 注册派发 + 元数据（net 组）', async () => {
  const { picker } = makePicker();
  const router = createCommandRouter({ builtins: false });
  router.register(createSaveFileToolEntry(envOf(picker)));
  const r = await router.dispatch(tc('save', { filename: 'f.txt', content: 'hi' }, 'download'));
  assert.equal(r.ok, true);
  const entry = router.query({ name: 'save' })[0];
  assert.equal(entry.group, 'net');
  assert.equal(entry.risk, 'write');
});
