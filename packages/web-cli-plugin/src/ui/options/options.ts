/**
 * Options page (FR-033 / FR-035 / FR-036 + TASK-018).
 *
 * Independent LLM configuration (chrome.storage.local), manual re-configuration
 * guidance (no auto migration from the built-in assistant), compliance entry.
 * The API key is written but never echoed in plaintext.
 *
 * TASK-018 hardening (user feedback「填模型 key 没法保存」):
 * - the whole save/test flow is wrapped in try/catch → failures are readable, never silent;
 * - an empty effective key is never displayed as a successful save;
 * - a successful save clears the input, refreshes the warning and echoes a
 *   provider · model · key-state summary;
 * - 「测试连接」sends the CURRENT form values to the background for one minimal
 *   real request and renders a readable result (latency / 401 / 403 / 404 /
 *   CORS·network / timeout), reusing `@lgdl/web-cli-base` (no new wheel).
 */
import { createChromeAsyncKv } from '../../platform/extension-env.js';
import {
  detectExtensionEnv,
  envGuardButtonState,
  envGuardInputNote,
  type ChromeEnvLike,
  type EnvGuardResult,
} from '../../platform/env-guard.js';
import { shortBuildStamp } from '../../build-info.js';
import { createKeyStore, type LlmSettings } from '../../llm/key-store.js';
import { PROVIDERS, providerById, DEFAULT_MAX_ROUNDS } from '../../llm/providers.js';
import { makeMessage, type PluginResponse } from '../../background/messaging.js';
import type { TestConnectionResult } from '../../llm/test-connection.js';
import type { LlmStatusSummary } from '../../llm/status.js';
import type { DiagMessagePayload } from '../../background/diag-message.js';
import {
  buildReport,
  diagStatusIcon,
  extensionItem,
  llmItem,
  originsItem,
  renderDiagText,
  sanitizeDiagText,
  storageItem,
  summarizeReport,
  swItem,
  versionItem,
  type DiagItem,
  type DiagReport,
  type DiagStatus,
} from './diagnostics.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

const store = createKeyStore(createChromeAsyncKv('web-cli'));

// TASK-019 任务 A: detect the extension context at load time. On `file://` (or
// any non-extension page) `chrome.runtime.id` / `chrome.storage.local` are
// unavailable → saving silently has nowhere to go. Guard up-front instead.
let envGuard: EnvGuardResult = detectExtensionEnv(
  typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined,
);
/** Last diagnostics report (for the one-click copy). */
let lastDiag: DiagReport | null = null;

type MessageKind = 'ok' | 'warn' | 'err' | '';

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Readable hint for a provider, including the browser-direct limitation note. */
function providerHint(id: string): string {
  const provider = providerById(id);
  return `${provider.hint}${provider.browserDirect ? '' : '；⚠ 该厂商浏览器直连受限（G-KEY），可在「测试连接」查看可读原因'}`;
}

function setMessage(el: HTMLElement, kind: MessageKind, text: string): void {
  el.classList.remove('msg-ok', 'msg-warn', 'msg-err');
  if (kind) el.classList.add(`msg-${kind}`);
  el.textContent = text;
}

const setSaved = (kind: MessageKind, text: string): void => setMessage($('saved'), kind, text);
const setTestResult = (kind: MessageKind, text: string): void => setMessage($('test-result'), kind, text);

function fillProviders(selected: string): void {
  const select = $('provider') as HTMLSelectElement;
  select.textContent = '';
  for (const p of PROVIDERS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name}${p.browserDirect ? '' : '（需 G-KEY 验证直连）'}`;
    if (p.id === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function setKeyWarning(configured: boolean): void {
  const box = $('key-warning');
  box.textContent = configured
    ? ''
    : '⚠ 尚未配置 API Key：插件无法调用 LLM。请在下方选择厂商、填入 API Key 并保存。';
  box.classList.toggle('show', !configured);
}

/** Echo the stored config as a non-sensitive summary (never the key itself). */
function renderSavedSummary(cfg: LlmSettings): void {
  const provider = providerById(cfg.providerId);
  const keyState = cfg.apiKey ? 'Key ✅' : 'Key ❌';
  setSaved(cfg.apiKey ? '' : 'warn', `当前配置：${provider.name} · ${cfg.model} · ${keyState}`);
}

/** TASK-019 任务 A: blocking banner + disabled actions when not in an extension. */
function applyEnvGuard(): void {
  const banner = $('env-guard');
  banner.textContent = envGuard.banner;
  banner.style.display = envGuard.inExtension ? 'none' : 'block';

  const note = $('env-guard-note');
  const noteText = envGuardInputNote(envGuard);
  note.textContent = noteText;
  note.style.display = noteText ? 'block' : 'none';

  const buttons = envGuardButtonState(envGuard);
  ($('save') as HTMLButtonElement).disabled = buttons.saveDisabled;
  ($('test') as HTMLButtonElement).disabled = buttons.testDisabled;
  ($('clear') as HTMLButtonElement).disabled = buttons.clearDisabled;
}

async function refresh(): Promise<void> {
  if (!envGuard.inExtension) {
    setSaved('warn', envGuard.banner);
    return;
  }
  try {
    const cfg = await store.load();
    fillProviders(cfg.providerId);
    ($('model') as HTMLInputElement).value = cfg.model;
    ($('baseURL') as HTMLInputElement).value = cfg.baseURL ?? '';
    ($('maxRounds') as HTMLInputElement).value = String(cfg.maxRounds ?? DEFAULT_MAX_ROUNDS);
    ($('apiKey') as HTMLInputElement).value = '';
    $('hint').textContent = providerHint(cfg.providerId);
    renderSavedSummary(cfg);
    setKeyWarning(cfg.apiKey.length > 0);
  } catch (err) {
    setSaved('err', `✖ 读取配置失败：${errMessage(err)}`);
  }
}

function setBusy(busy: boolean): void {
  const save = $('save') as HTMLButtonElement;
  save.disabled = envGuardButtonState(envGuard, busy).saveDisabled;
  save.textContent = busy ? '保存中…' : '保存';
}

/** Save the current form values; failures are always readable (no silent void). */
async function handleSave(): Promise<void> {
  if (!envGuard.inExtension) {
    setSaved('err', `✖ 保存失败：${envGuard.banner}`);
    return;
  }
  setBusy(true);
  try {
    const providerId = ($('provider') as HTMLSelectElement).value;
    const provider = providerById(providerId);
    const existing = await store.loadProvider(provider.id);
    const typed = ($('apiKey') as HTMLInputElement).value;
    const key = typed.trim() || existing.apiKey;
    if (!key) {
      setKeyWarning(false);
      setSaved('warn', `⚠ 未保存：未填写 ${provider.name} 的 API Key，且该厂商尚无已保存的 Key。请填入 Key 后重试。`);
      return;
    }
    const model = ($('model') as HTMLInputElement).value.trim() || provider.defaultModel;
    await store.save({
      providerId: provider.id,
      apiKey: key,
      model,
      baseURL: ($('baseURL') as HTMLInputElement).value,
      maxRounds: Number(($('maxRounds') as HTMLInputElement).value) || DEFAULT_MAX_ROUNDS,
    });
    // F-8: never leave the typed secret in the DOM after a successful save.
    ($('apiKey') as HTMLInputElement).value = '';
    setKeyWarning(true);
    setTestResult('', '');
    setSaved('ok', `✓ 已保存：${provider.name} · ${model} · Key ✅（chrome.storage.local，页面脚本不可读，明文不回显）`);
  } catch (err) {
    setSaved('err', `✖ 保存失败：${errMessage(err)}`);
  } finally {
    setBusy(false);
  }
}

/**
 * 「测试连接」：用当前表单值（含尚未保存的 Key）经 background 发一次最小真实
 * 请求，渲染可读结果。key 只作为 background 请求参数，不落日志/审计。
 */
async function handleTest(): Promise<void> {
  const btn = $('test') as HTMLButtonElement;
  if (!envGuard.inExtension) {
    setTestResult('err', `✖ 测试连接失败：${envGuard.banner}`);
    return;
  }
  const providerId = ($('provider') as HTMLSelectElement).value;
  const provider = providerById(providerId);
  btn.disabled = true;
  btn.textContent = '测试中…';
  try {
    const typed = ($('apiKey') as HTMLInputElement).value.trim();
    const stored = await store.loadProvider(provider.id);
    const apiKey = typed || stored.apiKey;
    const model = ($('model') as HTMLInputElement).value.trim() || provider.defaultModel;
    const baseURL = ($('baseURL') as HTMLInputElement).value.trim();
    if (!apiKey) {
      setTestResult('warn', `⚠ 请先填写 ${provider.name} 的 API Key 再测试连接。`);
      return;
    }
    setTestResult('', `正在向 ${provider.name} 发送最小 ping 请求…`);
    const res = (await chrome.runtime.sendMessage(
      makeMessage('llm-test', { providerId: provider.id, apiKey, model, baseURL }),
    )) as PluginResponse<TestConnectionResult> | undefined;
    if (!res?.ok || !res.data) {
      setTestResult('err', `✖ 测试连接失败：${res?.error ?? '后台无响应'}`);
      return;
    }
    const data = res.data;
    setTestResult(data.ok ? 'ok' : 'err', data.message);
  } catch (err) {
    setTestResult('err', `✖ 测试连接失败：${errMessage(err)}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '测试连接';
  }
}

// ── TASK-019 任务 C: 环境自检 / 诊断 ─────────────────────────────────────────

function manifestVersionSafe(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return 'unknown';
  }
}

async function sendDiag<T>(kind: 'diag' | 'llm-status'): Promise<PluginResponse<T> | undefined> {
  try {
    return (await chrome.runtime.sendMessage(makeMessage(kind))) as PluginResponse<T> | undefined;
  } catch {
    return undefined;
  }
}

/** Collect the six checks with real runtime calls; every failure is readable. */
async function runDiagnostics(): Promise<DiagReport> {
  const items: DiagItem[] = [extensionItem(envGuard.inExtension, envGuard.reasons)];

  // 3. storage.local read/write probe (only meaningful in an extension context).
  let storageStatus: DiagStatus = 'fail';
  let storageDetail = '非扩展环境：chrome.storage.local 不可用';
  if (envGuard.inExtension) {
    try {
      const kv = createChromeAsyncKv('web-cli-diag');
      const token = { at: Date.now() };
      await kv.set('probe', token);
      const back = await kv.get<{ at?: number }>('probe');
      await kv.remove('probe');
      if (back && typeof back.at === 'number') {
        storageStatus = 'ok';
        storageDetail = '写入测试键 → 读回一致 → 已清理';
      } else {
        storageDetail = '写入测试键后读回为空或结构不符（存储可能不可用）';
      }
    } catch (err) {
      storageDetail = `存储读写异常：${errMessage(err)}`;
    }
  }
  items.push(storageItem(storageStatus, storageDetail));

  // 4. SW connectivity + 2. version/build + 5. origins (single `diag` round trip).
  let diagData: DiagMessagePayload | undefined;
  let swStatus: DiagStatus = 'fail';
  let swDetail = '非扩展环境：无法连接 background service worker';
  if (envGuard.inExtension) {
    const t0 = Date.now();
    const res = await sendDiag<DiagMessagePayload>('diag');
    const elapsed = Date.now() - t0;
    if (res?.ok && res.data) {
      diagData = res.data;
      swStatus = 'ok';
      swDetail =
        `往返 ${elapsed} ms · SW 版本 v${res.data.version} · SW 启动于 ` +
        `${new Date(res.data.swStartedAt).toLocaleString()}`;
    } else {
      swDetail = `background 未返回有效诊断（${res?.error ?? '无响应'}）`;
    }
  }
  items.push(swItem(swStatus, swDetail));
  items.push(versionItem(manifestVersionSafe(), diagData?.version ?? null, shortBuildStamp(), diagData?.buildStamp ?? null));
  items.push(originsItem(diagData?.authorizedOrigins ?? [], diagData?.activeOrigin ?? null));

  // 6. configured provider / model (non-sensitive summary; never the key).
  let llm: LlmStatusSummary | null = null;
  if (envGuard.inExtension) {
    const res = await sendDiag<LlmStatusSummary>('llm-status');
    if (res?.ok && res.data) llm = res.data;
  }
  items.push(llmItem(Boolean(llm?.configured), llm?.providerName ?? '', llm?.model ?? ''));

  return buildReport(items, Date.now());
}

function renderDiag(report: DiagReport): void {
  lastDiag = report;
  const out = $('diag-output');
  out.textContent = '';
  for (const item of report.items) {
    const row = document.createElement('div');
    row.className = `diag-row diag-${item.status}`;
    // Defence in depth: sanitize before display too (never show a key-like token).
    row.textContent = `${diagStatusIcon(item.status)} ${item.label}：${sanitizeDiagText(item.detail)}`;
    out.appendChild(row);
  }
  const summary = document.createElement('div');
  summary.className = 'diag-summary';
  summary.textContent = summarizeReport(report).label;
  out.appendChild(summary);
  ($('diag-copy') as HTMLButtonElement).disabled = false;
}

async function copyDiagnostics(): Promise<void> {
  const btn = $('diag-copy') as HTMLButtonElement;
  if (!lastDiag) {
    $('diag-output').textContent = '请先点击「运行自检」。';
    return;
  }
  const text = renderDiagText(lastDiag);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('clipboard API 不可用');
    }
    btn.textContent = '已复制 ✓';
  } catch {
    // Fallback for pages without the async clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = '已复制 ✓';
    } catch {
      btn.textContent = '复制失败，请手动选择';
    }
    ta.remove();
  }
  setTimeout(() => {
    btn.textContent = '复制诊断信息';
  }, 2000);
}

function wire(): void {
  $('provider').addEventListener('change', () => {
    const id = ($('provider') as HTMLSelectElement).value;
    const provider = providerById(id);
    ($('model') as HTMLInputElement).value = provider.defaultModel;
    $('hint').textContent = providerHint(id);
    // The previous save summary / test result no longer match the selection.
    setSaved('', '');
    setTestResult('', '');
  });

  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    void handleSave();
  });

  $('test').addEventListener('click', () => {
    void handleTest();
  });

  $('diag-run').addEventListener('click', () => {
    const out = $('diag-output');
    out.textContent = '自检中…';
    void runDiagnostics()
      .then(renderDiag)
      .catch((err) => {
        out.textContent = `✖ 自检失败：${errMessage(err)}`;
      });
  });

  $('diag-copy').addEventListener('click', () => {
    void copyDiagnostics();
  });

  $('clear').addEventListener('click', () => {
    void (async () => {
      if (!envGuard.inExtension) {
        setSaved('err', `✖ 清除失败：${envGuard.banner}`);
        return;
      }
      try {
        await store.clear();
        setKeyWarning(false);
        setTestResult('', '');
        await refresh();
        setSaved('', '已清除本插件全部配置（含已保存的 API Key）。');
      } catch (err) {
        setSaved('err', `✖ 清除失败：${errMessage(err)}`);
      }
    })();
  });
}

wire();
applyEnvGuard();
void refresh();
// TASK-019 任务 C: run the self-check on load so the page immediately shows why
// "保存不了 / 功能不能用" (never a silent blank). Also re-runnable via「运行自检」.
void runDiagnostics()
  .then(renderDiag)
  .catch((err) => {
    $('diag-output').textContent = `✖ 自检失败：${errMessage(err)}`;
  });
