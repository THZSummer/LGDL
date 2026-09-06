import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDomToolEntry, domHelp } from './dom-tools.js';
import type { PlatformDomOps, PlatformEnv } from './platform.js';
import { nodeEnv } from './platform.js';
import { createAskUserToolEntry, askUserHelp as askUserHelpText } from './ask-user.js';
import type { AskResponder, AskUserQuestion, AskUserAnswer } from './ask-user.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

/** env 构造：nodeEnv + dom.ops 注入（state 桩随附）。 */
function domEnv(ops: PlatformDomOps): PlatformEnv {
  return {
    ...nodeEnv(),
    dom: { ops, state: { snapshot: async () => ({ injected: true }) } },
  };
}

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

function okOut(output: string) {
  return { ok: true, output };
}

/** 记录调用桩（逐子命令断言 + deny 拦截间谍）。 */
function makeOps(over: Partial<PlatformDomOps> = {}): { ops: PlatformDomOps; calls: string[] } {
  const calls: string[] = [];
  const ops: PlatformDomOps = {
    readState: async () => {
      calls.push('read-state');
      return okOut('url: https://host/app\ntitle: LGDL');
    },
    click: async (sel) => {
      calls.push(`click:${sel}`);
      return okOut(`✓ 已点击 ${sel}`);
    },
    hover: async (sel) => {
      calls.push(`hover:${sel}`);
      return okOut(`✓ 已悬停 ${sel}`);
    },
    scroll: async (sel, dx, dy) => {
      calls.push(`scroll:${sel ?? 'page'}:${dx}:${dy}`);
      return okOut('✓ 已滚动');
    },
    zoom: async (percent) => {
      calls.push(`zoom:${percent}`);
      return okOut(`✓ 已缩放 ${percent}%`);
    },
    fullscreen: async (on) => {
      calls.push(`fullscreen:${on}`);
      return okOut(on ? '✓ 已进入全屏' : '✓ 已退出全屏');
    },
    snapshot: async () => {
      calls.push('snapshot');
      return okOut('# 页面文本快照\n...');
    },
    ...over,
  };
  return { ops, calls };
}

test('dom: 注入桩逐子命令（参数透传 + 只读/写子命令齐备）', async () => {
  const { ops, calls } = makeOps();
  const entry = createDomToolEntry(domEnv(ops));
  assert.equal((await entry.executor({ subcommand: 'read-state', args: {} }, {})).output.includes('LGDL'), true);
  assert.equal((await entry.executor({ subcommand: 'click', args: { selector: '#btn' } }, {})).output, '✓ 已点击 #btn');
  await entry.executor({ subcommand: 'hover', args: { selector: '.tip' } }, {});
  await entry.executor({ subcommand: 'scroll', args: { selector: '#list', dx: '0', dy: '120' } }, {});
  await entry.executor({ subcommand: 'zoom', args: { percent: '150' } }, {});
  await entry.executor({ subcommand: 'fullscreen', args: { on: 'true' } }, {});
  const snap = await entry.executor({ subcommand: 'snapshot', args: {} }, {});
  assert.ok(snap.output.includes('快照'));
  assert.deepEqual(calls, [
    'read-state',
    'click:#btn',
    'hover:.tip',
    'scroll:#list:0:120',
    'zoom:150',
    'fullscreen:true',
    'snapshot',
  ]);
});

test('dom: 缺参/未知子命令/操作面未注入 错误 + Node 面转译桩', async () => {
  const { ops } = makeOps();
  const entry = createDomToolEntry(domEnv(ops));
  const noSel = await entry.executor({ subcommand: 'click', args: {} }, {});
  assert.equal(noSel.ok, false);
  assert.match(noSel.output, /--selector/);
  const unknown = await entry.executor({ subcommand: 'fly', args: {} }, {});
  assert.equal(unknown.ok, false);
  assert.match(unknown.output, /未知子命令/);
  // 无 ops（nodeEnv dom.ops = 转译桩）→ 友好错误
  const bare = createDomToolEntry({ ...nodeEnv(), dom: undefined });
  const r = await bare.executor({ subcommand: 'click', args: { selector: '#a' } }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /操作面未注入/);
  // Node 默认 ops 抛 NotFoundError → 转译（经 env.dom.ops 桩）
  const nodeOps = createDomToolEntry(nodeEnv());
  const r2 = await nodeOps.executor({ subcommand: 'snapshot', args: {} }, {});
  assert.equal(r2.ok, false);
  assert.ok(r2.error?.includes('failed'));
});

test('dom: 写操作 deny 策略拦截 —— 执行器(ops)未被调用（FR-005/AC-004，EC-003 语义）', async () => {
  const { ops, calls } = makeOps();
  const router = createCommandRouter({
    builtins: false,
    policy: { rules: [{ pattern: 'dom', action: 'deny', note: 'UI 写禁用' }] },
  });
  router.register(createDomToolEntry(domEnv(ops)));
  const r = await router.dispatch(tc('dom', { selector: '#del' }, 'click'));
  assert.equal(r.ok, false);
  assert.match(r.output, /权限被拒/);
  assert.equal(calls.length, 0); // 间谍断言：deny 时 DOM 操作未被调用
  // 只读子命令同样受该 deny 规则（工具级 risk 语义，规则细化由场景策略承担）
  const rs = await router.dispatch(tc('dom', {}, 'read-state'));
  assert.equal(rs.ok, false);
});

test('dom: 无策略时派发可用 + ToolEntry 元数据（group ui / risk ui / help 同源边界）', async () => {
  const { ops, calls } = makeOps();
  const router = createCommandRouter({ builtins: false });
  router.register(createDomToolEntry(domEnv(ops)));
  const ok = await router.dispatch(tc('dom', { selector: '#ok' }, 'click'));
  assert.equal(ok.ok, true);
  assert.equal(calls.length, 1);
  const entry = router.query({ name: 'dom' })[0];
  assert.equal(entry.group, 'ui');
  assert.equal(entry.risk, 'ui');
  const help = domHelp();
  assert.match(help, /同源|宿主应用自身/);
  assert.match(help, /NG-003/);
  assert.match(help, /PRM|权限门禁/);
});


// ================= ask-user（FR-023：任务内澄清；fake 应答器三型契约） =================

function makeResponder(impl: (q: AskUserQuestion) => { ok: boolean; value?: string; canceled?: boolean }) {
  const seen: AskUserQuestion[] = [];
  const responder: AskResponder = async (q) => {
    seen.push(q);
    return impl(q);
  };
  return { responder, seen };
}

test('ask-user: fake 应答器三型契约 — choice/confirm/text', async () => {
  // choice：选项命中回填
  const choice = makeResponder((q) => {
    assert.equal(q.kind, 'choice');
    assert.deepEqual(q.options, ['是', '否']);
    return { ok: true, value: '是' };
  });
  const entry = createAskUserToolEntry({ askUser: choice.responder });
  const r1 = await entry.executor({ subcommand: '', args: { kind: 'choice', prompt: '继续？', options: '是,否' } }, {});
  assert.equal(r1.ok, true);
  assert.equal(r1.output, '用户回答：是');
  assert.equal(choice.seen[0].kind, 'choice');
  // confirm：yes/no
  const confirm = makeResponder(() => ({ ok: true, value: 'no' }));
  const e2 = createAskUserToolEntry({ askUser: confirm.responder });
  const r2 = await e2.executor({ subcommand: '', args: { kind: 'confirm', prompt: '删除？' } }, {});
  assert.equal(r2.output, '用户回答：no');
  assert.equal(confirm.seen[0].kind, 'confirm');
  // text：自由文本
  const text = makeResponder(() => ({ ok: true, value: '画一个流程图' }));
  const e3 = createAskUserToolEntry({ askUser: text.responder });
  const r3 = await e3.executor({ subcommand: '', args: { kind: 'text', prompt: '想要什么图？' } }, {});
  assert.equal(r3.output, '用户回答：画一个流程图');
});

test('ask-user: 取消 → ok:false + 缺参/非法 kind/choice 无选项错误', async () => {
  const cancel = makeResponder(() => ({ ok: false, canceled: true }));
  const entry = createAskUserToolEntry({ askUser: cancel.responder });
  const rc = await entry.executor({ subcommand: '', args: { prompt: '问' } }, {});
  assert.equal(rc.ok, false);
  assert.match(rc.output, /取消/);
  const noPrompt = await entry.executor({ subcommand: '', args: {} }, {});
  assert.equal(noPrompt.ok, false);
  assert.match(noPrompt.output, /--prompt/);
  const badKind = await entry.executor({ subcommand: '', args: { kind: 'radio', prompt: 'x' } }, {});
  assert.equal(badKind.ok, false);
  assert.match(badKind.output, /未知 ask-user 类型/);
  const noOpts = await entry.executor({ subcommand: '', args: { kind: 'choice', prompt: 'x' } }, {});
  assert.equal(noOpts.ok, false);
  assert.match(noOpts.output, /--options/);
});

test('ask-user: 应答器未注入 → 配置指引（与 PRM ask 语义区分的 help 声明）', async () => {
  const bare = createAskUserToolEntry({});
  const r = await bare.executor({ subcommand: '', args: { prompt: 'q' } }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /未注入应答器/);
  assert.match(askUserHelpText(), /与 PRM 权限 ask|权限门禁的 ask/);
  assert.match(askUserHelpText(), /任务内澄清/);
});

