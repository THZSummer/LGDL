/**
 * chrome-tools.ts —— chrome 浏览器外壳操作子命令族（FR-026~028 / ADR-003，CHR L3）。
 *
 * 生态位（discovery §3.3 L3 / §3.4 边界，作者裁决 S-03/I-03）：页面内可承载的
 * chrome 操作子集 —— print（window.print 触发，打印对话框由用户侧确认）/ back·forward
 * （会话内 history 导航，宿主 SPA 路由内可用）/ reload（**破坏性**：重载宿主页、AI
 * 会话上下文中断 → 默认 ask EC-009）/ screenshot（视口/元素级同源近似截图 FR-028；
 * 整页级 out → captureVisibleTab/CDP = F-14 扩展宿主生态位）。书签/标签页·窗口/跨域
 * 导航/下载历史 = 不可承载 out（NG-002/NG-003，help 显式声明）。
 *
 * 分层（ADR-008）：执行面 = PlatformDomOps（printPage/historyNav/reloadPage/screenshot，
 * TASK-004 浏览器真实现 / fake ops 注入），本模块只做参数解析 / 门禁语义 / dataURL
 * 输出策略（ADR-003），**零 DOM 触碰** —— window/document/history 触碰全收敛
 * platform-dom.ts。
 *
 * 权限（FR-005/ADR-001，修复 IMP-4）：entry 增 `subcommandRisks`（PRM 按子命令裁决
 * 的单一数据源，plan §2.3.3）—— print/back/forward → 'ui'（默认 ask；back/forward
 * 为会话内导航、场景规则可 allow 免 ask，EC-009 落地 = TASK-011 App 规则）；
 * reload/screenshot → 'write'（破坏性/截图落盘副作用，缺省 ask）。entry.risk 保持
 * 'ui'（回退面与 dom 同构，零变化）。
 *
 * 截图输出策略（ADR-003/P-03 默认）：ops.screenshot 成功 → dataUrl 独立字段回填
 * （PlatformDomOpResult.dataUrl，不进 output 大文本）→ 本执行器 ①默认自动触发下载链
 * （env.filePicker.download 降级锚点：未注入/拒绝 → 可读降级不静默丢数据）并返回
 * {尺寸/字节/文件名} 摘要（PNG dataURL 头段解析尺寸 + base64 长度折算字节；dataURL
 * **不整段进上下文**）；②`--include-dataurl true` 才在预算内回带头段 + 截断标记；
 * ③整页级（mode=fullpage）入参 → 「不支持 + F-14/CDP 归属」说明（FR-028 out，
 * 执行器面先行拦截 + ops 面双保险）。CSP/跨源样式读取/canvas taint/序列化失败等
 * 授权能力失败 → translateCapabilityError 转译（EC-008），会话不中断。
 *
 * 本文件零 LGDL/react import（NFR-001）；零新增运行时依赖（NFR-002）。
 */
import type { PlatformDomOps, PlatformDomOpResult, PlatformEnv, PlatformScreenshotOptions } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

/** chrome 子命令（5；plan §2.3.3 CHR 工具面）。 */
export type ChromeSubcommand = 'print' | 'back' | 'forward' | 'reload' | 'screenshot';

/** 5 子命令注册序（schema enum / help / executor 共用单一数据源）。 */
export const CHROME_SUBCOMMANDS: ChromeSubcommand[] = ['print', 'back', 'forward', 'reload', 'screenshot'];

/** 截图 dataURL 头段预算（--include-dataurl true 时 output 回带头段上限字符，P-03/AC-012）。 */
export const SCREENSHOT_DATAURL_HEAD_BUDGET = 400;

/** PNG dataURL 前缀（ops.screenshot 载体 = canvas.toDataURL('image/png')，ADR-003）。 */
const PNG_DATAURL_PREFIX = 'data:image/png;base64,';

// ---------- dataURL 摘要（P-03/ADR-003：尺寸/字节从 dataURL 本体解析，不依赖 ops 文本） ----------

/** 截图 dataURL 摘要（尺寸 = PNG IHDR 头段解析；字节 = base64 长度折算；头段预算内截断标记）。 */
export interface ScreenshotDataSummary {
  /** PNG 宽（头段解析失败 = undefined；尺寸未知时摘要降级）。 */
  width?: number;
  /** PNG 高。 */
  height?: number;
  /** 二进制字节数近似（base64 长度 × 3/4 − padding）。 */
  bytes: number;
  /** dataURL 总长度（字符）。 */
  length: number;
  /** 预算内头段（含 mime 前缀；超预算 = 截断标记）。 */
  head: string;
  /** true = 头段被截断（dataURL 超预算）。 */
  truncated: boolean;
}

/** PNG IHDR 头段尺寸解析（仅解 base64 前 24 字节 = 8 签名 + 4 长度 + 4 "IHDR" + 8 宽高，零全量解码）。 */
export function parsePngSizeFromDataUrl(dataUrl: string): { width?: number; height?: number } {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return {};
  const b64 = dataUrl.slice(comma + 1);
  // 32 个 base64 字符 = 恰好 24 字节（char 边界对齐），覆盖 PNG 签名 + IHDR 宽高字段
  if (b64.length < 32) return {};
  const g = globalThis as Record<string, unknown>;
  const atobFn = typeof g.atob === 'function' ? (g.atob as (s: string) => string) : undefined;
  if (!atobFn) return {};
  let raw: string;
  try {
    raw = atobFn(b64.slice(0, 32));
  } catch {
    return {};
  }
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xff;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== sig[i]) return {};
  }
  if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== 'IHDR') return {};
  const be = (o: number): number => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  const width = be(16);
  const height = be(20);
  if (width === 0 || height === 0 || width > 100000 || height > 100000) return {}; // 非法尺寸护栏
  return { width, height };
}

/** dataURL 摘要：尺寸（PNG 头段）+ 字节（base64 折算）+ 预算内头段。 */
export function summarizeScreenshotData(dataUrl: string): ScreenshotDataSummary {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const bytes = Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
  const { width, height } = parsePngSizeFromDataUrl(dataUrl);
  const truncated = dataUrl.length > SCREENSHOT_DATAURL_HEAD_BUDGET;
  return {
    width,
    height,
    bytes,
    length: dataUrl.length,
    head: truncated ? dataUrl.slice(0, SCREENSHOT_DATAURL_HEAD_BUDGET) : dataUrl,
    truncated,
  };
}

/** 截图自动下载文件名（collect 落盘时间戳命名先例；重复名由浏览器下载去重）。 */
export function screenshotFilename(mode: string, now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `screenshot-${mode}-${stamp}.png`;
}

// ---------- 参数解析（executor 面；EC-002 可读错误 + 指引） ----------

/** 可选非负整型参数（截图 width/height）：缺省/空 → undefined；非法 → 可读错误。 */
function dimArg(args: Record<string, string>, key: string): { n?: number; error?: string } {
  const raw = args[key];
  if (raw === undefined || raw === '') return {};
  if (!/^\d+$/.test(raw)) return { error: `✖ chrome screenshot --${key} 需为非负整数（收到 "${raw}"）` };
  const n = Number(raw);
  if (n < 1) return { error: `✖ chrome screenshot --${key} 需 ≥ 1（收到 "${raw}"）` };
  return { n };
}

// ---------- 结果映射与未注入守卫 ----------

/** op 结果 → ToolResult（ok:false 带 error 透传，会话不中断）。 */
function fromOp(r: PlatformDomOpResult): ToolResult {
  return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
}

/** 子能力未注入守卫返回（FR-002：可选方法缺省 undefined → 可读错误，不崩溃）。 */
function opMissing(method: string): ToolResult {
  return {
    ok: false,
    output: `✖ chrome 该能力在当前环境未注入（env.dom.ops.${method} 缺省）—— 浏览器外壳操作仅在浏览器场景可用；写类子命令（reload/screenshot）受权限门禁（PRM）约束`,
    error: `chrome ops ${method} not injected`,
  };
}

/** historyNav 子命令（back/forward 共用；EC-009：会话内导航，场景规则可免 ask）。 */
async function runHistoryNav(ops: PlatformDomOps, delta: number): Promise<ToolResult> {
  if (typeof ops.historyNav !== 'function') return opMissing('historyNav');
  let r: PlatformDomOpResult;
  try {
    r = await ops.historyNav(delta);
  } catch (err) {
    const t = translateCapabilityError(err, '历史导航');
    return { ok: false, output: t.output, error: t.error };
  }
  return fromOp(r);
}

/**
 * screenshot 输出策略（ADR-003/P-03 默认）：
 *   ops.ok + dataUrl → ①自动触发下载链（env.filePicker.download 降级锚点）
 *   ②返回 {尺寸/字节/文件名} 摘要（dataURL 不整段进上下文）
 *   ③--include-dataurl true 预算内回带头段 + 截断标记
 *   下载链不可用/拒绝 → 可读降级（ok:false + 尺寸/字节摘要 + dataURL 长度；不静默丢数据）。
 */
async function deliverScreenshot(
  env: PlatformEnv,
  r: PlatformDomOpResult,
  mode: string,
  includeDataUrl: boolean,
): Promise<ToolResult> {
  const dataUrl = r.dataUrl ?? '';
  const info = summarizeScreenshotData(dataUrl);
  const kb = info.bytes > 0 ? Math.max(1, Math.round(info.bytes / 1024)) : 0;
  const dims = info.width !== undefined && info.height !== undefined ? `${info.width}×${info.height}px` : '尺寸未知';
  const modeLabel = mode === 'element' ? '元素级' : '视口级';
  const filename = screenshotFilename(mode);

  const fp = env.filePicker;
  let downloadNote = '';
  let persisted = false;
  if (fp && typeof fp.download === 'function') {
    try {
      await fp.download({ filename, data: dataUrl });
      persisted = true;
      downloadNote = '已自动触发下载链（env.filePicker.download）';
    } catch (err) {
      const t = translateCapabilityError(err, '截图下载');
      downloadNote = t.output;
    }
  } else {
    downloadNote = 'env.filePicker 未注入（下载链不可用 —— 浏览器场景自动装配，node 面需注入 fake）';
  }

  if (!persisted) {
    // EC-012 诚实降级：数据不静默丢弃 —— 可读原因 + 摘要 + dataURL 长度（不进上下文）
    return {
      ok: false,
      output:
        `✖ chrome screenshot：截图已生成但未落盘 —— ${downloadNote}。` +
        `摘要：${modeLabel} · ${dims} · ${info.bytes} B（≈${kb} KB · PNG dataURL 共 ${info.length} 字符）。` +
        `完整 dataURL 未进上下文（P-03/ADR-003）；如确需直接回传请 --include-dataurl true（预算内头段）。`,
      error: 'screenshot not persisted (download chain unavailable)',
    };
  }

  const lines = [
    `✓ chrome screenshot：${modeLabel}近似截图完成 · 摘要 {尺寸: ${dims}, 字节: ${info.bytes} B（≈${kb} KB）, 文件名: ${filename}}`,
    `落盘：${filename} · ${downloadNote}`,
    includeDataUrl
      ? `dataURL 头段（--include-dataurl true）：${info.head}${info.truncated ? `…（截断，共 ${info.length} 字符 —— 完整进上下文会击穿预算，AC-012）` : ''}`
      : 'dataURL：未进上下文（P-03/ADR-003 默认 —— 大 payload 挡在 AI 上下文之外；需要回传时 --include-dataurl true 预算内头段）',
    '近似度声明（ADR-003）：外部图片/CSS 变量/滚动态不保真（零依赖 foreignObject+canvas 近似）；整页级截图不支持 —— 归属 captureVisibleTab/CDP（F-14 扩展宿主/OS 生态位，FR-028 out）',
  ];
  return { ok: true, output: lines.join('\n') };
}

/**
 * chrome 工具执行器：子命令 → env.dom.ops（printPage/historyNav/reloadPage/screenshot）。
 * env = PlatformEnv（ops + filePicker 下载链同源注入；ADR-008 executor 零 DOM 触碰）。
 */
export async function executeChromeTool(env: PlatformEnv, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  const ops = env.dom?.ops;
  if (!CHROME_SUBCOMMANDS.includes(subcommand as ChromeSubcommand)) {
    return {
      ok: false,
      output: `✖ chrome 未知子命令 "${subcommand}"（可用：${CHROME_SUBCOMMANDS.join('/')}）`,
      error: 'unknown subcommand',
    };
  }
  if (!ops) {
    return {
      ok: false,
      output: '✖ chrome 操作面未注入（env.dom.ops 缺省）—— 浏览器外壳操作仅在浏览器场景可用；写类子命令（reload/screenshot）受权限门禁（PRM）约束',
      error: 'chrome ops not injected',
    };
  }

  switch (subcommand as ChromeSubcommand) {
    case 'print': {
      // --format 显式文件格式（如 pdf）→ 不支持说明（FR-026 out：打印为 PDF 需 CDP/扩展宿主）
      const format = (args.format ?? '').trim().toLowerCase();
      if (format !== '' && format !== 'dialog') {
        return {
          ok: false,
          output:
            `✖ chrome print --format "${format}" 不支持：本工具只触发浏览器打印对话框（window.print，打印对话框由用户侧确认/另存为 PDF）。` +
            `打印为 ${format} 文件输出需 CDP/扩展宿主侧（F-14 生态位，FR-026 out）。`,
          error: 'print format unsupported',
        };
      }
      if (typeof ops.printPage !== 'function') return opMissing('printPage');
      let pr: PlatformDomOpResult;
      try {
        pr = await ops.printPage();
      } catch (err) {
        // EC-008：打印授权/能力失败（无 window.print / 受限环境）→ 转译可读，会话不中断
        const t = translateCapabilityError(err, '打印');
        return { ok: false, output: t.output, error: t.error };
      }
      return fromOp(pr);
    }

    case 'back':
      return runHistoryNav(ops, -1);
    case 'forward':
      return runHistoryNav(ops, 1);

    case 'reload': {
      // 破坏性语义（FR-027/EC-009）：默认 ask 在门禁面（risk 'write'）；放行后提示恢复会话
      if (typeof ops.reloadPage !== 'function') return opMissing('reloadPage');
      let rr: PlatformDomOpResult;
      try {
        rr = await ops.reloadPage();
      } catch (err) {
        const t = translateCapabilityError(err, '页面刷新');
        return { ok: false, output: t.output, error: t.error };
      }
      if (!rr.ok) return fromOp(rr);
      // EC-009 恢复提示兜底：ops 输出若未含恢复指引，执行器面补一句（AI 可自愈路径）
      const hasRestoreHint = /重新 read-state|恢复会话/.test(rr.output);
      return hasRestoreHint
        ? fromOp(rr)
        : {
            ok: true,
            output: `${rr.output} ⚠ reload 为破坏性操作：重载后请重新 read-state/恢复会话上下文（EC-009）`,
          };
    }

    case 'screenshot': {
      const mode = (args.mode ?? 'viewport').trim();
      if (!['viewport', 'element', 'fullpage'].includes(mode)) {
        return {
          ok: false,
          output: `✖ chrome screenshot --mode 需为 viewport/element/fullpage（收到 "${mode}"；fullpage 不支持 → F-14/CDP 归属，FR-028 out）`,
          error: 'invalid screenshot mode',
        };
      }
      // 整页级 out（FR-028/ADR-003）：执行器面先行返回「不支持 + 归属」说明（ops 面同文案双保险）
      if (mode === 'fullpage') {
        return {
          ok: false,
          output:
            '✖ chrome screenshot 整页级截图不支持：当前零依赖近似面只做视口/元素级；整页归属 captureVisibleTab/CDP = F-14 扩展宿主/OS 生态位（FR-028 out）',
          error: 'fullpage unsupported',
        };
      }
      if (mode === 'element' && !(args.selector ?? '').trim()) {
        return { ok: false, output: '✖ chrome screenshot mode=element 缺少 --selector <CSS 选择器>' };
      }
      const w = dimArg(args, 'width');
      if (w.error) return { ok: false, output: w.error };
      const h = dimArg(args, 'height');
      if (h.error) return { ok: false, output: h.error };
      if (typeof ops.screenshot !== 'function') return opMissing('screenshot');
      const opts: PlatformScreenshotOptions = {
        mode: mode as PlatformScreenshotOptions['mode'],
        ...(mode === 'element' ? { selector: (args.selector ?? '').trim() } : {}),
        ...(w.n !== undefined ? { width: w.n } : {}),
        ...(h.n !== undefined ? { height: h.n } : {}),
      };
      let sr: PlatformDomOpResult;
      try {
        sr = await ops.screenshot(opts);
      } catch (err) {
        // EC-008：CSP/跨源样式读取/canvas taint/序列化失败 → 转译可读，会话不中断
        const t = translateCapabilityError(err, '截图');
        return { ok: false, output: t.output, error: t.error };
      }
      if (!sr.ok) return fromOp(sr);
      if (!sr.dataUrl) return fromOp(sr); // ops ok 但无 dataUrl（实现异常面）→ 透传 ops 输出
      const includeDataUrl = args['include-dataurl'] === 'true';
      return deliverScreenshot(env, sr, mode, includeDataUrl);
    }
  }
}

// ---------- ToolEntry 工厂 ----------

const CHROME_DESC =
  'chrome：浏览器外壳操作子命令族（5 子命令；宿主页会话内，FR-026~028）。' +
  ' print（触发浏览器打印对话框 window.print，用户侧确认；不做打印为 PDF —— CDP/扩展宿主侧 out）/ back（会话历史后退）/ forward（前进）' +
  ' / reload（页面刷新 —— 破坏性操作：默认 ask，放行后需重新 read-state/恢复会话 EC-009）/ screenshot（视口/元素级同源近似截图；整页级 out = F-14/CDP 归属）。' +
  ' 参数进 args 对象：{"subcommand":"screenshot","args":{"mode":"element","selector":"#chart"}}；' +
  ' screenshot 输出策略（ADR-003/P-03）：默认自动触发下载链并返回 {尺寸/字节/文件名} 摘要（dataURL 不进上下文）；--include-dataurl true 预算内回带头段。' +
  ' 书签/标签页·窗口/跨域导航/下载历史 = 不可承载 out（NG-002/NG-003）。';

const CHROME_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: CHROME_SUBCOMMANDS,
      description: 'chrome 子命令（5：print/back/forward/reload/screenshot）。',
    },
    args: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'print 输出格式：缺省 = 浏览器打印对话框（用户侧确认/可另存为 PDF）；显式格式（如 pdf）→ 不支持说明（FR-026 out，F-14/CDP 归属）。' },
        mode: { type: 'string', description: 'screenshot 截图范围：viewport=视口级（缺省）/ element=selector 目标元素级 / fullpage=整页级（不支持 → F-14/CDP 归属，FR-028 out）。' },
        selector: { type: 'string', description: 'screenshot mode=element 的目标 CSS 选择器（定位语法面 css:/裸 CSS/text=/text*=）。' },
        width: { type: 'string', description: 'screenshot 输出目标宽像素（可选；缺省 = 视口/元素实际尺寸）。' },
        height: { type: 'string', description: 'screenshot 输出目标高像素（可选）。' },
        'include-dataurl': { type: 'string', description: 'screenshot "true" = 输出预算内回带 dataURL 头段 + 截断标记（缺省 dataURL 不进上下文，P-03/AC-012）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function chromeHelp(): string {
  return [
    'chrome —— 浏览器外壳操作（页面内可承载 chrome 子集；5 子命令）',
    '用法：chrome <print|back|forward|reload|screenshot> [--参数 ...]',
    '',
    'risk 分级（FR-005/ADR-001，修复 IMP-4）：',
    '  [ui 交互·默认 ask]  print / back / forward（会话内 history 导航 —— 场景规则可 allow 免 ask，EC-009）',
    '  [write 破坏性/落盘·默认 ask]  reload（破坏性）/ screenshot（截图下载链）',
    '  → back/forward 为会话内导航不中断上下文；reload 重载宿主页中断 AI 会话 → 默认 ask',
    '',
    '子命令：',
    '  print  触发浏览器打印对话框（window.print()；打印对话框由用户侧确认/另存为 PDF，页面语义）',
    '          --format 缺省 = 对话框；显式文件格式（如 pdf）→ 不支持说明（打印为 PDF 需 CDP/扩展宿主 = F-14 out，FR-026）',
    '  back / forward  会话内历史导航（history.back/forward；宿主 SPA 路由内可用，不触发 ask 由场景规则放行）',
    '  reload  页面刷新 —— ⚠ 破坏性操作（FR-027/EC-009）：默认 ask（risk write）；放行后重载宿主页、AI 会话上下文中断 → 需重新 read-state/恢复会话上下文',
    '  screenshot  [--mode viewport|element|fullpage] [--selector] [--width] [--height] [--include-dataurl true]',
    '          视口级（缺省，文档根近似）/ 元素级（--selector 首匹配精确裁剪）同源近似截图（ADR-003：foreignObject+canvas 零依赖）',
    '          --mode fullpage → 不支持（整页归属 captureVisibleTab/CDP = F-14 扩展宿主/OS 生态位，FR-028 out）',
    '',
    '截图输出策略（P-03/ADR-003 默认）：成功即自动触发下载链（env.filePicker.download）并返回 {尺寸/字节/文件名} 摘要 ——',
    '  dataURL 不整段进 AI 上下文（AC-012 预算）；需要时 --include-dataurl true 在预算内回带头段 + 截断标记；下载链不可用 → 可读降级不静默丢数据',
    '近似度声明（ADR-003）：外部图片/CSS 变量/滚动态等不保真（近似截图）；CSP/跨源样式读取/canvas taint 失败 → 可读转译（EC-008）',
    '边界（NG-002/NG-003）：本工具在宿主应用自身同源页面会话内操作；书签/标签页·窗口/跨域导航/下载历史 = 不可承载 out（F-14 扩展宿主/OS 生态位）；第三方/跨域站点由插件运行时承载',
  ].join('\n');
}

/** 创建 chrome 工具条目（env.dom.ops + env.filePicker 注入；subcommandRisks = PRM 子命令级裁决单一数据源）。 */
export function createChromeToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'chrome',
    summary: '浏览器外壳操作（print/back/forward/reload/screenshot；reload·screenshot 写类默认 ask）',
    schema: { name: 'chrome', description: CHROME_DESC, parameters: CHROME_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'chrome',
    // plan §2.3.3：print/back/forward → 'ui'（back/forward 场景规则免 ask 面 = TASK-011 App 规则）；
    // reload/screenshot → 'write'（破坏性/落盘副作用缺省 ask）；entry.risk 保持 'ui' 回退面
    subcommandRisks: {
      print: 'ui',
      back: 'ui',
      forward: 'ui',
      reload: 'write',
      screenshot: 'write',
    },
    executor: async (tc) => executeChromeTool(env, tc.subcommand, tc.args),
    help: chromeHelp,
  };
}
