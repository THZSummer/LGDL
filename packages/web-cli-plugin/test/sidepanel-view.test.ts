/**
 * Side-panel view-model + static-surface regression tests (TASK-017 / F-1~F-8).
 *
 * Pure logic is unit-tested directly; DOM structure that cannot run in node
 * (no jsdom dependency) is asserted against the shipped HTML/source text.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONSENT_DEFAULT_OPEN,
  CONSENT_SUMMARY_TEXT,
  LOG_EMPTY_TEXT,
  activeSiteNotice,
  buildOnboarding,
  buttonStates,
  discoveryNotice,
  isLogEmpty,
  llmStatusView,
  openSettingsPage,
  sendDisabledReason,
  stateActionFromPayload,
} from '../src/ui/sidepanel/view-model.js';
import { createInitialState, reduce } from '../src/ui/sidepanel/chat-state.js';
import { toLlmStatusSummary, type MaskedLlmLike } from '../src/llm/status.js';
import { isPluginMessage, makeMessage } from '../src/background/messaging.js';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

// ── F-2: llm-status summary + view ────────────────────────────────────────

test('llm-status: summary keeps only non-sensitive fields (never the key)', () => {
  const masked = {
    hasKey: true,
    providerId: 'deepseek',
    providerName: 'DeepSeek',
    model: 'deepseek-chat',
    apiKeyMasked: 'sk-••••',
    apiKey: 'sk-super-secret',
  } as MaskedLlmLike & { apiKeyMasked: string; apiKey: string };
  const summary = toLlmStatusSummary(masked);
  assert.deepEqual(summary, { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-chat' });
  const json = JSON.stringify(summary);
  assert.equal(json.includes('secret'), false);
  assert.equal(json.includes('apiKey'), false);
});

test('llm-status: view covers detecting / unconfigured / configured', () => {
  const detecting = llmStatusView(null);
  assert.equal(detecting.configured, false);
  assert.equal(detecting.warn, false);
  assert.match(detecting.label, /检测中/);

  const unconfigured = llmStatusView({ configured: false, providerId: 'deepseek', providerName: 'DeepSeek', model: 'x' });
  assert.equal(unconfigured.warn, true);
  assert.match(unconfigured.label, /未配置/);
  assert.match(unconfigured.settingsLabel, /配置模型/);

  const configured = llmStatusView({ configured: true, providerId: 'volc', providerName: '火山方舟 · 通用', model: 'doubao-seed-1-6-250615' });
  assert.equal(configured.configured, true);
  assert.equal(configured.warn, false);
  assert.match(configured.label, /火山方舟 · 通用/);
  assert.match(configured.label, /doubao-seed-1-6-250615/);
});

test('messaging: llm-status is a recognised kind and cannot be shadowed by payload', () => {
  assert.equal(isPluginMessage(makeMessage('llm-status')), true);
  const msg = makeMessage('llm-status', { kind: 'chat' });
  assert.equal(msg.kind, 'llm-status');
  assert.equal(isPluginMessage({ kind: 'not-a-kind' }), false);
});

// ── F-3: state-driven onboarding ──────────────────────────────────────────

test('onboarding: state-driven — emphasizes the first unfinished step only', () => {
  const base = { configured: false, hasOrigin: false, discovered: false, authorized: false, hasConversation: false };

  const fresh = buildOnboarding(base);
  assert.equal(fresh.visible, true);
  assert.equal(fresh.currentStep, 1);
  assert.equal(fresh.steps.filter((s) => s.current).length, 1);
  assert.equal(fresh.steps[0].current, true);

  const configured = buildOnboarding({ ...base, configured: true });
  assert.equal(configured.currentStep, 2, 'configured → step 2 (open a site)');

  const found = buildOnboarding({ ...base, configured: true, hasOrigin: true, discovered: true });
  assert.equal(found.currentStep, 4, 'configured + discovered → step 4 (authorize)');
  assert.equal(found.steps[3].current, true);

  const operational = buildOnboarding({ ...base, configured: true, authorized: true });
  assert.equal(operational.visible, false, 'hidden once configured + authorized');

  const done = buildOnboarding({ configured: true, hasOrigin: true, discovered: true, authorized: true, hasConversation: true });
  assert.equal(done.currentStep, null);
  assert.equal(done.steps.every((s) => s.done), true);
});

// ── F-6: button enabled/disabled semantics ────────────────────────────────

test('button states: authorize/revoke/send are consistent with the bound-origin state', () => {
  assert.deepEqual(
    buttonStates({ authorized: false, pending: false }),
    { authorizeDisabled: true, revokeDisabled: true, sendDisabled: true },
    'no active origin → nothing actionable',
  );
  assert.deepEqual(
    buttonStates({ activeOrigin: 'https://a.test', authorized: false, pending: false }),
    { authorizeDisabled: false, revokeDisabled: true, sendDisabled: false },
    'bound + unauthorized → authorize only; revoke disabled (F-6)',
  );
  assert.deepEqual(
    buttonStates({ activeOrigin: 'https://a.test', authorized: true, pending: false }),
    { authorizeDisabled: true, revokeDisabled: false, sendDisabled: false },
  );
  assert.equal(buttonStates({ activeOrigin: 'https://a.test', authorized: true, pending: true }).sendDisabled, true);
});

// ── F-5 / F-4 ─────────────────────────────────────────────────────────────

test('empty log: placeholder text is provided and only used when there are no entries', () => {
  assert.equal(isLogEmpty(0), true);
  assert.equal(isLogEmpty(2), false);
  assert.match(LOG_EMPTY_TEXT, /还没有对话/);
  assert.match(LOG_EMPTY_TEXT, /配置模型/);
});

test('empty-log centering is gated on #log having no entry elements (D-043)', () => {
  const html = read('../../src/ui/sidepanel/index.html');
  // The empty-state flex centering must not leak onto real entries when the
  // `.empty` class is stale (e.g. audit scripts inject children directly).
  assert.match(html, /#log\.empty:not\(:has\(> \*\)\)/);
  // Base log keeps its fixed height + scroll + pre-wrap semantics.
  assert.match(html, /#log \{ height: 45vh; overflow: auto;/);
  assert.match(html, /white-space: pre-wrap;/);
});

test('consent disclosure is collapsed by default while keeping the title text', () => {
  assert.equal(CONSENT_DEFAULT_OPEN, false);
  assert.equal(CONSENT_SUMMARY_TEXT, '知情同意与能力边界');
});

// ── F-1: settings entry ───────────────────────────────────────────────────

test('settings entry: openSettingsPage calls openOptionsPage (and no-ops safely)', () => {
  let called = 0;
  assert.equal(openSettingsPage({ openOptionsPage: () => { called += 1; } }), true);
  assert.equal(called, 1);
  assert.equal(openSettingsPage(undefined), false);
  assert.equal(openSettingsPage({} as { openOptionsPage(): unknown }), false);
  assert.equal(called, 1);
});

// ── W1: persisted authorization survives a side-panel reload ───────────────

test('state payload → action: authorized is synced for the bound origin (W1)', () => {
  const authorized = stateActionFromPayload({
    active: { origin: 'https://a.test', discoveryState: 'supported', invalidated: false },
    tools: [],
    authorized: true,
  });
  assert.equal(authorized.origin, 'https://a.test');
  assert.equal(authorized.authorized, true);
  assert.equal(authorized.invalidated, false);

  const unauthorized = stateActionFromPayload({
    active: { origin: 'https://a.test', discoveryState: 'supported', invalidated: false },
    tools: [],
    authorized: false,
  });
  assert.equal(unauthorized.authorized, false);

  // no bound origin → never authorized, regardless of the transport bit
  const noOrigin = stateActionFromPayload({ active: null, tools: [], authorized: true });
  assert.equal(noOrigin.origin, undefined);
  assert.equal(noOrigin.authorized, false);

  // a missing bit must not be treated as authorized
  const missing = stateActionFromPayload({
    active: { origin: 'https://a.test', invalidated: true },
    tools: [],
  });
  assert.equal(missing.authorized, false);
  assert.equal(missing.invalidated, true);
});

test('reload of an already-authorized origin keeps authorize disabled / revoke enabled (W1)', () => {
  const action = stateActionFromPayload({
    active: { origin: 'https://a.test', discoveryState: 'supported', invalidated: false },
    tools: ['site.notes-list'],
    authorized: true,
  });
  let s = createInitialState();
  s = reduce(s, action);
  const b = buttonStates({ activeOrigin: s.activeOrigin, authorized: s.authorized, pending: s.pending });
  assert.equal(s.authorized, true);
  assert.equal(b.authorizeDisabled, true, 'already authorized → authorize must stay disabled after reload');
  assert.equal(b.revokeDisabled, false, 'already authorized → revoke must be enabled after reload');
  assert.equal(b.sendDisabled, false);
});

// ── W3: llm-config exposes no key-derived string ──────────────────────────

test('service-worker llm-config returns the non-sensitive summary only (W3)', () => {
  const src = read('../../src/background/service-worker.ts');
  // The old raw `maskedConfig()` passthrough (which carried apiKeyMasked) is gone.
  assert.equal(
    /case 'llm-config':\s*return okResponse\(await s\.keys\.maskedConfig\(\)\)/.test(src),
    false,
    'llm-config must not return the raw masked config',
  );
  assert.match(src, /toLlmStatusSummary\(await s\.keys\.maskedConfig\(\)\)/);
});

// ── Static surface (shipped HTML/source) ──────────────────────────────────

test('sidepanel UI surface: settings entry, llm status, onboarding are present', () => {
  const html = read('../../src/ui/sidepanel/index.html');
  assert.match(html, /id="open-options"/);
  assert.match(html, /id="llm-status"/);
  assert.match(html, /id="onboarding"/);
  // F-7 defensive layout
  assert.match(html, /box-sizing: border-box/);
  assert.match(html, /overflow-wrap: anywhere/);
  assert.match(html, /#input \{ flex: 1; min-width: 0; \}/);
});

test('sidepanel source: consent uses <details> collapsed by default; no non-default open', () => {
  const src = read('../../src/ui/sidepanel/sidepanel.ts');
  assert.match(src, /createElement\('details'\)/);
  assert.match(src, /details\.open = CONSENT_DEFAULT_OPEN/);
  assert.equal(/details\.open = true/.test(src), false);
  // F-4: risk controls stay outside the disclosure (visible/actionable).
  assert.match(src, /section\.appendChild\(details\)/);
  // F-1 wiring
  assert.match(src, /openSettingsPage\(chrome\.runtime\)/);
  // F-5 wiring
  assert.match(src, /LOG_EMPTY_TEXT/);
});

test('options UI surface: how-to, open hint, unconfigured warning, maxRounds hint', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /如何使用/);
  assert.match(html, /本页如何打开/);
  assert.match(html, /id="key-warning"/);
  assert.match(html, /id="maxRounds-hint"/);
  assert.match(html, /默认 1000/);
  assert.match(html, /box-sizing: border-box/);
});

test('options source: clears the API key input after save and toggles the warning', () => {
  const src = read('../../src/ui/options/options.ts');
  assert.match(src, /\(\$\('apiKey'\) as HTMLInputElement\)\.value = '';/);
  assert.match(src, /setKeyWarning/);
});

// ── TASK-018: options save hardening + 「测试连接」 ─────────────────────────

test('messaging: llm-test is a recognised kind', () => {
  assert.equal(isPluginMessage(makeMessage('llm-test')), true);
  assert.equal(isPluginMessage({ kind: 'llm-test' }), true);
});

test('options UI surface (TASK-018): save / test-connection buttons + result area', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /id="save"/);
  assert.match(html, /id="test"/);
  assert.match(html, /id="test-result"/);
  assert.match(html, /测试连接/);
});

test('options source (TASK-018): save/test wrapped in try-catch with readable failures', () => {
  const src = read('../../src/ui/options/options.ts');
  // readable failure text (never a silent void)
  assert.match(src, /保存失败/);
  assert.match(src, /测试连接失败/);
  assert.match(src, /未保存：未填写/);
  assert.match(src, /async function handleSave/);
  assert.match(src, /async function handleTest/);
  // the save summary must echo provider · model · key state
  assert.match(src, /renderSavedSummary/);
  assert.match(src, /Key ✅/);
  // the plaintext key is cleared after a successful save
  assert.match(src, /\(\$\('apiKey'\) as HTMLInputElement\)\.value = '';/);
  // the save/test flows are error-handled (readable, not a silent void)
  assert.match(src, /catch \(err\)[\s\S]*?setSaved\('err'/);
});

test('service-worker (TASK-018): llm-test runs a real minimal request and never audits the key', () => {
  const src = read('../../src/background/service-worker.ts');
  assert.match(src, /case 'llm-test'/);
  assert.match(src, /testLlmConnection\(/);
  // key is only passed as a request param — no audit.record / console.log with key
  assert.equal(/llm-test[\s\S]{0,400}audit\.record/.test(src), false);
});

// ── TASK-019 任务 A: 非扩展上下文守卫 ──────────────────────────────────────

test('env-guard (TASK-019 A): options + sidepanel block outside the extension', () => {
  const optHtml = read('../../src/ui/options/index.html');
  assert.match(optHtml, /id="env-guard"/);
  assert.match(optHtml, /id="env-guard-note"/);

  const optSrc = read('../../src/ui/options/options.ts');
  assert.match(optSrc, /detectExtensionEnv/);
  assert.match(optSrc, /applyEnvGuard/);
  assert.match(optSrc, /envGuardButtonState/);

  const spHtml = read('../../src/ui/sidepanel/index.html');
  assert.match(spHtml, /id="env-guard"/);

  const spSrc = read('../../src/ui/sidepanel/sidepanel.ts');
  assert.match(spSrc, /detectExtensionEnv/);
  assert.match(spSrc, /applyEnvGuard/);
});

// ── TASK-019 任务 B: 站点未声明协议的显式说明 ───────────────────────────────

test('discovery notice (TASK-019 B): three states, never a false claim', () => {
  // supported / not-yet-probed → hidden (does not shout when it works)
  assert.equal(discoveryNotice('supported').visible, false);
  assert.equal(discoveryNotice(undefined).visible, false);
  assert.equal(discoveryNotice(null).visible, false);

  // unsupported → design-not-a-bug explanation + how to verify, no retry
  const undeclared = discoveryNotice('unsupported');
  assert.equal(undeclared.visible, true);
  assert.equal(undeclared.kind, 'not-declared');
  assert.match(undeclared.title, /未声明/);
  assert.match(undeclared.detail, /设计如此/);
  assert.match(undeclared.detail, /不是故障/);
  assert.match(undeclared.detail, /LGDL/);
  assert.match(undeclared.detail, /\.well-known\/web-cli\.json|link/);
  assert.equal(undeclared.canRetry, false);

  // unknown → readable reason + retry entry
  const failed = discoveryNotice('unknown', '声明文件获取失败：HTTP 500');
  assert.equal(failed.visible, true);
  assert.equal(failed.kind, 'probe-failed');
  assert.match(failed.detail, /HTTP 500/);
  assert.equal(failed.canRetry, true);
  assert.equal(failed.retryLabel, '重新探测');

  // unknown without a reason still yields a readable default (not blank)
  const generic = discoveryNotice('unknown');
  assert.ok(generic.detail.length > 10);
});

test('discovery notice payload (TASK-019 B): discoveryReason survives the state projection', () => {
  const action = stateActionFromPayload({
    active: { origin: 'https://a.test', discoveryState: 'unknown', discoveryReason: '声明文件获取失败：HTTP 500', invalidated: false },
    tools: [],
    authorized: false,
  });
  assert.equal(action.discoveryState, 'unknown');
  assert.equal(action.discoveryReason, '声明文件获取失败：HTTP 500');

  let s = createInitialState();
  s = reduce(s, action);
  assert.equal(s.discoveryReason, '声明文件获取失败：HTTP 500');
  const notice = discoveryNotice(s.discoveryState, s.discoveryReason);
  assert.match(notice.detail, /HTTP 500/);

  // background honours the reported three-state + reason (not "descriptor → supported else unsupported")
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /reported === 'unknown'/);
  assert.match(sw, /setDiscovery\(state, undefined, reason\)/);
  assert.match(sw, /discoveryReason/);
});

test('discovery notice wiring (TASK-019 B): sidepanel exposes the notice + reprobe entry', () => {
  const html = read('../../src/ui/sidepanel/index.html');
  assert.match(html, /id="discovery-notice"/);
  assert.match(html, /id="discovery-title"/);
  assert.match(html, /id="discovery-detail"/);
  assert.match(html, /id="discovery-retry"/);

  const src = read('../../src/ui/sidepanel/sidepanel.ts');
  assert.match(src, /renderDiscoveryNotice\(\)/);
  assert.match(src, /makeMessage\('reprobe'\)/);

  const messaging = read('../../src/background/messaging.ts');
  assert.match(messaging, /'reprobe'/);
  assert.match(messaging, /'diag'/);
});

// ── TASK-019 任务 C: 环境自检 / 诊断面板 ────────────────────────────────────

test('diagnostics UI (TASK-019 C): options exposes the self-check panel + copy', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /id="diagnostics"/);
  assert.match(html, /id="diag-output"/);
  assert.match(html, /id="diag-run"/);
  assert.match(html, /id="diag-copy"/);
  assert.match(html, /环境自检/);

  const src = read('../../src/ui/options/options.ts');
  assert.match(src, /runDiagnostics/);
  assert.match(src, /renderDiag/);
  assert.match(src, /copyDiagnostics/);
  assert.match(src, /renderDiagText/);
  // the diagnostics path never prints/echoes a key
  assert.equal(/console\.(log|warn|error)\([^)]*apiKey/.test(src), false);
});

// ── TASK-020：保存后呈现 / 无活跃站点自救 / 侧栏 Key 状态 / 侧栏测试连接 ──────

test('TASK-020 C: llm-status view carries an explicit Key marker (zero plaintext)', () => {
  const configured = llmStatusView({ configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-flash' });
  assert.match(configured.label, /DeepSeek/);
  assert.match(configured.label, /deepseek-flash/);
  assert.match(configured.label, /Key ✅/);

  const missing = llmStatusView({ configured: false, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-flash' });
  assert.match(missing.label, /Key ⚠未配置/);
  assert.equal(missing.warn, true);

  // detecting must not claim a key state it does not know yet
  const detecting = llmStatusView(null);
  assert.equal(/Key ✅|Key ⚠/.test(detecting.label), false);
});

test('TASK-020 B: activeSiteNotice separates restricted / unbound / no-tab with an action', () => {
  // bound origin → hidden (the status line already carries the site identity)
  assert.equal(activeSiteNotice({ hasOrigin: true, tab: { present: true, restricted: true, reason: 'x' } }).visible, false);

  const restricted = activeSiteNotice({
    hasOrigin: false,
    tab: { present: true, restricted: true, reason: '扩展页面（chrome-extension://），扩展无法注入' },
  });
  assert.equal(restricted.visible, true);
  assert.equal(restricted.kind, 'restricted-tab');
  assert.match(restricted.title, /不可注入/);
  assert.match(restricted.detail, /chrome-extension/);
  assert.match(restricted.action, /重新绑定当前标签页/);

  const unbound = activeSiteNotice({ hasOrigin: false, tab: { present: true, origin: 'https://a.test', restricted: false } });
  assert.equal(unbound.kind, 'unbound-tab');
  assert.match(unbound.detail, /https:\/\/a\.test/);
  assert.match(unbound.action, /插件图标|重新绑定/);

  const noTab = activeSiteNotice({ hasOrigin: false, tab: { present: false, restricted: true, reason: '没有可用标签页' } });
  assert.equal(noTab.kind, 'no-tab');
  assert.match(noTab.action, /重新绑定当前标签页/);
});

test('TASK-020 B: sendDisabledReason is readable and empty only when send is enabled', () => {
  assert.equal(sendDisabledReason({ activeOrigin: 'https://a.test', pending: false }), '');
  assert.match(sendDisabledReason({ activeOrigin: 'https://a.test', pending: true }), /处理中/);

  const noOrigin = sendDisabledReason({
    activeOrigin: undefined,
    pending: false,
    tab: { present: true, restricted: true, reason: '扩展页面（chrome-extension://），扩展无法注入' },
  });
  assert.match(noOrigin, /发送已禁用/);
  assert.match(noOrigin, /不可注入/);
  assert.match(noOrigin, /重新绑定当前标签页/);

  const noTab = sendDisabledReason({ activeOrigin: undefined, pending: false, tab: null });
  assert.match(noTab, /没有可用标签页/);
});

// D-064: the single biggest real-world confusion was "无活跃站点" + the
// misleading "当前标签页没有可读取的地址". An unreadable address is the normal
// not-bound-yet state; the panel must say so and point at the icon click.
test('D-064: addressUnreadable is framed as「尚未绑定」and points at the icon click', () => {
  const unreadable = { present: true, restricted: true, addressUnreadable: true, reason: '无法读取当前标签页地址（请在目标站点标签页点击浏览器工具栏的插件图标）' } as const;
  const view = activeSiteNotice({ hasOrigin: false, tab: unreadable });
  assert.equal(view.kind, 'unbound-tab');
  assert.match(view.title, /尚未绑定/);
  assert.equal(/不可注入/.test(`${view.title}${view.detail}`), false, 'must not call a normal page restricted');
  assert.match(view.detail, /插件图标/);
  assert.match(view.action, /插件图标/);
  assert.equal(/没有可读取的地址/.test(`${view.title}${view.detail}${view.action}`), false);

  const sendReason = sendDisabledReason({ activeOrigin: undefined, pending: false, tab: unreadable });
  assert.match(sendReason, /发送已禁用/);
  assert.match(sendReason, /插件图标/);
});

test('D-064: onboarding states the icon click is the ONLY bind trigger', () => {
  const view = buildOnboarding({ configured: true, hasOrigin: false, discovered: false, authorized: false, hasConversation: false });
  assert.match(view.steps[2].text, /插件图标/);
  assert.match(view.steps[2].text, /唯一触发点/);
  assert.equal(view.currentStep, 2, 'configured → next action is step 2 (open a site)');
});

test('TASK-020 B/D: sidepanel exposes site-hint / rebind / llm-test surfaces', () => {
  const html = read('../../src/ui/sidepanel/index.html');
  assert.match(html, /id="site-hint"/);
  assert.match(html, /id="site-hint-title"/);
  assert.match(html, /id="site-hint-detail"/);
  assert.match(html, /id="site-hint-action"/);
  assert.match(html, /id="rebind"/);
  assert.match(html, /重新绑定当前标签页/);
  assert.match(html, /id="send-reason"/);
  assert.match(html, /id="llm-test"/);
  assert.match(html, /id="llm-test-result"/);

  const src = read('../../src/ui/sidepanel/sidepanel.ts');
  assert.match(src, /renderSiteHint\(\)/);
  assert.match(src, /renderSendReason\(\)/);
  assert.match(src, /makeMessage\('rebind'\)/);
  assert.match(src, /makeMessage\('llm-test'/);
  // env guard disables the panel-side rebind / test entries outside the extension
  assert.match(src, /'rebind', 'llm-test'/);

  assert.match(read('../../src/background/messaging.ts'), /'rebind'/);
});

test('TASK-020 A: options exposes a saved-key state marker + saved placeholder', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /id="key-state"/);
  assert.match(html, /id="test" class="test-primary"/);

  const src = read('../../src/ui/options/options.ts');
  assert.match(src, /API_KEY_PLACEHOLDER_SAVED = '已保存（不回显）；如需更换请重新输入'/);
  assert.match(src, /renderKeyState\(true\)/);
  assert.match(src, /Key ✅ 已写入（不回显）/);
  assert.match(src, /⚠ 未配置 Key —— 保存后仍无法调用 LLM/);
  assert.match(src, /setApiKeyPlaceholder\(true\)/);
  assert.match(src, /highlightSaved\(\)/);
  // a successful save still clears the input (F-8) — the marker makes it non-ambiguous
  assert.match(src, /\(\$\('apiKey'\) as HTMLInputElement\)\.value = '';/);
  // never echo a plaintext key into the receipt
  assert.equal(/已保存：[\s\S]{0,80}apiKey/.test(src), false);
});

