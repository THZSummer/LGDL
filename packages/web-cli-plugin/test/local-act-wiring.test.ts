/**
 * V4.5-1 **W1 / TASK-V45-101** — the **node-gate skeleton** for ADR-V45-007
 * (`risk-recovery` 扩展 + act 闭集 6 项 + 本地 act 单一生产入口).
 *
 * ── Why a NEW gate ──────────────────────────────────────────────────────────
 *
 * FIX-1 (2026-09-20) established the precedent: a **local** act (`authorize`) must
 * reach exactly ONE production entry (`authorizeCurrentSite()`), must never be turned
 * into a chat message (`requestTurn`), and the deny set may only ever judge
 * `act === 'next'`. v4.5 adds two more local acts (`rebind` → `rebindCurrentTab()`,
 * `help` → `openSettingsSection('settings-help')`), and `#rebind` already has a
 * second UI entrance (the settings view). R-REG-905 =「双入口漂移」— the structural
 * defence is a **call-site** gate, not a review finding.
 *
 * ── W1 形态（骨架） ─────────────────────────────────────────────────────────
 *
 * The judge functions are pure source-text extractors (same technique as the
 * `authorize-chip-wiring.test.ts` precedent) and are exercised against the **real**
 * source for the shipped act (`authorize`) plus synthetic sources for the reverse
 * proofs. `rebind` / `help` are declared in {@link LOCAL_ACT_SLOTS} with
 * `status: 'pending-w3'`; `TASK-V45-112` flips them to `landed` and adds the live
 * assertions — the extractors themselves never change.
 *
 * ── Falsifiability ──────────────────────────────────────────────────────────
 *
 * Every judgement carries a literal `expectFailPattern`; the reverse proofs assert
 * the declared fragment really appears on the forged source (≥3 groups), so a
 * judgement cannot be「declared but unable to fire」.
 *
 * @module test/local-act-wiring
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { NEXTSTEP_ACTS, candidateRules } from '../src/ui/sidepanel/recommend.js';

// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`, so a
// `new URL('../src/…', import.meta.url)` would look inside `dist-test/src/`.
const PKG = fileURLToPath(new URL('../../', import.meta.url));
const SIDEPANEL = readFileSync(join(PKG, 'src/ui/sidepanel/sidepanel.ts'), 'utf8');

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The extractors (pure; each one is the judge for one problem class)
 * ──────────────────────────────────────────────────────────────────────────── */

/** `expectFailPattern` of every judgement declared by this gate. */
export interface LocalActJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
  readonly status: 'landed' | 'pending-w3';
}

export const JUDGEMENTS: readonly LocalActJudgement[] = [
  { id: 'LA-1-single-entry', expectFailPattern: '唯一调用点判据失败：', status: 'landed' },
  { id: 'LA-2-call-site-set', expectFailPattern: '调用点集合判据失败：', status: 'landed' },
  { id: 'LA-3-no-request-turn', expectFailPattern: '本地 act 分支不得出现 requestTurn', status: 'landed' },
  { id: 'LA-4-closed-set-same-source', expectFailPattern: 'act 闭集同源判据失败：', status: 'landed' },
  { id: 'LA-5-rebind-entry', expectFailPattern: '（W3 实体化：rebind 唯一入口）', status: 'pending-w3' },
  { id: 'LA-6-help-entry', expectFailPattern: '（W3 实体化：help 唯一入口）', status: 'pending-w3' },
];

/**
 * The local acts and their declared single production entrance.
 * `status: 'pending-w3'` items are declared-but-not-yet-shipped: asserting them now
 * would be a fake FAIL, so W1 only records them (`TASK-V45-112` flips them).
 */
export const LOCAL_ACT_SLOTS = [
  { act: 'authorize', entry: 'authorizeCurrentSite', callSiteCount: 2, w1CallSiteCount: 2, status: 'landed' },
  { act: 'rebind', entry: 'rebindCurrentTab', callSiteCount: 2, w1CallSiteCount: 1, status: 'pending-w3' },
  { act: 'help', entry: 'openSettingsSection', callSiteCount: 1, w1CallSiteCount: 0, status: 'pending-w3' },
] as const;

/** Call sites of `name(` in the source (comments and `import` lines excluded). */
export function callSites(source: string, name: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  source.split('\n').forEach((raw, i) => {
    if (isComment(raw)) return;
    if (!new RegExp(`${name}\\s*\\(`).test(raw)) return;
    if (/^\s*import\b/.test(raw)) return;
    // A DECLARATION is not a call site (`function authorizeCurrentSite(): void {`).
    if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`).test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=`).test(raw)) return;
    out.push({ line: i + 1, text: raw.trim() });
  });
  return out;
}

/** Declaration sites of `function name(` / `const name = (` (excluded from call sites). */
export function declarationSites(source: string, name: string): number[] {
  const out: number[] = [];
  source.split('\n').forEach((raw, i) => {
    if (new RegExp(`^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`).test(raw)) out.push(i + 1);
    else if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=`).test(raw)) out.push(i + 1);
  });
  return out;
}

/**
 * The body of `handleCardAction`'s `if (action === '<act>')` branch, or `null` when
 * the branch is missing. Indentation-based (`sidepanel.ts` uses two-space `if`s).
 */
export function actBranchBody(source: string, act: string): string | null {
  const m = new RegExp(`\\n {2}if \\(action === '${act}'\\) \\{\\n([\\s\\S]*?)\\n {2}\\}`).exec(source);
  return m ? m[1] : null;
}

/** The judge: exactly one call site, and it is not a declaration. */
export function singleEntryProblems(source: string, name: string, expected: number): string[] {
  const calls = callSites(source, name);
  const problems: string[] = [];
  if (calls.length !== expected) {
    problems.push(`唯一调用点判据失败：${name}() 期望 ${expected} 个调用点，实测 ${calls.length}（${JSON.stringify(calls)}）`);
  }
  for (const line of declarationSites(source, name)) {
    if (calls.some((c) => c.line === line)) {
      problems.push(`唯一调用点判据失败：${name}() 第 ${line} 行是声明而非调用（声明不得计入调用点）`);
    }
  }
  return problems;
}

/**
 * The judge: the branch must **exist**, must reach the declared single entry, and must
 * never turn the local act into a chat message. An empty/blank branch is a failure too
 * —「找不到 ⇒ 静默放行」is exactly the空转 the reverse proof forbids.
 */
export function localActBranchProblems(source: string, act: string, entry?: string): string[] {
  const body = actBranchBody(source, act);
  const problems: string[] = [];
  if (body === null) {
    problems.push(`本地 act 分支不得出现 requestTurn：找不到 '${act}' 分支（本地动作必须接线）`);
    return problems;
  }
  if (body.trim().length === 0) {
    problems.push(`本地 act 分支不得出现 requestTurn：'${act}' 分支为空（本地动作必须接线到单一入口）`);
  }
  if (entry !== undefined && !new RegExp(`${entry}\\s*\\(`).test(body)) {
    problems.push(`本地 act 分支不得出现 requestTurn：'${act}' 分支必须调用单一入口 ${entry}()`);
  }
  if (/requestTurn\s*\(/.test(body)) {
    problems.push(`本地 act 分支不得出现 requestTurn（'${act}' 分支实测命中）`);
  }
  return problems;
}

/** The judge: the closed act vocabulary and the wiring table must agree. */
export function closedSetProblems(acts: readonly string[], slots: readonly { readonly act: string; readonly status: string }[]): string[] {
  const problems: string[] = [];
  for (const s of slots) {
    if (s.status === 'landed' && !acts.includes(s.act)) {
      problems.push(`act 闭集同源判据失败：已落地本地 act '${s.act}' 不在 NEXTSTEP_ACTS 中`);
    }
  }
  if (!acts.includes('next')) problems.push('act 闭集同源判据失败：闭集必须含 next（回合语义）');
  const dup = acts.filter((a, i) => acts.indexOf(a) !== i);
  if (dup.length > 0) problems.push(`act 闭集同源判据失败：闭集含重复项 ${dup.join(', ')}`);
  return problems;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 真源码断言（W1 已落地面：`authorize` —— FIX-1 先例）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 LA-1：authorize 单一生产入口 authorizeCurrentSite 恰 2 个调用点（设置按钮 + chip 分支）', () => {
  assert.deepEqual(singleEntryProblems(SIDEPANEL, 'authorizeCurrentSite', 2), []);
});

test('V45 W1 LA-1 反证：伪造第三处调用 ⇒ 唯一入口判据必红', () => {
  const forged = `${SIDEPANEL}\n  authorizeCurrentSite();\n`;
  const problems = singleEntryProblems(forged, 'authorizeCurrentSite', 2);
  assert.ok(problems.length > 0, '伪造调用必须被判红');
  assert.ok(problems.some((p) => p.includes('唯一调用点判据失败：')), problems.join(' | '));
});

test('V45 W1 LA-2：权限请求 requestOriginPermissionDetailed 唯一调用点（不在声明行）', () => {
  assert.deepEqual(singleEntryProblems(SIDEPANEL, 'requestOriginPermissionDetailed', 1), []);
  assert.equal(declarationSites(SIDEPANEL, 'requestOriginPermissionDetailed').length, 0, '权限请求不得在面板侧另做声明式封装（沿用既有 await 调用）');
});

test('V45 W1 LA-3：authorize 分支走本地权限流，不得把「授权当前站点」当聊天消息', () => {
  assert.deepEqual(localActBranchProblems(SIDEPANEL, 'authorize', 'authorizeCurrentSite'), []);
});

test('V45 W1 LA-3 反证：把 authorize 分支改回 requestTurn ⇒ 回合判据必红', () => {
  const body = actBranchBody(SIDEPANEL, 'authorize');
  assert.ok(body, '前置：authorize 分支存在');
  const forged = SIDEPANEL.replace(body as string, body!.replace('authorizeCurrentSite();', "requestTurn('授权当前站点');"));
  const problems = localActBranchProblems(forged, 'authorize', 'authorizeCurrentSite');
  assert.ok(problems.some((p) => p.includes('本地 act 分支不得出现 requestTurn')), problems.join(' | '));
});

test('V45 W1 LA-3 反证：删掉 authorize 分支 ⇒ 分支缺失同样判红（禁判据空转）', () => {
  const body = actBranchBody(SIDEPANEL, 'authorize');
  const forged = SIDEPANEL.replace(body as string, '');
  const problems = localActBranchProblems(forged, 'authorize', 'authorizeCurrentSite');
  assert.ok(problems.length > 0, '分支缺失必须判红（判据不得因「找不到」而静默放行）');
  // 空分支同样是「未接线」，不得静默放行。
  assert.ok(
    localActBranchProblems(SIDEPANEL, 'authorize', 'openSettingsSection').length > 0,
    '接错入口（分支未调用声明入口）必须判红',
  );
});

test('V45 W1 LA-4：act 闭集与布线表同源（已落地项必须在闭集内）', () => {
  assert.deepEqual(closedSetProblems(NEXTSTEP_ACTS, LOCAL_ACT_SLOTS), []);
  assert.ok(NEXTSTEP_ACTS.includes('authorize'), 'FIX-1 先例：闭集必须已含 authorize');
});

test('V45 W1 LA-4 反证：已落地 act 从闭集移除 ⇒ 同源判据必红', () => {
  const forged = NEXTSTEP_ACTS.filter((a) => a !== 'authorize');
  const problems = closedSetProblems(forged, LOCAL_ACT_SLOTS);
  assert.ok(problems.some((p) => p.includes('act 闭集同源判据失败：')), problems.join(' | '));
});

test('V45 W1 LA-4 反证：闭集出现重复项 ⇒ 同源判据必红（先增后减被看住）', () => {
  const problems = closedSetProblems([...NEXTSTEP_ACTS, 'authorize'], LOCAL_ACT_SLOTS);
  assert.ok(problems.some((p) => p.includes('闭集含重复项')), problems.join(' | '));
});

test('V45 W1 LA-3+④：本地 act 永不入 deny 集（deny 只作用于 act === "next"）', () => {
  const denied = ['重新拾取', '改用描述', '用引用 1 做原地翻译', '授权当前站点', '了解 6 个页面手势'];
  const onboarding = candidateRules({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: false, trust: 'untrusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'idle', steady: false },
    risks: [],
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    deniedCommands: denied,
    now: 1,
  }).find((c) => c.rule === 'onboarding');
  assert.ok(onboarding, '前置：首装态必须产出 onboarding 候选');
  assert.ok(
    onboarding!.chips.some((c) => c.act !== 'next'),
    'deny 集命中 all chips 时本地 act 仍必须存活（否则「本地 act 永不入 deny 集」被违反）',
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 预留位（W3/TASK-V45-112 实体化）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 预留位：rebind / help 本地 act 槽位已声明（W3 实体化，不得在 W1 伪 FAIL）', () => {
  const pending = LOCAL_ACT_SLOTS.filter((s) => s.status === 'pending-w3');
  assert.equal(pending.length, 2, `必须恰好 2 个待实体化槽位（rebind / help），实测 ${pending.length}`);
  assert.deepEqual(pending.map((s) => s.act).sort(), ['help', 'rebind']);
  for (const p of pending) {
    // W1 现状必须与登记逐字一致（`rebind`：设置按钮 1 个入口；`help`：尚未接线），
    // 且 chip 分支**尚未**存在 —— W3/TASK-V45-112 会把两者同时推进到目标值。
    assert.equal(
      callSites(SIDEPANEL, p.entry).length,
      p.w1CallSiteCount,
      `${p.entry} 在 W1 阶段的调用点数必须 == 登记值 ${p.w1CallSiteCount}`,
    );
    assert.equal(actBranchBody(SIDEPANEL, p.act), null, `'${p.act}' chip 分支在 W1 阶段必须尚未接线`);
  }
});

test('V45 W1 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  assert.ok(JUDGEMENTS.filter((j) => j.status === 'landed').length >= 4, '已落地判据必须 ≥4 条');
});
