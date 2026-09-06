import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createChromeToolEntry,
  chromeHelp,
  executeChromeTool,
  CHROME_SUBCOMMANDS,
  SCREENSHOT_DATAURL_HEAD_BUDGET,
  parsePngSizeFromDataUrl,
  summarizeScreenshotData,
  screenshotFilename,
} from './chrome-tools.js';
import type { ChromeSubcommand } from './chrome-tools.js';
import type { PlatformDomOps, PlatformEnv, PlatformFilePicker, PlatformScreenshotOptions } from './platform.js';
import { nodeEnv } from './platform.js';
import { createCommandRouter } from './router.js';
import type { ToolResult } from './router.js';
import type { WebCliToolCall } from './llm.js';

/** 构造带指定 name 的错误（走 classifyCapabilityError 分类面，EC-008）。 */
function namedErr(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

/**
 * PNG 外观二进制 dataURL（测试夹具）：
 * 真实 PNG 签名 + IHDR chunk（宽/高）+ 填充字节 —— 解析面只读前 24 字节（尺寸），
 * 后续填充仅供字节长度/头段截断断言，无需合法 IDAT/CRC。
 */
function pngDataUrl(width: number, height: number, extraBytes = 0): string {
  const bytes: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  bytes.push(0, 0, 0, 13); // IHDR 数据长度
  for (const ch of 'IHDR') bytes.push(ch.charCodeAt(0));
  bytes.push((width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff);
  bytes.push((height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff);
  bytes.push(8, 2, 0, 0, 0); // bitDepth=8 / colorType=2 / compression / filter / interlace
  bytes.push(0, 0, 0, 0); // CRC 占位（不校验）
  for (let i = 0; i < extraBytes; i++) bytes.push(i % 251);
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

/** chrome ops 注入桩：记录各方法调用；chrome 5 方法齐备（over 可覆写注入失败/异常面）。 */
function makeChromeOps(over: Partial<PlatformDomOps> = {}): { ops: PlatformDomOps; calls: string[]; shot: PlatformScreenshotOptions[] } {
  const calls: string[] = [];
  const shot: PlatformScreenshotOptions[] = [];
  const ops = {
    printPage: async () => {
      calls.push('print');
      return { ok: true, output: '✓ 已触发打印（window.print）' };
    },
    historyNav: async (delta: number) => {
      calls.push(`historyNav:${delta}`);
      return { ok: true, output: `✓ 已执行会话内历史导航 delta=${delta}` };
    },
    reloadPage: async () => {
      calls.push('reload');
      return { ok: true, output: '✓ 已触发页面刷新' };
    },
    screenshot: async (opts?: PlatformScreenshotOptions) => {
      calls.push('screenshot');
      shot.push(opts ?? { mode: 'viewport' });
      return { ok: true, output: '✓ 截图序列化完成', dataUrl: pngDataUrl(2, 3) };
    },
    ...over,
  } as unknown as PlatformDomOps;
  return { ops, calls, shot };
}

/** 记录型下载链 picker（screenshot 落盘断言）。 */
function makePicker(): { fp: PlatformFilePicker; downloads: Array<{ filename: string; data: string }> } {
  const downloads: Array<{ filename: string; data: string }> = [];
  const fp: PlatformFilePicker = {
    async save() {
      throw namedErr('NotAllowedError', 'save 未注入');
    },
    async download(opts: { filename: string; data: string | Blob }) {
      downloads.push({ filename: opts.filename, data: typeof opts.data === 'string' ? opts.data : '[blob]' });
    },
  };
  return { fp, downloads };
}

/** env 构造：nodeEnv + chrome ops + 可选 filePicker（缺省 nodeEnv 桩 = download NotFoundError 降级面）。 */
function chromeEnv(ops: PlatformDomOps, fp?: PlatformFilePicker): PlatformEnv {
  const base = { ...nodeEnv(), dom: { ops, state: { snapshot: async () => ({ injected: true }) } } };
  if (fp) base.filePicker = fp;
  if (fp === undefined) delete base.filePicker; // 显式无下载链（deliverScreenshot 未注入降级面）
  return base;
}

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** entry.executor 快捷（不经 router；executor 面边界测试用）。 */
async function exec(entry: ReturnType<typeof createChromeToolEntry>, subcommand: string, args: Record<string, string> = {}): Promise<ToolResult> {
  return entry.executor({ subcommand, args }, {});
}

// ================= 元数据 / schema / help =================

test('chrome: 元数据面 — 5 子命令 + subcommandRisks（print/back/forward=ui、reload/screenshot=write）+ schema enum + help 公开', () => {
  const { ops } = makeChromeOps();
  const entry = createChromeToolEntry(chromeEnv(ops));
  assert.equal(entry.name, 'chrome');
  assert.equal(entry.summary?.includes('print/back/forward/reload/screenshot'), true);
  assert.equal(entry.risk, 'ui'); // 回退面（dom 同构；5 子命令全部由 subcommandRisks 覆盖）
  assert.equal(entry.group, 'chrome');
  // plan §2.3.3：PRM 按子命令裁决的单一数据源
  assert.deepEqual(entry.subcommandRisks, {
    print: 'ui',
    back: 'ui',
    forward: 'ui',
    reload: 'write',
    screenshot: 'write',
  } satisfies Record<ChromeSubcommand, string>);
  // schema subcommand.enum 与 CHROME_SUBCOMMANDS 单一数据源同步
  const schema = entry.schema.parameters as {
    properties: { subcommand: { enum?: string[] }; args: { properties: Record<string, { description: string }> } };
  };
  assert.deepEqual(schema.properties.subcommand.enum, CHROME_SUBCOMMANDS);
  // 参数面（format/selector/include-dataurl 等，验收点）
  const props = schema.properties.args.properties;
  assert.ok(props.format);
  assert.ok(props.mode);
  assert.ok(props.selector);
  assert.ok(props.width);
  assert.ok(props.height);
  assert.ok(props['include-dataurl']);
  // 派生三链一致（注册 → deriveTools 含 chrome）
  const router = createCommandRouter({ builtins: false });
  router.register(entry);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['chrome']);
  assert.ok(router.helpFor('chrome')?.includes('浏览器外壳操作'));
});

test('chrome: help 面 — 打印用户侧确认 / reload 破坏性恢复提示（EC-009）/ 截图近似度 + 整页 out（ADR-003）/ back·forward 场景规则面', () => {
  const help = chromeHelp();
  assert.match(help, /window\.print/);
  assert.match(help, /打印对话框由用户侧确认|用户侧确认/);
  assert.match(help, /打印为 PDF 需 CDP|打印为 PDF/);
  assert.match(help, /reload 为破坏性操作|破坏性/);
  assert.match(help, /read-state|恢复会话/);
  assert.match(help, /EC-009/);
  assert.match(help, /back \/ forward|back \/ forward/);
  assert.match(help, /会话内|history/);
  assert.match(help, /场景规则可 allow 免 ask|规则/);
  assert.match(help, /近似|foreignObject|不保真/);
  assert.match(help, /ADR-003/);
  assert.match(help, /整页|fullpage/);
  assert.match(help, /F-14|CDP/);
  assert.match(help, /include-dataurl/);
  assert.match(help, /下载链|不进 AI 上下文|不进上下文/);
});

// ================= executor：fake ops 各子命令（print/back/forward/reload） =================

test('chrome: fake ops 注入 — print/back/forward/reload 调用透传 + reload 恢复提示兜底（EC-009）', async () => {
  const { ops, calls } = makeChromeOps();
  const entry = createChromeToolEntry(chromeEnv(ops, makePicker().fp));
  // print：默认触发打印对话框（window.print；输出透传 ops）
  const p = await exec(entry, 'print');
  assert.equal(p.ok, true);
  assert.match(p.output, /已触发打印/);
  // print --format pdf → 不支持 + F-14/CDP 归属（FR-026 out），且 ops 未被调用
  const pdf = await exec(entry, 'print', { format: 'pdf' });
  assert.equal(pdf.ok, false);
  assert.match(pdf.output, /print --format "pdf" 不支持|不支持/);
  assert.match(pdf.output, /F-14|CDP/);
  assert.equal(calls.length, 1); // 只有上面 print 一次（pdf 未触碰 ops）
  // back/forward：会话内 history 导航 delta=-1/+1
  const b = await exec(entry, 'back');
  assert.equal(b.ok, true);
  const f = await exec(entry, 'forward');
  assert.equal(f.ok, true);
  assert.deepEqual(calls.slice(1), ['historyNav:-1', 'historyNav:1']);
  // reload：fake ops 输出未含恢复指引 → 执行器补 EC-009 恢复提示（AI 可自愈路径）
  const r = await exec(entry, 'reload');
  assert.equal(r.ok, true);
  assert.match(r.output, /已触发页面刷新/);
  assert.match(r.output, /重新 read-state|恢复会话/);
  assert.match(r.output, /EC-009/);
  // reload：ops 输出已含恢复提示 → 执行器不重复追加（EC-009 提示保持单份）
  const { ops: ops2 } = makeChromeOps({
    reloadPage: async () => ({ ok: true, output: '✓ 已刷新（重载后请重新 read-state/恢复会话上下文，EC-009）' }),
  });
  const entry2 = createChromeToolEntry(chromeEnv(ops2));
  const r2 = await exec(entry2, 'reload');
  assert.equal(r2.ok, true);
  assert.equal((r2.output.match(/EC-009/g) ?? []).length, 1);
  assert.equal(r2.output.includes('已触发页面刷新'), false); // ops 原句透传（未被拼接污染）
});

// ================= executor：错误面（未知子命令 / 未注入 / 缺参） =================

test('chrome: 未知子命令 / 操作面未注入 / 子能力未注入 → 可读错误（不崩溃）', async () => {
  const { ops, calls } = makeChromeOps();
  const entry = createChromeToolEntry(chromeEnv(ops));
  const unk = await exec(entry, 'bookmark');
  assert.equal(unk.ok, false);
  assert.match(unk.output, /未知子命令 "bookmark"/);
  assert.match(unk.output, /print\/back\/forward\/reload\/screenshot/);
  assert.equal(unk.error, 'unknown subcommand');
  assert.equal(calls.length, 0);
  // 整面未注入（env.dom.ops 缺省）
  const bare = createChromeToolEntry({ ...nodeEnv(), dom: undefined });
  const noOps = await exec(bare, 'print');
  assert.equal(noOps.ok, false);
  assert.match(noOps.output, /操作面未注入/);
  // 子能力未注入：仅有 v2 7 方法（无 chrome 5 可选方法）→ 逐子命令「未注入」可读错误
  const v2ops = { ...nodeEnv().dom?.ops } as unknown as PlatformDomOps; // readState~snapshot 7 桩
  const entry7 = createChromeToolEntry(chromeEnv(v2ops));
  for (const sub of CHROME_SUBCOMMANDS) {
    const args = sub === 'screenshot' ? { mode: 'element', selector: '#a' } : {};
    const r = await exec(entry7, sub, args);
    assert.equal(r.ok, false, `${sub} 应返回未注入错误`);
    assert.match(r.output, /未注入/);
  }
});

// ================= executor：screenshot 参数解析 / 整页 out =================

test('chrome: screenshot 视口/元素级参数解析透传 + 整页 out（F-14/CDP）+ 缺参/非法参数', async () => {
  const { ops, shot, calls } = makeChromeOps();
  const entry = createChromeToolEntry(chromeEnv(ops, makePicker().fp));
  // 视口级缺省：mode=viewport 透传（无多余键）
  const v = await exec(entry, 'screenshot');
  assert.equal(v.ok, true);
  assert.deepEqual(shot[0], { mode: 'viewport' });
  // 元素级：selector 透传 + width/height 整数解析
  const el = await exec(entry, 'screenshot', { mode: 'element', selector: '#hero', width: '600', height: '400' });
  assert.equal(el.ok, true);
  assert.deepEqual(shot[1], { mode: 'element', selector: '#hero', width: 600, height: 400 });
  // 元素级缺 selector → 可读错误（未触碰 ops）
  const noSel = await exec(entry, 'screenshot', { mode: 'element' });
  assert.equal(noSel.ok, false);
  assert.match(noSel.output, /mode=element 缺少 --selector/);
  assert.equal(calls.length, 2); // 上面两次成功
  // width/height 非法值 → 可读错误
  const badW = await exec(entry, 'screenshot', { width: 'abc' });
  assert.equal(badW.ok, false);
  assert.match(badW.output, /--width 需为非负整数|--width 需 ≥ 1/);
  // mode 非法值 → 可读错误 + 合法值指引
  const badMode = await exec(entry, 'screenshot', { mode: 'bogus' });
  assert.equal(badMode.ok, false);
  assert.match(badMode.output, /--mode 需为 viewport\/element\/fullpage/);
  // 整页级 → 执行器面先行「不支持 + F-14/CDP 归属」说明，ops.screenshot 不被调用（FR-028 out）
  const full = await exec(entry, 'screenshot', { mode: 'fullpage' });
  assert.equal(full.ok, false);
  assert.match(full.output, /整页级截图不支持/);
  assert.match(full.output, /F-14|CDP/);
  assert.equal(full.error, 'fullpage unsupported');
  assert.equal(calls.length, 2); // fullpage 短路，ops 未被调用
});

// ================= screenshot 输出策略（ADR-003/P-03）：摘要 + 下载链 =================

test('chrome: screenshot 默认输出 {尺寸/字节/文件名} 摘要 + 自动下载链 + dataURL 不进上下文', async () => {
  const { ops } = makeChromeOps();
  const { fp, downloads } = makePicker();
  const entry = createChromeToolEntry(chromeEnv(ops, fp));
  const r = await exec(entry, 'screenshot');
  assert.equal(r.ok, true);
  // 摘要面：尺寸（PNG 头段解析 2×3）+ 字节 + 文件名
  assert.match(r.output, /尺寸: 2×3px/);
  assert.match(r.output, /字节: \d+ B/);
  assert.match(r.output, /文件名: screenshot-viewport-\d{8}-\d{6}\.png/);
  // 下载链：已自动触发（env.filePicker.download 降级锚点），data 与 ops dataUrl 一致
  assert.match(r.output, /已自动触发下载链/);
  assert.match(r.output, /未进上下文/); // P-03 默认：dataURL 不整段进上下文
  assert.match(r.output, /近似度声明|不保真/); // ADR-003 近似度局限公开
  const dataUrl = pngDataUrl(2, 3);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].data, dataUrl);
  assert.match(downloads[0].filename, /^screenshot-viewport-\d{8}-\d{6}\.png$/);
  assert.equal(r.output.includes(dataUrl), false, '完整 dataURL 不得进 output（AC-012）');
});

test('chrome: screenshot --include-dataurl true — 预算内头段 + 截断标记；小 dataUrl 全量头段', async () => {
  const { ops } = makeChromeOps({
    screenshot: async () => ({ ok: true, output: '✓ 截图序列化完成', dataUrl: pngDataUrl(2, 3, 1000) }),
  });
  const { fp, downloads } = makePicker();
  const entry = createChromeToolEntry(chromeEnv(ops, fp));
  const big = pngDataUrl(2, 3, 1000);
  const r = await exec(entry, 'screenshot', { 'include-dataurl': 'true' });
  assert.equal(r.ok, true);
  // 预算内头段 + 截断标记（P-03/AC-012）
  assert.match(r.output, /dataURL 头段/);
  assert.match(r.output, /截断/);
  assert.match(r.output, new RegExp(`共 ${big.length} 字符`));
  assert.ok(r.output.includes(big.slice(0, SCREENSHOT_DATAURL_HEAD_BUDGET)));
  assert.equal(r.output.includes(big), false); // 头段截断，完整 dataURL 仍不进上下文
  assert.equal(downloads.length, 1); // include-dataurl 不改变下载链默认
  // 小 dataURL（预算内）：头段 = 全量，无截断标记
  const { ops: ops2 } = makeChromeOps();
  const { fp: fp2 } = makePicker();
  const entry2 = createChromeToolEntry(chromeEnv(ops2, fp2));
  const small = pngDataUrl(2, 3);
  const r2 = await exec(entry2, 'screenshot', { 'include-dataurl': 'true' });
  assert.equal(r2.ok, true);
  assert.match(r2.output, /dataURL 头段/);
  assert.ok(r2.output.includes(small));
  assert.equal(/截断/.test(r2.output), false);
});

test('chrome: screenshot 下载链降级 — filePicker 未注入 / download 授权拒绝 → 可读 ok:false 不静默丢数据（EC-012/EC-008）', async () => {
  // ① 无 filePicker → 「未注入」可读降级
  const { ops, shot } = makeChromeOps();
  const entryNoFp = createChromeToolEntry(chromeEnv(ops));
  const noFp = await exec(entryNoFp, 'screenshot');
  assert.equal(noFp.ok, false);
  assert.match(noFp.output, /未落盘/);
  assert.match(noFp.output, /未注入/);
  assert.match(noFp.output, /尺寸: 2×3px|2×3px/); // 摘要仍回（数据不静默丢）
  assert.equal(noFp.error, 'screenshot not persisted (download chain unavailable)');
  assert.equal(shot.length, 1); // ops 已执行（截图本体成功，落盘失败）
  // ② download 抛 NotAllowedError → 授权转译可读（EC-008）
  const fpDeny: PlatformFilePicker = {
    async save() {
      return { ok: false, canceled: true };
    },
    async download() {
      throw namedErr('NotAllowedError', '用户拒绝下载');
    },
  };
  const entryDeny = createChromeToolEntry(chromeEnv(makeChromeOps().ops, fpDeny));
  const denied = await exec(entryDeny, 'screenshot');
  assert.equal(denied.ok, false);
  assert.match(denied.output, /未落盘/);
  assert.match(denied.output, /授权被拒绝|不允许/);
});

// ================= 授权两路转译（EC-008）：ops 抛授权异常 → 可读 + 会话不中断 =================

test('chrome: 授权两路转译（EC-008）— print 授权拒绝 / screenshot SecurityError / reload NotFound → 可读 + 会话不中断', async () => {
  // print：NotAllowedError（打印授权/受限环境）→ 可读转译；后续 back 正常执行 = 会话不中断
  const { ops: opsPrint } = makeChromeOps({
    printPage: async () => {
      throw namedErr('NotAllowedError', '打印被用户拒绝');
    },
  });
  const entryP = createChromeToolEntry(chromeEnv(opsPrint, makePicker().fp));
  const p = await exec(entryP, 'print');
  assert.equal(p.ok, false);
  assert.match(p.output, /打印/);
  assert.match(p.output, /授权被拒绝|不可用/);
  assert.ok(p.error?.startsWith('打印 failed'));
  const after = await exec(entryP, 'back');
  assert.equal(after.ok, true); // 会话不中断（EC-008）
  // screenshot：SecurityError（CSP/跨源样式读取/canvas taint）→ 安全上下文转译
  const { ops: opsShot } = makeChromeOps({
    screenshot: async () => {
      throw namedErr('SecurityError', 'canvas tainted by cross-origin styles');
    },
  });
  const entryS = createChromeToolEntry(chromeEnv(opsShot, makePicker().fp));
  const s = await exec(entryS, 'screenshot');
  assert.equal(s.ok, false);
  assert.match(s.output, /安全上下文|不可用/);
  // reload：NotFoundError → 转译可读（页面存活语义）
  const { ops: opsReload } = makeChromeOps({
    reloadPage: async () => {
      throw namedErr('NotFoundError', 'window.location.reload 不可用');
    },
  });
  const entryR = createChromeToolEntry(chromeEnv(opsReload));
  const r = await exec(entryR, 'reload');
  assert.equal(r.ok, false);
  assert.match(r.output, /不可用/);
});

// ================= dispatch 级：reload deny 间谍 + back 免 ask 规则面（EC-009/ADR-001） =================

test('chrome: dispatch — reload deny 后执行器（ops.reloadPage）不调用（间谍；EC-014 deny 优先）', async () => {
  const { ops, calls } = makeChromeOps();
  const router = createCommandRouter({
    builtins: false,
    policy: { rules: [{ risk: 'write', action: 'deny', note: '写类子命令禁用（reload/screenshot 破坏性）' }] },
  });
  router.register(createChromeToolEntry(chromeEnv(ops, makePicker().fp)));
  const r = await router.dispatch(tc('chrome', {}, 'reload'));
  assert.equal(r.ok, false);
  assert.match(r.output, /权限被拒/);
  assert.equal(calls.length, 0); // 间谍断言：deny 时 ops.reloadPage 未被调用
  // screenshot 同为 write 档 → 同 deny（规则面一致）
  const s = await router.dispatch(tc('chrome', {}, 'screenshot'));
  assert.equal(s.ok, false);
  assert.equal(calls.length, 0);
});

test('chrome: dispatch — back/forward 免 ask 规则面（allow 规则前置 → 零 ask 放行；无规则 → 缺省 ask 裁决）', async () => {
  const { ops, calls } = makeChromeOps();
  const askCalls: Array<{ tool: string; subcommand?: string }> = [];
  // lgdl-web aiPolicy 形态（ADR-001）：chrome back/forward allow 规则前置 + 既有 risk ui ask 规则保持
  const router = createCommandRouter({
    builtins: false,
    policy: {
      rules: [
        { pattern: 'chrome', subcommand: 'back', action: 'allow', note: '会话内后退免 ask（EC-009）' },
        { pattern: 'chrome', subcommand: 'forward', action: 'allow', note: '会话内前进免 ask（EC-009）' },
        { risk: 'ui', action: 'ask', note: 'UI 副作用默认确认' },
      ],
      onAsk: async (q) => {
        askCalls.push({ tool: q.tool, subcommand: q.subcommand });
        return { action: 'allow' };
      },
    },
  });
  router.register(createChromeToolEntry(chromeEnv(ops, makePicker().fp)));
  const b = await router.dispatch(tc('chrome', {}, 'back'));
  assert.equal(b.ok, true);
  const f = await router.dispatch(tc('chrome', {}, 'forward'));
  assert.equal(f.ok, true);
  assert.equal(askCalls.length, 0, 'allow 规则下 back/forward 免 ask（EC-009 场景规则面）');
  assert.deepEqual(calls, ['historyNav:-1', 'historyNav:1']); // 执行器被调用
  // print 仍命中 risk ui ask 规则（前置 allow 只放行 back/forward）→ ask → allow 放行
  const p = await router.dispatch(tc('chrome', {}, 'print'));
  assert.equal(p.ok, true);
  assert.deepEqual(askCalls, [{ tool: 'chrome', subcommand: 'print' }]);
  assert.deepEqual(calls, ['historyNav:-1', 'historyNav:1', 'print']);

  // 无子命令 allow 规则 → back 命中 risk ui ask（缺省/规则 ask）→ onAsk 裁决
  const { ops: ops2, calls: calls2 } = makeChromeOps();
  const ask2: string[] = [];
  const gated = createCommandRouter({
    builtins: false,
    policy: {
      rules: [{ risk: 'ui', action: 'ask', note: 'UI 默认确认' }],
      onAsk: async (q) => {
        ask2.push(q.subcommand ?? '');
        return { action: 'allow' };
      },
    },
  });
  gated.register(createChromeToolEntry(chromeEnv(ops2, makePicker().fp)));
  const b2 = await gated.dispatch(tc('chrome', {}, 'back'));
  assert.equal(b2.ok, true);
  assert.deepEqual(ask2, ['back']); // ask 携带子命令名（FR-044 呈现面）
  assert.deepEqual(calls2, ['historyNav:-1']);
  // onAsk deny → back 拒且执行器不调用（ask 裁决 deny = 权限被拒）
  const { ops: ops3, calls: calls3 } = makeChromeOps();
  const deniedRouter = createCommandRouter({
    builtins: false,
    policy: { rules: [{ risk: 'ui', action: 'ask' }], onAsk: async () => ({ action: 'deny' }) },
  });
  deniedRouter.register(createChromeToolEntry(chromeEnv(ops3)));
  const b3 = await deniedRouter.dispatch(tc('chrome', {}, 'back'));
  assert.equal(b3.ok, false);
  assert.match(b3.output, /权限被拒/);
  assert.equal(calls3.length, 0);
});

// ================= dataUrl 摘要单元 =================

test('chrome: summarizeScreenshotData / parsePngSizeFromDataUrl / screenshotFilename — 摘要面单元', () => {
  const dataUrl = pngDataUrl(2, 3);
  assert.deepEqual(parsePngSizeFromDataUrl(dataUrl), { width: 2, height: 3 });
  // 非 PNG / 头不足 → 尺寸未知（不抛）
  assert.deepEqual(parsePngSizeFromDataUrl('data:image/png;base64,AAAA'), {});
  assert.deepEqual(parsePngSizeFromDataUrl('not-a-dataurl'), {});
  const big = pngDataUrl(8, 8, 1000);
  const s = summarizeScreenshotData(big);
  assert.equal(s.width, 8);
  assert.equal(s.height, 8);
  assert.equal(s.bytes, 8 + 4 + 4 + 13 + 4 + 1000); // sig+IHDR 头 33 字节 + 填充（base64 折算精确）
  assert.equal(s.length, big.length);
  assert.equal(s.head, big.slice(0, SCREENSHOT_DATAURL_HEAD_BUDGET));
  assert.equal(s.truncated, true);
  // 字节折算：base64 长度 ×3/4 − padding（小图无 padding 场景）
  assert.equal(summarizeScreenshotData(pngDataUrl(2, 3)).bytes, 33);
  // 文件名：collect 落盘时间戳命名先例
  assert.equal(screenshotFilename('viewport', new Date(2026, 8, 7, 10, 30, 0)), 'screenshot-viewport-20260907-103000.png');
  assert.equal(screenshotFilename('element', new Date(2026, 8, 7, 10, 30, 0)), 'screenshot-element-20260907-103000.png');
});

// ================= executeChromeTool 直调（env 面；门禁语义不经过 router 的直通验证） =================

test('chrome: executeChromeTool 直调 — env.dom.ops 注入形态 + 未知子命令/ops 缺省可读', async () => {
  const { ops } = makeChromeOps();
  const { fp } = makePicker();
  const env = chromeEnv(ops, fp);
  const r = await executeChromeTool(env, 'back', {});
  assert.equal(r.ok, true);
  assert.match(r.output, /historyNav|-1/);
  const bare = chromeEnv({} as unknown as PlatformDomOps, fp);
  const r2 = await executeChromeTool(bare, 'print', {});
  assert.equal(r2.ok, false);
  assert.match(r2.output, /未注入/);
});
