/**
 * Build stamp injection（TASK-019：区分「改动源码后未重新加载扩展」）。
 *
 * `build.mjs` 在 esbuild 的 `define` 中把 `__BUILD_STAMP__` 替换为**每次构建的
 * ISO 时间戳**。诊断面板据此判断 options / SW 是否为同一次构建、以及「改了代码但
 * 没在 chrome://extensions 点『重新加载』」时仍读到旧 stamp（可操作结论）。
 *
 * node 运行时（单测 / 直接导入）下该标识符不存在，用 `typeof` 守卫回退 'dev'，
 * 绝不抛 ReferenceError（零依赖、零副作用）。
 */

declare const __BUILD_STAMP__: string;

/** 本次构建时间戳（构建期注入）；未注入时为 'dev'。 */
export const BUILD_STAMP: string = typeof __BUILD_STAMP__ === 'undefined' ? 'dev' : __BUILD_STAMP__;

/** 人类可读的短构建标记（截取到秒，去掉毫秒 Z）。 */
export function shortBuildStamp(stamp: string = BUILD_STAMP): string {
  if (!stamp || stamp === 'dev' || stamp === 'unknown') return 'dev';
  return stamp.replace(/\.\d+Z$/, 'Z');
}
