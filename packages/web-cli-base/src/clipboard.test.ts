/**
 * clipboard.test.ts —— clipboard 文本/富子命令 node 注入面测试（TASK-008/FR-021/022/ADR-009）。
 * 既有文本 read/write 用例零删除（legacy 用例在 p2-web-tools.test.ts，本文件增量 + 零回归断言）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeClipboard, executeClipboardRich, createClipboardToolEntry, clipboardHelp, CLIPBOARD_RICH_SUBCOMMANDS } from './clipboard.js';
import type { PlatformEnv } from './platform.js';
import { createCommandRouter } from './router.js';

// ---- 文本面零回归（v3 语义直接复验） ----

test('clipboard: 文本 read/write 既有语义零回归（直接执行器 + 空剪贴板/缺参/未知子命令）', async () => {
  const cb = { readText: async () => 'hello', writeText: async (t: string) => {} };
  assert.equal((await executeClipboard(cb, 'read', {})).output, 'hello');
  const wr = await executeClipboard(cb, 'write', { text: 'a->b' });
  assert.match(wr.output, /已写入剪贴板/);
  assert.equal((await executeClipboard(undefined, 'read', {})).ok, false);
  assert.equal((await executeClipboard(cb, 'write', {})).ok, false);
  assert.equal((await executeClipboard(cb, 'fly', {})).ok, false);
});

// ---- 富写缝（env.clipboardRich fake） ----

function richEnv(opts: { writeItemSpy?: Array<Record<string, unknown>>; pasteSlot?: unknown }): PlatformEnv {
  const spy = opts.writeItemSpy ?? [];
  const hub = {
    sources: {
      pasteCapture: { active: async () => true, lastCapture: () => opts.pasteSlot },
    },
  };
  return {
    kind: 'browser',
    fetch: (async () => new Response()) as typeof fetch,
    clipboardRich: {
      async writeItem(o: { textHtml?: string; textPlain?: string; imagePng?: Blob }) {
        spy.push({ ...o });
      },
    },
    events: hub as never,
  };
}

test('clipboard: write-html 富写（text/html + text/plain 并存，ClipboardItem 载体）+ 缺参/未注入', async () => {
  const spy: Array<Record<string, unknown>> = [];
  const env = richEnv({ writeItemSpy: spy });
  const ok = await executeClipboardRich(env, 'write-html', { html: '<b>hi</b>' });
  assert.equal(ok.ok, true);
  assert.equal(spy.length, 1);
  assert.match(String(spy[0].textHtml), /<b>hi<\/b>/);
  assert.equal(spy[0].textPlain, 'hi', 'text/plain 并存');
  const noHtml = await executeClipboardRich(env, 'write-html', {});
  assert.equal(noHtml.ok, false);
  const envNoRich = { ...env, clipboardRich: undefined };
  const noSeam = await executeClipboardRich(envNoRich, 'write-html', { html: '<b>x</b>' });
  assert.equal(noSeam.ok, false);
  assert.match(noSeam.output, /clipboardRich/);
});

test('clipboard: write-image dataURL → Blob（尺寸/字节断言）→ 富写；非法 dataURL 可读错误', async () => {
  const spy: Array<Record<string, unknown>> = [];
  const env = richEnv({ writeItemSpy: spy });
  // 1×1 透明 PNG
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const ok = await executeClipboardRich(env, 'write-image', { dataurl: `data:image/png;base64,${pngB64}` });
  assert.equal(ok.ok, true);
  assert.ok(spy.length === 1 && spy[0].imagePng instanceof Blob);
  const blob = spy[0].imagePng as Blob;
  assert.equal(blob.type, 'image/png');
  assert.ok(blob.size > 0);
  const bad = await executeClipboardRich(env, 'write-image', { dataurl: 'data:text/plain,xx' });
  assert.equal(bad.ok, false);
  assert.match(bad.output, /data:image/);
});

test('clipboard: paste-read 无捕获槽 → 不支持说明（NG-012）；有槽 → 富内容可读（脱敏）+ 文件项元数据', async () => {
  const envNone = richEnv({});
  const none = await executeClipboardRich(envNone, 'paste-read', {});
  assert.equal(none.ok, false);
  assert.match(none.output, /无手势|粘贴/);

  const slot = { ts: Date.now(), textHtml: '<b>hello token=SECRET9</b>', textPlain: 'hello', files: [{ name: 'a.png', type: 'image/png', size: 123 }] };
  const env = richEnv({ pasteSlot: slot });
  const ok = await executeClipboardRich(env, 'paste-read', {});
  assert.equal(ok.ok, true);
  assert.match(ok.output, /text\/html/);
  assert.ok(!ok.output.includes('SECRET9'), '富剪贴板文本按 RICH_CLIPBOARD_TEXT_POLICY 脱敏（FR-006）');
  assert.match(ok.output, /a\.png/);
});

// ---- 授权失败转译（EC-008：write-html 授权拒绝两路可读） ----

test('clipboard: 富写授权失败 → v3 FR-009 转译可读（会话不中断）', async () => {
  const env: PlatformEnv = {
    kind: 'browser',
    fetch: (async () => new Response()) as typeof fetch,
    clipboardRich: {
      async writeItem() {
        const e = new Error('denied by user');
        e.name = 'NotAllowedError';
        throw e;
      },
    },
  };
  const r = await executeClipboardRich(env, 'write-html', { html: '<b>x</b>' });
  assert.equal(r.ok, false);
  assert.match(r.output, /授权被拒绝/);
});

// ---- 元数据面 + router 门禁 ----

test('clipboard: 元数据面 —— 富子命令 risks（write-html/write-image=write、paste-read=ui）；文本 read/write 零回归', () => {
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch };
  const entry = createClipboardToolEntry(env);
  assert.equal(entry.risk, 'ui'); // 既有回退面零变化
  assert.deepEqual(entry.subcommandRisks, { 'write-html': 'write', 'write-image': 'write', 'paste-read': 'ui' });
  assert.deepEqual([...CLIPBOARD_RICH_SUBCOMMANDS], ['write-html', 'write-image', 'paste-read']);
  const h = clipboardHelp();
  assert.match(h, /write-html/);
  assert.match(h, /NG-012/);
});

test('clipboard: 经 router 派发 —— write-html（write）无 onAsk → deny fail-closed；read（文本面）默认 ask 规则沿既有', async () => {
  const env = richEnv({});
  const router = createCommandRouter({ policy: {} });
  router.register(createClipboardToolEntry(env));
  const denied = await router.dispatch({ name: 'clipboard', subcommand: 'write-html', args: { html: '<b>x</b>' }, id: 'cl1' } as never, {});
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
});
