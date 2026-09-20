/**
 * F 还原度快修轮（2026-09-20，FIX-1）—— **授权 chip 直达授权流** 的布线门禁。
 *
 * ── 缺陷（真机首屏评估发现） ─────────────────────────────────────────────────
 *
 * `recommend.ts` 的 onboarding 规则里，「授权当前站点」chip 曾带 `act:'next'` ⇒
 * `handleCardAction` 的 `'next'` 分支把字符串当**聊天消息**发给 LLM（`requestTurn`）。
 * 而授权实际是**浏览器权限流**（`chrome.permissions.request`），唯一入口在面板侧
 * `authorizeCurrentSite()`（设置视图 `#authorize` 按钮原本内联的那段）。
 *
 * ── 两条硬判据，都可失败 ─────────────────────────────────────────────────────
 *
 *   AC-1  权限请求只有一个调用点（`requestOriginPermissionDetailed` 恰 1 处，位于
 *         `authorizeCurrentSite()` 内），且该函数恰有 2 个调用点（`#authorize` 监听器
 *         + `handleCardAction` 的 `'authorize'` 分支）。
 *   AC-2  `handleCardAction` 的 `'authorize'` 分支**不得**出现 `requestTurn(` ——
 *         授权不是回合（与 `repick` 同理：本地行为、不受 `pending` 门控）。
 *
 * 判据函数导出，便于把**伪造源码**指给同一判据、证明门禁能红（反证在本文件内实跑）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { NEXTSTEP_ACTS, candidateRules } from '../src/ui/sidepanel/recommend.js';

// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`, so a
// `new URL('../src/…', import.meta.url)` would look inside `dist-test/src/`.
const PKG = fileURLToPath(new URL('../../', import.meta.url));
const SIDEPANEL = readFileSync(join(PKG, 'src/ui/sidepanel/sidepanel.ts'), 'utf8');

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

/** AC-1a: call sites of the permission request (the import line is not a call). */
export function permissionRequestSites(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  source.split('\n').forEach((raw, i) => {
    if (isComment(raw)) return;
    if (!/requestOriginPermissionDetailed\s*\(/.test(raw)) return;
    if (/^\s*import\b/.test(raw)) return;
    out.push({ line: i + 1, text: raw.trim() });
  });
  return out;
}

/** AC-1b: call sites of the single authorize entry (declaration excluded). */
export function authorizeEntryCallSites(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  source.split('\n').forEach((raw, i) => {
    if (isComment(raw)) return;
    if (!/authorizeCurrentSite\s*\(/.test(raw)) return;
    if (/function\s+authorizeCurrentSite\s*\(/.test(raw)) return; // declaration
    out.push({ line: i + 1, text: raw.trim() });
  });
  return out;
}

/**
 * AC-2: the body of `handleCardAction`'s `'authorize'` branch, or `null` when the
 * branch is missing. Indentation-based — the branch is a two-space-indented `if`.
 */
export function authorizeBranchBody(source: string): string | null {
  const m = /\n {2}if \(action === 'authorize'\) \{\n([\s\S]*?)\n {2}\}/.exec(source);
  return m ? m[1] : null;
}

// ── AC-1 ─────────────────────────────────────────────────────────────────────

test('AC-1 权限请求唯一调用点（requestOriginPermissionDetailed 恰 1 处）', () => {
  const sites = permissionRequestSites(SIDEPANEL);
  assert.equal(
    sites.length,
    1,
    `requestOriginPermissionDetailed 只允许出现在 authorizeCurrentSite 内，实测 ${sites.length} 处：${JSON.stringify(sites)}`,
  );
  assert.match(sites[0].text, /await\s+requestOriginPermissionDetailed\(origin\)/);
});

test('AC-1 授权单一入口 authorizeCurrentSite：声明 1 处 + 调用 2 处（设置按钮 + chip 分支）', () => {
  const calls = authorizeEntryCallSites(SIDEPANEL);
  assert.equal(
    calls.length,
    2,
    `authorizeCurrentSite 必须恰有 2 个调用点（#authorize 监听器 + handleCardAction 的 authorize 分支），实测 ${calls.length}：${JSON.stringify(calls)}`,
  );
  assert.ok(
    calls.some((c) => /addEventListener\('click', \(\) => authorizeCurrentSite\(\)\)/.test(c.text)),
    `设置按钮必须复用同一入口：${JSON.stringify(calls)}`,
  );
  assert.ok(
    calls.some((c) => /^\s*authorizeCurrentSite\(\);$/.test(c.text)),
    `chip 分支必须复用同一入口：${JSON.stringify(calls)}`,
  );
});

// ── AC-2 ─────────────────────────────────────────────────────────────────────

test('AC-2 授权分支走本地权限流，不得把「授权当前站点」当聊天消息（无 requestTurn）', () => {
  const body = authorizeBranchBody(SIDEPANEL);
  assert.ok(body, 'handleCardAction 必须存在 authorize 分支');
  assert.match(body as string, /authorizeCurrentSite\(\)/, 'authorize 分支必须调用单一授权入口');
  assert.ok(!/requestTurn\s*\(/.test(body as string), 'authorize 分支不得出现 requestTurn（授权不是回合）');
});

// ── 反证：伪造源码 ⇒ 同一判据必红 ────────────────────────────────────────────

test('AC-1 反证：伪造第二处权限请求调用 ⇒ 唯一入口判定必红', () => {
  const forged = `${SIDEPANEL}\n  void requestOriginPermissionDetailed('https://x.test');\n`;
  assert.equal(permissionRequestSites(forged).length, 2, '伪造调用必须被计数为第二处');
});

test('AC-1 反证：伪造第三处 authorizeCurrentSite() ⇒ 调用点数判定必红', () => {
  const forged = `${SIDEPANEL}\n  authorizeCurrentSite();\n`;
  assert.equal(authorizeEntryCallSites(forged).length, 3, '伪造调用必须被计数为第三处');
});

test('AC-2 反证：把 authorize 分支改回 requestTurn ⇒ 回合判定必红', () => {
  const body = authorizeBranchBody(SIDEPANEL);
  assert.ok(body, '前置：分支存在');
  const forged = SIDEPANEL.replace(body as string, body!.replace('authorizeCurrentSite();', "requestTurn('授权当前站点');"));
  const forgedBody = authorizeBranchBody(forged);
  assert.ok(forgedBody && /requestTurn\s*\(/.test(forgedBody), '伪造分支必须被同一判据识别为回合');
});

// ── 与 act 闭集同源 ──────────────────────────────────────────────────────────

test('act 闭集含 authorize，且 onboarding 授权 chip 实际产出该 act（与运行时同源）', () => {
  assert.ok((NEXTSTEP_ACTS as readonly string[]).includes('authorize'), 'NEXTSTEP_ACTS 必须含 authorize');
  const onboarding = candidateRules({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: false, trust: 'untrusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'idle', steady: false },
    risks: [],
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    now: 1,
  }).find((c) => c.rule === 'onboarding');
  assert.equal(onboarding?.chips[0]?.act, 'authorize');
});
