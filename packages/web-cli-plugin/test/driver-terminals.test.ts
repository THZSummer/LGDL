/**
 * V5.5-1 **TASK-V55-110** (ADR-V55-003 §1/§4/§5 · FR-SELF-020~024 · AC-SELF-003 ·
 * R-V55-103 / R-SELF-007 / R-SELF-903) — the **driver-terminal vocabulary** gate.
 *
 * ── 判据（每条都有 `expectFailPattern`，反证在文件内实跑）──────────────────────
 *
 *   DTM-1 **恰 4 且单源** —— `DRIVER_TERMINALS` 恰 4 项、恰一处声明；四枚字面量在 `src/**`
 *        只允许出现在 `next-registry/terminals.ts`（第二声明 / 字面量外泄 ⇒ FAIL）。
 *   DTM-2 **与 `STREAM_TERMINALS` 正交** —— 后者 **6 逐字**、交集为 ∅（R-V55-103）。
 *   DTM-3 **三段控制（禁恒真）** —— `driverTerminalReading`：① 正常 ⇒ `ok`；② 终态在但驱动者
 *        被移除 / 无可达 next ⇒ `violated`；③ 终态不存在 ⇒ `n/a`（既非 PASS 也非 FAIL）。
 *   DTM-4 **「已答」四口径可证伪** —— 取消 / 空值 / 迟到 ⇒ **必不成立「已答」**；
 *        `ASK_CANCEL_REASONS` 4 项逐字。
 *
 * @module test/driver-terminals
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ASK_CANCEL_REASONS, STREAM_TERMINALS } from '../src/ui/sidepanel/stream-model.js';
import {
  ANSWERED_CALIBERS,
  DRIVER_TERMINALS,
  DRIVER_TERMINAL_MOMENT,
  DRIVER_TERMINAL_REQUIRES_ANSWER,
  answeredCaliber,
  driverTerminalReading,
  orthogonalityProblems,
} from '../src/ui/sidepanel/next-registry/terminals.js';
import { PROACTIVE_MOMENTS } from '../src/ui/sidepanel/next-registry/drivers.js';
import { DRIVER_DECLS_SRC } from '../src/ui/sidepanel/next-registry/providers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const TERMINALS_REL = 'src/ui/sidepanel/next-registry/terminals.ts';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'DTM-1-exactly-four-single-source', expectFailPattern: '驱动者终态词汇必须恰 4 项且恰一处声明' },
  { id: 'DTM-2-orthogonal-to-stream', expectFailPattern: '两表必须正交（流终态 vs 已表达意图）' },
  { id: 'DTM-3-three-stage-control', expectFailPattern: '三段控制：判据不得恒真' },
  { id: 'DTM-4-answered-caliber', expectFailPattern: '「已答」四口径必须可证伪' },
];

export function srcTsFiles(dir = join(PKG, 'src')): { readonly rel: string; readonly text: string }[] {
  const out: { rel: string; text: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push({ rel: full.slice(full.indexOf(PKG) + PKG.length), text: readFileSync(full, 'utf8') });
  }
  return out;
}

/** DTM-1 — exactly one declaration site; no literal outside it. */
export function terminalSingleSourceProblems(files: readonly { readonly rel: string; readonly text: string }[]): string[] {
  const problems: string[] = [];
  const declSites = files
    .filter((f) => /export const DRIVER_TERMINALS\b/.test(f.text))
    .map((f) => `${f.rel}×${(f.text.match(/export const DRIVER_TERMINALS\b/g) ?? []).length}`);
  const total = files.reduce((n, f) => n + (f.text.match(/export const DRIVER_TERMINALS\b/g) ?? []).length, 0);
  if (total !== 1 || declSites.join(',') !== TERMINALS_REL + '×1') {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：DRIVER_TERMINALS 声明点 = ${declSites.join(', ') || '<无>'}`);
  }
  // `describe-submitted` 同时是「已表达意图」时刻（ADR-V55-003 §3 行②）⇒ 它在时刻枚举里出现是
  // **设计**而非外泄；扫描因此只针对纯终态词（三型 `answered-*`），而 `describe-submitted` 的
  // 重叠由下面的显式断言承担（刻意分离，不得混为一谈）。
  const momentOverlap = DRIVER_TERMINALS.filter((t) => (PROACTIVE_MOMENTS as readonly string[]).includes(t));
  if (momentOverlap.join(',') !== 'describe-submitted') {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：终态词 ∩ 七类时刻 必须恰为 describe-submitted（实测 ${momentOverlap.join(', ') || '<空>'}`);
  }
  for (const t of DRIVER_TERMINALS) {
    if (momentOverlap.includes(t)) continue;
    const leaks = files.filter((f) => f.rel !== TERMINALS_REL && f.text.includes(`'${t}'`)).map((f) => f.rel);
    if (leaks.length > 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：字面量 '${t}' 外泄到 ${leaks.join(', ')}`);
  }
  return problems;
}

/** DTM-2 — the two vocabularies stay orthogonal, the stream one verbatim. */
export function orthogonalityJudge(
  streamTerminals: readonly string[] = STREAM_TERMINALS,
  driverTerminals: readonly string[] = DRIVER_TERMINALS,
): string[] {
  return orthogonalityProblems(streamTerminals, driverTerminals).map((p) => p);
}

/** `driversForMoment` built from the hand-written declaration table (the real registry source). */
function driversForMomentFromDecls(
  decls: Readonly<Record<string, { readonly driverId: string; readonly moments: readonly string[] }>>,
  moment: string,
): readonly string[] {
  return Object.values(decls)
    .filter((d) => d.moments.includes(moment))
    .map((d) => d.driverId);
}

/** DTM-3 — the three-stage reading of one terminal. */
export function threeStageReading(): { normal: string; violated: string; 'n/a': string } {
  const drivers = (m: string) => driversForMomentFromDecls(DRIVER_DECLS_SRC, m);
  const normal = driverTerminalReading({ terminal: 'answered-ref', value: '原地翻译为中文', canceled: false, driversForMoment: drivers, nextOf: () => 'op.turn' });
  const removed = driverTerminalReading({ terminal: 'answered-ref', value: '原地翻译为中文', canceled: false, driversForMoment: () => [], nextOf: () => 'op.turn' });
  const noTerminal = driverTerminalReading({ driversForMoment: drivers, nextOf: () => null });
  return { normal: normal.status, violated: removed.status, 'n/a': noTerminal.status };
}

const FILES = srcTsFiles();

test('DTM-1 驱动者终态词汇恰 4 且单源（字面量不外泄）', () => {
  assert.equal(DRIVER_TERMINALS.length, 4, JUDGEMENTS[0].expectFailPattern);
  assert.deepEqual([...DRIVER_TERMINALS], ['answered-ref', 'answered-op', 'answered-bg', 'describe-submitted']);
  assert.deepEqual(terminalSingleSourceProblems(FILES), [], JUDGEMENTS[0].expectFailPattern);
});

test('DTM-1 反证：第二声明 / 字面量外泄 ⇒ 必红 → 还原 PASS', () => {
  const forged = [...FILES, { rel: 'src/ui/sidepanel/next-registry/ghost.ts', text: "const x = 'answered-ref';\n" }];
  assert.ok(terminalSingleSourceProblems(forged).length > 0, `${JUDGEMENTS[0].expectFailPattern}：外泄必须红`);
  const dup = FILES.map((f) => (f.rel === TERMINALS_REL ? { ...f, text: `${f.text}\nexport const DRIVER_TERMINALS = ['answered-ref'] as const;\n` } : f));
  assert.ok(terminalSingleSourceProblems(dup).some((p) => p.includes('恰一处声明')), `${JUDGEMENTS[0].expectFailPattern}：第二声明必须红`);
  assert.deepEqual(terminalSingleSourceProblems(FILES), []);
});

test('DTM-2 与 STREAM_TERMINALS 6 正交（交集空 + 6 逐字不动）', () => {
  assert.deepEqual([...STREAM_TERMINALS], ['answered', 'cancelled', 'approved', 'rejected', 'invalidated', 'completed'], 'STREAM_TERMINALS 6 项逐字不动');
  assert.deepEqual(orthogonalityJudge(), [], JUDGEMENTS[1].expectFailPattern);
});

test('DTM-2 反证：交集非空 / 流终态被改 / 词汇 3 或 5 项 ⇒ 各 FAIL → 还原 PASS', () => {
  assert.ok(orthogonalityJudge([...STREAM_TERMINALS], [...DRIVER_TERMINALS, 'answered']).length > 0, `${JUDGEMENTS[1].expectFailPattern}：交集必须红`);
  assert.ok(orthogonalityJudge(['answered', 'cancelled'], [...DRIVER_TERMINALS]).length > 0, `${JUDGEMENTS[1].expectFailPattern}：流终态计数必须红`);
  assert.ok(orthogonalityJudge([...STREAM_TERMINALS], ['answered-ref']).length > 0, `${JUDGEMENTS[1].expectFailPattern}：词汇数必须红`);
  assert.deepEqual(orthogonalityJudge(), []);
});

test('DTM-3 三段控制：正常 ok / 移除驱动者 violated / 终态不存在 n/a', () => {
  const r = threeStageReading();
  assert.equal(r.normal, 'ok', `${JUDGEMENTS[2].expectFailPattern}：正常段必须 ok 且读数非空`);
  assert.equal(r.violated, 'violated', `${JUDGEMENTS[2].expectFailPattern}：移除驱动者必须 violated`);
  assert.equal(r['n/a'], 'n/a', `${JUDGEMENTS[2].expectFailPattern}：终态不存在必须 n/a（不得当 PASS）`);
  // 正常段读数非空（判据真的运行过）。
  const drivers = (m: string) => driversForMomentFromDecls(DRIVER_DECLS_SRC, m);
  const full = driverTerminalReading({ terminal: 'describe-submitted', driversForMoment: drivers, nextOf: () => 'op.turn' });
  assert.equal(full.driver, 'ref-action', `${JUDGEMENTS[2].expectFailPattern}：读数必须指名驱动者`);
});

test('DTM-3 反证：可达 next 缺失 ⇒ violated（判据不是「有终态就绿」）', () => {
  const drivers = (m: string) => driversForMomentFromDecls(DRIVER_DECLS_SRC, m);
  const noNext = driverTerminalReading({ terminal: 'answered-ref', value: 'x', canceled: false, driversForMoment: drivers, nextOf: () => null });
  assert.equal(noNext.status, 'violated', `${JUDGEMENTS[2].expectFailPattern}：无可达 next 必须 violated`);
});

test('DTM-4 「已答」四口径与 ASK_CANCEL_REASONS 4 项逐字', () => {
  assert.equal(ANSWERED_CALIBERS.length, 4, `${JUDGEMENTS[3].expectFailPattern}：四口径必须显式登记`);
  assert.deepEqual([...ASK_CANCEL_REASONS].sort(), ['aborted', 'superseded', 'timeout', 'user']);
  assert.equal(answeredCaliber({ value: '原地翻译为中文', canceled: false }), 'answered');
  assert.equal(answeredCaliber({ value: '   ', canceled: false }), 'cancelled', `${JUDGEMENTS[3].expectFailPattern}：空值不得算已答`);
  assert.equal(answeredCaliber({ value: '原地翻译为中文', canceled: true }), 'cancelled', `${JUDGEMENTS[3].expectFailPattern}：取消不得算已答`);
  assert.equal(answeredCaliber({ value: '原地翻译为中文', late: true }), 'late', `${JUDGEMENTS[3].expectFailPattern}：迟到不得算已答`);
  assert.equal(answeredCaliber({}), 'n/a');
  for (const t of DRIVER_TERMINAL_REQUIRES_ANSWER) {
    const v = driverTerminalReading({ terminal: t, canceled: true, value: 'x', driversForMoment: () => ['d'], nextOf: () => 'op.turn' });
    assert.equal(v.status, 'violated', `${JUDGEMENTS[3].expectFailPattern}：${t} 在取消下必不成立`);
    const late = driverTerminalReading({ terminal: t, late: true, value: 'x', driversForMoment: () => ['d'], nextOf: () => 'op.turn' });
    assert.equal(late.status, 'violated', `${JUDGEMENTS[3].expectFailPattern}：${t} 在迟到下必不成立`);
  }
  for (const t of DRIVER_TERMINALS) {
    assert.ok((PROACTIVE_MOMENTS as readonly string[]).includes(DRIVER_TERMINAL_MOMENT[t]), `${t} 的归属时刻必须在七类时刻闭集内`);
  }
});

test('DTM 元判据：每条 judgement 的 expectFailPattern 非占位', () => {
  assert.equal(JUDGEMENTS.length, 4);
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
  }
});
