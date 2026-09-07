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


// ================= v3（TASK-005）：dom 7→27 子命令族扩展 =================

/** 全量 27 子命令注入桩（记录入参供逐条断言；v3 新能力面 = makeOps 的 7 方法超集）。 */
function makeOpsV3(seen: Record<string, unknown> = {}): PlatformDomOps {
  return {
    readState: async () => {
      seen['read-state'] = true;
      return okOut('url: https://host/app\ntitle: LGDL');
    },
    click: async (sel, opts) => {
      seen.click = { sel, opts };
      return okOut(`✓ 已点击 ${sel}`);
    },
    hover: async (sel) => {
      seen.hover = sel;
      return okOut(`✓ 已悬停 ${sel}`);
    },
    scroll: async (sel, dx, dy) => {
      seen.scroll = { sel, dx, dy };
      return okOut('✓ 已滚动');
    },
    zoom: async (percent) => {
      seen.zoom = percent;
      return okOut('✓ 已缩放');
    },
    fullscreen: async (on) => {
      seen.fullscreen = on;
      return okOut('✓ 全屏');
    },
    snapshot: async () => {
      seen.snapshot = true;
      return okOut('# 页面文本快照');
    },
    // PER
    interactives: async (opts) => {
      seen.interactives = opts;
      return okOut('✓ 可交互清单');
    },
    readElement: async (opts) => {
      seen['read-element'] = opts;
      return okOut('✓ 元素读取');
    },
    findElements: async (opts) => {
      seen.find = opts;
      return okOut('✓ 3 匹配');
    },
    readStructure: async (opts) => {
      seen.structure = opts;
      return okOut('✓ 结构读取');
    },
    snapshotStructured: async (opts) => {
      seen.snapshotStructured = opts;
      return okOut('✓ 结构化快照');
    },
    // INT
    dblclick: async (sel) => {
      seen.dblclick = sel;
      return okOut('✓ 双击');
    },
    contextmenu: async (sel) => {
      seen.contextmenu = sel;
      return okOut('✓ 右键');
    },
    longPress: async (sel, ms) => {
      seen['long-press'] = { sel, ms };
      return okOut('✓ 长按');
    },
    dragDrop: async (from, to) => {
      seen.drag = { from, to };
      return okOut('✓ 拖放');
    },
    focusEl: async (sel) => {
      seen.focus = sel;
      return okOut('✓ focus');
    },
    blurEl: async (sel) => {
      seen.blur = sel;
      return okOut('✓ blur');
    },
    typeText: async (sel, text, opts) => {
      seen.type = { sel, text, opts };
      return okOut('✓ 键入');
    },
    pressKey: async (combo, opts) => {
      seen.press = { combo, opts };
      return okOut('✓ 按键');
    },
    // WR
    setText: async (sel, text) => {
      seen.setText = { sel, text };
      return okOut('✓ 文本已设');
    },
    setAttr: async (sel, name, value) => {
      seen.setAttr = { sel, name, value };
      return okOut('✓ 属性已设');
    },
    removeAttr: async (sel, name) => {
      seen.removeAttr = { sel, name };
      return okOut('✓ 属性已移除');
    },
    setStyle: async (sel, opts) => {
      seen.setStyle = { sel, opts };
      return okOut('✓ 样式已设');
    },
    setValue: async (sel, value) => {
      seen.setValue = { sel, value };
      return okOut('✓ 值已设');
    },
    fillForm: async (plan) => {
      seen.fill = plan;
      return okOut('✓ 表单已填');
    },
    addElement: async (opts) => {
      seen.add = opts;
      return okOut('✓ 元素已加');
    },
    removeElement: async (sel) => {
      seen.remove = sel;
      return okOut('✓ 元素已删');
    },
  };
}

test('dom: v3 元数据面 —— 27 子命令（既有 7 顺序保持）+ schema enum 同步 + subcommandRisks 分组 + entry.risk 回退面零变化', async () => {
  const { ops } = makeOps();
  const entry = createDomToolEntry(domEnv(ops));
  const schema = entry.schema.parameters as { properties: { subcommand: { enum: string[] } } };
  const subs = schema.properties.subcommand.enum;
  assert.equal(subs.length, 27);
  // 红线（AC-001 检查点③）：既有 7 头部不漂移
  assert.deepEqual(subs.slice(0, 7), ['read-state', 'click', 'hover', 'scroll', 'zoom', 'fullscreen', 'snapshot']);
  // 元数据回退面 = v2（risk/group 零变化）
  assert.equal(entry.risk, 'ui');
  assert.equal(entry.group, 'ui');
  // subcommandRisks 分组（plan §2.3.3 单一数据源）
  const sr = entry.subcommandRisks ?? {};
  for (const s of ['read-state', 'snapshot', 'interactives', 'read-element', 'find', 'structure']) assert.equal(sr[s], 'read', `${s} 应标 read`);
  for (const s of ['click', 'hover', 'scroll', 'zoom', 'fullscreen', 'dblclick', 'contextmenu', 'long-press', 'drag', 'focus', 'blur', 'press']) {
    assert.equal(sr[s], 'ui', `${s} 应标 ui`);
  }
  for (const s of ['type', 'set-text', 'set-attr', 'remove-attr', 'set-style', 'set-value', 'fill', 'add', 'remove']) {
    assert.equal(sr[s], 'write', `${s} 应标 write`);
  }
  assert.equal(Object.keys(sr).length, 27, 'subcommandRisks 覆盖全部 27 子命令，无遗漏');
  // 帮助面：risk 分级 / 合成事件局限（NG-007）/ 同源边界（NG-002/003）/ 敏感字段策略（FR-024）
  const help = domHelp();
  assert.match(help, /risk 分级/);
  assert.match(help, /免 ask/);
  assert.match(help, /NG-007/);
  assert.match(help, /NG-002/);
  assert.match(help, /敏感字段/);
  // C34 使用引导：schema styles 描述 + help read-element 行均含颜色示例（--styles 指定/--styles true 全量）
  const domSchema = entry.schema.parameters as {
    properties: { subcommand: { enum: string[] }; args: { properties: { styles?: { description?: string } } } };
  };
  assert.match(
    domSchema.properties.args.properties.styles?.description ?? '',
    /想知道元素颜色\/背景\/字体\/字号 → --styles color\/background\/font-size\/font-weight 或 --styles true（全部）/,
  );
  assert.match(help, /dom read-element --selector '<元素>' --styles color/);
});

test('dom: v3 新增 20 子命令注入桩逐条 —— 参数解析/透传（PER4 + INT8 + WR8；click 坐标 + snapshot 结构化段升级面）', async () => {
  const seen: Record<string, unknown> = {};
  const ops = makeOpsV3(seen);
  const entry = createDomToolEntry(domEnv(ops));
  const run = (subcommand: string, args: Record<string, string> = {}) => entry.executor({ subcommand, args }, {});

  // ---- click 坐标/偏移升级（FR-020；selector-only 零回归由 v2 用例承接） ----
  await run('click', { selector: '#btn', offsetX: '5', offsetY: '7' });
  assert.deepEqual(seen.click, { sel: '#btn', opts: { offsetX: 5, offsetY: 7 } });
  await run('click', { selector: '#pt', x: '120', y: '40' });
  assert.deepEqual(seen.click, { sel: '#pt', opts: { x: 120, y: 40 } });

  // ---- PER（FR-011~014） ----
  await run('interactives', { type: 'button', state: 'disabled', text: '保存', offset: '10', limit: '20', maxItems: '50' });
  assert.deepEqual(seen.interactives, { type: 'button', state: 'disabled', text: '保存', offset: 10, limit: 20, maxItems: 50 });
  await run('read-element', { selector: '#f', attributes: 'id,class', text: 'true', styles: 'color,width', classList: 'true', geometry: 'true', state: 'true', value: 'true' });
  assert.deepEqual(seen['read-element'], {
    selector: '#f',
    fields: { attributes: ['id', 'class'], text: true, styles: ['color', 'width'], classList: true, geometry: true, state: true, value: true },
  });
  // read-element 无读取面开关 → fields 缺省 undefined（ops 默认读取面）
  await run('read-element', { selector: '#f' });
  assert.deepEqual(seen['read-element'], { selector: '#f', fields: undefined });
  await run('find', { selector: '.item', limit: '5', detail: 'true' });
  assert.deepEqual(seen.find, { selector: '.item', limit: 5, detail: true });
  await run('structure', { selector: 'main', parts: 'children,links,headings', maxLength: '8000' });
  assert.deepEqual(seen.structure, { selector: 'main', parts: ['children', 'links', 'headings'], serialize: undefined, maxLength: 8000 });
  // structure 页级（无 selector）+ 整页序列化
  await run('structure', { serialize: 'true' });
  assert.deepEqual(seen.structure, { selector: undefined, parts: undefined, serialize: true, maxLength: undefined });

  // ---- INT（FR-018~023） ----
  await run('dblclick', { selector: '#a' });
  assert.equal(seen.dblclick, '#a');
  await run('contextmenu', { selector: '#a' });
  assert.equal(seen.contextmenu, '#a');
  await run('long-press', { selector: '#a', ms: '800' });
  assert.deepEqual(seen['long-press'], { sel: '#a', ms: 800 });
  await run('long-press', { selector: '#a' }); // ms 缺省 500
  assert.deepEqual(seen['long-press'], { sel: '#a', ms: 500 });
  await run('drag', { from: '#src', to: '#dst' });
  assert.deepEqual(seen.drag, { from: '#src', to: '#dst' });
  await run('focus', { selector: '#i' });
  assert.equal(seen.focus, '#i');
  await run('blur', { selector: '#i' });
  assert.equal(seen.blur, '#i');
  await run('type', { selector: '#i', text: 'hello', clear: 'true' });
  assert.deepEqual(seen.type, { sel: '#i', text: 'hello', opts: { clear: true } });
  await run('type', { selector: '#i', text: 'hi' });
  assert.deepEqual(seen.type, { sel: '#i', text: 'hi', opts: undefined });
  await run('press', { key: 'ctrl+Enter', selector: '#i' });
  assert.deepEqual(seen.press, { combo: 'ctrl+Enter', opts: { selector: '#i' } });
  await run('press', { key: 'Enter' });
  assert.deepEqual(seen.press, { combo: 'Enter', opts: undefined });

  // ---- WR（FR-031~036） ----
  await run('set-text', { selector: '#t', text: '新文本' });
  assert.deepEqual(seen.setText, { sel: '#t', text: '新文本' });
  await run('set-attr', { selector: '#a', name: 'href', value: '/x' });
  assert.deepEqual(seen.setAttr, { sel: '#a', name: 'href', value: '/x' });
  await run('set-attr', { selector: '#a', name: 'disabled' }); // 布尔属性形态 value 缺省
  assert.deepEqual(seen.setAttr, { sel: '#a', name: 'disabled', value: undefined });
  await run('remove-attr', { selector: '#a', name: 'href' });
  assert.deepEqual(seen.removeAttr, { sel: '#a', name: 'href' });
  await run('set-style', { selector: '#s', cssText: 'color:red;display:block' });
  assert.deepEqual(seen.setStyle, { sel: '#s', opts: { cssText: 'color:red;display:block' } });
  await run('set-style', { selector: '#s', prop: 'color', value: 'red' });
  assert.deepEqual(seen.setStyle, { sel: '#s', opts: { properties: { color: 'red' } } });
  await run('set-style', { selector: '#s', classAction: 'toggle', className: 'active' });
  assert.deepEqual(seen.setStyle, { sel: '#s', opts: { classAction: 'toggle', className: 'active' } });
  await run('set-value', { selector: '#v', value: '42' });
  assert.deepEqual(seen.setValue, { sel: '#v', value: '42' });
  await run('fill', { fields: '{"#user":"alice","#pw":"s3cret"}', submit: 'true' });
  assert.deepEqual(seen.fill, { fields: [{ selector: '#user', value: 'alice' }, { selector: '#pw', value: 's3cret' }], submit: true });
  await run('fill', { fields: '[{"selector":"#sel","value":"选项B","byLabel":true}]' });
  assert.deepEqual(seen.fill, { fields: [{ selector: '#sel', value: '选项B', byLabel: true }], submit: undefined });
  await run('add', { tag: 'button', to: '#root', text: '点我', attrs: '{"data-x":"1","class":"btn"}', mode: 'after' });
  assert.deepEqual(seen.add, {
    tag: 'button',
    text: '点我',
    attrs: { 'data-x': '1', class: 'btn' },
    position: { mode: 'after', selector: '#root' },
  });
  await run('add', { tag: 'div', to: '#root' }); // mode 缺省 append
  assert.deepEqual(seen.add, { tag: 'div', text: undefined, attrs: undefined, position: { mode: 'append', selector: '#root' } });
  await run('remove', { selector: '#gone' });
  assert.equal(seen.remove, '#gone');

  // ---- snapshot 结构化段（FR-010：既有 snapshot 升级参数，不加新名） ----
  await run('snapshot', { structured: 'true', sections: 'interactives,headings', offset: '5', limit: '10', maxLength: '2000' });
  assert.deepEqual(seen.snapshotStructured, { offset: 5, limit: 10, maxLength: 2000, sections: ['interactives', 'headings'] });
  await run('snapshot', { structured: 'true' });
  assert.deepEqual(seen.snapshotStructured, { offset: undefined, limit: undefined, maxLength: undefined, sections: undefined });
});

test('dom: v3 新子命令缺参/参数非法 → 可读错误（executor 侧边界；EC-002 面）+ 子能力未注入守卫（FR-002）', async () => {
  const seen: Record<string, unknown> = {};
  const ops = makeOpsV3(seen);
  const entry = createDomToolEntry(domEnv(ops));
  const run = (subcommand: string, args: Record<string, string> = {}) => entry.executor({ subcommand, args }, {});
  const fail = async (sub: string, args: Record<string, string>, re: RegExp) => {
    const r = await run(sub, args);
    assert.equal(r.ok, false, `${sub} 应失败`);
    assert.match(r.output, re);
  };
  await fail('read-element', {}, /--selector/);
  await fail('find', {}, /--selector/);
  await fail('structure', { parts: 'xpath,children' }, /--parts 含非法值/);
  await fail('dblclick', {}, /--selector/);
  await fail('contextmenu', {}, /--selector/);
  await fail('long-press', {}, /--selector/);
  await fail('long-press', { selector: '#a', ms: 'xyz' }, /--ms 需为整数/);
  await fail('drag', { to: '#dst' }, /--from/);
  await fail('drag', { from: '#src' }, /--to/);
  await fail('focus', {}, /--selector/);
  await fail('blur', {}, /--selector/);
  await fail('type', { selector: '#i' }, /--text/);
  await fail('type', { text: 'x' }, /--selector/);
  await fail('press', {}, /--key/);
  await fail('set-text', { selector: '#t' }, /--text/);
  await fail('set-attr', { selector: '#a' }, /--name/);
  await fail('set-attr', { name: 'href' }, /--selector/);
  await fail('remove-attr', { selector: '#a' }, /--name/);
  await fail('set-style', { selector: '#s' }, /需提供其一/);
  await fail('set-style', { selector: '#s', prop: 'color' }, /--value/);
  await fail('set-style', { selector: '#s', classAction: 'flip', className: 'x' }, /classAction 需为 add\/remove\/toggle/);
  await fail('set-style', { selector: '#s', classAction: 'add' }, /--className/);
  await fail('set-value', { selector: '#v' }, /--value/);
  await fail('fill', {}, /--fields/);
  await fail('fill', { fields: '{bad json' }, /合法 JSON/);
  await fail('fill', { fields: '{"#a":42}' }, /值需为字符串/);
  await fail('add', { to: '#root' }, /--tag/);
  await fail('add', { tag: 'div' }, /--to/);
  await fail('add', { tag: 'div', to: '#root', mode: 'sideways' }, /--mode 需为 append\/prepend\/before\/after/);
  await fail('add', { tag: 'div', to: '#root', attrs: '[1,2]' }, /JSON 对象/);
  await fail('remove', {}, /--selector/);
  await fail('snapshot', { structured: 'true', sections: 'xpath' }, /--sections 含非法值/);
  await fail('snapshot', { structured: 'true', offset: 'abc' }, /--offset 需为整数/);
  await fail('click', { selector: '#b', offsetX: 'nope' }, /--offsetX 需为整数/);
  // 缺参不触发任何 ops 调用（seen 保持空）
  assert.equal(Object.keys(seen).length, 0);
  // 子能力未注入（v2 7 方法桩无 v3 方法）→ 可读「未注入」，不崩溃（FR-002）
  const seven = makeOps();
  const entry7 = createDomToolEntry(domEnv(seven.ops));
  for (const sub of ['interactives', 'read-element', 'snapshot-structured-flag', 'dblclick', 'type', 'set-value', 'fill', 'add']) {
    const args =
      sub === 'type'
        ? { selector: '#i', text: 'x' }
        : sub === 'snapshot-structured-flag'
          ? { structured: 'true' }
          : sub === 'read-element' || sub === 'dblclick'
            ? { selector: '#x' }
            : sub === 'fill'
              ? { fields: '{"#a":"1"}' }
              : sub === 'set-value'
                ? { selector: '#v', value: '1' }
                : sub === 'add'
                  ? { tag: 'div', to: '#r' }
                  : {};
    const r = await entry7.executor({ subcommand: sub === 'snapshot-structured-flag' ? 'snapshot' : sub, args }, {});
    assert.equal(r.ok, false, `${sub} 应返回未注入错误`);
    assert.match(r.output, /未注入/);
  }
});

test('dom: scroll/zoom/fullscreen 显式非法参数 → 可读错误（EC-002 不静默回退）；缺省路径保持 v2 兼容（C34 改进）', async () => {
  const seen: Record<string, unknown> = {};
  const ops = makeOpsV3(seen);
  const entry = createDomToolEntry(domEnv(ops));
  const run = (subcommand: string, args: Record<string, string> = {}) => entry.executor({ subcommand, args }, {});
  const fail = async (sub: string, args: Record<string, string>, re: RegExp) => {
    const r = await run(sub, args);
    assert.equal(r.ok, false, `${sub} ${JSON.stringify(args)} 应失败`);
    assert.match(r.output, re);
  };
  // 显式非空但非法数值 → 可读错误（不静默回退 100%/0/false）
  await fail('scroll', { dx: 'abc' }, /--dx 需为整数/);
  await fail('scroll', { dx: '10', dy: '1.5' }, /--dy 需为整数/);
  await fail('zoom', { percent: 'abc' }, /--percent 需为整数/);
  await fail('zoom', { percent: '150%' }, /--percent 需为整数/);
  await fail('fullscreen', { on: 'yes' }, /--on 需为 true 或 false/);
  await fail('fullscreen', { on: 'TRUE' }, /--on 需为 true 或 false/);
  // 非法路径零 ops 调用（执行器先于 ops 拦截）
  assert.equal(Object.keys(seen).length, 0);
  // 缺省/合法路径 = v2 兼容形态（scroll 缺省 0,0 / zoom 缺省 undefined / fullscreen false）
  await run('scroll', { selector: '#list' });
  assert.deepEqual(seen.scroll, { sel: '#list', dx: 0, dy: 0 });
  await run('zoom', {});
  assert.equal(seen.zoom, undefined);
  await run('fullscreen', { on: 'false' });
  assert.equal(seen.fullscreen, false);
  await run('fullscreen', {});
  assert.equal(seen.fullscreen, false);
});

test('dom: dispatch 级子命令 risk —— 只读子命令免 ask / ui·write 子命令 ask（IMP-4 修复 AC-009 机制侧；FR-005）', async () => {
  const seen: Record<string, unknown> = {};
  const ops = makeOpsV3(seen);
  const askCalls: string[] = [];
  const router = createCommandRouter({
    builtins: false,
    policy: {
      // lgdl-web 形态规则：UI 副作用默认 ask（只读子命令落 read → 不命中 → 缺省 allow）
      rules: [{ risk: 'ui', action: 'ask', note: 'UI 副作用默认确认' }],
      onAsk: async (q) => {
        askCalls.push(q.subcommand ?? '');
        return { action: 'allow' };
      },
    },
  });
  router.register(createDomToolEntry(domEnv(ops)));
  // 只读组 6 子命令：全部免 ask 放行（IMP-4 修复验收点：v2 整工具 risk:ui 曾锁死 read-state/snapshot）
  const readArgs = (sub: string): Record<string, string> => (sub === 'read-element' || sub === 'find' ? { selector: '#x' } : {});
  for (const sub of ['read-state', 'snapshot', 'interactives', 'read-element', 'find', 'structure']) {
    const r = await router.dispatch(tc('dom', readArgs(sub), sub));
    assert.equal(r.ok, true, `${sub} 应免 ask 放行`);
  }
  assert.equal(askCalls.length, 0, '只读子命令不应触发 ask');
  assert.equal(seen['read-state'], true);
  assert.equal(seen.snapshot, true);
  assert.ok(seen.interactives !== undefined);
  assert.ok(seen['read-element'] !== undefined);
  // ui 组：命中 risk:'ui' ask 规则 → ask → allow → 执行器被调用
  const c = await router.dispatch(tc('dom', { selector: '#b' }, 'click'));
  assert.equal(c.ok, true);
  assert.deepEqual(askCalls, ['click']);
  assert.deepEqual(seen.click, { sel: '#b', opts: undefined });
  const d = await router.dispatch(tc('dom', { selector: '#b' }, 'dblclick'));
  assert.equal(d.ok, true);
  assert.deepEqual(askCalls, ['click', 'dblclick']);
  // write 组：规则不匹配（write ≠ ui）→ 缺省 ask 取向（defaultActionForRisk('write')='ask'）→ allow
  const t = await router.dispatch(tc('dom', { selector: '#t', text: 'hi' }, 'set-text'));
  assert.equal(t.ok, true);
  assert.deepEqual(askCalls, ['click', 'dblclick', 'set-text']);
  assert.deepEqual(seen.setText, { sel: '#t', text: 'hi' });
});

test('dom: dispatch 级子命令 risk —— write deny 规则命中即拒且执行器不调用（EC-014 deny 优先语义）', async () => {
  const seen: Record<string, unknown> = {};
  const ops = makeOpsV3(seen);
  let askRaised = 0;
  const router = createCommandRouter({
    builtins: false,
    policy: {
      rules: [{ risk: 'write', action: 'deny', note: '禁止写入' }],
      onAsk: async () => {
        askRaised++;
        return { action: 'allow' };
      },
    },
  });
  router.register(createDomToolEntry(domEnv(ops)));
  const r = await router.dispatch(tc('dom', { selector: '#t', text: 'x' }, 'set-text'));
  assert.equal(r.ok, false);
  assert.match(r.output, /权限被拒/);
  assert.equal(askRaised, 0, 'deny 命中不进入 ask');
  assert.equal(Object.keys(seen).length, 0, 'deny 时执行器（ops）未被调用');
  // 只读子命令不受 write deny 规则影响 → 缺省 allow
  const rs = await router.dispatch(tc('dom', {}, 'read-state'));
  assert.equal(rs.ok, true);
  assert.equal(seen['read-state'], true);
});

