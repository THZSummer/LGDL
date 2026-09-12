/**
 * Plugin host-layer chrome tool wrapper (D1/D2/D6 output honesty + D4 copy fix).
 *
 * The base `chrome` tool still owns the executor / risk tiers / dataURL download
 * policy for the viewport/element paths — this module only wraps the
 * **plugin-exposed** entry so:
 *
 *  D4 — the base `schema.description` / `help` carry conclusions from the old
 *  **page-context** era (`书签/标签页·窗口/跨域导航/下载历史 = 不可承载 out`
 *  `NG-002/NG-003`) and「整页级不支持」. In the plugin (an **extension host**) that
 *  is outdated and misleading: bookmarks etc. are host-layer capabilities, and
 *  fullpage is now a real (approximate) scroll-stitch. The wrapper keeps the
 *  still-correct base text but rewrites the boundary clause to the host truth.
 *  The base source is NOT touched.
 *
 *  D1 — after the base executor returns, append the honest pixel-path note
 *  recorded by the real-screenshot provider (真实像素 vs 近似 + concrete reason).
 *
 *  D2 — the base executor **short-circuits `mode=fullpage`** before
 *  `ops.screenshot` is reached, so this wrapper owns the fullpage command:
 *  it calls the plugin provider (`ops.screenshot({mode:'fullpage'})` → scroll-stitch
 *  with `captureVisibleTab` + SW `OffscreenCanvas`) and then delivers the stitched
 *  image with the **same policy** as the base viewport/element path (auto-download
 *  via `env.filePicker.download`, `{尺寸/字节/文件名}` summary, `--include-dataurl`
 *  budget head, dataURL never entering the context). It reuses the base **exported**
 *  helpers (`summarizeScreenshotData` / `screenshotFilename` /
 *  `translateCapabilityError`) so the policy cannot drift. Every successful output
 *  carries the honest limitation notice (fixed/sticky repeat per screen, lazy
 *  content, animation/carousel inconsistency) — never「完整/无损整页」.
 *
 *  D6 — `back` / `forward` output is already produced by the ops wrapper
 *  (`historyNav`), which labels「原生（tabs.goBack/goForward）」vs「页面 history
 *  （回退，原因：…）」and discloses when native navigation left the bound origin.
 *
 * RISK: never widened here — `risk` / `subcommandRisks` / `executor` semantics
 * are preserved (only screenshot output/delivery for fullpage + path notes).
 */
import {
  summarizeScreenshotData,
  screenshotFilename,
  translateCapabilityError,
  type PlatformEnv,
  type ToolEntry,
  type ToolResult,
} from '@lgdl/web-cli-base';
import {
  annotateScreenshotPath,
  FULLPAGE_LIMITATION_NOTICE,
  fullpagePathLine,
  SCREENSHOT_PATH_META,
  type ScreenshotPathMeta,
} from '../platform/real-screenshot.js';

/** Corrected plugin host-layer boundary note appended to the chrome description. */
export const PLUGIN_CHROME_BOUNDARY_DESC =
  '插件宿主层边界：本工具只承载宿主页会话内的子集（print/back/forward/reload/screenshot）；' +
  '书签 / 标签页·窗口 / 下载 / 跨域导航不是本工具的职责 —— 标签页见 `tabs` 工具；' +
  '书签 / 下载等由插件按 origin 授权后的宿主层能力承载（不代表浏览器不支持）。' +
  ' screenshot 像素路径：优先宿主页真实像素（captureVisibleTab，需该站点已授权 host 权限）；' +
  '未授权 / 受限页 / captureVisibleTab 失败时回退页面上下文近似（canvas），输出会如实标注实际路径；' +
  '整页级 = 滚动分屏 captureVisibleTab 拼接（近似：fixed/sticky 每屏重复、懒加载/动画状态可能不一致，输出会声明局限）。' +
  ' back/forward 优先标签页级原生 tabs.goBack/goForward，失败才回退页面 history（输出标注实际路径）。';

/** Corrected boundary line replacing the base help's page-context era conclusion. */
export const PLUGIN_CHROME_BOUNDARY_HELP =
  '边界（插件宿主层，修正页内上下文时代的旧结论）：本工具只承载宿主页会话内的子集；' +
  '书签 / 标签页·窗口 / 下载 / 跨域导航不是本工具的职责 —— 标签页见 tabs 工具；' +
  '书签 / 下载等由插件按 origin 授权后的宿主层能力承载（不代表浏览器不支持）。';

/** Rewrite the base chrome description for the plugin host (keeps the still-valid text). */
export function hostChromeDescription(base: string): string {
  const cleaned = base
    .replace(/\s*书签\/标签页·窗口\/跨域导航\/下载历史\s*=\s*不可承载\s*out（NG-002\/NG-003）。/g, ' ')
    .replace(
      'screenshot（视口/元素级同源近似截图；整页级 out = F-14/CDP 归属）',
      'screenshot（视口/元素级；已授权站点优先真实像素 captureVisibleTab，否则回退近似 canvas；整页级 = 分屏 captureVisibleTab 拼接并声明局限）',
    )
    .trim();
  return `${cleaned} ${PLUGIN_CHROME_BOUNDARY_DESC}`;
}

/** Rewrite the base chrome help for the plugin host (keeps the still-valid text). */
export function hostChromeHelp(base: string): string {
  return base
    .replace(/边界（NG-002\/NG-003）：[^\n]*/g, PLUGIN_CHROME_BOUNDARY_HELP)
    .replace(
      /视口级（缺省，文档根近似）\/ 元素级（--selector 首匹配精确裁剪）同源近似截图（ADR-003：foreignObject\+canvas 零依赖）/,
      '视口级（缺省）/ 元素级（--selector 首匹配精确裁剪）优先宿主页真实像素（captureVisibleTab），否则回退页面上下文近似（canvas，输出会如实标注原因）',
    )
    .replace(
      /--mode fullpage → 不支持（整页归属 captureVisibleTab\/CDP = F-14 扩展宿主\/OS 生态位，FR-028 out）/,
      '--mode fullpage → 插件宿主：逐屏滚动 captureVisibleTab 拼接（受 2 次/秒速率限制与屏数/像素上限约束，失败/超限可读拒绝）；拼接为近似 —— fixed/sticky 元素每屏重复、懒加载内容可能未加载、动画/轮播状态可能不一致，输出会声明局限',
    )
    .replace(
      /back \/ forward  会话内历史导航（history\.back\/forward；宿主 SPA 路由内可用，不触发 ask 由场景规则放行）/,
      'back / forward  优先标签页级原生历史（chrome.tabs.goBack/goForward，跨导航可靠）；失败（无权限/无历史/受限页）才回退页面 history.back/forward，输出如实标注实际路径；原生导航可能离开绑定 origin，输出会说明绑定影响',
    )
    .replace(
      /近似度声明（ADR-003）：外部图片\/CSS 变量\/滚动态等不保真（近似截图）；CSP\/跨源样式读取\/canvas taint 失败 → 可读转译（EC-008）/,
      '近似度声明（仅近似/拼接路径）：走 canvas 近似时外部图片/CSS 变量/滚动态等不保真；整页拼接为近似（fixed/sticky 每屏重复等，见上）。CSP/跨源样式读取/canvas taint 失败 → 可读转译（EC-008）',
    );
}

/**
 * D2: patch the base schema's `mode` parameter description (still says fullpage
 * is unsupported). Defensive clone; unknown shapes are left untouched.
 */
export function hostChromeSchema(base: ToolEntry['schema']): ToolEntry['schema'] {
  const clone = JSON.parse(JSON.stringify(base)) as ToolEntry['schema'];
  const params = clone.parameters as
    | { properties?: { args?: { properties?: Record<string, { description?: string }> } } }
    | undefined;
  const mode = params?.properties?.args?.properties?.mode;
  if (mode && typeof mode.description === 'string') {
    mode.description = mode.description.replace(
      'fullpage=整页级（不支持 → F-14/CDP 归属，FR-028 out）',
      'fullpage=整页级（插件宿主：逐屏滚动 captureVisibleTab 拼接，近似并声明局限；受 2 次/秒速率限制与屏数/像素上限约束）',
    );
  }
  return clone;
}

function screenshotMeta(env: PlatformEnv): ScreenshotPathMeta | undefined {
  return (env as unknown as Record<symbol, ScreenshotPathMeta | undefined>)[SCREENSHOT_PATH_META];
}

/** Reset the per-call path record so a failed/short-circuited call cannot inherit stale evidence. */
function resetScreenshotMeta(meta: ScreenshotPathMeta): void {
  meta.decided = false;
  meta.kind = 'approx';
  meta.reason = undefined;
  meta.cropped = undefined;
  meta.origin = undefined;
  meta.fullpage = undefined;
  meta.fullpageAttempt = undefined;
}

/**
 * D2: deliver a stitched fullpage image with the base viewport/element policy
 * (auto-download + summary + `--include-dataurl` head + dataURL never in context).
 */
async function deliverFullpageScreenshot(
  env: PlatformEnv,
  dataUrl: string,
  meta: ScreenshotPathMeta,
  args: Record<string, string>,
): Promise<ToolResult> {
  const info = summarizeScreenshotData(dataUrl);
  const kb = info.bytes > 0 ? Math.max(1, Math.round(info.bytes / 1024)) : 0;
  const dims = info.width !== undefined && info.height !== undefined ? `${info.width}×${info.height}px` : '尺寸未知';
  const filename = screenshotFilename('fullpage');
  const includeDataUrl = args['include-dataurl'] === 'true';

  const fp = env.filePicker;
  let downloadNote = '';
  let persisted = false;
  if (fp && typeof fp.download === 'function') {
    try {
      await fp.download({ filename, data: dataUrl });
      persisted = true;
      downloadNote = '已自动触发下载链（env.filePicker.download）';
    } catch (err) {
      downloadNote = translateCapabilityError(err, '截图下载').output;
    }
  } else {
    downloadNote = 'env.filePicker 未注入（下载链不可用 —— 浏览器场景自动装配，node 面需注入 fake）';
  }

  const fpMeta = meta.fullpage;
  const pathLines = [
    fullpagePathLine(fpMeta?.screens ?? 0),
    fpMeta && !fpMeta.restored
      ? `滚动位置：⚠ 原滚动位置恢复失败：${fpMeta.restoreError ?? '未知原因'}（页面可能停留在捕获时的位置）`
      : '滚动位置：已恢复（未把页面留在底部）',
    FULLPAGE_LIMITATION_NOTICE,
  ];
  const ignored =
    args.width !== undefined || args.height !== undefined
      ? '\n（--width/--height 对整页拼接不适用：已按文档实际尺寸拼接，未静默套用）'
      : '';

  if (!persisted) {
    return {
      ok: false,
      output:
        `✖ chrome screenshot：整页已拼接但未落盘 —— ${downloadNote}。` +
        `摘要：整页拼接 · ${dims} · ${info.bytes} B（≈${kb} KB · PNG dataURL 共 ${info.length} 字符）。` +
        `完整 dataURL 未进上下文（P-03/ADR-003）；如确需直接回传请 --include-dataurl true（预算内头段）。` +
        `\n${pathLines.join('\n')}${ignored}`,
      error: 'screenshot not persisted (download chain unavailable)',
    };
  }

  const lines = [
    `✓ chrome screenshot：整页拼接截图完成 · 摘要 {尺寸: ${dims}, 字节: ${info.bytes} B（≈${kb} KB）, 文件名: ${filename}}`,
    `落盘：${filename} · ${downloadNote}`,
    includeDataUrl
      ? `dataURL 头段（--include-dataurl true）：${info.head}${info.truncated ? `…（截断，共 ${info.length} 字符 —— 完整进上下文会击穿预算，AC-012）` : ''}`
      : 'dataURL：未进上下文（P-03/ADR-003 默认 —— 大 payload 挡在 AI 上下文之外；需要回传时 --include-dataurl true 预算内头段）',
    ...pathLines,
  ];
  return { ok: true, output: `${lines.join('\n')}${ignored}` };
}

/** Wrap the plugin-exposed chrome entry (copy fix + honest screenshot/history path notes). */
export function wrapChromeEntryForHost(entry: ToolEntry, env: PlatformEnv): ToolEntry {
  const baseExecutor = entry.executor;
  const baseHelp = entry.help;
  return {
    ...entry,
    schema: { ...hostChromeSchema(entry.schema), description: hostChromeDescription(entry.schema.description) },
    ...(baseHelp ? { help: () => hostChromeHelp(baseHelp()) } : {}),
    executor: async (tc, ctx): Promise<ToolResult> => {
      const meta = screenshotMeta(env);
      const isScreenshot = tc.subcommand === 'screenshot';
      if (isScreenshot && meta) resetScreenshotMeta(meta);

      // D2: base short-circuits fullpage before `ops.screenshot`; own it here.
      if (isScreenshot && (tc.args?.mode ?? '').trim() === 'fullpage') {
        const ops = env.dom?.ops;
        if (!ops?.screenshot) {
          return { ok: false, output: '✖ chrome screenshot 实现未注入（env.dom.ops.screenshot 缺省）', error: 'screenshot not injected' };
        }
        const sr = await ops.screenshot({ mode: 'fullpage' });
        if (!sr.ok || !sr.dataUrl) return { ok: false, output: sr.output, error: sr.error ?? 'fullpage screenshot failed' };
        return deliverFullpageScreenshot(env, sr.dataUrl, meta ?? { kind: 'fullpage', decided: false }, tc.args ?? {});
      }

      const res = await baseExecutor(tc, ctx);
      if (isScreenshot && meta) {
        return { ...res, output: annotateScreenshotPath(res.output, meta) };
      }
      return res;
    },
  };
}
