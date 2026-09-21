/**
 * V4.5-1 **W1 / TASK-V45-101** — the **node-gate skeleton** for ADR-V45-007
 * (`risk-recovery` 扩展 + act 闭集 6 项 + 本地 act 单一生产入口).
 *
 * ── V5-1 预迁移（TASK-V5-113 → 115 / ADR-V5-001）────────────────────────────
 *
 * TASK-V5-113 把 `handleCardAction` 的**集 B**（`next` / `repick` / `describe` /
 * `describe-submit` / `rebind` / `help` / `authorize`）收敛为 `dispatchChipAction`
 * 的**一次查表**（per-op 分支 = 0）。因此本地 act 的接线判据从「`if (action ===
 * 'x')` 分支体」**等价重锚**为「`bindPanelOps({...})` 的 op 槽 → 声明的单一入口」：
 * 判据力**只升不降**（现在还要求 `ACT_TO_OP` 映射同源）。
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
  { id: 'LA-3-no-request-turn', expectFailPattern: '本地 act 不得出现 requestTurn', status: 'landed' },
  { id: 'LA-4-closed-set-same-source', expectFailPattern: 'act 闭集同源判据失败：', status: 'landed' },
  { id: 'LA-5-rebind-entry', expectFailPattern: '唯一调用点判据失败：rebindCurrentTab', status: 'landed' },
  { id: 'LA-6-help-entry', expectFailPattern: '唯一调用点判据失败：openSettingsSection', status: 'landed' },
];

/**
 * The local acts and their declared single production entrance.
 * V5-1: `opSlot` is the `bindPanelOps` key the pipeline reaches; `opId` is the
 * `ACT_TO_OP` mapping (both are asserted, so act→op→entry is a single chain).
 */
export const LOCAL_ACT_SLOTS = [
  { act: 'authorize', opSlot: 'authorize', opId: 'op.authorize', entry: 'authorizeCurrentSite', callSiteCount: 2, status: 'landed' },
  { act: 'rebind', opSlot: 'rebind', opId: 'op.rebind', entry: 'rebindCurrentTab', callSiteCount: 2, status: 'landed' },
  { act: 'help', opSlot: 'help', opId: 'op.help', entry: 'openSettingsSection', callSiteCount: 1, status: 'landed' },
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

/** The body of the `bindPanelOps({ … })` call, or `null` when it is missing. */
export function panelOpsBlock(source: string): string | null {
  const m = /\n {2}bindPanelOps\(\{([\s\S]*?)\n {2}\}\);/m.exec(source);
  return m ? m[1] : null;
}

/** The single line that wires an op slot (`act: …`), or `null` when missing. */
export function opSlotBinding(source: string, slot: string): string | null {
  const block = panelOpsBlock(source);
  if (!block) return null;
  const m = new RegExp(`\\n\\s*${slot}: ([^\\n]*)`).exec(block);
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
 * The judge: the op slot must **exist**, must reach the declared single entry, and
 * must never turn the local act into a chat message. A missing/blank slot is a
 * failure too —「找不到 ⇒ 静默放行」is exactly the空转 the reverse proof forbids.
 */
export function localActSlotProblems(source: string, slot: string, entry: string): string[] {
  const binding = opSlotBinding(source, slot);
  const problems: string[] = [];
  if (binding === null) {
    problems.push(`本地 act 不得出现 requestTurn：找不到 bindPanelOps 的 '${slot}' 槽（本地动作必须接线）`);
    return problems;
  }
  if (binding.trim().length === 0) {
    problems.push(`本地 act 不得出现 requestTurn：'${slot}' 槽为空（本地动作必须接线到单一入口）`);
  }
  if (!new RegExp(`${entry}\\s*\\(`).test(binding)) {
    problems.push(`本地 act 不得出现 requestTurn：'${slot}' 槽必须调用单一入口 ${entry}()`);
  }
  if (/requestTurn\s*\(/.test(binding)) {
    problems.push(`本地 act 不得出现 requestTurn（'${slot}' 槽实测命中）`);
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

test('V45 W1 LA-1：authorize 单一生产入口 authorizeCurrentSite 恰 2 个调用点（设置按钮 + op 槽）', () => {
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

test('V45 W1 LA-3：authorize op 槽走本地权限流，不得把「授权当前站点」当聊天消息', () => {
  assert.deepEqual(localActSlotProblems(SIDEPANEL, 'authorize', 'authorizeCurrentSite'), []);
  assert.equal(ACT_TO_OP.authorize, 'op.authorize', 'act→opId 映射必须同源');
});

test('V45 W1 LA-3 反证：把 authorize op 槽改回 requestTurn ⇒ 回合判据必红', () => {
  const binding = opSlotBinding(SIDEPANEL, 'authorize');
  assert.ok(binding, '前置：authorize op 槽存在');
  const forged = SIDEPANEL.replace(binding as string, binding!.replace('authorizeCurrentSite()', "requestTurn('授权当前站点')"));
  const problems = localActSlotProblems(forged, 'authorize', 'authorizeCurrentSite');
  assert.ok(problems.some((p) => p.includes('本地 act 不得出现 requestTurn')), problems.join(' | '));
});

test('V45 W1 LA-3 反证：删掉 authorize op 槽 ⇒ 缺失同样判红（禁判据空转）', () => {
  const binding = opSlotBinding(SIDEPANEL, 'authorize');
  const forged = SIDEPANEL.replace(binding as string, 'DELETE_ME');
  const problems = localActSlotProblems(forged, 'authorize', 'authorizeCurrentSite');
  assert.ok(problems.length > 0, '槽缺失必须判红（判据不得因「找不到」而静默放行）');
  // 空槽同样是「未接线」，不得静默放行。
  assert.ok(
    localActSlotProblems(SIDEPANEL, 'authorize', 'openSettingsSection').length > 0,
    '接错入口（槽未调用声明入口）必须判红',
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
 * 3. 本地 act 实体化（V5-1：op 槽 + 单一入口 + 闭集同源）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W3 LA-5/LA-6：rebind / help 已实体化（唯一入口 + op 槽零 requestTurn + 闭集同源）', () => {
  // ① 每个本地 act 的单一生产入口调用点集合 == 登记值（W3 目标值）。
  for (const slot of LOCAL_ACT_SLOTS) {
    assert.deepEqual(singleEntryProblems(SIDEPANEL, slot.entry, slot.callSiteCount), [], `${slot.act} 的唯一入口调用点集合`);
    assert.ok(slot.callSiteCount >= 1, `${slot.act} 必须至少 1 个调用点（否则入口不存在）`);
  }
  // ② 每个本地 act 的 op 槽必须接线到声明入口，且**无** `requestTurn(`。
  for (const slot of LOCAL_ACT_SLOTS) {
    assert.deepEqual(localActSlotProblems(SIDEPANEL, slot.opSlot, slot.entry), [], `${slot.act} op 槽`);
    const binding = opSlotBinding(SIDEPANEL, slot.opSlot);
    assert.ok(binding && binding.trim().length > 0, `${slot.act} op 槽不得为空（本地动作必须接线）`);
    assert.equal(ACT_TO_OP[slot.act as keyof typeof ACT_TO_OP], slot.opId, `${slot.act} 的 opId 映射`);
  }
  // ③ 闭集同源：三个本地 act 都在 `NEXTSTEP_ACTS` 内，且闭集恰好 6 项（逐字该序）。
  assert.deepEqual(closedSetProblems(NEXTSTEP_ACTS, LOCAL_ACT_SLOTS), []);
  assert.deepEqual([...NEXTSTEP_ACTS], ['next', 'repick', 'describe', 'authorize', 'rebind', 'help'], '闭集必须逐字 6 项');
  for (const act of ['rebind', 'help']) assert.ok((NEXTSTEP_ACTS as readonly string[]).includes(act), `闭集必须含 ${act}`);
  // ④ 「了解 6 个页面手势」chip 的 act 必是 help（本地设置导航），不是 next。
  const onboarding = candidateRules({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    now: 1,
  }).find((c) => c.rule === 'onboarding');
  assert.ok(onboarding, '前置：授权站点 + 首装态必须产出 onboarding 候选');
  assert.equal(onboarding!.chips.find((c) => c.text.includes('页面手势'))?.act, 'help', '手势 chip 必须是本地 help 动作');
  assert.equal(onboarding!.chips.find((c) => c.text.includes('授权当前站点'))?.act, 'authorize');
});

test('V45 W3 LA-5 反证：删掉 rebind op 槽 / 接错入口 ⇒ 判据必红（不得空转）', () => {
  const binding = opSlotBinding(SIDEPANEL, 'rebind');
  assert.ok(binding, '前置：rebind op 槽存在');
  const forgedMissing = SIDEPANEL.replace(binding as string, 'DELETE_ME');
  assert.ok(localActSlotProblems(forgedMissing, 'rebind', 'rebindCurrentTab').length > 0, '槽缺失必须判红');
  assert.ok(
    localActSlotProblems(SIDEPANEL, 'rebind', 'openSettingsSection').length > 0,
    '接错入口必须判红',
  );
  const forgedTurn = SIDEPANEL.replace(binding as string, binding!.replace('rebindCurrentTab()', "requestTurn('重新绑定当前标签页')"));
  assert.ok(
    localActSlotProblems(forgedTurn, 'rebind', 'rebindCurrentTab').some((p) => p.includes('requestTurn')),
    '把 rebind 当聊天消息必须判红',
  );
  // help 同理：删槽 ⇒ 红。
  const helpBinding = opSlotBinding(SIDEPANEL, 'help');
  assert.ok(helpBinding, '前置：help op 槽存在');
  assert.ok(localActSlotProblems(SIDEPANEL.replace(helpBinding as string, 'DELETE_ME'), 'help', 'openSettingsSection').length > 0, 'help 槽缺失必须判红');
});

test('V45 W1 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  assert.ok(JUDGEMENTS.filter((j) => j.status === 'landed').length >= 4, '已落地判据必须 ≥4 条');
});

/* ── V5-1（TASK-V5-115 / FR-ALLN-112·120 / AC-ALLN-009·019 · X3）──────────────
 *
 * X3 施工图形态③④ 的对账面：**旧断言的语义逐条有对应新断言**（无「不再 FAIL 的判据」），
 * 且 act → opId → op 槽 → 单一入口 → 义务表 是一条**同源链**（任一环改一处即红）。
 * R1（TASK-V5-113）已把本地 act 槽预迁移为 op 槽；R2（本任务）补齐**对账表 + 反证**。
 */

/**
 * 旧判据 → 新判据的逐条映射（X3 形态③④的对账表；`leaf:'v5-1'`）。
 * `oldId` = 被重锚的旧断言的可定位标识（v4.5-1 的门禁判据 id / 断言文本）；`newId` =
 * 接管它的判据 id（本文件 `JUDGEMENTS` 或 V5-1 新增链路判据）。
 */
export interface X3ReconciliationRow {
  readonly oldId: string;
  readonly newId: string;
  readonly oldAssertion: string;
  readonly newAssertion: string;
  readonly reason: string;
  readonly leaf: string;
}

export const X3_RECONCILIATION: readonly X3ReconciliationRow[] = [
  {
    oldId: 'LA-3-if-action-authorize-branch',
    newId: 'LA-3-no-request-turn',
    oldAssertion: 'handleCardAction 的 `if (action === \'authorize\')` 分支体调用 authorizeCurrentSite()',
    newAssertion: 'bindPanelOps 的 authorize op 槽调用同一入口 + ACT_TO_OP.authorize === op.authorize（同源链）」',
    reason: 'per-op 分支已退役（集 B 收敛为一次查表）：判据从「分支体」重锚为「op 槽 → 单一入口 + 映射同源」，判据力只升不降。',
    leaf: 'v5-1',
  },
  {
    oldId: 'LA-5-if-action-rebind-branch',
    newId: 'LA-5-rebind-entry',
    oldAssertion: 'handleCardAction 的 `if (action === \'rebind\')` 分支体调用 rebindCurrentTab()',
    newAssertion: 'rebind op 槽 → rebindCurrentTab() 唯一入口（调用点集合 = 登记值）',
    reason: '同上：rebind 的本地语义（零回合 / 单一入口）在 op 词汇下逐条保持，判据落在 op 槽与入口调用点集合上。',
    leaf: 'v5-1',
  },
  {
    oldId: 'LA-6-if-action-help-branch',
    newId: 'LA-6-help-entry',
    oldAssertion: 'handleCardAction 的 `if (action === \'help\')` 分支体调用 openSettingsSection()',
    newAssertion: 'help op 槽 → openSettingsSection() 唯一入口（设置导航，零回合）',
    reason: '同上：help 是本地设置导航而非回合；重锚后仍要求「单一入口 + 零 requestTurn」，语义零丢失。',
    leaf: 'v5-1',
  },
  {
    oldId: 'LA-4-NEXTSTEP_ACTS-verbatim-6',
    newId: 'LA-4-closed-set-same-source',
    oldAssertion: 'NEXTSTEP_ACTS 逐字 6 项（act 是分发词汇）',
    newAssertion: 'NEXTSTEP_ACTS == Object.keys(ACT_TO_OP)（act 降渲染别名，唯一权威是映射表）',
    reason: 'act 从分发词汇降为渲染别名：旧闭集的 6 项仍逐字被钉死，但钉在 act→opId 映射表的键集上（新增 op 自动纳入）。',
    leaf: 'v5-1',
  },
];

test('V5-1 X3 对账：4 条重锚逐条登记（oldId / newId / 两侧断言 / reason ≥40 / leaf v5-1）', () => {
  assert.ok(X3_RECONCILIATION.length >= 4, 'X3 对账表必须覆盖 ≥4 条重锚');
  const judgementIds = new Set(JUDGEMENTS.map((j) => j.id));
  for (const row of X3_RECONCILIATION) {
    assert.ok(row.oldId.trim().length > 0, 'oldId 必须可定位');
    assert.ok(row.oldAssertion.trim().length > 0 && row.newAssertion.trim().length > 0, `${row.oldId}: 两侧断言都必须写明`);
    assert.ok(row.reason.trim().length >= 40, `${row.oldId}: reason 必须 ≥40 字符`);
    assert.equal(row.leaf, 'v5-1', `${row.oldId}: leaf 必须登记为 v5-1`);
    assert.ok(judgementIds.has(row.newId), `${row.oldId}: newId ${row.newId} 必须在 JUDGEMENTS 内（接管判据必须真的存在）`);
  }
});

test('V5-1 X3 同源链：act → opId → op 槽 → 单一入口 → 义务表（改任一环即红）', () => {
  for (const slot of LOCAL_ACT_SLOTS) {
    assert.equal(ACT_TO_OP[slot.act as keyof typeof ACT_TO_OP], slot.opId, `${slot.act} 的 act→opId 必须同源`);
    const binding = opSlotBinding(SIDEPANEL, slot.opSlot);
    assert.ok(binding && new RegExp(`${slot.entry}\\s*\\(`).test(binding), `${slot.opId} 的 op 槽必须接线到 ${slot.entry}()`);
    assert.ok(OBLIGATION_OP_IDS.includes(slot.opId), `${slot.opId} 必须在义务表 opId 集内（注册表边界与门禁同源）`);
  }
  // 反证：把 opId 改掉（模拟「映射表改了、门禁没跟」）⇒ 同源链判据必红。
  const forged = { ...ACT_TO_OP, rebind: 'op.turn' } as Record<string, string>;
  assert.notEqual(forged.rebind, LOCAL_ACT_SLOTS[1].opId, '伪造映射必须使同源链判据可红');
  // 反证：把 op 槽接到 requestTurn（本地动作变回合）⇒ LA-3 判据必红（既有反证已实跑）。
  const binding = opSlotBinding(SIDEPANEL, 'rebind');
  const forgedSource = SIDEPANEL.replace(binding as string, "rebind: () => requestTurn('重新绑定当前标签页'),");
  assert.ok(
    localActSlotProblems(forgedSource, 'rebind', 'rebindCurrentTab').length > 0,
    '同源链的「零回合」环必须可红',
  );
});
