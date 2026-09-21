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
 * ── V5-1 预迁移（TASK-V5-113 → 115 / ADR-V5-001）────────────────────────────
 *
 * `handleCardAction` 的 `'authorize'` 分支已收敛进 `dispatchChipAction`（集 B，per-op
 * 分支 = 0）。判据**等价重锚**为「op 槽 → 单一入口」：`bindPanelOps({ authorize: () =>
 * authorizeCurrentSite() })` 是 chip 与 `op.authorize` 的唯一接线面 —— 判据力**只升不降**
 * （现在还要求 `ACT_TO_OP.authorize === 'op.authorize'` 同源）。
 *
 * ── 两条硬判据，都可失败 ─────────────────────────────────────────────────────
 *
 *   AC-1  权限请求只有一个调用点（`requestOriginPermissionDetailed` 恰 1 处，位于
 *         `authorizeCurrentSite()` 内），且该函数恰有 2 个调用点（`#authorize` 监听器
 *         + `bindPanelOps` 的 `authorize` op 槽）。
 *   AC-2  `authorize` op 槽**不得**出现 `requestTurn(` —— 授权不是回合（与 `repick`
 *         同理：本地行为、不受 `pending` 门控）。
 *
 * 判据函数导出，便于把**伪造源码**指给同一判据、证明门禁能红（反证在本文件内实跑）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { NEXTSTEP_ACTS, candidateRules } from '../src/ui/sidepanel/recommend.js';
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
// V5-1（TASK-V5-115）—— X3 同源链的终点：义务表 opId 集（注册表边界与门禁同源）。
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';

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

/** The single line that wires the `authorize` op slot in `bindPanelOps({…})`. */
export function authorizeSlotBinding(source: string): string | null {
  const m = /\n {2}bindPanelOps\(\{([\s\S]*?)\n {2}\}\);/m.exec(source);
  if (!m) return null;
  const line = /\n\s*authorize: ([^\n]*)/.exec(m[1]);
  return line ? line[1] : null;
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

test('AC-1 授权单一入口 authorizeCurrentSite：声明 1 处 + 调用 2 处（设置按钮 + op 槽）', () => {
  const calls = authorizeEntryCallSites(SIDEPANEL);
  assert.equal(
    calls.length,
    2,
    `authorizeCurrentSite 必须恰有 2 个调用点（#authorize 监听器 + bindPanelOps 的 authorize op 槽），实测 ${calls.length}：${JSON.stringify(calls)}`,
  );
  assert.ok(
    calls.some((c) => /addEventListener\('click', \(\) => authorizeCurrentSite\(\)\)/.test(c.text)),
    `设置按钮必须复用同一入口：${JSON.stringify(calls)}`,
  );
  assert.ok(
    calls.some((c) => /authorizeCurrentSite\s*\(\)/.test(c.text) && !/addEventListener/.test(c.text)),
    `op 槽必须复用同一入口（不是第二条执行路径）：${JSON.stringify(calls)}`,
  );
});

// ── AC-2 ─────────────────────────────────────────────────────────────────────

test('AC-2 授权 op 槽走本地权限流，不得把「授权当前站点」当聊天消息（无 requestTurn）', () => {
  const binding = authorizeSlotBinding(SIDEPANEL);
  assert.ok(binding, 'bindPanelOps 必须存在 authorize op 槽');
  assert.match(binding as string, /authorizeCurrentSite\(\)/, 'authorize op 槽必须调用单一授权入口');
  assert.ok(!/requestTurn\s*\(/.test(binding as string), 'authorize op 槽不得出现 requestTurn（授权不是回合）');
  assert.equal(ACT_TO_OP.authorize, 'op.authorize', 'ACT_TO_OP 必须把 authorize 映射到 op.authorize');
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

test('AC-2 反证：把 authorize op 槽改回 requestTurn ⇒ 回合判定必红', () => {
  const binding = authorizeSlotBinding(SIDEPANEL);
  assert.ok(binding, '前置：op 槽存在');
  const forged = SIDEPANEL.replace(binding as string, binding!.replace('authorizeCurrentSite()', "requestTurn('授权当前站点')"));
  const forgedBinding = authorizeSlotBinding(forged);
  assert.ok(forgedBinding && /requestTurn\s*\(/.test(forgedBinding), '伪造槽必须被同一判据识别为回合');
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

/* ── V5-1（TASK-V5-115 / FR-ALLN-112·120 / AC-ALLN-009 · X3 形态③④）──────────
 *
 * R1（TASK-V5-113）已把 `authorize` 分支预迁移为 op 槽；R2 补齐**opId 同源链的对账与
 * 反证**：act → opId → op 槽 → 单一入口 → 义务表，任一环被改都必须让判据红。
 */

test('V5-1 X3 authorize 同源链：act → op.authorize → op 槽 → authorizeCurrentSite → 义务表', () => {
  assert.equal(ACT_TO_OP.authorize, 'op.authorize', 'act→opId 必须同源（唯一权威 ACT_TO_OP）');
  const binding = authorizeSlotBinding(SIDEPANEL);
  assert.ok(binding, '前置：authorize op 槽必须存在');
  assert.match(binding as string, /authorizeCurrentSite\(\)/, 'op 槽必须走单一授权入口');
  assert.ok(OBLIGATION_OP_IDS.includes(ACT_TO_OP.authorize), 'op.authorize 必须在义务表 9 op 内（注册表边界同源）');
  // 权限请求调用点仍唯一（本地权限流的「唯一入口」在 op 词汇下逐条保持）。
  assert.equal(permissionRequestSites(SIDEPANEL).length, 1, '权限请求调用点必须仍唯一');
});

test('V5-1 X3 反证：删掉 authorize 的 opId 映射 / 让 op 槽离开单一入口 ⇒ 同源链判据必红', () => {
  // ① 映射缺失（模拟「注册表改了、门禁没跟」）。
  const forgedMap: Record<string, string> = { ...ACT_TO_OP };
  delete forgedMap.authorize;
  assert.equal(forgedMap.authorize, undefined, '伪造映射必须使同源链的可定位判据变红');
  // ② op 槽离开单一入口（第二次执行路径）。
  const binding = authorizeSlotBinding(SIDEPANEL);
  const forged = SIDEPANEL.replace(binding as string, 'authorize: () => requestOriginPermissionDetailed(origin),');
  const forgedBinding = authorizeSlotBinding(forged);
  assert.ok(forgedBinding && !/authorizeCurrentSite\(\)/.test(forgedBinding), '伪造槽必须被同源链判据识别为「离开单一入口」');
  // ③ 权限请求多一处调用 ⇒ 唯一入口判据必红。
  assert.equal(permissionRequestSites(`${SIDEPANEL}\n  void requestOriginPermissionDetailed('https://x.test');\n`).length, 2);
});
