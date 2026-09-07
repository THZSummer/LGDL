/**
 * dialog-tools.test.ts —— dialog 工具的 node 注入面测试（TASK-006；fake env + 真 dialogOverride 经 shim）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEventsToolEntry } from './events-tools.js';
import { createDialogToolEntry, executeDialogTool, DIALOG_SUBCOMMANDS } from './dialog-tools.js';
import { createBrowserEventHub } from './platform-events.js';
import type { PlatformEnv, PlatformEventHub } from './platform.js';
import { createMemoryAudit } from './audit.js';
import type { MemoryAuditSink } from './audit.js';
import { createCommandRouter } from './router.js';
import type { ToolContext } from './router.js';

function makeFakeEnv(): { env: PlatformEnv; hub: PlatformEventHub } {
  const hub = createBrowserEventHub({ window: makeFakeWindow().win, document: {} });
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: hub };
  return { env, hub };
}

function makeFakeWindow() {
  const calls: Array<{ fn: string; args: unknown[] }> = [];
  const win: Record<string, unknown> = {
    alert: (...a: unknown[]) => {
      calls.push({ fn: 'alert', args: a });
    },
    confirm: (...a: unknown[]) => {
      calls.push({ fn: 'confirm', args: a });
      return true;
    },
    prompt: (...a: unknown[]) => {
      calls.push({ fn: 'prompt', args: a });
      return 'native';
    },
  };
  return { win, calls };
}

const noCtx = (audit?: MemoryAuditSink): ToolContext | undefined => (audit ? { services: { audit } } : undefined);

// ---- 元数据面 ----

test('dialog: 元数据面 —— 6 子命令 + subcommandRisks（install/uninstall/policy-add=write、remove=state、list/status=read）', () => {
  const { env } = makeFakeEnv();
  const entry = createDialogToolEntry(env);
  assert.equal(entry.name, 'dialog');
  assert.equal(entry.group, 'dialog');
  assert.deepEqual(entry.subcommandRisks, {
    'override-install': 'write',
    uninstall: 'write',
    'policy-add': 'write',
    remove: 'state',
    list: 'read',
    status: 'read',
  });
  assert.deepEqual(DIALOG_SUBCOMMANDS, ['override-install', 'uninstall', 'policy-add', 'list', 'remove', 'status']);
});

// ---- 未注入转译 ----

test('dialog: env.events 未注入 → 可读转译不中断（EC-011）', async () => {
  const r = await executeDialogTool({ kind: 'node', fetch: (async () => new Response()) as typeof fetch }, 'override-install', {});
  assert.equal(r.ok, false);
  assert.match(r.output, /不可用/);
});

// ---- 真 dialogOverride 控制器（createBrowserEventHub shim window）全链 ----

test('dialog: override-install → confirm/prompt 缺省保守应答 + 事件入通道；policy-add trusted → accept；uninstall 还原', async () => {
  const fw = makeFakeWindow();
  const hub = createBrowserEventHub({ window: fw.win, document: {} });
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: hub };
  const audit = createMemoryAudit();
  const ctx = noCtx(audit);

  // 安装前：原生行为（测试假原生返回 confirm true）
  assert.equal((fw.win.confirm as (m?: unknown) => boolean)('原生?'), true);

  const install = await executeDialogTool(env, 'override-install', {}, ctx);
  assert.equal(install.ok, true);
  assert.equal(await hub.sources.dialogOverride.installed(), true);

  // 订阅 dialog 事件（观察通道）+ 开启全局开关
  const evEntry = createEventsToolEntry(env);
  void evEntry;
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'dialog' });
  assert.ok(sub.ok);
  const subId = sub.ok ? sub.subId : '';

  // 缺省保守：confirm → false（dismiss），prompt → null，alert 不阻塞
  const confirmRes = (fw.win.confirm as (m?: unknown) => boolean)('确认继续吗');
  assert.equal(confirmRes, false, 'confirm 无匹配规则 → dismiss 否定值（EC-005）');
  const promptRes = (fw.win.prompt as (m?: unknown) => string | null)('请输入名称');
  assert.equal(promptRes, null);
  (fw.win.alert as (m?: unknown) => void)('提示: 密码错误 token=SECRET');
  const pull = await hub.pull(subId);
  assert.equal(pull.events.length, 3);
  const texts = pull.events.map((e) => e.text).join('\n');
  assert.ok(!texts.includes('SECRET'), '对话框文本脱敏');
  const kinds = pull.events.map((e) => e.kind);
  assert.ok(kinds.every((k) => k === 'dialog'));

  // policy-add（trusted）+ 命中 → accept
  const pa = await executeDialogTool(env, 'policy-add', { type: 'confirm', action: 'accept', trusted: 'true', pattern: '继续' }, ctx);
  assert.equal(pa.ok, true);
  const confirmOk = (fw.win.confirm as (m?: unknown) => boolean)('要继续吗');
  assert.equal(confirmOk, true, 'trusted accept 规则命中 → 确认值');

  // uninstall 还原
  const un = await executeDialogTool(env, 'uninstall', {}, ctx);
  assert.equal(un.ok, true);
  assert.equal(await hub.sources.dialogOverride.installed(), false);
  assert.equal((fw.win.confirm as (m?: unknown) => boolean)('原生?'), true, '卸载还原原生行为');
});

// ---- policy-add untrusted 拒 / remove / list / status / 审计 ----

test('dialog: policy-add untrusted 缺省拒 + 需 --trusted true；list/remove/status 全链 + 审计无明文', async () => {
  const { env, hub } = makeFakeEnv();
  const audit = createMemoryAudit();
  const ctx = noCtx(audit);

  const deny = await executeDialogTool(env, 'policy-add', { type: 'confirm', action: 'accept' }, ctx);
  assert.equal(deny.ok, false);
  assert.match(deny.output, /trusted/);

  const ok = await executeDialogTool(env, 'policy-add', { type: 'alert', action: 'dismiss', pattern: '稍等', trusted: 'true' }, ctx);
  assert.equal(ok.ok, true);
  const list = await executeDialogTool(env, 'list', {}, ctx);
  assert.match(list.output, /\[0\] alert/);
  const status = await executeDialogTool(env, 'status', {}, ctx);
  assert.match(status.output, /未安装/);
  const rm = await executeDialogTool(env, 'remove', { index: '0' }, ctx);
  assert.equal(rm.ok, true);
  assert.match((await executeDialogTool(env, 'list', {}, ctx)).output, /当前无对话框应答策略/);
  // 审计：policy-add-denied / policy-add / policy-remove 三笔 dialog 事件按序入账（真实字段断言）
  const dialogEvs = audit.events.filter((e) => e.type === 'dialog');
  assert.equal(dialogEvs.length, 3, 'denied + registered + removed 三笔 dialog 审计');
  assert.deepEqual(
    dialogEvs.map((e) => e.action),
    ['policy-add-denied', 'policy-add', 'policy-remove'],
    'dialog 审计动作按调用序记录（trusted 决策与动作在）',
  );
  assert.equal(dialogEvs[0].detail, 'untrusted 策略拒：confirm/accept', 'deny 审计 detail = 规则归类（type/action 非页面内容）');
  assert.equal(dialogEvs[1].detail, 'trusted 策略注册：alert → dismiss pattern=稍等', 'trusted 注册审计记录规则形态');
  assert.ok(dialogEvs.every((e) => e.tool === 'dialog'), '审计 tool 位 = dialog');
  // 负向：审计面无页面捕获内容明文 —— 本流程未触发任何页面对话框（未 install），audit detail 无消息/应答文本面
  assert.ok(!JSON.stringify(dialogEvs).includes('确认继续'), '审计不含页面对话框消息文本');
  const types = audit.events.map((e) => e.type);
  assert.ok(types.includes('dialog'));
});

// ---- 经 router 注册：override-install write → 无 onAsk 桥 deny（执行器不被调用） ----

test('dialog: 经 router 派发 —— override-install（write）无 onAsk 桥 → deny fail-closed（FR-005）', async () => {
  const { env } = makeFakeEnv();
  const router = createCommandRouter({ policy: {} });
  router.register(createDialogToolEntry(env));
  const spyHub = env.events;
  void spyHub;
  const denied = await router.dispatch({ name: 'dialog', subcommand: 'override-install', args: {}, id: 'd1' } as never, {});
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  assert.equal(await env.events?.sources.dialogOverride.installed(), false, 'deny 后不安装（FR-005）');
});
