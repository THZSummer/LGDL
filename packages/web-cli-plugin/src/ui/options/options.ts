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
import {
  diagStatusIcon,
  renderDiagText,
  sanitizeDiagText,
  summarizeReport,
  type DiagReport,
} from '../settings/diagnostics.js';
import {
  API_KEY_PLACEHOLDER_EMPTY,
  API_KEY_PLACEHOLDER_SAVED,
  AUTO_AUTH_EMPTY_TEXT,
  apiKeyPlaceholder,
  autoAuthListStatus,
  autoAuthRows,
  groupListView,
  keyStateView,
  keyWarningText,
  providerHint as sharedProviderHint,
  savedSummaryView,
  tabsSettingStatus,
  type AutoAuthRecordView,
  type SessionGroupView,
} from '../settings/view.js';
import { createSettingsOps, transportFromRuntime } from '../settings/ops.js';

// TASK-033: the key placeholders now live in the shared settings module so the
// side panel and this fallback page cannot diverge. Re-exported for compatibility.
export { API_KEY_PLACEHOLDER_EMPTY, API_KEY_PLACEHOLDER_SAVED };

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

// TASK-033: all settings actions run through the shared ops implementation so
// this fallback page and the side-panel settings view cannot drift.
const settingsOps = createSettingsOps({
  env: envGuard,
  transport: transportFromRuntime(
    (typeof chrome !== 'undefined' ? chrome.runtime : { sendMessage: async () => ({ ok: false, error: '非扩展环境' }) }) as never,
  ),
  store,
  buildStamp: shortBuildStamp(),
  manifestVersion: manifestVersionSafe,
  probeStorage: async () => {
    const kv = createChromeAsyncKv('web-cli-diag');
    const token = { at: Date.now() };
    await kv.set('probe', token);
    const back = await kv.get<{ at?: number }>('probe');
    await kv.remove('probe');
    return back && typeof back.at === 'number'
      ? { status: 'ok' as const, detail: '写入测试键 → 读回一致 → 已清理' }
      : { status: 'warn' as const, detail: '写入测试键后读回为空或结构不符（存储可能不可用）' };
  },
});

// decision ② / FR-048: session-group management (create / add origin / remove / delete).
type MessageKind = 'ok' | 'warn' | 'err' | '';

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Readable hint for a provider (shared with the side-panel settings view). */
function providerHint(id: string): string {
  return sharedProviderHint(id);
}

function setMessage(el: HTMLElement, kind: MessageKind, text: string): void {
  el.classList.remove('msg-ok', 'msg-warn', 'msg-err');
  if (kind) el.classList.add(`msg-${kind}`);
  el.textContent = text;
}

const setSaved = (kind: MessageKind, text: string): void => {
  $('saved').classList.remove('flash');
  setMessage($('saved'), kind, text);
};
const setTestResult = (kind: MessageKind, text: string): void => setMessage($('test-result'), kind, text);

/** TASK-020 任务 A: the API-key placeholder reflects the saved/empty state. */
function setApiKeyPlaceholder(hasKey: boolean): void {
  ($('apiKey') as HTMLInputElement).placeholder = apiKeyPlaceholder(hasKey);
}

/**
 * TASK-020 任务 A: zero-plaintext key-state marker. `hasKey` is a boolean derived
 * from the stored config (or the `llm-status` summary) — never the key itself.
 */
function renderKeyState(hasKey: boolean): void {
  const el = $('key-state');
  const view = keyStateView(hasKey);
  el.classList.remove('ok', 'warn');
  el.classList.add(view.kind);
  el.textContent = view.text;
}

/** TASK-020 任务 A: make the success receipt visually unmistakable. */
function highlightSaved(): void {
  const el = $('saved');
  try {
    el.scrollIntoView({ block: 'nearest' });
  } catch {
    /* non-layout environments */
  }
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1500);
}

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
  box.textContent = keyWarningText(configured);
  box.classList.toggle('show', !configured);
}

/** Echo the stored config as a non-sensitive summary (never the key itself). */
function renderSavedSummary(cfg: LlmSettings): void {
  const view = savedSummaryView(cfg);
  setSaved(view.kind, view.text);
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
    setApiKeyPlaceholder(cfg.apiKey.length > 0);
    renderKeyState(cfg.apiKey.length > 0);
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
    // TASK-033: persistence + validation live in the shared settings ops.
    const res = await settingsOps.saveLlm({
      providerId,
      apiKey: ($('apiKey') as HTMLInputElement).value,
      model: ($('model') as HTMLInputElement).value,
      baseURL: ($('baseURL') as HTMLInputElement).value,
      maxRounds: ($('maxRounds') as HTMLInputElement).value,
    });
    if (!res.ok) {
      if (res.kind === 'warn') {
        setKeyWarning(false);
        renderKeyState(false);
      }
      setSaved(res.kind || 'err', res.text);
      return;
    }
    // F-8: never leave the typed secret in the DOM after a successful save.
    ($('apiKey') as HTMLInputElement).value = '';
    // TASK-020 任务 A: an empty box must read as "saved (not echoed)", not "空/失败".
    setApiKeyPlaceholder(true);
    renderKeyState(true);
    setKeyWarning(true);
    setTestResult('', '');
    setSaved('ok', res.text);
    highlightSaved();
  } catch (err) {
    setSaved('err', `✖ 保存失败：${errMessage(err)}`);
  } finally {
    setBusy(false);
  }
}

/**
 * 「测试连接」：用当前表单值（含尚未保存的 Key）经 background 发一次最小真实
 * 请求，渲染可读结果。key 只作为 background 请求参数，不落日志/审计。
 * TASK-033: the request/classification is shared with the side-panel settings view.
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
    setTestResult('', `正在向 ${provider.name} 发送最小 ping 请求…`);
    const res = await settingsOps.testConnection({
      providerId,
      apiKey: ($('apiKey') as HTMLInputElement).value,
      model: ($('model') as HTMLInputElement).value,
      baseURL: ($('baseURL') as HTMLInputElement).value,
    });
    setTestResult(res.kind === 'warn' ? 'warn' : res.ok ? 'ok' : 'err', res.text);
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

/** Collect the six checks via the shared settings ops (identical in the panel). */
async function runDiagnostics(): Promise<DiagReport> {
  return settingsOps.runDiagnostics();
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

// ── decision ② / FR-048: 会话分组管理 ───────────────────────────────────────

function renderGroups(groups: SessionGroupView[]): void {
  const box = $('group-list');
  box.textContent = '';
  // TASK-033: the row model comes from the shared view helper (panel parity).
  const view = groupListView(groups);
  if (view.empty) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = '尚无分组（默认每个域名独立一个会话）。';
    box.appendChild(empty);
  }
  for (const g of groups) {
    const row = document.createElement('div');
    row.className = 'group-row';
    const strong = document.createElement('strong');
    strong.textContent = `${g.name}（${g.origins.length} 个域名）`;
    row.appendChild(strong);
    const origins = document.createElement('div');
    origins.className = 'muted';
    origins.textContent = g.origins.length ? g.origins.join('，') : '（暂无域名）';
    row.appendChild(origins);

    const actions = document.createElement('div');
    actions.className = 'row';
    for (const origin of g.origins) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `移出 ${origin}`;
      b.addEventListener('click', () => void groupOp({ action: 'remove', origin }));
      actions.appendChild(b);
    }
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '删除分组';
    del.addEventListener('click', () => void groupOp({ action: 'delete', groupId: g.groupId }));
    actions.appendChild(del);
    row.appendChild(actions);
    box.appendChild(row);
  }

  const sel = $('group-target') as HTMLSelectElement;
  const prev = sel.value;
  sel.textContent = '';
  for (const g of groups) {
    const opt = document.createElement('option');
    opt.value = g.groupId;
    opt.textContent = g.name;
    sel.appendChild(opt);
  }
  if (groups.some((g) => g.groupId === prev)) sel.value = prev;
}

async function refreshGroups(): Promise<void> {
  const status = $('sessions-status');
  if (!envGuard.inExtension) {
    status.textContent = '非扩展环境：无法读取会话分组。';
    return;
  }
  const res = await settingsOps.loadSessions();
  if (!res.ok || !res.data) {
    status.textContent = res.text;
    return;
  }
  renderGroups(res.data.groups);
  status.textContent = `${res.text} · 分组 ${res.data.groups.length} 个`;
}

async function groupOp(payload: Record<string, unknown>): Promise<void> {
  const status = $('sessions-status');
  const res = await settingsOps.groupAction(payload);
  if (!res.ok) {
    status.textContent = res.text;
    return;
  }
  renderGroups(res.data ?? []);
  await refreshGroups();
}

// ── author decision ③ / FR-049: 标签页管理隐私开关 ─────────────────────────

function renderTabsSetting(enabled: boolean, tools?: string[]): void {
  ($('tabs-enabled') as HTMLInputElement).checked = enabled;
  // TASK-033: readable status text comes from the shared view helper.
  $('tabs-setting-status').textContent = tabsSettingStatus(enabled, tools);
}

async function refreshTabsSetting(): Promise<void> {
  const status = $('tabs-setting-status');
  if (!envGuard.inExtension) {
    status.textContent = '非扩展环境：无法读取标签页管理开关。';
    return;
  }
  const res = await settingsOps.loadTabsSetting();
  if (!res.data) {
    status.textContent = res.text;
    return;
  }
  renderTabsSetting(res.data.enabled, res.data.tools);
}

async function setTabsSetting(enabled: boolean): Promise<void> {
  const status = $('tabs-setting-status');
  const res = await settingsOps.setTabsSetting(enabled);
  if (!res.data) {
    status.textContent = res.text;
    // Re-read the authoritative state so the checkbox never lies.
    await refreshTabsSetting();
    return;
  }
  renderTabsSetting(res.data.enabled, res.data.tools);
}

// ── FR-052 / ADR-017: 按 origin 自动授权管理 ────────────────────────────────

function renderAutoAuthList(records: AutoAuthRecordView[]): void {
  const box = $('auto-auth-list');
  box.textContent = '';
  // TASK-033: normalization comes from the shared view helper (panel parity).
  const rows = autoAuthRows(records);
  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = AUTO_AUTH_EMPTY_TEXT;
    box.appendChild(empty);
    return;
  }
  for (const rec of rows) {
    const row = document.createElement('div');
    row.className = 'auto-auth-row';
    const label = document.createElement('strong');
    label.textContent = rec.origin;
    row.appendChild(label);

    const mk = (tier: 'read' | 'write', text: string) => {
      const wrap = document.createElement('label');
      wrap.className = 'inline-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = rec[tier] === true;
      input.dataset.tier = tier;
      input.dataset.origin = rec.origin;
      input.addEventListener('change', () => void setAutoAuthSetting(rec.origin, tier, input.checked));
      wrap.append(input, ` ${text}`);
      return wrap;
    };
    const controls = document.createElement('div');
    controls.className = 'row';
    controls.append(mk('read', '读操作自动'), mk('write', '写操作自动'));
    const off = document.createElement('button');
    off.type = 'button';
    off.textContent = '关闭该站点自动授权';
    off.addEventListener('click', () => void clearAutoAuthSetting(rec.origin));
    controls.appendChild(off);
    row.appendChild(controls);
    box.appendChild(row);
  }
}

async function refreshAutoAuth(): Promise<void> {
  const status = $('auto-auth-status');
  if (!envGuard.inExtension) {
    status.textContent = '非扩展环境：无法读取自动授权设置。';
    return;
  }
  const res = await settingsOps.loadAutoAuth();
  if (!res.data) {
    status.textContent = res.text;
    return;
  }
  renderAutoAuthList(res.data);
  status.textContent = autoAuthListStatus(res.data.length);
}

async function setAutoAuthSetting(origin: string, tier: 'read' | 'write', enabled: boolean): Promise<void> {
  const status = $('auto-auth-status');
  const res = await settingsOps.setAutoAuth(origin, tier, enabled);
  if (!res.data) {
    status.textContent = res.text;
    await refreshAutoAuth();
    return;
  }
  renderAutoAuthList(res.data);
  status.textContent = res.text;
}

async function clearAutoAuthSetting(origin: string): Promise<void> {
  const status = $('auto-auth-status');
  const res = await settingsOps.clearAutoAuth(origin);
  if (!res.data) {
    status.textContent = res.text;
    await refreshAutoAuth();
    return;
  }
  renderAutoAuthList(res.data);
  status.textContent = res.text;
}

function wire(): void {
  // author decision ③ / FR-049: 标签页管理隐私开关。
  $('tabs-enabled').addEventListener('change', (e) => {
    void setTabsSetting((e.target as HTMLInputElement).checked);
  });

  // decision ② / FR-048: 会话分组管理。
  $('new-group').addEventListener('click', () => {
    const input = $('new-group-name') as HTMLInputElement;
    const name = input.value.trim();
    if (!name) {
      $('sessions-status').textContent = '✖ 请先填写分组名称。';
      return;
    }
    input.value = '';
    void groupOp({ action: 'create', name });
  });
  $('group-join').addEventListener('click', () => {
    const origin = ($('group-origin') as HTMLInputElement).value.trim();
    const groupId = ($('group-target') as HTMLSelectElement).value;
    if (!origin) {
      $('sessions-status').textContent = '✖ 请填写要加入分组的域名/来源。';
      return;
    }
    if (!groupId) {
      $('sessions-status').textContent = '✖ 请先新建一个分组。';
      return;
    }
    void groupOp({ action: 'add', groupId, origin });
  });

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
      // TASK-033: shared clear implementation (panel parity, same store).
      const res = await settingsOps.clearLlm();
      if (!res.ok) {
        setSaved('err', res.text);
        return;
      }
      setKeyWarning(false);
      setTestResult('', '');
      await refresh();
      setSaved('', res.text);
    })();
  });
}

wire();
applyEnvGuard();
void refresh();
// decision ② / FR-048: load session-group state alongside the LLM config.
void refreshGroups();
// author decision ③ / FR-049: load the tab-tool privacy toggle.
void refreshTabsSetting();
// FR-052 / ADR-017: load the per-origin auto-authorization management list.
void refreshAutoAuth();
// TASK-019 任务 C: run the self-check on load so the page immediately shows why
// "保存不了 / 功能不能用" (never a silent blank). Also re-runnable via「运行自检」.
void runDiagnostics()
  .then(renderDiag)
  .catch((err) => {
    $('diag-output').textContent = `✖ 自检失败：${errMessage(err)}`;
  });
