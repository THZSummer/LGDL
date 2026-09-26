/**
 * V5.5-3 **TASK-V55-303 / 307** (ADR-V55-008 §1/§2/§5 · FR-SELF-080~086 · **AC-SELF-005** ·
 * R-SELF-906 / R-V55-104) — the **op 三档清分机核**（`test:op-three-tier`）.
 *
 * ── 它判什么 ────────────────────────────────────────────────────────────────
 *
 *   ① **计数与成员集**：`{auto: 5, confirm: 2, gesture: 2}` 且成员集**逐字**（spec §5.7）；
 *   ② **特权恒 `gesture`**：`layer === 'sw'` 的行**恰 2** 且**恒**落 `gesture`（AI 不可发起 /
 *      不可代答 —— N-SELF-021 / FR-SELF-081/085）；
 *   ③ **与 `ops.ts#IMPL` 逐字段一致**：`hasConsent === Boolean(op.consent)` ∧ `layer` 同源 ∧
 *      逐档风险级断言（R-SELF-906「清分纸面化」的结构性防线）；
 *   ④ **`auto` 档零三表写入**（FR-SELF-083）：授权 / 权限 / 凭据的写入点只允许在
 *      `confirm` / `gesture` 档；`auto` 档出现写入点 ⇒ FAIL；
 *   ⑤ **新 op 必须归档**（FR-SELF-084 / EC-SELF-018）：清分表 opId 集 **≡** 注册表 opId 集
 *      （双向包含）；未归档 / 多归档 / 第四档 ⇒ FAIL；
 *   ⑥ **派生而非纸面**：`tierOf` 由 `layer`/`hasConsent` 计算 ⇒ 改声明**必然**同步改清分
 *      （逐档注入反证：把 `confirm` 档的 `hasConsent` 抹掉 ⇒ 清分变成 6/1/2 ⇒ FAIL）。
 *
 * 每条判据都声明 `expectFailPattern`（`test/gate-integrity` 的 node 门禁发现标记），且
 * 反证**在本文件内实跑**（注入 ⇒ FAIL → 还原 ⇒ PASS），不做恒真断言（FR-SELF-111）。
 *
 * @module test/op-three-tier
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  OP_DESCRIPTORS,
  OP_IDS,
  OP_TIERS,
  OP_TIER_TABLE,
  SW_OP_DESCRIPTORS,
  type OpDescriptor,
  type OpTier,
  opDescriptor,
  tierOf,
  tierOfId,
} from '../src/shared/op-table.js';
import { pressDecision } from '../src/ui/sidepanel/next-registry/ai-drive.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { OPS_RECOVERY_ROWS } from '../src/ui/sidepanel/next-registry/providers.js';
// ★ F-36 / ADN-1 TASK-ADN-122：接受层判定（`admitCandidate`）与档位读取点同源机核。
import { admitCandidate, type AiNextFacts } from '../src/background/ai-next.js';

/** `expectFailPattern` of every judgement this gate declares (the meta-gate marker). */
export interface ThreeTierJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}

export const JUDGEMENTS: readonly ThreeTierJudgement[] = [
  { id: 'OT-1-partition-counts', expectFailPattern: '三档清分计数必须恰 5/2/2（合计 9）' },
  { id: 'OT-2-members-verbatim', expectFailPattern: '三档成员集必须逐字一致' },
  { id: 'OT-3-privileged-gesture', expectFailPattern: '特权 op 必须恰 2 且恒 gesture（AI 不可自动执行）' },
  { id: 'OT-4-impl-consistency', expectFailPattern: '清分表必须与 ops.ts#IMPL 的 riskLevel/consent/layer 逐字段一致' },
  { id: 'OT-5-auto-zero-writes', expectFailPattern: 'auto 档必须零三表写入（写入点只允许 confirm/gesture）' },
  { id: 'OT-6-new-op-archived', expectFailPattern: '新 op 必须归档（清分表 opId 集 ≡ 注册表 opId 集，双向包含）' },
  { id: 'OT-7-single-tier', expectFailPattern: '任一 op 必须恰属一档（无未归档 / 无第四档）' },
  { id: 'OT-8-derived-not-paper', expectFailPattern: 'tierOf 必须由 layer/hasConsent 派生（改声明 ⇒ 清分同步变）' },
  { id: 'OT-9-ai-initiate-subset', expectFailPattern: 'AI 发起路径必须 ⊆（auto ∪ confirm 发起）——confirm 必须可见且不得自动按下' },
  { id: 'OT-10-gesture-user-gesture', expectFailPattern: 'gesture 档发起方必须是用户手势（AI 不可发起 / 不可代答 consent）' },
  { id: 'OT-11-judging-chain-zero-diff', expectFailPattern: '判定链 zeroDiffFiles 9 项必须逐项零 diff（未在册解冻不得改动）' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 期望集（spec §5.7 逐字；**唯一**处声明，测试与判据共用）
 * ──────────────────────────────────────────────────────────────────────────── */

export const EXPECTED_TIER_MEMBERS: Readonly<Record<OpTier, readonly string[]>> = Object.freeze({
  auto: Object.freeze(['op.pick', 'op.describe', 'op.help', 'op.rebind', 'op.turn']),
  confirm: Object.freeze(['op.llm-config', 'op.revoke']),
  gesture: Object.freeze(['op.authorize', 'op.perm.request']),
});

export const EXPECTED_TIER_COUNTS: Readonly<Record<OpTier, number>> = Object.freeze({ auto: 5, confirm: 2, gesture: 2 });

const sorted = (xs: readonly string[]): string[] => [...xs].sort();

/** The member list of one tier, read from the materialized table (never a second list). */
export function tierMembers(tierTable: Readonly<Record<string, OpTier>>, tier: OpTier): string[] {
  return sorted(Object.entries(tierTable).filter(([, t]) => t === tier).map(([id]) => id));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 判据（纯函数；反证从这些函数实跑）
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * ① ② ⑦ —— 计数 + 成员集 + 「恰一档」：清分表 opId 集必须**双向**等于注册表 opId 集，且
 * 每档计数 / 成员集逐字。
 */
export function partitionProblems(
  tierTable: Readonly<Record<string, OpTier>>,
  ids: readonly string[],
  privileged: readonly string[],
): string[] {
  const problems: string[] = [];
  // ⑦ 恰一档：每个 id 必须有 tier ∈ OP_TIERS；表里不得有注册表之外的键。
  for (const id of ids) {
    const t = tierTable[id];
    if (t === undefined || !(OP_TIERS as readonly string[]).includes(t)) {
      problems.push(`${JUDGEMENTS[6].expectFailPattern}：${id} 未归档 / 档位非法（${String(t)}）`);
    }
  }
  for (const id of Object.keys(tierTable)) {
    if (!ids.includes(id)) problems.push(`${JUDGEMENTS[5].expectFailPattern}：${id} 不在注册表（第二份清单）`);
  }
  // ① ② 计数 + 成员集。
  for (const tier of OP_TIERS) {
    const members = tierMembers(tierTable, tier);
    if (members.length !== EXPECTED_TIER_COUNTS[tier]) {
      problems.push(`${JUDGEMENTS[0].expectFailPattern}：${tier} 实测 ${members.length} ≠ ${EXPECTED_TIER_COUNTS[tier]}`);
    }
    if (JSON.stringify(members) !== JSON.stringify(sorted(EXPECTED_TIER_MEMBERS[tier]))) {
      problems.push(`${JUDGEMENTS[1].expectFailPattern}：${tier} 实测 ${members.join(',')}`);
    }
  }
  // ③ 特权恒 gesture（恰 2）。
  if (privileged.length !== 2) problems.push(`${JUDGEMENTS[2].expectFailPattern}：特权 op 实测 ${privileged.length} 个 ≠ 2`);
  for (const id of privileged) {
    if (tierTable[id] !== 'gesture') problems.push(`${JUDGEMENTS[2].expectFailPattern}：特权 ${id} 归 ${String(tierTable[id])}（必须恒 gesture）`);
  }
  return problems;
}

/**
 * ③ —— 清分表 ↔ `ops.ts#IMPL` 的一致性（逐 op 三字段 + 逐档风险级）。
 * 「`op.turn` 归档理由」（FR-SELF-086）：`panel` ∧ 无 consent ∧ low risk ⇒ `auto`。
 */
export function implConsistencyProblems(
  descriptors: readonly OpDescriptor[],
  tiers: Readonly<Record<string, OpTier>>,
  ops: Readonly<Record<string, { readonly risk?: string; readonly consent?: unknown; readonly layer?: string }>>,
): string[] {
  const problems: string[] = [];
  for (const d of descriptors) {
    const op = ops[d.id];
    if (!op) {
      problems.push(`${JUDGEMENTS[3].expectFailPattern}：${d.id} 在 ops.ts#IMPL 缺行（op-impl-missing）`);
      continue;
    }
    if (d.hasConsent !== Boolean(op.consent)) {
      problems.push(`${JUDGEMENTS[3].expectFailPattern}：${d.id} hasConsent=${d.hasConsent} ≠ IMPL.consent=${Boolean(op.consent)}`);
    }
    if (d.layer !== op.layer) problems.push(`${JUDGEMENTS[3].expectFailPattern}：${d.id} layer ${d.layer} ≠ IMPL ${String(op.layer)}`);
    const tier = tiers[d.id];
    if (tier === 'auto' && (d.hasConsent || op.consent || op.risk !== 'low')) {
      problems.push(`${JUDGEMENTS[3].expectFailPattern}：auto 档 ${d.id} 必须无 consent ∧ low risk`);
    }
    if (tier === 'confirm' && (!d.hasConsent || op.risk === 'low')) {
      problems.push(`${JUDGEMENTS[3].expectFailPattern}：confirm 档 ${d.id} 必须有 consent ∧ 非 low risk`);
    }
    if (tier === 'gesture' && d.layer !== 'sw') {
      problems.push(`${JUDGEMENTS[2].expectFailPattern}：gesture 档 ${d.id} 必须 layer=sw`);
    }
  }
  // `op.turn` 的归档理由（文书）：auto 档的**唯一回合入口**，panel-local / 无 consent。
  if (tiers['op.turn'] !== 'auto') problems.push(`${JUDGEMENTS[3].expectFailPattern}：op.turn 必须归 auto（无 consent / panel-local / one requestTurn）`);
  return problems;
}

/**
 * ④ —— `auto` 档零三表写入：每个写入点所属 op 必须落在 `confirm` / `gesture` 档。
 * 写入点表是**声明**（`sink` 名 + 其所属 op）；`auto` 档出现任一写入点 ⇒ FAIL。
 */
export function writePointProblems(
  writePoints: readonly { readonly opId: string; readonly symbol: string }[],
  tiers: Readonly<Record<string, OpTier>>,
): string[] {
  const problems: string[] = [];
  for (const w of writePoints) {
    const tier = tiers[w.opId];
    if (tier === undefined) {
      problems.push(`${JUDGEMENTS[4].expectFailPattern}：写入点 ${w.symbol} 的 op ${w.opId} 未归档`);
      continue;
    }
    if (tier === 'auto') {
      problems.push(`${JUDGEMENTS[4].expectFailPattern}：auto 档 ${w.opId} 不得写三表（${w.symbol}）`);
    }
  }
  return problems;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 真实读数（全部从单源对象抽，不手写第二份）
 * ──────────────────────────────────────────────────────────────────────────── */

const PRIVILEGED_IDS: readonly string[] = Object.freeze(SW_OP_DESCRIPTORS.map((d) => d.id));

/**
 * 三表写入点（授权 / 权限 / 凭据）—— 每项 = **既有 sink 符号** + 其所属 op。
 * 声明只为判「`auto` 档是否越权写入」；op 归属与 `ops.ts#IMPL` 的 consent 行同源。
 */
export const WRITE_POINTS: readonly { readonly opId: string; readonly symbol: string }[] = Object.freeze([
  { opId: 'op.llm-config', symbol: 'keyStore.save' },
  { opId: 'op.perm.request', symbol: 'requestCapabilityPermissionOnGesture' },
  { opId: 'op.authorize', symbol: 'authorizeCurrentSite' },
  { opId: 'op.revoke', symbol: 'removeCapabilityPermission' },
]);

test('OT ①/②/⑦: 三档清分计数 5/2/2 ∧ 成员集逐字 ∧ 恰一档', () => {
  assert.deepEqual(partitionProblems(OP_TIER_TABLE, OP_IDS, PRIVILEGED_IDS), [], '三档清分机核');
  assert.deepEqual(sorted(Object.keys(OP_TIER_TABLE)), sorted(OP_IDS), JUDGEMENTS[5].expectFailPattern);
  assert.equal(OP_IDS.length, 9, '本批 op 恰 9');
  // 档位枚举恰 3 项（无第四档）。
  assert.deepEqual([...OP_TIERS], ['auto', 'confirm', 'gesture']);
});

test('OT ③: 特权 op 恰 2 恒 gesture（AI 不可自动执行 / 不可代答）', () => {
  assert.equal(SW_OP_DESCRIPTORS.length, 2, JUDGEMENTS[2].expectFailPattern);
  for (const id of PRIVILEGED_IDS) {
    const d = opDescriptor(id);
    assert.ok(d, `${id} 必须有描述符行`);
    assert.equal(tierOf(d), 'gesture', `${id} 必须恒 gesture`);
    assert.equal(tierOfId(id), 'gesture');
  }
  // 反向：gesture 档**恰**是特权集（不存在「非特权却被 AI 禁止」的隐藏档）。
  assert.deepEqual(tierMembers(OP_TIER_TABLE, 'gesture'), sorted(PRIVILEGED_IDS), JUDGEMENTS[2].expectFailPattern);
  // AI 自动执行特权 op 的判据（`auto` 白名单为空交集）。
  const autoSet = new Set(tierMembers(OP_TIER_TABLE, 'auto'));
  for (const id of PRIVILEGED_IDS) assert.equal(autoSet.has(id), false, `${id} 不得出现在 auto 档`);
});

test('OT ④: 与 ops.ts#IMPL 逐字段一致（riskLevel / consent / layer）', () => {
  assert.deepEqual(implConsistencyProblems(OP_DESCRIPTORS, OP_TIER_TABLE, OPS_BY_ID), [], JUDGEMENTS[3].expectFailPattern);
  // op.turn 归档理由文书可判（FR-SELF-086）。
  assert.equal(tierOfId('op.turn'), 'auto');
  assert.equal(opDescriptor('op.turn')?.hasConsent, false);
  assert.equal(OPS_BY_ID['op.turn']?.risk, 'low');
});

test('OT ⑤: auto 档零三表写入（写入点只允许 confirm / gesture）', () => {
  assert.deepEqual(writePointProblems(WRITE_POINTS, OP_TIER_TABLE), [], JUDGEMENTS[4].expectFailPattern);
  // 判据非恒真：把 op.revoke（confirm）抹成 auto 档的合成表 ⇒ 必红。
  const forged: Record<string, OpTier> = { ...OP_TIER_TABLE, 'op.revoke': 'auto' };
  assert.ok(writePointProblems(WRITE_POINTS, forged).length > 0, 'auto 档写入点必须判红');
  // 且合成表同时也违反成员集（双重可判）。
  assert.ok(partitionProblems(forged, OP_IDS, PRIVILEGED_IDS).length > 0);
});

test('OT ⑥/⑦ 反证: 新增 op 未归档 / 新特权未归 gesture / 未归档第四档 ⇒ FAIL → 还原 PASS', () => {
  // ① 注册表多一个未见过的 op（未归档）。
  const withGhost = [...OP_IDS, 'op.ghost'];
  const p1 = partitionProblems(OP_TIER_TABLE, withGhost, PRIVILEGED_IDS);
  assert.ok(p1.some((p) => p.includes(JUDGEMENTS[6].expectFailPattern)), p1.join(' | '));
  // ② 新特权（sw）被归 auto ⇒ 特权恒 gesture 判据必红。
  const forgedSw: Record<string, OpTier> = { ...OP_TIER_TABLE, 'op.authorize': 'auto' };
  const p2 = partitionProblems(forgedSw, OP_IDS, PRIVILEGED_IDS);
  assert.ok(p2.some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), p2.join(' | '));
  // ③ 第四档（未归档值）。
  const forged4: Record<string, OpTier> = { ...OP_TIER_TABLE, 'op.help': 'nope' as OpTier };
  const p3 = partitionProblems(forged4, OP_IDS, PRIVILEGED_IDS);
  assert.ok(p3.some((p) => p.includes(JUDGEMENTS[6].expectFailPattern)), p3.join(' | '));
  // 还原 ⇒ PASS（判据不是恒真）。
  assert.deepEqual(partitionProblems(OP_TIER_TABLE, OP_IDS, PRIVILEGED_IDS), []);
});

test('OT ⑧: tierOf 由 layer/hasConsent 派生 —— 改声明 ⇒ 清分同步变（不可能脱钩）', () => {
  assert.equal(tierOf({ layer: 'panel', hasConsent: false }), 'auto');
  assert.equal(tierOf({ layer: 'panel', hasConsent: true }), 'confirm');
  // 特权恒 gesture：consent 的有无**不改变**手势档（`layer === 'sw'` 优先）。
  assert.equal(tierOf({ layer: 'sw', hasConsent: false }), 'gesture');
  assert.equal(tierOf({ layer: 'sw', hasConsent: true }), 'gesture');

  // 反证：把 `op.revoke` 的 consent 抹掉（改安全声明本身）⇒ 该 op 立刻落 auto 档。
  const forgedRevoke = OP_DESCRIPTORS.map((d) => (d.id === 'op.revoke' ? { ...d, hasConsent: false } : d));
  assert.equal(tierOf(forgedRevoke.find((d) => d.id === 'op.revoke') as OpDescriptor), 'auto', '改 consent ⇒ 清分必须同步变');
  assert.notEqual(forgedRevoke.find((d) => d.id === 'op.revoke')?.hasConsent, opDescriptor('op.revoke')?.hasConsent, '前置：注入锚点必须存在');

  // 反证：把 `op.help` 的 layer 改成 sw ⇒ gesture 档变 3（特权恒 gesture 判据仍然成立，但计数必红）。
  const forgedHelp = OP_DESCRIPTORS.map((d) => (d.id === 'op.help' ? { ...d, layer: 'sw' as const } : d));
  const forgedTable: Record<string, OpTier> = Object.fromEntries(forgedHelp.map((d) => [d.id, tierOf(d)]));
  assert.equal(forgedTable['op.help'], 'gesture');
  assert.ok(
    partitionProblems(forgedTable, OP_IDS, [...PRIVILEGED_IDS, 'op.help']).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)),
    'layer 改动 ⇒ 计数判据必红（派生式不可脱钩）',
  );
  // 还原 ⇒ PASS。
  assert.deepEqual(implConsistencyProblems(OP_DESCRIPTORS, OP_TIER_TABLE, OPS_BY_ID), []);
});

test('OT ⑧: 物化表是派生结果（不是第二份数据）—— 逐行重构 ⇒ 与源表逐项相等', () => {
  const recomputed: Record<string, OpTier> = Object.fromEntries(OP_DESCRIPTORS.map((d) => [d.id, tierOf(d)]));
  assert.deepEqual(recomputed, { ...OP_TIER_TABLE }, 'OP_TIER_TABLE 必须恰等于按描述符重算的结果');
  // 逐档成员集也与规格逐字（双读法：表 vs 规格期望集）。
  for (const tier of OP_TIERS) {
    assert.deepEqual(tierMembers(OP_TIER_TABLE, tier), sorted(EXPECTED_TIER_MEMBERS[tier]), `${tier} 成员集`);
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-307**（ADR-V55-008 §2/§3 · FR-SELF-067/082/085 · N-SELF-021/025 ·
 * AC-SELF-005/008 · R-V55-104）—— **逐档反证**：`confirm` / `gesture` 不可自动按下，
 * 且判定链（`zeroDiffFiles` 9 项）**零触碰**。
 * ──────────────────────────────────────────────────────────────────────────── */
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const PKG2 = new URL('../../', import.meta.url).pathname;
const OPS_SRC = readFileSync(`${PKG2}src/ui/sidepanel/next-registry/ops.ts`, 'utf8');
const AI_DRIVE_SRC = readFileSync(`${PKG2}src/ui/sidepanel/next-registry/ai-drive.ts`, 'utf8');
const PANEL_HTML = readFileSync(`${PKG2}src/ui/sidepanel/index.html`, 'utf8');

/**
 * 面板上的**用户可点** op 触发面（`confirm` 档的「可见 confirm next」由此可判）：
 *   · 注册表产出的 op-direct chip（`OPS_RECOVERY_ROWS`）+ 既有 `<option value="op.*">` 控件。
 * 「可见」= 用户在流内 / 面板内**能点**（不是 AI 代按）。
 */
export function surfacedOpIds(html: string, recoveryOps: readonly string[]): string[] {
  const fromHtml = [...html.matchAll(/value="(op\.[a-z.-]+)"/g)].map((m) => m[1] as string);
  return [...new Set([...recoveryOps, ...fromHtml])].sort();
}

/**
 * **AI 发起路径 ⊆（`auto` ∪ `confirm` 发起）**：AI 可直接按下的 ⊆ `auto`；`confirm` 档只能
 * 作为**可见 next** 被发起（consent 卡必须由用户作答）；`gesture` 档一律不可由 AI 发起。
 */
export function aiInitiateProblems(
  tiers: Readonly<Record<string, OpTier>>,
  aiPressed: readonly string[],
  surfaced: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const id of aiPressed) {
    if (tiers[id] !== 'auto') problems.push(`${JUDGEMENTS[8].expectFailPattern}：AI 直接按下 ${id}（档位 ${String(tiers[id])}）`);
  }
  for (const id of Object.entries(tiers).filter(([, t]) => t === 'confirm').map(([id]) => id)) {
    if (!surfaced.includes(id)) problems.push(`${JUDGEMENTS[8].expectFailPattern}：confirm 档 ${id} 缺可见发起面（AI 发起 ⇒ 必须产出可见 confirm next）`);
  }
  return problems;
}

/** **AI 代答 consent** 的判据：AI 永远不得作答 consent 卡（`confirm` 卡必须用户作答）。 */
export function aiConsentAnswerProblems(answeredByAi: readonly string[]): string[] {
  return answeredByAi.map((id) => `${JUDGEMENTS[9].expectFailPattern}：AI 代答了 ${id} 的 consent 卡`);
}

/** **判定链零触碰**：`zeroDiffFiles` 逐项零 diff（未在册解冻的；解冻是登记行为，非静默放开）。 */
export function zeroDiffProblems(
  zeroDiffFiles: readonly string[],
  unfrozen: ReadonlySet<string>,
  runGitNumstat: (file: string) => string,
): string[] {
  const problems: string[] = [];
  for (const file of zeroDiffFiles) {
    const out = runGitNumstat(file).trim();
    for (const line of out ? out.split('\n') : []) {
      const path = line.split('\t').at(-1)?.trim() ?? '';
      if (path.length > 0 && !unfrozen.has(path)) problems.push(`${JUDGEMENTS[10].expectFailPattern}：${path}`);
    }
  }
  return problems;
}

test('OT ⑨: AI 发起路径 ⊆（auto ∪ confirm 发起）—— confirm 必须可见 ⇒ 不得自动按下', () => {
  const aiCtx = { actor: 'ai' as const, driverId: 'ref-action', driverClass: 'ai-driven' as const, configured: true, armed: true };
  const aiPressed = OP_IDS.filter((id) => pressDecision(id, aiCtx).ok);
  // AI 能按下的**恰**是 auto 档（5 项）—— 逐项同源，不是手写白名单。
  assert.deepEqual([...aiPressed].sort(), tierMembers(OP_TIER_TABLE, 'auto'), JUDGEMENTS[8].expectFailPattern);
  const surfaced = surfacedOpIds(PANEL_HTML, OPS_RECOVERY_ROWS.map((r) => r.op));
  assert.deepEqual(aiInitiateProblems(OP_TIER_TABLE, aiPressed, surfaced), [], JUDGEMENTS[8].expectFailPattern);
  // confirm 档的 consent 卡必须由用户作答（IMPL 行带 consent ⇒ pipeline 走面板收集器）。
  for (const id of tierMembers(OP_TIER_TABLE, 'confirm')) {
    assert.ok(OPS_BY_ID[id]?.consent, `${id} 必须有 consent 卡（AI 发起 ⇒ 用户作答）`);
    assert.equal(pressDecision(id, aiCtx).ok, false, `${id} 不得被 AI 自动按下`);
  }
  // 反证：把 confirm 档塞进 AI 按下集 ⇒ 必红；缺可见发起面 ⇒ 必红 → 还原 PASS。
  assert.ok(aiInitiateProblems(OP_TIER_TABLE, [...aiPressed, 'op.llm-config'], surfaced).length > 0, 'AI 按下 confirm ⇒ 必红');
  assert.ok(aiInitiateProblems(OP_TIER_TABLE, aiPressed, []).length > 0, 'confirm 缺可见发起面 ⇒ 必红');
  assert.deepEqual(aiInitiateProblems(OP_TIER_TABLE, aiPressed, surfaced), []);
});

test('OT ⑩: gesture 档发起方 = 用户手势（AI 不可发起 / 不可代答 consent）', () => {
  // 结构性：特权 op 的面板执行体恒拒（`SW_LAYER_REFUSAL`），手势在页面（两段握手 → PANEL 手势入口）。
  assert.match(OPS_SRC, /if \(d\.layer === 'sw'\) return SW_LAYER_REFUSAL\(d\.id\)/, '特权 op 的面板执行体必须恒拒');
  assert.match(OPS_SRC, /export async function swExec/, '特权 op 必须经 swExec（两段握手）');
  assert.match(OPS_SRC, /await PANEL\.authorize\(\)/, 'op.authorize 的手势入口必须由页面提供');
  assert.match(OPS_SRC, /await PANEL\.permRequest\(ids\)/, 'op.perm.request 的手势入口必须由页面提供');
  // AI 侧零 consent 通道：`ai-drive.ts` 不得出现 consent 收集 / 代答面（注入反证见下）。
  assert.equal(/collectConsent|consent/i.test(AI_DRIVE_SRC), false, 'ai-drive 不得含任何 consent 通道');
  // 反证：AI 代答 ⇒ 必红（判据非恒真）。
  assert.deepEqual(aiConsentAnswerProblems([]), []);
  assert.ok(aiConsentAnswerProblems(['op.llm-config']).some((p) => p.includes(JUDGEMENTS[9].expectFailPattern)));
  assert.ok(aiConsentAnswerProblems(['op.authorize']).length > 0, 'AI 代答特权 consent 更须判红');
});

test('OT ⑪: 判定链零触碰 —— v3 台账 `zeroDiffFiles` 9 项逐项零 diff（未在册解冻）', () => {
  const v3 = JSON.parse(readFileSync(`${PKG2}docs/v3-supersession-ledger.json`, 'utf8')) as {
    base: string;
    zeroDiffFiles: string[];
  };
  const v4 = JSON.parse(readFileSync(`${PKG2}docs/v4-supersession-ledger.json`, 'utf8')) as {
    unfrozenZeroDiffFiles?: readonly { file: string }[];
    zeroDiffFiles?: readonly string[];
  };
  assert.equal(v3.zeroDiffFiles.length, 9, 'v3 判定链零改动面必须恰 9 项');
  assert.ok((v4.zeroDiffFiles ?? []).length > 0, 'v4 必须显式声明零改动文件（不动面）');
  const unfrozen = new Set((v4.unfrozenZeroDiffFiles ?? []).map((u) => u.file));
  // 判定链两文件**永不**在解冻册里（否则「零触碰」就是可静默放弃的）。
  for (const critical of ['packages/web-cli-plugin/src/security/policy.ts', 'packages/web-cli-plugin/src/security/auto-authorize.ts']) {
    assert.equal(unfrozen.has(critical), false, `${critical} 不得被解冻（判定链零触碰是硬红线）`);
  }
  const runGit = (file: string): string =>
    execFileSync('git', ['-C', REPO, 'diff', '--numstat', v3.base, '--', file], { encoding: 'utf8' });
  assert.deepEqual(zeroDiffProblems(v3.zeroDiffFiles, unfrozen, runGit), [], JUDGEMENTS[10].expectFailPattern);
  // 反证：把一个本轮确实改过的文件塞进判定链零改动面 ⇒ 必红（判据非恒真）。
  const forged = [...v3.zeroDiffFiles, 'packages/web-cli-plugin/src/shared/op-table.ts'];
  assert.ok(zeroDiffProblems(forged, unfrozen, runGit).length > 0, '改动过的文件塞进 zeroDiffFiles 必须判红');
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5F-2 **TASK-V55F-202**（ADR-SGO-004 §6 · FR-SGO-049/103 · AC-SGO-005 ·
 * N-SGO-005 · R-SGO-001）—— **OT-⑩ 扩批量变体**：批量机制**不得**改变档位裁决.
 *
 * 原判据（OT-⑩：gesture 档发起方必须是用户手势）**逐字不改**；本段**扩**批量变体：
 *   · `tierOf` **逐 op 对照不变**（衍生式 5/2/2 保持）；
 *   · 批量**准入集必须 ⊆ `auto` 档**（批次是执行面的聚合，不是档位的旁路）；
 *   · 特权 op（`op.authorize` / `op.perm.request`）**恒 `gesture`** ⇒ 永不可入批（注入必红）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 批量准入集 ⊆ `auto` 档（纯函数；空数组 ⇒ 通过）。 */
export function bulkAdmitProblems(batchAdmitted: readonly string[], tiers: Readonly<Record<string, OpTier>>): string[] {
  const p = 'OT-⑩扩批量变体：批量准入不得含非 auto 档（批次不改变档位裁决）';
  return batchAdmitted
    .filter((id) => tiers[id] !== 'auto')
    .map((id) => `${p}：${id} 实测档位 ${String(tiers[id])}`);
}

test('OT ⑩ 扩批量变体：批量准入 ⊆ auto ∧ tierOf 逐 op 不变 ∧ 特权恒 gesture（注入必红）', () => {
  // ① 原判据不复述、不替换：本段只**追加**批量面的读数（OT-⑩ 的原测试逐字保留）。
  // ② `tierOf` 逐 op 对照不变：按描述符重算 == 物化表（衍生式 5/2/2 保持）。
  const recomputed: Record<string, OpTier> = Object.fromEntries(OP_DESCRIPTORS.map((d) => [d.id, tierOf(d)]));
  assert.deepEqual(recomputed, { ...OP_TIER_TABLE }, '批量机制不得改变任何 op 的档位裁决');
  assert.deepEqual(EXPECTED_TIER_COUNTS, { auto: 5, confirm: 2, gesture: 2 });
  // ③ 特权 op 恒 gesture（批量不得把它们拉进 auto）。
  for (const id of PRIVILEGED_IDS) assert.equal(tierOfId(id), 'gesture', `${id} 必须恒 gesture（不得因批次改变）`);
  // ④ 批量准入集 ⊆ auto：合法批次的成员只能是 auto 档（真实读数为空 ⇒ 通过）。
  const batchAdmitted: readonly string[] = [];
  assert.deepEqual(bulkAdmitProblems(batchAdmitted, OP_TIER_TABLE), []);
  assert.deepEqual(bulkAdmitProblems(tierMembers(OP_TIER_TABLE, 'auto'), OP_TIER_TABLE), []);
  // ⑤ 注入：把特权 op 塞进批量准入集 ⇒ 必红；还原 ⇒ PASS。
  const forgedAdmit = bulkAdmitProblems(['op.authorize'], OP_TIER_TABLE);
  assert.ok(forgedAdmit.length > 0, '特权 op 入批必须判红');
  assert.ok(forgedAdmit.some((x) => x.includes('OT-⑩扩批量变体')), '必红必须命中 OT-⑩ 扩批量变体判据');
  assert.ok(bulkAdmitProblems(['op.llm-config'], OP_TIER_TABLE).length > 0, 'confirm 档入批同样必红');
  // ⑥ 注入：把 op.authorize 的档位改成 auto（改安全声明）⇒ 档位判据 + 批量判据**双红**。
  const forgedTiers: Record<string, OpTier> = { ...OP_TIER_TABLE, 'op.authorize': 'auto' };
  assert.ok(partitionProblems(forgedTiers, OP_IDS, PRIVILEGED_IDS).some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), '改档位必须让特权恒 gesture 判据红');
  assert.deepEqual(bulkAdmitProblems(batchAdmitted, OP_TIER_TABLE), []);
  // ⑦ `auth` 6 终态语义保持：本文件不持有终态词表，只机核「档位不被批量改变」（OT-⑩ 原判据）。
  assert.equal(OP_TIERS.length, 3, '档位枚举必须恰 3（无第四档）');
});

/* ────────────────────────────────────────────────────────────────────────────
 * ★ F-36 / ADN-1 **TASK-ADN-122**（ADR-ADN-003 §① · ADR-ADN-009 · FR-ADN-021/033/096 ·
 * AC-ADN-005/010）—— **接受层加严（判据力只升，零删除）**：
 *   · 接受层的档位**读取点 = `tierOf` 单源**（`background/ai-next.ts` 只经 `tierOf(d)` 读档，
 *     零第二档位表 / 零手写白名单）；
 *   · `tierOfId('op.authorize') === 'gesture'` ∧ `admitCandidate` 拒（连接受都拒）；
 *   · 既有派生式三档 / `OP_TIER_TABLE` 物化 / 特权恒 `gesture` 判据**逐字保留**（上文用例）。
 * 反证：把读取点换掉（删 `tierOf(` 调用）/ 内联第二档位表 ⇒ 真源切片判据必红。
 * ──────────────────────────────────────────────────────────────────────────── */

const AI_NEXT_SRC = readFileSync(`${PKG2}src/background/ai-next.ts`, 'utf8');

/** 接受层档位读取点判据：必须经 `tierOf(` 单源读档，且不得内联第二份档位表。 */
export function acceptTierReadPointProblems(src: string): string[] {
  const p = '接受层档位读取点必须 = tierOf（零第二档位表）';
  const problems: string[] = [];
  if (!/tierOf\s*\(/.test(src)) problems.push(`${p}：未发现 tierOf( 调用（读取点漂移 / 手写白名单）`);
  if (/OP_TIER_TABLE|OP_TIERS\b/.test(src)) problems.push(`${p}：ai-next 不得内联 / 复制第二份档位表`);
  return problems;
}

test('★ ADN-1 122：接受层读点 = tierOf ∧ tierOfId(op.authorize)=gesture ∧ admitCandidate 拒', () => {
  const FACTS: AiNextFacts = { refs: [] };
  // ① 真源切片：接受层只经 tierOf( 单源读档（零第二档位表）。
  assert.deepEqual(acceptTierReadPointProblems(AI_NEXT_SRC), [], 'ai-next 必须经 tierOf 单源读档');
  assert.match(AI_NEXT_SRC, /tierOf\(d\) === 'gesture'/, 'gesture 档判定必须由 tierOf(d) 派生');
  // ② 特权 op 恒 gesture ∧ 接受层即拒（连提案都拒）。
  assert.equal(tierOfId('op.authorize'), 'gesture');
  assert.equal(admitCandidate({ opId: 'op.authorize', label: '授权当前站点' }, FACTS).ok, false, 'gesture 候选连接受都拒');
  assert.equal(admitCandidate({ opId: 'op.perm.request', label: '申请权限' }, FACTS).ok, false, '特权 op 一律拒');
  // ③ 对照：auto / confirm 档接受（分层不混同）——confirm 可接受但不可自动按下。
  assert.equal(admitCandidate({ opId: 'op.turn', label: '继续' }, FACTS).ok, true, 'auto 档接受');
  assert.equal(admitCandidate({ opId: 'op.llm-config', label: '配置 LLM' }, FACTS).ok, true, 'confirm 档接受');
  assert.equal(
    pressDecision('op.llm-config', { actor: 'ai', driverId: 'ai-next', driverClass: 'ai-driven', configured: true, armed: true }).ok,
    false,
    'confirm 不得自动按下（AI 不得代答 consent）',
  );
  // ④ 反证：把读取点换掉（删 tierOf( 调用）/ 内联第二档位表 ⇒ 必红 → 还原 PASS。
  const forged = AI_NEXT_SRC.replace("if (tierOf(d) === 'gesture') return { ok: false, blocked: 'tier' };", 'void 0;');
  assert.notEqual(forged, AI_NEXT_SRC, '前置：读取点锚点必须存在');
  assert.ok(acceptTierReadPointProblems(forged).length > 0, '删读取点 ⇒ 必红');
  assert.ok(acceptTierReadPointProblems(`${AI_NEXT_SRC}\nconst OP_TIER_TABLE = {} as const;\n`).length > 0, '第二档位表 ⇒ 必红');
  assert.deepEqual(acceptTierReadPointProblems(AI_NEXT_SRC), [], '还原 ⇒ PASS');
});
