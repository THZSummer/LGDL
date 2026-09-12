/**
 * Plugin host-layer chrome tool wrapper (D1 output honesty + D4 copy fix).
 *
 * The base `chrome` tool still owns the executor / risk tiers / dataURL download
 * policy — this module only wraps the **plugin-exposed** entry so:
 *
 *  D4 — the base `schema.description` / `help` carry conclusions from the old
 *  **page-context** era (`书签/标签页·窗口/跨域导航/下载历史 = 不可承载 out`
 *  `NG-002/NG-003`). In the plugin (an **extension host**) that is outdated and
 *  misleading: it made the assistant tell users that bookmarks etc. are
 *  "technically impossible". The wrapper keeps the still-correct base text but
 *  rewrites the boundary clause to the host truth (this tool only owns the
 *  in-page-session subset; tabs live in the `tabs` tool; bookmarks / downloads are
 *  plugin host-layer capabilities gated by per-origin authorization). The base
 *  source is NOT touched.
 *
 *  D1 — after the base executor returns, append the honest pixel-path note
 *  recorded by the real-screenshot provider (真实像素 vs 近似 + concrete reason).
 *
 * RISK: never widened here — `risk` / `subcommandRisks` / `executor` semantics
 * are preserved (only `screenshot` output text gains the path note).
 */
import type { PlatformEnv, ToolEntry, ToolResult } from '@lgdl/web-cli-base';
import { annotateScreenshotPath, SCREENSHOT_PATH_META, type ScreenshotPathMeta } from '../platform/real-screenshot.js';

/** Corrected plugin host-layer boundary note appended to the chrome description. */
export const PLUGIN_CHROME_BOUNDARY_DESC =
  '插件宿主层边界：本工具只承载宿主页会话内的子集（print/back/forward/reload/screenshot）；' +
  '书签 / 标签页·窗口 / 下载 / 跨域导航不是本工具的职责 —— 标签页见 `tabs` 工具；' +
  '书签 / 下载等由插件按 origin 授权后的宿主层能力承载（不代表浏览器不支持）。' +
  ' screenshot 像素路径：优先宿主页真实像素（captureVisibleTab，需该站点已授权 host 权限）；' +
  '未授权 / 受限页 / captureVisibleTab 失败时回退页面上下文近似（canvas），输出会如实标注实际路径；整页级暂不支持。';

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
      'screenshot（视口/元素级；已授权站点优先真实像素 captureVisibleTab，否则回退近似 canvas；整页级暂不支持）',
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
      '视口级（缺省）/ 元素级（--selector 首匹配精确裁剪）；已授权站点优先宿主页真实像素（captureVisibleTab），否则回退页面上下文近似（canvas，输出会如实标注原因）',
    )
    .replace(
      /近似度声明（ADR-003）：外部图片\/CSS 变量\/滚动态等不保真（近似截图）；CSP\/跨源样式读取\/canvas taint 失败 → 可读转译（EC-008）/,
      '近似度声明（仅回退路径）：走 canvas 近似时外部图片/CSS 变量/滚动态等不保真；真实像素路径无此限制。CSP/跨源样式读取/canvas taint 失败 → 可读转译（EC-008）',
    );
}

function screenshotMeta(env: PlatformEnv): ScreenshotPathMeta | undefined {
  return (env as unknown as Record<symbol, ScreenshotPathMeta | undefined>)[SCREENSHOT_PATH_META];
}

/** Wrap the plugin-exposed chrome entry (copy fix + honest screenshot path note). */
export function wrapChromeEntryForHost(entry: ToolEntry, env: PlatformEnv): ToolEntry {
  const baseExecutor = entry.executor;
  const baseHelp = entry.help;
  return {
    ...entry,
    schema: { ...entry.schema, description: hostChromeDescription(entry.schema.description) },
    ...(baseHelp ? { help: () => hostChromeHelp(baseHelp()) } : {}),
    executor: async (tc, ctx): Promise<ToolResult> => {
      const meta = screenshotMeta(env);
      if (tc.subcommand === 'screenshot' && meta) {
        // Reset so a call that never reaches the provider (e.g. fullpage /
        // validation error) cannot inherit a stale path from a previous call.
        meta.decided = false;
        meta.kind = 'approx';
        meta.reason = undefined;
        meta.cropped = undefined;
        meta.origin = undefined;
      }
      const res = await baseExecutor(tc, ctx);
      if (tc.subcommand === 'screenshot' && meta) {
        return { ...res, output: annotateScreenshotPath(res.output, meta) };
      }
      return res;
    },
  };
}
