import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WAIT_KINDS,
  WAIT_TIMEOUT_DEFAULT_MS,
  WAIT_TIMEOUT_MAX_MS,
  WAIT_INTERVAL_DEFAULT_MS,
  parseWaitArgs,
  executeWaitTool,
  waitHelp,
  createWaitToolEntry,
} from './wait-tools.js';
import type { PlatformDomOps, PlatformDomOpResult, PlatformEnv, PlatformWaitForOptions } from './platform.js';
import { nodeEnv } from './platform.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';
import { parseSleepCommand } from './sleep.js';
import { SLEEP_TOOL } from './tools.js';

function okOut(output: string): PlatformDomOpResult {
  return { ok: true, output };
}

/** 记录调用桩：waitFor 单点记录（executor 只应委托一次 —— NFR-007 工具层零空转）。 */
function makeOps(
  waitFor?: (opts: PlatformWaitForOptions) => Promise<PlatformDomOpResult>,
): { ops: PlatformDomOps; calls: PlatformWaitForOptions[] } {
  const calls: PlatformWaitForOptions[] = [];
  const ops: PlatformDomOps = {
    readState: async () => okOut(''),
    click: async () => okOut(''),
    hover: async () => okOut(''),
    scroll: async () => okOut(''),
    zoom: async () => okOut(''),
    fullscreen: async () => okOut(''),
    snapshot: async () => okOut(''),
    waitFor: async (opts) => {
      calls.push(opts);
      if (waitFor) return waitFor(opts);
      return { ok: true, output: `✓ 等待命中（${opts.conditions.map((c) => c.kind).join('+')}）` };
    },
  };
  return { ops, calls };
}

/** env 构造：nodeEnv + dom.ops 注入（waitFor 桩随附）。 */
function waitEnv(ops: PlatformDomOps): PlatformEnv {
  return { ...nodeEnv(), dom: { ops, state: { snapshot: async () => ({ injected: true }) } } };
}

function tc(name: string, args: Record<string, string>, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

// ================= 条件解析（parseWaitArgs） =================

test('parseWaitArgs: element 单条件 + 缺省 mode/timeout/interval', () => {
  const r = parseWaitArgs({ kind: 'element', selector: '#toast' });
  assert.equal(r.ok, true);
  if (r.ok === true) {
    assert.deepEqual(r.options.conditions, [{ kind: 'element', selector: '#toast' }]);
    assert.equal(r.options.mode, 'any');
    assert.equal(r.options.timeout, WAIT_TIMEOUT_DEFAULT_MS);
    assert.equal(r.options.interval, WAIT_INTERVAL_DEFAULT_MS);
  }
});

test('parseWaitArgs: 数值参数解析 + timeout 30s 钳制 + selector 空白裁剪', () => {
  const r = parseWaitArgs({ kind: 'visible', selector: '  #btn  ', mode: 'all', timeout: '45000', interval: '150' });
  assert.equal(r.ok, true);
  if (r.ok === true) {
    assert.deepEqual(r.options.conditions, [{ kind: 'visible', selector: '#btn' }]);
    assert.equal(r.options.mode, 'all');
    assert.equal(r.options.timeout, WAIT_TIMEOUT_MAX_MS); // 45000 → 钳制 30000
    assert.equal(r.options.interval, 150);
  }
  // 界内 timeout 保持
  const ok = parseWaitArgs({ kind: 'element', selector: '#a', timeout: '5000' });
  assert.equal(ok.ok, true);
  if (ok.ok === true) assert.equal(ok.options.timeout, 5000);
});

test('parseWaitArgs: gone/visible 经 text= 定位语法（O-011 语法面一致）', () => {
  const gone = parseWaitArgs({ kind: 'gone', selector: 'text*=已删除' });
  assert.equal(gone.ok, true);
  if (gone.ok === true) assert.deepEqual(gone.options.conditions, [{ kind: 'gone', selector: 'text*=已删除' }]);
  const vis = parseWaitArgs({ kind: 'visible', selector: 'text=保存成功' });
  assert.equal(vis.ok, true);
  if (vis.ok === true) assert.deepEqual(vis.options.conditions, [{ kind: 'visible', selector: 'text=保存成功' }]);
});

test('parseWaitArgs: kind=text 三形态（裸文本精确 / selector text= 语法 / CSS 容器 + text）', () => {
  // ① 裸文本 → 规范 text= 精确匹配
  const plain = parseWaitArgs({ kind: 'text', text: '加载完成' });
  assert.equal(plain.ok, true);
  if (plain.ok === true) {
    assert.deepEqual(plain.options.conditions, [{ kind: 'text', text: 'text=加载完成' }]);
    assert.equal(plain.options.conditions[0].selector, undefined);
  }
  // ② selector 直接 text= / text*= 语法（页面级文本出现）
  const sel = parseWaitArgs({ kind: 'text', selector: 'text*=加载' });
  assert.equal(sel.ok, true);
  if (sel.ok === true) assert.deepEqual(sel.options.conditions, [{ kind: 'text', text: 'text*=加载' }]);
  // ③ CSS 容器 + text（等待容器内出现文本）
  const scoped = parseWaitArgs({ kind: 'text', selector: '#list', text: '第 2 页' });
  assert.equal(scoped.ok, true);
  if (scoped.ok === true) {
    assert.deepEqual(scoped.options.conditions, [{ kind: 'text', selector: '#list', text: 'text=第 2 页' }]);
  }
});

test('parseWaitArgs: --conditions 多条件数组 + mode any/all 语义', () => {
  const r = parseWaitArgs({
    mode: 'all',
    timeout: '8000',
    conditions: JSON.stringify([
      { kind: 'element', selector: '#toast' },
      { kind: 'gone', selector: '#spinner' },
      { kind: 'text', text: '加载完成' },
    ]),
  });
  assert.equal(r.ok, true);
  if (r.ok === true) {
    assert.equal(r.options.conditions.length, 3);
    assert.deepEqual(r.options.conditions[0], { kind: 'element', selector: '#toast' });
    assert.deepEqual(r.options.conditions[1], { kind: 'gone', selector: '#spinner' });
    assert.deepEqual(r.options.conditions[2], { kind: 'text', text: 'text=加载完成' });
    assert.equal(r.options.mode, 'all');
    assert.equal(r.options.timeout, 8000);
  }
  // 单条件显式 mode any
  const any = parseWaitArgs({ kind: 'element', selector: '#x', mode: 'any' });
  assert.equal(any.ok, true);
  if (any.ok === true) assert.equal(any.options.mode, 'any');
});

test('parseWaitArgs: 非法 kind / 缺条件 → 可读错误', () => {
  const noKind = parseWaitArgs({ selector: '#x' });
  assert.equal(noKind.ok, false);
  if (noKind.ok === false) {
    assert.match(noKind.output, /--kind/);
    assert.match(noKind.output, /element|visible|interactable|gone|text/);
    assert.equal(noKind.error, 'missing kind');
  }
  const empty = parseWaitArgs({});
  assert.equal(empty.ok, false);
  if (empty.ok === false) assert.match(empty.output, /--conditions/);
  const badKind = parseWaitArgs({ kind: 'fly', selector: '#x' });
  assert.equal(badKind.ok, false);
  if (badKind.ok === false) assert.match(badKind.output, /未知 wait 条件 kind "fly"/);
  // element 缺 selector
  const noSel = parseWaitArgs({ kind: 'element' });
  assert.equal(noSel.ok, false);
  if (noSel.ok === false) assert.match(noSel.output, /--selector/);
  // text 缺文本目标
  const textNoTarget = parseWaitArgs({ kind: 'text' });
  assert.equal(textNoTarget.ok, false);
  if (textNoTarget.ok === false) assert.match(textNoTarget.output, /--text/);
  // text CSS 容器缺 --text
  const textNoText = parseWaitArgs({ kind: 'text', selector: '#list' });
  assert.equal(textNoText.ok, false);
  if (textNoText.ok === false) assert.match(textNoText.output, /--text/);
});

test('parseWaitArgs: 非法定位（role=/坏 CSS）→ 可读错误 + 语法指引（EC-002，不静默当 CSS）', () => {
  const role = parseWaitArgs({ kind: 'element', selector: 'role=button' });
  assert.equal(role.ok, false);
  if (role.ok === false) {
    assert.match(role.output, /role= 定位暂不支持/);
    assert.match(role.output, /interactives/);
  }
  const badCss = parseWaitArgs({ kind: 'element', selector: 'button[' });
  assert.equal(badCss.ok, false);
  if (badCss.ok === false) {
    assert.match(badCss.output, /selector 非法/);
    assert.match(badCss.output, /CSS|语法/);
  }
  const badText = parseWaitArgs({ kind: 'text', text: 'text=' });
  assert.equal(badText.ok, false);
  if (badText.ok === false) assert.match(badText.output, /text= 前缀但语法非法/);
});

test('parseWaitArgs: mode/timeout/interval 非法参数 → 可读错误', () => {
  const badMode = parseWaitArgs({ kind: 'element', selector: '#x', mode: 'some' });
  assert.equal(badMode.ok, false);
  if (badMode.ok === false) assert.match(badMode.output, /--mode 需为 any/);
  const badTimeout = parseWaitArgs({ kind: 'element', selector: '#x', timeout: 'abc' });
  assert.equal(badTimeout.ok, false);
  if (badTimeout.ok === false) assert.match(badTimeout.output, /--timeout 需为非负毫秒数/);
  const negTimeout = parseWaitArgs({ kind: 'element', selector: '#x', timeout: '-1' });
  assert.equal(negTimeout.ok, false);
  const badInterval = parseWaitArgs({ kind: 'element', selector: '#x', interval: '0' });
  assert.equal(badInterval.ok, false);
  if (badInterval.ok === false) assert.match(badInterval.output, /--interval 需为正毫秒数/);
  const negInterval = parseWaitArgs({ kind: 'element', selector: '#x', interval: '-50' });
  assert.equal(negInterval.ok, false);
});

test('parseWaitArgs: kind 与 conditions 二选一 + conditions JSON 形态错误', () => {
  const dual = parseWaitArgs({ kind: 'element', selector: '#x', conditions: '[]' });
  assert.equal(dual.ok, false);
  if (dual.ok === false) assert.match(dual.output, /只能二选一/);
  const notJson = parseWaitArgs({ conditions: '[{' });
  assert.equal(notJson.ok, false);
  if (notJson.ok === false) assert.match(notJson.output, /JSON 数组字符串/);
  const notArray = parseWaitArgs({ conditions: '{"kind":"element"}' });
  assert.equal(notArray.ok, false);
  if (notArray.ok === false) assert.match(notArray.output, /非空 JSON 数组/);
  const emptyArr = parseWaitArgs({ conditions: '[]' });
  assert.equal(emptyArr.ok, false);
  if (emptyArr.ok === false) assert.match(emptyArr.output, /非空 JSON 数组/);
  const notObject = parseWaitArgs({ conditions: JSON.stringify(['x']) });
  assert.equal(notObject.ok, false);
  if (notObject.ok === false) assert.match(notObject.output, /第 1 项不是条件对象/);
  const badItemKind = parseWaitArgs({ conditions: JSON.stringify([{ kind: 'fly', selector: '#x' }]) });
  assert.equal(badItemKind.ok, false);
  if (badItemKind.ok === false) assert.match(badItemKind.output, /--conditions 第 1 项/);
  const badItemSel = parseWaitArgs({ conditions: JSON.stringify([{ kind: 'element' }]) });
  assert.equal(badItemSel.ok, false);
  if (badItemSel.ok === false) assert.match(badItemSel.output, /--conditions 第 1 项/);
});

// ================= 执行器（executeWaitTool） =================

test('executeWaitTool: 命中透传 ops 状态摘要 + 单次委托零空转（NFR-007）', async () => {
  const { ops, calls } = makeOps(async (opts) => ({
    ok: true,
    output: `✓ 等待命中：${opts.conditions.map((c) => `${c.kind}(${c.selector ?? c.text ?? ''})`).join(' / ')}，匹配数 1`,
  }));
  const t0 = Date.now();
  const r = await executeWaitTool(ops, { kind: 'element', selector: '#toast', timeout: '30000', interval: '200' });
  const elapsed = Date.now() - t0;
  assert.equal(r.ok, true);
  assert.ok(r.output.includes('#toast'));
  assert.equal(calls.length, 1); // 单次委托：工具自身不做忙等轮询（引擎在 ops.waitFor 内，ADR-005）
  assert.ok(elapsed < 1000, `工具层零固定延时（elapsed=${elapsed}ms）—— 委托立即完成，无自身 interval 空转`);
  // 选项透传（timeout/interval 解析正确）
  assert.equal(calls[0].timeout, 30000);
  assert.equal(calls[0].interval, 200);
});

test('executeWaitTool: 超时 ok:false + 最后观察状态摘要透传，不中断会话', async () => {
  const lastState =
    '⏱ 等待超时（5000ms）：element(#x) 未出现（匹配数 0）；gone(#spinner) 已满足（匹配数 0）；text=加载完成 未出现；最近一次观测 t=5000ms';
  const { ops } = makeOps(async () => ({ ok: false, output: lastState, error: 'timeout' }));
  const r = await executeWaitTool(ops, { kind: 'element', selector: '#x', timeout: '5000' });
  assert.equal(r.ok, false); // 超时 = ok:false 可读返回（会话不中断，非抛异常）
  assert.equal(r.output, lastState); // 最后观察状态摘要完整透传
  assert.equal(r.error, 'timeout');
});

test('executeWaitTool: ops.waitFor ok:false 且 output 空 → 超时兜底文案（仍可读）', async () => {
  const { ops } = makeOps(async () => ({ ok: false, output: '' }));
  const r = await executeWaitTool(ops, { kind: 'gone', selector: '#spinner', timeout: '3000' });
  assert.equal(r.ok, false);
  assert.match(r.output, /3000ms/);
});

test('executeWaitTool: waitFor 未注入 → 「未注入」可读错误（FR-002 additive 契约）', async () => {
  const r = await executeWaitTool(undefined, { kind: 'element', selector: '#x' });
  assert.equal(r.ok, false);
  assert.match(r.output, /未注入/);
  assert.match(r.output, /sleep/); // 语义区分提示
  // 有 ops 但 waitFor 方法缺失
  const bare = makeOps();
  delete (bare.ops as Partial<PlatformDomOps>).waitFor;
  const r2 = await executeWaitTool(bare.ops, { kind: 'element', selector: '#x' });
  assert.equal(r2.ok, false);
  if (r2.ok === false) assert.match(r2.output, /未注入/);
});

test('executeWaitTool: ops.waitFor 抛授权异常 → 转译可读错误（FR-009/EC-003）', async () => {
  const boom = new Error('条件等待权限被拒');
  boom.name = 'NotAllowedError';
  const { ops } = makeOps(async () => {
    throw boom;
  });
  const r = await executeWaitTool(ops, { kind: 'element', selector: '#x' });
  assert.equal(r.ok, false);
  assert.match(r.output, /条件等待/);
  assert.ok(r.error?.includes('条件等待 failed'));
});

test('executeWaitTool: 解析失败直接返回可读错误（ops.waitFor 不被调用）', async () => {
  const { ops, calls } = makeOps();
  const r = await executeWaitTool(ops, { kind: 'element' }); // 缺 selector
  assert.equal(r.ok, false);
  assert.match(r.output, /--selector/);
  assert.equal(calls.length, 0);
});

// ================= ToolEntry / 门禁语义 / sleep 并存 =================

test('createWaitToolEntry: 元数据 risk read / group ui / schema 参数面', async () => {
  const { ops } = makeOps();
  const entry = createWaitToolEntry(waitEnv(ops));
  assert.equal(entry.name, 'wait');
  assert.equal(entry.risk, 'read'); // 只读观察 → PRM 缺省 allow
  assert.equal(entry.group, 'ui');
  const params = entry.schema.parameters as { properties: { args: { properties: Record<string, unknown> } } };
  const props = params.properties.args.properties;
  const kinds = (props.kind as { enum?: string[] }).enum ?? [];
  assert.deepEqual(kinds, [...WAIT_KINDS]);
  assert.ok(props.selector);
  assert.ok(props.text);
  assert.ok(props.mode);
  assert.ok(props.timeout);
  assert.ok(props.interval);
  assert.ok(props.conditions);
  // 单条件直接 executor 可调（dispatch 形态：name=wait, subcommand=''）
  const r = await entry.executor({ subcommand: '', args: { kind: 'element', selector: '#x' } }, {});
  assert.equal(r.ok, true);
});

test('wait: 只读 risk read 缺省 allow 免 ask（risk:ui ask 规则不命中，IMP-4 修复语义）', async () => {
  const { ops, calls } = makeOps();
  const asked: string[] = [];
  const router = createCommandRouter({
    builtins: false,
    policy: {
      rules: [{ risk: 'ui', action: 'ask', note: 'UI 写默认 ask' }],
      onAsk: async (q) => {
        asked.push(q.subcommand ?? '');
        return { action: 'allow' };
      },
    },
  });
  router.register(createWaitToolEntry(waitEnv(ops)));
  const r = await router.dispatch(tc('wait', { kind: 'element', selector: '#toast' }));
  assert.equal(r.ok, true);
  assert.equal(asked.length, 0); // read → 缺省 allow，不触发 ask
  assert.equal(calls.length, 1);
  // riskDefaults 显示声明 read:deny 时（场景收紧）→ deny 且执行器不被调用
  const { ops: ops2, calls: calls2 } = makeOps();
  const deny = createCommandRouter({
    builtins: false,
    policy: { riskDefaults: { read: 'deny' }, onAsk: async () => ({ action: 'allow' }) },
  });
  deny.register(createWaitToolEntry(waitEnv(ops2)));
  const rd = await deny.dispatch(tc('wait', { kind: 'element', selector: '#x' }));
  assert.equal(rd.ok, false);
  assert.equal(calls2.length, 0);
});

test('wait: deny 规则拦截 → 执行器不被调用（门禁先于执行）', async () => {
  const { ops, calls } = makeOps();
  const router = createCommandRouter({ builtins: false, policy: { rules: [{ pattern: 'wait', action: 'deny' }] } });
  router.register(createWaitToolEntry(waitEnv(ops)));
  const r = await router.dispatch(tc('wait', { kind: 'element', selector: '#x' }));
  assert.equal(r.ok, false);
  assert.match(r.output, /权限被拒/);
  assert.equal(calls.length, 0);
});

test('wait 与 sleep 并存零回归：独立工具名/语义 + sleep 模块行为不动', () => {
  // wait 与 sleep 是两个独立顶层工具（sleep.ts 零改动断言 = sleep 行为照旧 + 全量套件绿）
  const sleepParse = parseSleepCommand('sleep --ms 5');
  assert.deepEqual(sleepParse, { ok: true, kind: 'sleep', ms: 5 });
  assert.equal(SLEEP_TOOL.function.name, 'sleep');
  // wait 工具帮助面显式区分二者语义（FR-025：wait=条件驱动 / sleep=固定延时）
  const help = waitHelp();
  assert.match(help, /与 sleep 固定延时语义区分/);
  assert.match(help, /sleep = 固定延时/);
  assert.match(help, /MutationObserver/);
  assert.match(help, /轮询/);
  assert.match(help, /最后观察状态/);
  // wait 只读声明（help 面 risk read）
  assert.match(help, /只读观察（risk:read）/);
});

// ================= ADR-005 引擎契约占位断言（platform-dom TASK-004 真实现由 validate V13 承接） =================
// 说明：真实双通道引擎（MutationObserver + 轮询 + 统一超时含最后状态）归属 platform-dom.ts 的
// ops.waitFor（TASK-004），本测试以「ADR-005 语义契约」注入最小引擎占位 —— 验证 wait 工具把
// interval/timeout 原样传入且等待有界（NFR-007：命中即止不空转、超时即止返回最后状态）。

async function adr005EngineStandIn(
  opts: PlatformWaitForOptions,
  world: { itemPresent: boolean },
  ticks: () => void,
): Promise<{ ok: boolean; output: string }> {
  const interval = opts.interval ?? WAIT_INTERVAL_DEFAULT_MS;
  const timeout = opts.timeout ?? WAIT_TIMEOUT_DEFAULT_MS;
  const deadline = Date.now() + timeout;
  const label = opts.conditions.map((c) => `${c.kind}(${c.selector ?? c.text ?? ''})`).join(' / ');
  // 统一超时：每轮（观察者通知或轮询节拍）重判；命中即返；到点返回最后状态
  for (;;) {
    ticks();
    const met =
      opts.mode === 'all'
        ? opts.conditions.every((c) => (c.kind === 'gone' ? !world.itemPresent : world.itemPresent))
        : opts.conditions.some((c) => (c.kind === 'gone' ? !world.itemPresent : world.itemPresent));
    if (met) return { ok: true, output: `✓ 等待命中（${label}，t≈${Date.now() - (deadline - timeout)}ms）` };
    if (Date.now() >= deadline) {
      return {
        ok: false,
        output: `⏱ 等待超时（${timeout}ms）：${label} —— 最后观察状态 itemPresent=${world.itemPresent}`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

test('ADR-005 契约：interval/timeout 透传 + 命中即止 + 超时返回最后状态（NFR-007 有界无空转）', async () => {
  // 命中路径：条件初始已满足 → 引擎首检即返（1 tick，零多余轮询）
  const world = { itemPresent: true };
  let ticks = 0;
  const hit = await adr005EngineStandIn(
    { conditions: [{ kind: 'element', selector: '#toast' }], mode: 'any', timeout: 2000, interval: 100 },
    world,
    () => ticks++,
  );
  assert.equal(hit.ok, true);
  assert.equal(ticks, 1);

  // 超时路径：条件从不满足 → 统一超时中止，轮询次数有界 ≈ timeout/interval，返回最后状态
  const never = { itemPresent: false };
  let ticks2 = 0;
  const t0 = Date.now();
  const timeoutRes = await adr005EngineStandIn(
    { conditions: [{ kind: 'element', selector: '#ghost' }], mode: 'any', timeout: 120, interval: 40 },
    never,
    () => ticks2++,
  );
  const elapsed = Date.now() - t0;
  assert.equal(timeoutRes.ok, false);
  assert.match(timeoutRes.output, /最后观察状态 itemPresent=false/);
  assert.ok(ticks2 >= 2 && ticks2 <= 6, `轮询有界（ticks=${ticks2}，≈120/40）`);
  assert.ok(elapsed >= 120, `超时中止（elapsed=${elapsed}ms）`);

  // 工具层把 interval/timeout 原样交给引擎（executor 单次委托 = 透传已由上方用例断言）
  const { ops, calls } = makeOps(async (o) =>
    adr005EngineStandIn(o, { itemPresent: true }, () => {}),
  );
  const r = await executeWaitTool(ops, { kind: 'element', selector: '#toast', timeout: '2000', interval: '100' });
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].timeout, 2000);
  assert.equal(calls[0].interval, 100);
});
