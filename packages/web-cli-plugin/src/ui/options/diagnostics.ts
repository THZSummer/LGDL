/**
 * 「环境自检 / 诊断」纯逻辑（TASK-019 任务 C）。
 *
 * 让用户能**自己诊断**「保存不了 / 很多功能不能用」：把扩展上下文、版本/构建、
 * storage 读写、SW 连通性、已授权 origin、已配置厂商与模型逐项以 ✅/⚠/❌ + 详情
 * 呈现，并生成**可一键复制**的诊断文本（便于反馈）。
 *
 * 红线：诊断输出**绝不含 API Key 明文**。
 *  - 数据来源：`llm-status` 只回非敏感摘要（providerId/providerName/model/configured）；
 *  - 纵深防御：`sanitizeDiagText` 兜底脱敏 `sk-*` / `ark-*` / Bearer / apiKey= 形态，
 *    即使上游将来误塞敏感串也不会随复制文本外泄。
 *
 * 纯逻辑、零依赖、node 可测；浏览器侧的采集（storage/SW 往返）在 options.ts。
 */

export type DiagStatus = 'ok' | 'warn' | 'fail';

export interface DiagItem {
  /** 稳定 id（渲染 / 测试锚点）。 */
  id: string;
  label: string;
  status: DiagStatus;
  /** 可读详情（中文）；渲染前经 sanitizeDiagText 兜底脱敏。 */
  detail: string;
}

export interface DiagReport {
  generatedAt: number;
  items: DiagItem[];
}

/** 状态 → 图标（✅ / ⚠ / ❌）。 */
export function diagStatusIcon(status: DiagStatus): string {
  return status === 'ok' ? '✅' : status === 'warn' ? '⚠' : '❌';
}

/**
 * 兜底脱敏：即便上游误把 key 塞进详情，也不会随复制文本外泄。
 * 覆盖字节/常见厂商前缀与 `apiKey=` 赋值形态。
 */
export function sanitizeDiagText(text: string): string {
  return String(text)
    .replace(/\b(sk-[A-Za-z0-9_-]{4,})/g, 'sk-•••（已脱敏）')
    .replace(/\b(ark-[A-Za-z0-9_-]{4,})/g, 'ark-•••（已脱敏）')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1•••（已脱敏）')
    .replace(/((?:api[-_]?key|apikey|authorization)\s*[:=]\s*)[^\s,;）)]+/gi, '$1•••（已脱敏）');
}

export interface DiagSummary {
  ok: number;
  warn: number;
  fail: number;
  /** 一行结论（不误导：有 fail 就明确说失败项数）。 */
  label: string;
}

export function summarizeReport(report: Pick<DiagReport, 'items'>): DiagSummary {
  const ok = report.items.filter((i) => i.status === 'ok').length;
  const warn = report.items.filter((i) => i.status === 'warn').length;
  const fail = report.items.filter((i) => i.status === 'fail').length;
  const label =
    fail > 0
      ? `❌ ${fail} 项未通过（见下方逐项）`
      : warn > 0
        ? `⚠ ${warn} 项提示（可用，但建议关注）`
        : '✅ 全部通过';
  return { ok, warn, fail, label };
}

/** 生成可一键复制的诊断文本（含免责声明；已脱敏）。 */
export function renderDiagText(report: DiagReport): string {
  const lines: string[] = [
    'web-cli plugin 环境自检 / 诊断',
    `时间：${new Date(report.generatedAt).toISOString()}`,
    '（本诊断不含任何 API Key 明文）',
    '',
  ];
  for (const item of report.items) {
    lines.push(`${diagStatusIcon(item.status)} ${item.label}：${sanitizeDiagText(item.detail)}`);
  }
  lines.push('', `结论：${summarizeReport(report).label}`);
  return lines.join('\n');
}

// ── 逐项判定纯函数（便于 ✅/❌ 分支单测） ───────────────────────────────────

/** 1. 扩展上下文。 */
export function extensionItem(inExtension: boolean, reasons: string[]): DiagItem {
  return {
    id: 'extension',
    label: '扩展上下文（chrome.runtime.id / chrome.storage.local）',
    status: inExtension ? 'ok' : 'fail',
    detail: inExtension ? '在扩展环境中，配置可正常读写' : `不在扩展环境：${reasons.join('；') || '未知原因'}`,
  };
}

/** 2. 版本 / 是否最新构建（含「旧扩展未重载」导致的页面/SW 构建不一致）。 */
export function versionItem(
  manifestVersion: string,
  swVersion: string | null,
  buildStamp: string,
  swBuildStamp?: string | null,
): DiagItem {
  const label = '扩展版本 / 构建';
  if (!swVersion) {
    return {
      id: 'version',
      label,
      status: 'warn',
      detail: `manifest v${manifestVersion} · 构建 ${buildStamp} · 未能读到 background 上报版本（SW 未响应）`,
    };
  }
  if (swBuildStamp && swBuildStamp !== buildStamp) {
    return {
      id: 'version',
      label,
      status: 'warn',
      detail:
        `页面构建 ${buildStamp} 与 background 构建 ${swBuildStamp} 不一致——` +
        '多半是改了代码只刷新了页面、没有在 chrome://extensions 点「重新加载」；点一次「重新加载」后重开本页即可',
    };
  }
  const matches = swVersion === manifestVersion;
  return {
    id: 'version',
    label,
    status: matches ? 'ok' : 'warn',
    detail: matches
      ? `manifest v${manifestVersion} · background v${swVersion} · 构建 ${buildStamp}`
      : `manifest v${manifestVersion} 与 background v${swVersion} 不一致——可能只重载了部分上下文，请在 chrome://extensions 点「重新加载」`,
  };
}

/** 3. storage.local 读写实测。 */
export function storageItem(status: DiagStatus, detail: string): DiagItem {
  return { id: 'storage', label: 'chrome.storage.local 读写实测', status, detail };
}

/** 4. SW 连通性（往返 + 耗时）。 */
export function swItem(status: DiagStatus, detail: string): DiagItem {
  return { id: 'sw', label: 'background (service worker) 连通性', status, detail };
}

/** 5. 已授权 origin / 当前活跃站点。 */
export function originsItem(authorizedOrigins: string[], activeOrigin: string | null): DiagItem {
  const detail =
    `当前活跃站点：${activeOrigin ?? '（无）'}；已授权 origin：` +
    (authorizedOrigins.length ? authorizedOrigins.join('、') : '（无）');
  return { id: 'origins', label: '已授权 origin / 当前活跃站点', status: 'ok', detail };
}

/** 6. 已配置厂商与模型（零明文）。 */
export function llmItem(configured: boolean, providerName: string, model: string): DiagItem {
  return {
    id: 'llm',
    label: '已配置厂商与模型（零明文）',
    status: configured ? 'ok' : 'warn',
    detail: configured
      ? `${providerName || '未知厂商'} · ${model || '默认模型'} · Key 已配置（不回显明文）`
      : '尚未配置 API Key——插件无法调用 LLM',
  };
}

export function buildReport(items: DiagItem[], now: number): DiagReport {
  return { generatedAt: now, items };
}
