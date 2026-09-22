/**
 * V5-2 **TASK-V5-147** (ADR-V5-005 §2 · ADR-V5-001 · FR-ALLN-078/059/076 ·
 * **AC-ALLN-011/009** · R-ALLN-012 / **R-ALLN-905**) — the **per-op wiring gate**.
 *
 * ── What it judges ───────────────────────────────────────────────────────────
 *
 *   ① **逐 op 唯一调用点**：每个 op 的「能力 / 动作请求」符号在 `src/**` 里的调用点数
 *      等于登记值（`OP_CALLSITE_SET`）—— 复制一条调用点（第二条执行路径）即红；
 *   ② **单一入口调用点集合显式登记**：9 个 op 全部出现在登记表里（漏一个 ⇒ 红）；
 *   ③ **零 `requestTurn`**（除 `op.turn`）：`REQUESTTURN_CALLSITE_SET` 只允许 turn 的
 *      入口与 composer 提交两个位置，其余 8 个 op 的**槽位**不得出现它（R-ALLN-905）；
 *   ④ **本地 op 不受 `pending` 门控**：`params`/`consent` 皆无的 op 在 `openAsks` 超限时
 *      仍必须执行（`deny` 集断言 —— 只有带卡片状态的 op 才可能入队）；
 *   ⑤ **与 op 清单同源**：登记表的 opId 集 == `OP_IDS`（清单一改，本门禁同步红/绿）。
 *
 * 每条判据都有 `expectFailPattern`（gate-integrity 的 node 门禁发现标记），且 3 条伪造
 * 反证**在文件内实跑**（复制调用点 / 让本地 op 接 `requestTurn` / 让本地 op 受 pending 门控）。
 *
 * @module test/op-wiring
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { OP_IDS } from '../src/shared/op-table.js';
import { OPS_BY_ID, runOp } from '../src/ui/sidepanel/next-registry/pipeline.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const SIDEPANEL = read('src/ui/sidepanel/sidepanel.ts');

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

/** `expectFailPattern` of every judgement this gate declares (the meta-gate marker). */
export interface OpWiringJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly OpWiringJudgement[] = [
  { id: 'OP-W-1-unique-callsite', expectFailPattern: '唯一调用点判据失败：' },
  { id: 'OP-W-2-callsite-registry', expectFailPattern: '调用点登记表必须覆盖全部 op（漏登记即红）' },
  { id: 'OP-W-3-no-requestTurn', expectFailPattern: '本地 op 槽不得出现 requestTurn' },
  { id: 'OP-W-4-local-not-pending-gated', expectFailPattern: '本地 op 不得受 pending 门控（零卡片状态的 op 永不入队）' },
  { id: 'OP-W-5-table-same-source', expectFailPattern: '登记表 opId 集必须与 OP_IDS 同源' },
  // V5.5-1 TASK-V55-113（ADR-V55-001 §5 · FR-SELF-015/033 · R-V55-101）——
  // **主流程 diff = 0 复合读数**：新增「答案驱动化」时的三条计数判据同屏机核。
  { id: 'OP-W-6-main-flow-diff0', expectFailPattern: '主流程 diff 必须为 0（requestTurn 恰 2 / maybeRecommend 1 定义 7 调用点 / nextAfterSettle 1 定义）' },
];

/**
 * The **single entry symbol** of each op and the number of call sites it is allowed.
 *
 * `op.turn`'s 2 = the composer submit + the op slot (it is the ONE turn-issuing entry,
 * N22/N25); every other op's symbol is a capability / action request whose **one** call
 * site is the op's own slot or execution body — a second one is the double-path drift
 * FR-ALLN-059 / R-ALLN-012 forbid.
 */
export const OP_CALLSITE_SET: readonly {
  readonly opId: string;
  readonly symbol: string;
  readonly callSites: number;
}[] = Object.freeze([
  { opId: 'op.turn', symbol: 'requestTurn', callSites: 2 },
  // 3 = the in-panel pick-guidance listener + the L1 deps seam + the op slot (all ONE entry
  //     `pickInput.requestPick`; the op slot is the pipeline's route).
  { opId: 'op.pick', symbol: 'requestPick', callSites: 3 },
  { opId: 'op.describe', symbol: 'submitDescribe', callSites: 1 },
  { opId: 'op.authorize', symbol: 'authorizeCurrentSite', callSites: 1 },
  { opId: 'op.rebind', symbol: 'rebindCurrentTab', callSites: 1 },
  { opId: 'op.help', symbol: 'openSettingsSection', callSites: 1 },
  { opId: 'op.llm-config', symbol: 'keyStore.save', callSites: 1 },
  { opId: 'op.perm.request', symbol: 'requestCapabilityPermissionOnGesture', callSites: 1 },
  { opId: 'op.revoke', symbol: 'removeCapabilityPermission', callSites: 1 },
]);

/** Call sites of `symbol(` (comments / imports / declarations excluded). */
export function callSites(source: string, symbol: string): number[] {
  const out: number[] = [];
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  source.split('\n').forEach((raw, i) => {
    if (isComment(raw)) return;
    if (!new RegExp(`${escaped}\\s*\\(`).test(raw)) return;
    if (/^\s*import\b/.test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`).test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${escaped}\\s*=`).test(raw)) return;
    out.push(i + 1);
  });
  return out;
}

/** ① + ② — every declared op must have exactly its registered call-site count. */
export function callsiteProblems(
  source: string,
  table: readonly { readonly opId: string; readonly symbol: string; readonly callSites: number }[],
  opIds: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const opId of opIds) {
    const row = table.find((r) => r.opId === opId);
    if (!row) {
      problems.push(`调用点登记表必须覆盖全部 op（漏登记即红）：缺 ${opId}`);
      continue;
    }
    const sites = callSites(source, row.symbol);
    if (sites.length !== row.callSites) {
      problems.push(`唯一调用点判据失败：${row.symbol}( 在 ${opId} 下实测 ${sites.length} 处 ≠ 登记 ${row.callSites} 处（第二处即双入口漂移）`);
    }
  }
  for (const row of table) {
    if (!opIds.includes(row.opId)) problems.push(`调用点登记表必须覆盖全部 op（漏登记即红）：多出未声明 op ${row.opId}`);
  }
  return problems;
}

/** ③ — `requestTurn(` 只允许出现在 turn 的入口与 composer 提交（2 处）。 */
export function requestTurnProblems(source: string): string[] {
  const sites = callSites(source, 'requestTurn');
  const problems: string[] = [];
  if (sites.length !== 2) {
    problems.push(`本地 op 槽不得出现 requestTurn：requestTurn( 必须恰 2 处（入口 + composer 提交），实测 ${sites.length} 处（行号 ${sites.join(', ')}）`);
  }
  return problems;
}

/** ④ — the ops that may queue are exactly those carrying a card state (`params`/`consent`). */
export function pendingGateProblems(
  ops: Readonly<Record<string, { readonly params?: unknown; readonly consent?: unknown }>>,
): string[] {
  const problems: string[] = [];
  // 「本地（零卡片状态）」= the ops whose whole point is one click. If one of them grows a
  // card state it becomes queueable ⇒ it turns a one-click action into a two-step one
  // (the regression FR-ALLN-059 forbids).
  const LOCAL = ['op.turn', 'op.pick', 'op.rebind', 'op.help'];
  for (const opId of LOCAL) {
    const op = ops[opId];
    if (op && (op.params || op.consent)) {
      problems.push(`本地 op 不得受 pending 门控（零卡片状态的 op 永不入队）：${opId} 声明了卡片状态`);
    }
  }
  return problems;
}

test('OP-W ①/②: 9 个 op 各有唯一调用点 ∧ 调用点集合显式登记', () => {
  assert.deepEqual(callsiteProblems(SIDEPANEL, OP_CALLSITE_SET, OP_IDS), [], JUDGEMENTS[0].expectFailPattern);
  assert.equal(OP_CALLSITE_SET.length, OP_IDS.length, JUDGEMENTS[1].expectFailPattern);
  for (const row of OP_CALLSITE_SET) {
    assert.ok(row.callSites >= 1, `${row.opId} 的调用点数必须 ≥1（否则入口不存在）`);
    assert.ok(row.symbol.length > 0, `${row.opId} 必须登记唯一入口符号`);
  }
});

test('OP-W ③: 除 op.turn 外零 requestTurn（集合比对）', () => {
  assert.deepEqual(requestTurnProblems(SIDEPANEL), [], JUDGEMENTS[2].expectFailPattern);
  // 与登记表同源：turn 的符号就是 requestTurn，其余 8 个 op 的符号都不是它。
  const turn = OP_CALLSITE_SET.find((r) => r.opId === 'op.turn');
  assert.equal(turn?.symbol, 'requestTurn');
  for (const row of OP_CALLSITE_SET) {
    if (row.opId === 'op.turn') continue;
    assert.notEqual(row.symbol, 'requestTurn', `${row.opId} 不得经 requestTurn`);
  }
});

test('OP-W ④: 本地 op 在 pending 门控下仍可执行（deny 集断言）', async () => {
  assert.deepEqual(pendingGateProblems(OPS_BY_ID), [], JUDGEMENTS[3].expectFailPattern);
  // 直接驱动管线：openAsks 远超上限，但 card-less 的本地 op 仍必须执行（不得 'queued'）。
  for (const opId of ['op.rebind', 'op.help', 'op.pick', 'op.describe']) {
    const out = await runOp(opId, {}, { openAsks: 99, maxOpenAsks: 2, ops: OPS_BY_ID });
    assert.notEqual(out.reason, 'queued', `${opId} 不得受 pending 门控`);
  }
  // 对照：带卡片状态的 op 在预算耗尽时**可以**入队（判据不是「一律不入队」）。
  const queued = await runOp('op.llm-config', {}, { openAsks: 99, maxOpenAsks: 2, ops: OPS_BY_ID });
  assert.equal(queued.reason, 'queued', '带 params 的 op 超预算时必须入队而非静默丢弃');
});

test('OP-W ⑤: 登记表与 op 清单同源（清单改一处 ⇒ 门禁同步红/绿）', () => {
  const forgedIds = [...OP_IDS, 'op.ghost'];
  assert.ok(callsiteProblems(SIDEPANEL, OP_CALLSITE_SET, forgedIds).length > 0, '清单新增 op 而登记表未跟 ⇒ 必红');
  const forgedTable = OP_CALLSITE_SET.filter((r) => r.opId !== 'op.revoke');
  assert.ok(callsiteProblems(SIDEPANEL, forgedTable, OP_IDS).length > 0, '登记表少一 op ⇒ 必红');
});

test('OP-W 反证 ①: 复制一条调用点 ⇒ 唯一调用点判据必红', () => {
  const forged = `${SIDEPANEL}\n  void keyStore.save({ providerId: 'x', apiKey: 'y', model: 'z' });\n`;
  const problems = callsiteProblems(forged, OP_CALLSITE_SET, OP_IDS);
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), problems.join(' | '));
});

test('OP-W 反证 ②: 让本地 op 误接 requestTurn ⇒ 回合判据必红', () => {
  const forged = SIDEPANEL.replace(
    "    rebind: () => void rebindCurrentTab(),",
    "    rebind: () => void requestTurn('重新绑定当前标签页'),",
  );
  assert.notEqual(forged, SIDEPANEL, '前置：注入锚点必须存在');
  const problems = requestTurnProblems(forged);
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), problems.join(' | '));
});

test('OP-W 反证 ③: 让本地 op 受 pending 门控 ⇒ 门控判据必红', () => {
  const forged = { ...OPS_BY_ID, 'op.rebind': { ...OPS_BY_ID['op.rebind'], params: { prompt: 'x' } } };
  const problems = pendingGateProblems(forged);
  assert.ok(problems.length > 0, JUDGEMENTS[3].expectFailPattern);
  // 还原 ⇒ PASS（判据不是恒真）。
  assert.deepEqual(pendingGateProblems(OPS_BY_ID), []);
});

/* ── V5.5-1 TASK-V55-113（ADR-V55-001 §5 · FR-SELF-015/033 · R-V55-101）──────────
 *
 * 「答案驱动化」把三处「用户已表达的话」的结算路径接进推荐器。若每处就地写一行
 * `maybeRecommend('answered')`，`maybeRecommend(` 的调用点会从 7 涨到 10（**第 8 个散落
 * 调用点**，R-V55-101）。因此主流程必须 **diff = 0**：三处都经**唯一**的
 * `nextAfterSettle` 入口，而 `nextAfterSettle` 自己只含 1 个 `maybeRecommend(`。
 * ──────────────────────────────────────────────────────────────────────────── */

/** `symbol(` 的出现点数（排除注释行 / import / 定义行）——与 {@link callSites} 同口径。 */
export function occurrenceProblems(
  source: string,
  symbol: string,
  expected: number,
  label: string,
): string[] {
  const sites = callSites(source, symbol);
  return sites.length === expected ? [] : [`${JUDGEMENTS[5].expectFailPattern}：${label} 实测 ${sites.length} 处 ≠ ${expected} 处（行号 ${sites.join(', ')}）`];
}

/** `nextAfterSettle(` 的**定义**处数（调用点不在此列）。 */
export function definitionCount(source: string, symbol: string): number {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`, 'gm')) ?? []).length;
}

test('OP-W ⑥ 主流程 diff = 0：requestTurn 恰 2 ∧ maybeRecommend 1 定义 / 7 调用点 ∧ nextAfterSettle 1 定义', () => {
  const problems = [
    ...requestTurnProblems(SIDEPANEL),
    ...occurrenceProblems(SIDEPANEL, 'maybeRecommend', 7, 'maybeRecommend 调用点'),
    ...(definitionCount(SIDEPANEL, 'maybeRecommend') === 1 ? [] : [`${JUDGEMENTS[5].expectFailPattern}：maybeRecommend 定义实测 ${definitionCount(SIDEPANEL, 'maybeRecommend')} 处`]),
    ...(definitionCount(SIDEPANEL, 'nextAfterSettle') === 1 ? [] : [`${JUDGEMENTS[5].expectFailPattern}：nextAfterSettle 定义实测 ${definitionCount(SIDEPANEL, 'nextAfterSettle')} 处`]),
  ];
  assert.deepEqual(problems, [], problems.join(' | '));
  // 「answered」触发点确实接线（三处结算路径 + ops 恢复缝），但都不新增 maybeRecommend 调用点。
  assert.ok(callSites(SIDEPANEL, 'nextAfterSettle').length >= 4, 'answered 触发点必须接线（applyRefAction / submitDescribe / ask 应答 / ops 缝）');
});

test('OP-W ⑥ 反证：新增第 8 个 maybeRecommend( 调用点 ⇒ 必红 → 还原 PASS', () => {
  const forged = `${SIDEPANEL}\nmaybeRecommend('idle');\n`;
  const problems = occurrenceProblems(forged, 'maybeRecommend', 7, 'maybeRecommend 调用点');
  assert.ok(problems.some((p) => p.includes(JUDGEMENTS[5].expectFailPattern)), problems.join(' | '));
  // 反证之二：删掉唯一入口 ⇒ 定义计数必红。
  const noEntry = SIDEPANEL.replace('function nextAfterSettle(src: SettleSource = { kind: \'idle\' }): void {', 'function renamedEntry(src: SettleSource = { kind: \'idle\' }): void {');
  assert.notEqual(noEntry, SIDEPANEL, '前置：注入锚点必须存在');
  assert.equal(definitionCount(noEntry, 'nextAfterSettle'), 0, '删掉唯一入口 ⇒ 定义计数必须归零（判据非恒真）');
  assert.deepEqual(occurrenceProblems(SIDEPANEL, 'maybeRecommend', 7, 'maybeRecommend 调用点'), []);
});
