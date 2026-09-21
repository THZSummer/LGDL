/**
 * In-panel settings view (TASK-033) — the primary settings surface.
 *
 * Renders every settings section **inside the side panel** so the user never
 * has to leave for `chrome-extension://…/options.html` (no new tab, no
 * navigation, chat state preserved). All actions go through the shared
 * {@link SettingsOps} implementation, so the panel and the fallback options
 * page cannot drift.
 *
 * The DOM is built programmatically with prefixed ids (`settings-*`) so it can
 * coexist with the chat view's own controls (session switcher, consent
 * auto-auth) without duplicate-id lookups. `options.html` keeps its static
 * markup but consumes the same `SettingsOps`/view helpers.
 */
import type { EnvGuardResult } from '../../platform/env-guard.js';
import { envGuardButtonState } from '../../platform/env-guard.js';
import { providerById, DEFAULT_MAX_ROUNDS } from '../../llm/providers.js';
import type { DiagReport } from './diagnostics.js';
import { diagStatusIcon, renderDiagText, sanitizeDiagText, summarizeReport } from './diagnostics.js';
import { ensureSettingsStyles } from './styles.js';
import { buildHelpSection } from './help.js';
import { AUTO_AUTH_HARD_LINES } from '../../security/auto-authorize.js';
import { requestCapabilityPermissionOnGesture, type OptionalCapability } from '../../platform/capability-permissions.js';
import {
  AUTO_AUTH_EMPTY_TEXT,
  apiKeyPlaceholder,
  autoAuthListStatus,
  autoAuthRows,
  bookmarksCapabilityStatus,
  downloadsCapabilityStatus,
  notifyCapabilityStatus,
  clipboardCapabilityStatus,
  CAPABILITY_EXPLANATION,
  CAPABILITY_SHORT_LABEL,
  capabilityActionView,
  capabilityDeniedReceipt,
  capabilityGrantReceipt,
  capabilityStateNote,
  groupListView,
  keyStateView,
  keyWarningText,
  providerHint,
  providerOptions,
  savedSummaryView,
  type AutoAuthRecordView,
  type CapabilitiesView,
} from './view.js';
import type { OpMessageKind, SettingsOps } from './ops.js';

export interface SettingsPanelDeps {
  root: HTMLElement;
  doc: Document;
  ops: SettingsOps;
  env: EnvGuardResult;
  /** Bound site origin (undefined when no active site). */
  getActiveOrigin: () => string | undefined;
  /** Surface a readable one-off notice in the chat view. */
  onNotice?: (text: string) => void;
  /**
   * V4.5-1 W2 (TASK-V45-105 / ADR-V45-001 §4) — the「站点」分区的**长文案详情**.
   *
   * 与流内 `site` 系统行的 `title` **同源**：两者都取自 `activeSiteNotice(...).detail`
   * 这一个派生函数（面板侧只做投影；`title` 另过 `plaintextTitle` 的 fail-closed 净化）。
   * 返回空串即隐藏该行（无活跃站点且无原因时不留空白块）。
   */
  getSiteDetail?: () => string;
  /** Called after an LLM config change so the chat header status refreshes. */
  onLlmChanged?: () => void;
}

export interface SettingsPanelHandle {
  /** Reload every section from the authoritative stores. */
  refresh: () => Promise<void>;
  /** TASK-040: re-measure optional-permission grants + re-render just this section. */
  refreshCapabilities: () => Promise<void>;
  /** Re-derive origin-scoped controls (called when the active tab changes). */
  setActiveOrigin: (origin: string | undefined) => void;
  element: HTMLElement;
}

interface ElementProps {
  id?: string;
  class?: string;
  text?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  title?: string;
  for?: string;
}

function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  props: ElementProps = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (props.id) el.id = props.id;
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.title) el.title = props.title;
  if (props.for) el.setAttribute('for', props.for);
  if (props.type) el.setAttribute('type', props.type);
  if (props.placeholder) el.setAttribute('placeholder', props.placeholder);
  if (props.value !== undefined) (el as HTMLInputElement).value = props.value;
  for (const child of children) el.appendChild(typeof child === 'string' ? doc.createTextNode(child) : child);
  return el;
}

const KIND_CLASS: Record<Exclude<OpMessageKind, ''>, string> = { ok: 'ok', warn: 'warn', err: 'err' };

function setMessage(el: HTMLElement, kind: OpMessageKind, text: string): void {
  el.classList.remove('ok', 'warn', 'err');
  if (kind) el.classList.add(KIND_CLASS[kind]);
  el.textContent = text;
}

export function mountSettingsPanel(deps: SettingsPanelDeps): SettingsPanelHandle {
  const { doc, ops, env } = deps;
  const root = deps.root;
  root.classList.add('wc-settings');
  ensureSettingsStyles(doc);
  root.textContent = '';

  const disabled = !env.inExtension;
  const buttons = envGuardButtonState(env);

  // ── section 1: LLM configuration ─────────────────────────────────────────
  const llmSection = h(doc, 'section', { id: 'settings-llm', class: 'wc-section' });
  llmSection.appendChild(h(doc, 'h2', { text: 'LLM 配置' }));

  const envGuard = h(doc, 'div', { id: 'settings-env-guard', class: `wc-env-guard${env.inExtension ? '' : ' show'}` });
  envGuard.setAttribute('role', 'alert');
  envGuard.textContent = env.banner;
  llmSection.appendChild(envGuard);

  const envNote = h(doc, 'div', { id: 'settings-env-guard-note', class: `wc-env-note${env.inExtension ? '' : ' show'}` });
  if (!env.inExtension) envNote.textContent = `本面板不在扩展环境中，表单无法读写 chrome.storage.local：${env.reasons.join('；')}。`;
  llmSection.appendChild(envNote);

  const keyWarning = h(doc, 'div', { id: 'settings-key-warning', class: 'wc-warning', text: '' });
  keyWarning.setAttribute('role', 'status');
  llmSection.appendChild(keyWarning);

  const form = h(doc, 'form', { id: 'settings-form' });
  form.appendChild(h(doc, 'label', { for: 'settings-provider', text: 'LLM 厂商（8 厂商 BYOK）' }));
  const provider = h(doc, 'select', { id: 'settings-provider' });
  form.appendChild(provider);
  form.appendChild(h(doc, 'div', { id: 'settings-hint', class: 'wc-muted' }));

  form.appendChild(h(doc, 'label', { for: 'settings-apiKey', text: 'API Key' }));
  const apiKey = h(doc, 'input', { id: 'settings-apiKey', type: 'password', placeholder: apiKeyPlaceholder(false) });
  apiKey.setAttribute('autocomplete', 'off');
  form.appendChild(apiKey);
  form.appendChild(h(doc, 'div', { id: 'settings-key-state', class: 'wc-key-state' }));

  form.appendChild(h(doc, 'label', { for: 'settings-model', text: '模型' }));
  form.appendChild(h(doc, 'input', { id: 'settings-model', type: 'text' }));

  form.appendChild(h(doc, 'label', { for: 'settings-baseURL', text: '自定义 Base URL（可选）' }));
  form.appendChild(h(doc, 'input', { id: 'settings-baseURL', type: 'text', placeholder: '留空使用厂商默认' }));

  form.appendChild(h(doc, 'label', { for: 'settings-maxRounds', text: '最大执行轮数' }));
  const maxRounds = h(doc, 'input', { id: 'settings-maxRounds', type: 'number' });
  maxRounds.setAttribute('min', '1');
  form.appendChild(maxRounds);
  form.appendChild(h(doc, 'div', { id: 'settings-maxRounds-hint', class: 'wc-note', text: `默认 ${DEFAULT_MAX_ROUNDS}：单次任务中 agent 工具调用的最大轮数（防死循环）。一般无需修改。` }));

  const saveBtn = h(doc, 'button', { id: 'settings-save', type: 'submit', class: 'wc-primary', text: '保存' });
  const testBtn = h(doc, 'button', { id: 'settings-test', type: 'button', text: '测试连接' });
  const clearBtn = h(doc, 'button', { id: 'settings-clear', type: 'button', text: '清除本插件配置' });
  const llmRow = h(doc, 'div', { class: 'wc-row' }, [saveBtn, testBtn, clearBtn]);
  form.appendChild(llmRow);
  const saved = h(doc, 'div', { id: 'settings-saved', class: 'wc-msg' });
  saved.setAttribute('role', 'status');
  saved.setAttribute('aria-live', 'polite');
  form.appendChild(saved);
  const testResult = h(doc, 'div', { id: 'settings-test-result', class: 'wc-msg' });
  testResult.setAttribute('role', 'status');
  testResult.setAttribute('aria-live', 'polite');
  form.appendChild(testResult);
  form.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '「测试连接」用当前表单值（含尚未保存的 Key）向所选厂商发一次最小 ping 请求，验证 Key / 端点 / 网络；结果只显示在此处，不写入日志或审计。',
    }),
  );
  llmSection.appendChild(form);
  root.appendChild(llmSection);

  // ── section 2: auto-authorization (per site) ─────────────────────────────
  const aaSection = h(doc, 'section', { id: 'settings-auto-auth', class: 'wc-section' });
  aaSection.appendChild(h(doc, 'h2', { text: '自动授权（按站点）' }));
  aaSection.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '按站点 origin 分别设置：勾选后对应档位的操作不再弹出人工二次确认。读操作自动默认开；写操作自动默认关，且不含破坏性操作。evaluate 档与未授权站点永不自动放行。',
    }),
  );

  const aaOriginLine = h(doc, 'div', { class: 'wc-row' });
  aaOriginLine.append(
    h(doc, 'span', { class: 'wc-muted', text: '当前站点：' }),
    h(doc, 'strong', { id: 'settings-auto-auth-origin', text: '（无活跃站点）' }),
  );
  aaSection.appendChild(aaOriginLine);

  const mkTierCheck = (id: string, label: string, onChange: (v: boolean) => void) => {
    const wrap = h(doc, 'label', { class: 'wc-inline', for: id });
    const input = h(doc, 'input', { id, type: 'checkbox' }) as HTMLInputElement;
    input.disabled = true;
    input.addEventListener('change', () => onChange(input.checked));
    wrap.append(input, doc.createTextNode(` ${label}`));
    return wrap;
  };
  const autoRead = mkTierCheck('settings-auto-read', '读操作自动（默认开）', (v) => void onAutoAuth('read', v));
  const autoWrite = mkTierCheck('settings-auto-write', '写操作自动（默认关）', (v) => void onAutoAuth('write', v));
  aaSection.appendChild(autoRead);
  aaSection.appendChild(autoWrite);

  const badge = h(doc, 'button', { id: 'settings-auto-auth-badge', type: 'button', class: 'wc-badge-close' }) as HTMLButtonElement;
  badge.style.display = 'none';
  badge.title = '点击关闭该站点的自动授权（读/写都关）';
  aaSection.appendChild(badge);

  // V4.5-1 W2 (TASK-V45-105)：退役的 `#site-hint` 长文案在设置视图的站点分区里有确定归属
  // —— 只读、零控件、与流内行 `title` **同源**（不引入第二个交互面，法则六）。
  const aaSiteDetail = h(doc, 'p', { id: 'settings-site-detail', class: 'wc-note' });
  aaSection.appendChild(aaSiteDetail);
  const aaHard = h(doc, 'div', { class: 'wc-note wc-aa-note', text: AUTO_AUTH_HARD_LINES.join('') });
  aaSection.appendChild(aaHard);
  const aaList = h(doc, 'div', { id: 'settings-auto-auth-list' });
  aaSection.appendChild(aaList);
  const aaStatus = h(doc, 'div', { id: 'settings-auto-auth-status', class: 'wc-muted' });
  aaStatus.setAttribute('role', 'status');
  aaStatus.setAttribute('aria-live', 'polite');
  aaSection.appendChild(aaStatus);
  root.appendChild(aaSection);

  // ── section 3: tabs management privacy toggle ────────────────────────────
  const tabsSection = h(doc, 'section', { id: 'settings-tabs', class: 'wc-section' });
  tabsSection.appendChild(h(doc, 'h2', { text: '标签页管理（隐私）' }));
  const tabsWrap = h(doc, 'label', { class: 'wc-inline', for: 'settings-tabs-enabled' });
  const tabsCheck = h(doc, 'input', { id: 'settings-tabs-enabled', type: 'checkbox' }) as HTMLInputElement;
  tabsWrap.append(tabsCheck, doc.createTextNode(' 允许助手查看/切换标签页（默认开）'));
  tabsSection.appendChild(tabsWrap);
  tabsSection.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '开启后 LLM 工具面包含 tabs（list / switch / open / mute / pin / move / close）。list 默认只返回 origin+path（去掉 query/fragment）；switch/open/mute/pin/move/close 属敏感档位需二次确认（close 一次只关一个，摘要显示目标标题与去参数 URL，并提示不可逆）。关闭后 tabs 立即从工具面移除。',
    }),
  );
  const tabsStatus = h(doc, 'div', { id: 'settings-tabs-setting-status', class: 'wc-muted' });
  tabsStatus.setAttribute('role', 'status');
  tabsStatus.setAttribute('aria-live', 'polite');
  tabsSection.appendChild(tabsStatus);
  root.appendChild(tabsSection);

  // ── FR-054: optional-permission capabilities (bookmarks / downloads) ──────
  const capsSection = h(doc, 'section', { id: 'settings-capabilities', class: 'wc-section' });
  capsSection.appendChild(h(doc, 'h2', { text: '能力与隐私（可选权限）' }));
  capsSection.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '书签、下载记录、系统通知与剪贴板使用「可选权限」声明：静态安装面零变化、可单独撤销。每行按 Chrome 的**实测权限态**显示：未授权 →「授权 Chrome ＜能力＞权限」；已授权 →「撤销 Chrome 权限」+「✅ 已授权」徽标；已撤销 → 回到未授权并说明上次撤销。撤销走 chrome.permissions.remove（无需点击手势），工具会即时移出 LLM 工具面并写审计。写类操作需确认；删除书签属破坏性操作，即使开启「写操作自动」也不会自动放行。剪贴板的读取默认为关（隐私敏感，风险档 state），即使开启「读操作自动」也仍会请求确认；剪贴板/通知内容绝不写入审计或日志。',
    }),
  );

  interface CapRow {
    cap: OptionalCapability;
    button: HTMLButtonElement;
    badge: HTMLElement;
    status: HTMLElement;
    receipt: HTMLElement;
    read?: HTMLInputElement;
    write?: HTMLInputElement;
  }
  const capRows: CapRow[] = [];

  const mkCapRow = (
    cap: OptionalCapability,
    title: string,
    readId: string,
    readLabel: string,
    writeOpt?: { id: string; label: string },
  ): void => {
    const row = h(doc, 'div', { class: 'wc-auto-row' });
    row.appendChild(h(doc, 'strong', { text: title }));
    const status = h(doc, 'div', { id: `settings-cap-${cap}-status`, class: 'wc-muted', text: `${title}：尚未读取。` });
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    row.appendChild(status);
    // TASK-040 defect ③: plain-language explanation of the capability + why Chrome prompts.
    row.appendChild(h(doc, 'p', { id: `settings-cap-${cap}-explain`, class: 'wc-note', text: CAPABILITY_EXPLANATION[cap] }));
    const actionRow = h(doc, 'div', { class: 'wc-row' });
    const button = h(doc, 'button', {
      id: `settings-cap-${cap}-request`,
      type: 'button',
      text: capabilityActionView(cap, false, false).buttonLabel,
    }) as HTMLButtonElement;
    const badge = h(doc, 'span', { id: `settings-cap-${cap}-badge`, class: 'wc-badge-granted', text: '' });
    badge.style.display = 'none';
    actionRow.append(button, badge);
    row.appendChild(actionRow);
    // TASK-040 defect ②: prominent, persistent receipt (survives refreshes).
    const receipt = h(doc, 'div', { id: `settings-cap-${cap}-receipt`, class: 'wc-msg' });
    receipt.setAttribute('role', 'status');
    receipt.setAttribute('aria-live', 'polite');
    row.appendChild(receipt);

    const readWrap = h(doc, 'label', { class: 'wc-inline', for: readId });
    const read = h(doc, 'input', { id: readId, type: 'checkbox' }) as HTMLInputElement;
    readWrap.append(read, doc.createTextNode(` ${readLabel}`));
    row.appendChild(readWrap);
    let write: HTMLInputElement | undefined;
    if (writeOpt) {
      const writeWrap = h(doc, 'label', { class: 'wc-inline', for: writeOpt.id });
      write = h(doc, 'input', { id: writeOpt.id, type: 'checkbox' }) as HTMLInputElement;
      writeWrap.append(write, doc.createTextNode(` ${writeOpt.label}`));
      row.appendChild(writeWrap);
    }
    capsSection.appendChild(row);
    capRows.push({ cap, button, badge, status, receipt, read, write });
  };

  mkCapRow('bookmarks', '书签访问（读 + 写）', 'settings-cap-bookmarks-read', '允许读取书签（默认开）', {
    id: 'settings-cap-bookmarks-write',
    label: '允许写入书签（默认关；删除仍需确认）',
  });
  mkCapRow('downloads', '下载记录（只读）', 'settings-cap-downloads-read', '允许读取下载记录（默认开；不做取消/删除）');
  mkCapRow('notify', '系统通知（读 + 写）', 'settings-cap-notify-enabled', '允许助手发送系统通知（默认开）');
  mkCapRow(
    'clipboard',
    '剪贴板（读 + 写）',
    'settings-cap-clipboard-read',
    '允许读取剪贴板（默认关；隐私敏感，读取为 state 档、永不自动放行）',
    { id: 'settings-cap-clipboard-write', label: '允许写入剪贴板（默认开；写入需确认）' },
  );
  root.appendChild(capsSection);

  // ── section 4: session groups ────────────────────────────────────────────
  const sessSection = h(doc, 'section', { id: 'settings-sessions', class: 'wc-section' });
  sessSection.appendChild(h(doc, 'h2', { text: '会话分组（可选）' }));
  sessSection.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '默认每个域名独立一个会话（同域名的标签页共用同一份对话历史）。可把多个域名并入同一「会话组」以共享对话。分组只共享对话，不代表互相授权。',
    }),
  );
  const newGroupName = h(doc, 'input', { id: 'settings-new-group-name', type: 'text', placeholder: '新建分组名' });
  newGroupName.setAttribute('autocomplete', 'off');
  const newGroupBtn = h(doc, 'button', { id: 'settings-new-group', type: 'button', text: '新建分组' });
  sessSection.appendChild(h(doc, 'div', { class: 'wc-row' }, [newGroupName, newGroupBtn]));
  const groupList = h(doc, 'div', { id: 'settings-group-list' });
  sessSection.appendChild(groupList);
  const groupJoinRow = h(doc, 'div', { class: 'wc-row wc-stack' });
  const groupSelect = h(doc, 'select', { id: 'settings-group-target' });
  groupSelect.setAttribute('aria-label', '目标分组');
  const groupJoinBtn = h(doc, 'button', { id: 'settings-group-join', type: 'button', text: '把当前站点并入所选分组' });
  groupJoinRow.append(groupSelect, groupJoinBtn);
  sessSection.appendChild(groupJoinRow);
  const sessStatus = h(doc, 'div', { id: 'settings-sessions-status', class: 'wc-muted', text: '会话分组：尚未读取。' });
  sessStatus.setAttribute('role', 'status');
  sessStatus.setAttribute('aria-live', 'polite');
  sessSection.appendChild(sessStatus);
  root.appendChild(sessSection);

  // ── section 5: environment self-check / diagnostics ──────────────────────
  const diagSection = h(doc, 'section', { id: 'settings-diagnostics', class: 'wc-section' });
  diagSection.appendChild(h(doc, 'h2', { text: '环境自检 / 诊断' }));
  diagSection.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '逐项检测扩展上下文、版本/构建、chrome.storage.local 读写、background 连通性、已授权 origin、已配置厂商与模型（零明文）。保存不了 / 功能不能用时先看这里。',
    }),
  );
  const diagOutput = h(doc, 'div', { id: 'settings-diag-output', class: 'wc-diag-output', text: '未运行。点击下方「运行自检」。' });
  diagOutput.setAttribute('role', 'status');
  diagOutput.setAttribute('aria-live', 'polite');
  diagSection.appendChild(diagOutput);
  const diagRun = h(doc, 'button', { id: 'settings-diag-run', type: 'button', text: '运行自检' });
  const diagCopy = h(doc, 'button', { id: 'settings-diag-copy', type: 'button', text: '复制诊断信息' }) as HTMLButtonElement;
  diagCopy.disabled = true;
  diagSection.appendChild(h(doc, 'div', { class: 'wc-row' }, [diagRun, diagCopy]));
  root.appendChild(diagSection);

  // ── section 6/7: compliance + migration (collapsed) ──────────────────────
  const helpSection = h(doc, 'section', { id: 'settings-compliance', class: 'wc-section' });
  const compliance = h(doc, 'details', { id: 'settings-compliance-details' });
  compliance.appendChild(h(doc, 'summary', { text: '合规与能力边界' }));
  compliance.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '站点自动化存在账号风控、条款冲突与数据外泄风险；使用前请确认目标站点条款允许自动化。随插件仓库发布的文档：docs/compliance.md、docs/protocol.md。',
    }),
  );
  helpSection.appendChild(compliance);
  const migration = h(doc, 'details', { id: 'settings-migration' });
  migration.appendChild(h(doc, 'summary', { text: '迁移指引（不自动迁移）' }));
  migration.appendChild(
    h(doc, 'p', {
      class: 'wc-note',
      text: '本插件独立配置 LLM，不读取也不写入内置助手的本地设置。请在此面板手动重配厂商、Key、模型；首版不提供自动迁移。',
    }),
  );
  helpSection.appendChild(migration);
  root.appendChild(helpSection);

  // ── section 8/8 (V4.5-1 W3 / TASK-V45-112):「帮助」—— 只读手势表 ────────────
  // The retired in-stream L1 gesture panel (`#l1-gestures`) lives here now; the section
  // is registered in `SETTINGS_SECTION_IDS` so its count stays derived, and it renders
  // ZERO clickables (help is not an action surface).
  root.appendChild(buildHelpSection(doc, h));

  // ── state ────────────────────────────────────────────────────────────────
  let activeOrigin: string | undefined;
  let aaRows: AutoAuthRecordView[] = [];
  let capsView: CapabilitiesView | null = null;
  let lastDiag: DiagReport | null = null;

  function currentRow(): AutoAuthRecordView | undefined {
    return aaRows.find((r) => r.origin === activeOrigin);
  }

  function renderAutoAuthRows(): void {
    const read = autoRead.querySelector('input') as HTMLInputElement;
    const write = autoWrite.querySelector('input') as HTMLInputElement;
    const originEl = doc.getElementById('settings-auto-auth-origin');
    if (originEl) originEl.textContent = activeOrigin ?? '（无活跃站点）';
    const row = currentRow();
    const s = autoAuthRows(row ? [row] : [])[0];
    read.checked = Boolean(s?.read ?? (activeOrigin ? true : false));
    write.checked = Boolean(s?.write ?? false);
    read.disabled = !activeOrigin;
    write.disabled = !activeOrigin;

    const marker = s ? [s.read ? '读' : '', s.write ? '写' : ''].filter(Boolean).join('+') : '';
    badge.textContent = marker ? `⚡ 自动授权：${marker}（点击关闭）` : '';
    badge.style.display = activeOrigin && marker ? 'inline-block' : 'none';
    badge.disabled = !activeOrigin;

    aaList.textContent = '';
    if (aaRows.length === 0) {
      aaList.appendChild(h(doc, 'div', { class: 'wc-muted', text: AUTO_AUTH_EMPTY_TEXT }));
      return;
    }
    for (const rec of aaRows) {
      const rowEl = h(doc, 'div', { class: 'wc-auto-row' });
      rowEl.appendChild(h(doc, 'strong', { text: rec.origin }));
      const controls = h(doc, 'div', { class: 'wc-row' });
      const mk = (tier: 'read' | 'write', label: string) => {
        const wrap = h(doc, 'label', { class: 'wc-inline' });
        const input = h(doc, 'input', { type: 'checkbox' }) as HTMLInputElement;
        input.checked = rec[tier];
        input.dataset.tier = tier;
        input.dataset.origin = rec.origin;
        input.addEventListener('change', () => void onAutoAuth(tier, input.checked, rec.origin));
        wrap.append(input, doc.createTextNode(` ${label}`));
        return wrap;
      };
      controls.append(mk('read', '读操作自动'), mk('write', '写操作自动'));
      const off = h(doc, 'button', { type: 'button', text: '关闭该站点自动授权' });
      off.addEventListener('click', () => void onClearAutoAuth(rec.origin));
      controls.appendChild(off);
      rowEl.appendChild(controls);
      aaList.appendChild(rowEl);
    }
  }

  function renderGroups(groups: Parameters<typeof groupListView>[0]): void {
    const view = groupListView(groups);
    groupList.textContent = '';
    if (view.empty) {
      groupList.appendChild(h(doc, 'div', { class: 'wc-muted', text: '尚无分组（默认每个域名独立一个会话）。' }));
    }
    for (const row of view.rows) {
      const rowEl = h(doc, 'div', { class: 'wc-auto-row' });
      rowEl.appendChild(h(doc, 'strong', { text: row.title }));
      rowEl.appendChild(h(doc, 'div', { class: 'wc-muted', text: row.originsText }));
      const actions = h(doc, 'div', { class: 'wc-row' });
      const join = h(doc, 'button', { type: 'button', text: '把当前站点并入' });
      join.addEventListener('click', () => {
        if (!activeOrigin) {
          sessStatus.textContent = '✖ 当前没有活跃站点，无法并入分组。';
          return;
        }
        void ops.groupAction({ action: 'add', groupId: row.groupId, origin: activeOrigin }).then((res) => {
          sessStatus.textContent = res.text;
          void refreshSessions();
        });
      });
      actions.appendChild(join);
      const del = h(doc, 'button', { type: 'button', text: '删除分组' });
      del.addEventListener('click', () => {
        void ops.groupAction({ action: 'delete', groupId: row.groupId }).then((res) => {
          sessStatus.textContent = res.text;
          void refreshSessions();
        });
      });
      actions.appendChild(del);
      rowEl.appendChild(actions);
      groupList.appendChild(rowEl);
    }

    const sel = groupSelect;
    const prev = sel.value;
    sel.textContent = '';
    for (const row of view.rows) {
      const opt = h(doc, 'option', { value: row.groupId, text: row.title });
      sel.appendChild(opt);
    }
    if (view.rows.some((r) => r.groupId === prev)) sel.value = prev;
  }

  function applyLlmForm(cfg: {
    providerId: string;
    model: string;
    baseURL: string;
    maxRounds: number;
    hasKey: boolean;
  }): void {
    provider.textContent = '';
    for (const opt of providerOptions(cfg.providerId)) {
      const o = h(doc, 'option', { value: opt.value, text: opt.label }) as HTMLOptionElement;
      if (opt.selected) o.selected = true;
      provider.appendChild(o);
    }
    (doc.getElementById('settings-model') as HTMLInputElement).value = cfg.model;
    (doc.getElementById('settings-baseURL') as HTMLInputElement).value = cfg.baseURL;
    (doc.getElementById('settings-maxRounds') as HTMLInputElement).value = String(cfg.maxRounds || DEFAULT_MAX_ROUNDS);
    apiKey.value = '';
    apiKey.placeholder = apiKeyPlaceholder(cfg.hasKey);
    const ks = keyStateView(cfg.hasKey);
    const ksEl = doc.getElementById('settings-key-state');
    if (ksEl) {
      ksEl.className = `wc-key-state ${ks.kind}`;
      ksEl.textContent = ks.text;
    }
    keyWarning.textContent = keyWarningText(cfg.hasKey);
    keyWarning.classList.toggle('show', !cfg.hasKey);
    const hint = doc.getElementById('settings-hint');
    if (hint) hint.textContent = providerHint(cfg.providerId);
    const summary = savedSummaryView({ providerId: cfg.providerId as never, model: cfg.model, apiKey: cfg.hasKey ? 'x' : '' });
    setMessage(saved, summary.kind, summary.text);
  }

  // ── actions ──────────────────────────────────────────────────────────────
  async function refreshLlm(): Promise<void> {
    const res = await ops.loadLlm();
    if (!res.ok || !res.data) {
      setMessage(saved, res.kind || 'err', res.text);
      return;
    }
    applyLlmForm(res.data);
  }

  async function refreshTabs(): Promise<void> {
    const res = await ops.loadTabsSetting();
    tabsCheck.checked = res.data?.enabled ?? false;
    tabsStatus.textContent = res.data ? res.text : res.text;
  }

  function renderCapabilityStatus(): void {
    if (!capsView) return;
    const v = capsView;
    const statusById: Record<OptionalCapability, string> = {
      bookmarks: bookmarksCapabilityStatus(v.bookmarks),
      downloads: downloadsCapabilityStatus(v.downloads),
      notify: notifyCapabilityStatus(v.notify),
      clipboard: clipboardCapabilityStatus(v.clipboard),
    };
    for (const row of capRows) {
      const grant = v[row.cap];
      row.status.textContent = statusById[row.cap];
      // TASK-040: the action control is derived from the **measured** grant only.
      const action = capabilityActionView(row.cap, grant.granted, grant.revoked);
      row.button.textContent = action.buttonLabel;
      row.button.dataset.mode = action.mode;
      row.button.disabled = disabled;
      row.badge.textContent = action.badge;
      row.badge.style.display = action.badge ? 'inline-block' : 'none';
      // Persistent state note (consistent with the measured grant); an action
      // receipt set right after an action renders on top until the next refresh.
      const note = capabilityStateNote(row.cap, grant.granted, grant.revoked);
      setMessage(row.receipt, note.kind, note.text);
      // No permission → the privacy toggles fall back to「未授予」semantics (unchecked + disabled),
      // never reading as「开」while the permission is gone.
      const toggleEnabled = grant.granted && !disabled;
      if (row.read) {
        row.read.checked = grant.granted ? grant.read : false;
        row.read.disabled = !toggleEnabled;
      }
      if (row.write) {
        row.write.checked = grant.granted ? Boolean(grant.write) : false;
        row.write.disabled = !toggleEnabled;
      }
    }
  }

  async function refreshCapabilities(): Promise<void> {
    const res = await ops.loadCapabilities();
    if (!res.data) {
      for (const row of capRows) row.status.textContent = res.text;
      return;
    }
    capsView = res.data;
    renderCapabilityStatus();
  }

  async function onCapabilityPrivacy(
    cap: OptionalCapability,
    scope: 'read' | 'write',
    enabled: boolean,
    statusEl: HTMLElement,
  ): Promise<void> {
    const res = await ops.setCapabilityPrivacy(cap, scope, enabled);
    if (res.data) {
      capsView = res.data;
      renderCapabilityStatus();
    } else {
      statusEl.textContent = res.text;
      await refreshCapabilities();
    }
  }

  async function refreshAutoAuth(): Promise<void> {
    const res = await ops.loadAutoAuth();
    if (res.data) aaRows = res.data;
    renderAutoAuthRows();
    aaStatus.textContent = res.data ? autoAuthListStatus(res.data.length) : res.text;
  }

  async function refreshSessions(): Promise<void> {
    const res = await ops.loadSessions();
    renderGroups(res.data?.groups ?? []);
    sessStatus.textContent = res.ok ? `${res.text} · 分组 ${res.data?.groups.length ?? 0} 个` : res.text;
  }

  async function onSave(): Promise<void> {
    saveBtn.disabled = true;
    try {
      const res = await ops.saveLlm({
        providerId: (provider as HTMLSelectElement).value,
        apiKey: apiKey.value,
        model: (doc.getElementById('settings-model') as HTMLInputElement).value,
        baseURL: (doc.getElementById('settings-baseURL') as HTMLInputElement).value,
        maxRounds: (doc.getElementById('settings-maxRounds') as HTMLInputElement).value,
      });
      setMessage(saved, res.kind, res.text);
      if (res.ok) {
        apiKey.value = '';
        apiKey.placeholder = apiKeyPlaceholder(true);
        const ks = keyStateView(true);
        const ksEl = doc.getElementById('settings-key-state');
        if (ksEl) {
          ksEl.className = `wc-key-state ${ks.kind}`;
          ksEl.textContent = ks.text;
        }
        keyWarning.classList.remove('show');
        setMessage(testResult, '', '');
        deps.onLlmChanged?.();
      }
    } finally {
      saveBtn.disabled = disabled;
    }
  }

  async function onTest(): Promise<void> {
    testBtn.disabled = true;
    setMessage(testResult, '', '正在发送最小 ping 请求…');
    try {
      const res = await ops.testConnection({
        providerId: (provider as HTMLSelectElement).value,
        apiKey: apiKey.value,
        model: (doc.getElementById('settings-model') as HTMLInputElement).value,
        baseURL: (doc.getElementById('settings-baseURL') as HTMLInputElement).value,
      });
      setMessage(testResult, res.kind, res.text);
    } finally {
      testBtn.disabled = disabled;
    }
  }

  async function onClear(): Promise<void> {
    const res = await ops.clearLlm();
    setMessage(saved, res.kind, res.text);
    if (res.ok) await refreshLlm();
  }

  async function onAutoAuth(tier: 'read' | 'write', enabled: boolean, origin?: string): Promise<void> {
    const target = origin ?? activeOrigin;
    if (!target) return;
    const res = await ops.setAutoAuth(target, tier, enabled);
    if (res.data) aaRows = res.data;
    renderAutoAuthRows();
    aaStatus.textContent = res.text;
    if (!res.ok) await refreshAutoAuth();
  }

  async function onClearAutoAuth(origin: string): Promise<void> {
    const res = await ops.clearAutoAuth(origin);
    if (res.data) aaRows = res.data;
    renderAutoAuthRows();
    aaStatus.textContent = res.text;
    if (!res.ok) await refreshAutoAuth();
  }

  function renderDiag(report: DiagReport): void {
    lastDiag = report;
    diagOutput.textContent = '';
    for (const item of report.items) {
      const row = h(doc, 'div', { class: `wc-diag-row wc-diag-${item.status}` });
      // Defence in depth: sanitize before display (never show a key-like token).
      row.textContent = `${diagStatusIcon(item.status)} ${item.label}：${sanitizeDiagText(item.detail)}`;
      diagOutput.appendChild(row);
    }
    const summary = h(doc, 'div', { class: 'wc-diag-summary', text: summarizeReport(report).label });
    diagOutput.appendChild(summary);
    diagCopy.disabled = false;
  }

  async function runDiag(): Promise<void> {
    diagOutput.textContent = '自检中…';
    try {
      renderDiag(await ops.runDiagnostics());
    } catch (err) {
      diagOutput.textContent = `✖ 自检失败：${err instanceof Error ? err.message : String(err)}`;
    }
  }

  async function copyDiag(): Promise<void> {
    if (!lastDiag) {
      diagOutput.textContent = '请先点击「运行自检」。';
      return;
    }
    const text = renderDiagText(lastDiag);
    try {
      const clipboard = (doc.defaultView as unknown as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } })
        ?.navigator?.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(text);
        diagCopy.textContent = '已复制 ✓';
      } else {
        throw new Error('clipboard API 不可用');
      }
    } catch {
      diagCopy.textContent = '复制失败，请手动选择文本';
    }
    setTimeout(() => {
      diagCopy.textContent = '复制诊断信息';
    }, 2000);
  }

  // ── wiring ───────────────────────────────────────────────────────────────
  provider.addEventListener('change', () => {
    const id = (provider as HTMLSelectElement).value;
    (doc.getElementById('settings-model') as HTMLInputElement).value = providerById(id).defaultModel;
    const hint = doc.getElementById('settings-hint');
    if (hint) hint.textContent = providerHint(id);
    setMessage(saved, '', '');
    setMessage(testResult, '', '');
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void onSave();
  });
  testBtn.addEventListener('click', () => void onTest());
  clearBtn.addEventListener('click', () => void onClear());
  badge.addEventListener('click', () => {
    if (activeOrigin) void onClearAutoAuth(activeOrigin);
  });
  tabsCheck.addEventListener('change', () => {
    void ops.setTabsSetting(tabsCheck.checked).then((res) => {
      tabsStatus.textContent = res.text;
      if (!res.ok) void refreshTabs();
    });
  });
  // FR-054: the permission request MUST run inside this click gesture in the
  // extension page (never in the SW). The promise's UI updates happen after.
  const requestCapability = (row: (typeof capRows)[number]): void => {
    const { cap } = row;
    const label = CAPABILITY_SHORT_LABEL[cap];
    row.status.textContent = `正在请求${label}权限…（Chrome 会弹出授权提示；此请求发生在你的点击手势内）`;
    setMessage(row.receipt, '', `正在请求${label}权限…（浏览器会弹出授权提示；此请求发生在你的点击手势内）`);
    void requestCapabilityPermissionOnGesture(cap).then((res) => {
      if (!res.granted) {
        const denied = capabilityDeniedReceipt(cap, res.error);
        setMessage(row.receipt, denied.kind, denied.text);
        return;
      }
      void ops.notifyCapabilityPermissionChanged(cap).then((r) => {
        if (r.data) {
          capsView = r.data;
          renderCapabilityStatus();
        } else {
          row.status.textContent = r.text;
        }
        const granted = capabilityGrantReceipt(cap);
        setMessage(row.receipt, granted.kind, granted.text);
      });
    });
  };

  const revokeCapability = async (row: (typeof capRows)[number]): Promise<void> => {
    const { cap } = row;
    setMessage(row.receipt, '', `正在撤销${CAPABILITY_SHORT_LABEL[cap]}权限…（Chrome 会立即移除，无需弹窗）`);
    const res = await ops.revokeCapability(cap);
    if (res.data) {
      capsView = res.data;
      renderCapabilityStatus();
    } else {
      await refreshCapabilities();
    }
    setMessage(row.receipt, res.kind, res.text);
  };

  for (const row of capRows) {
    // One button, two states: request (inside the gesture) or revoke (no gesture needed).
    row.button.addEventListener('click', () => {
      if (row.button.dataset.mode === 'revoke') void revokeCapability(row);
      else requestCapability(row);
    });
    row.read?.addEventListener('change', () => {
      if (row.read) void onCapabilityPrivacy(row.cap, 'read', row.read.checked, row.status);
    });
    row.write?.addEventListener('change', () => {
      if (row.write) void onCapabilityPrivacy(row.cap, 'write', row.write.checked, row.status);
    });
  }
  newGroupBtn.addEventListener('click', () => {
    const name = newGroupName.value.trim();
    if (!name) {
      sessStatus.textContent = '✖ 请先填写分组名称。';
      return;
    }
    newGroupName.value = '';
    void ops.groupAction({ action: 'create', name }).then((res) => {
      sessStatus.textContent = res.text;
      void refreshSessions();
    });
  });
  groupJoinBtn.addEventListener('click', () => {
    if (!activeOrigin) {
      sessStatus.textContent = '✖ 当前没有活跃站点，无法并入分组。';
      return;
    }
    const groupId = groupSelect.value;
    if (!groupId) {
      sessStatus.textContent = '✖ 请先新建并选择一个分组。';
      return;
    }
    void ops.groupAction({ action: 'add', groupId, origin: activeOrigin }).then((res) => {
      sessStatus.textContent = res.text;
      void refreshSessions();
    });
  });
  diagRun.addEventListener('click', () => void runDiag());
  diagCopy.addEventListener('click', () => void copyDiag());

  if (disabled) {
    (saveBtn as HTMLButtonElement).disabled = buttons.saveDisabled;
    (testBtn as HTMLButtonElement).disabled = buttons.testDisabled;
    (clearBtn as HTMLButtonElement).disabled = buttons.clearDisabled;
    for (const row of capRows) row.button.disabled = true;
  }

  function setActiveOrigin(origin: string | undefined): void {
    activeOrigin = origin;
    renderAutoAuthRows();
  }

  async function refresh(): Promise<void> {
    // V4.5-1 W2：站点分区详情与流内 `site` 行的 `title` 同源（同一派生函数；只读投影）。
    aaSiteDetail.textContent = deps.getSiteDetail?.() ?? '';
    await refreshLlm();
    await refreshTabs();
    await refreshCapabilities();
    await refreshAutoAuth();
    await refreshSessions();
  }

  return { refresh, refreshCapabilities, setActiveOrigin, element: root };
}
