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
  buildOnboarding,
  buttonStates,
  isLogEmpty,
  llmStatusView,
  openSettingsPage,
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
