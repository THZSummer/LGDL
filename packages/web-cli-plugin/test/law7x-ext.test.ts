/**
 * V5.5-1 **TASK-V55-123** (ADR-V55-003 §3/§4/§5 · FR-SELF-020~028 · **AC-SELF-003** ·
 * R-SELF-007 / R-SELF-903) — the **法七扩展门禁**（「已表达意图」四类终态逐类必有可达 next）。
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   ① **四类逐类** —— 已答 ref-round / 已答 op-ask / 已答 bg-ask / 已交描述：来源键 → 终态词 →
 *      时刻 → 驱动者 → 可达 next，**五段逐类**断言（口径与 `driver-terminals.test.ts` **同源**：
 *      同一 `DRIVER_TERMINALS` / `DRIVER_TERMINAL_MOMENT` / `driverTerminalReading`）；
 *   ② **双向反证** —— 「新增终态无 next ⇒ FAIL」∧「已有 next 被删 ⇒ FAIL」；
 *   ③ **禁恒真（三段控制）** —— 正常 ⇒ `ok`；驱动者被移除 / 无可达 next / 口径①不成立 ⇒
 *      `violated`；终态不存在 ⇒ `n/a`（既非 PASS 也非 FAIL，**单独计数**）；
 *   ④ **生产路径口径②（L7X-4，review R1 BLOCK-01）** —— 后台 ask 的**取消**必须在
 *      `registerSuspension` **之前**被 `isCanceled` 守卫拦下（稳态驱动集 + `return`，不记
 *      `answered-bg`、不驱动 `'answered'`）。判据读**真源**（`sidepanel.ts` 切片）+ 三段注入反证。
 *
 * @module test/law7x-ext
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { DRIVER_DECLS_SRC } from '../src/ui/sidepanel/next-registry/providers.js';
import {
  DRIVER_TERMINALS,
  DRIVER_TERMINAL_MOMENT,
  DRIVER_TERMINAL_REQUIRES_ANSWER,
  answeredCaliber,
  driverTerminalReading,
  terminalOfSource,
} from '../src/ui/sidepanel/next-registry/terminals.js';
import type { DriverTerminal } from '../src/ui/sidepanel/next-registry/terminals.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
/** 生产路径的真源（L7X-4 判据的取材面；不读 dist / 不读副本）。 */
export const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
/** 后台 ask 分支的开头（`submitAskFor` 内，`rid && !isRef`）。 */
export const BG_ASK_BRANCH_START = 'if (rid && !isRef) {';
/** `submitAskFor` 里紧随该分支之后的语句（切片右界，保证判据只看这一支）。 */
export const BG_ASK_BRANCH_END = "dispatch({\n    type: 'ask-resolved'";

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'L7X-1-four-intents', expectFailPattern: '四类「已表达意图」终态必须逐类有可达 next' },
  { id: 'L7X-2-bidirectional', expectFailPattern: '双向反证：新增终态无 next / 已有 next 被删 都必须 FAIL' },
  { id: 'L7X-3-not-tautology', expectFailPattern: '禁恒真：三段控制（ok / violated / n/a）' },
  {
    id: 'L7X-4-bg-ask-cancel-guard',
    expectFailPattern: '取消后台 ask 不得记「已答」/ 不得触发 answered 时机（生产路径口径②）',
  },
];

/**
 * `moment → 驱动者`：**从手写声明表抽取**（与 `driver-terminals.test.ts#DTM-3` 同一口径）。
 * 不读注册表：注册表是 lazy 的（`registerBuiltinProviders()` 由 `recommend.ts` 调用），
 * 而本判据要判的是**声明面**本身（两源漂移由 `driver-quadruple` 双向包含兜底）。
 */
function driversForMomentOf(moment: string): readonly string[] {
  return Object.values(DRIVER_DECLS_SRC)
    .filter((d) => (d.moments as readonly string[]).includes(moment))
    .map((d) => d.driverId);
}

function driversForTimingOf(timing: string): readonly string[] {
  return Object.values(DRIVER_DECLS_SRC)
    .filter((d) => (d.timings as readonly string[]).includes(timing))
    .map((d) => d.driverId);
}

/** 四类「已表达意图」的来源键（生产侧登记 `Suspension.source` 的取值面）。 */
export const S0_INTENT_SOURCES = Object.freeze(['ref', 'op', 'bg', 'describe']);

/** 生产侧的悬置登记口径（`drivers.ts#Suspension`）用来源键；终态词由本表判定。 */
function readingOf(terminal: DriverTerminal, over: Record<string, unknown> = {}) {
  return driverTerminalReading({
    terminal,
    canceled: false,
    value: '原地翻译为中文',
    late: false,
    driversForMoment: (m: string) => driversForMomentOf(m),
    nextOf: () => 'op.turn',
    ...over,
  });
}

/* ── L7X-4（review R1 BLOCK-01）：后台 ask「取消」的生产路径口径② ───────────────
 *
 * `terminals.ts#answeredCaliber` 是口径的**判定侧**，但它不进 sidepanel bundle
 * （build §17.4）——生产的「终态」只由 `source` 约定。因此「取消 ⇒ 不记「已答」」必须在
 * **生产路径**上被守卫，而不是只被纯函数判定：三型 ask 里 ref（引用回合）与 op（面板
 * params）两路都已把驱动分支放在 `isCanceled` 判定之后，只有**后台 ask** 这一支
 * （`submitAskFor` 的 `rid && !isRef` 分支）漏判 —— 取消会被登记成 `answered-bg`
 * 并驱动 `'answered'`（FR-SELF-023 口径② / EC-SELF-005 的生产违反面）。
 *
 * 判据读**真源切片**（`sidepanel.ts`），因此该支被改写/删除、守卫被搬到登记之后、
 * 或守卫内改记 `'answered'` 都会立刻 FAIL。
 */

/** `submitAskFor` 的后台 ask 分支源文本（左闭右开：到 `dispatch({ type: 'ask-resolved'` 之前）。 */
export function bgAskBranch(source: string): string {
  const start = source.indexOf(BG_ASK_BRANCH_START);
  if (start < 0) return '';
  const end = source.indexOf(BG_ASK_BRANCH_END, start);
  return end > start ? source.slice(start, end) : source.slice(start);
}

/** 从 `from` 处的 `{` 起做花括号配对，返回整块（含 `if (…)` 头部）。配对失败 ⇒ 空串。 */
export function bracedBlockAt(source: string, from: number): string {
  const open = source.indexOf('{', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return '';
}

/** L7X-4 的纯判据：后台 ask 分支必须**先**用取消守卫拦下，再登记悬置。 */
export function bgAskCancelGuardProblems(source: string): string[] {
  const problems: string[] = [];
  const pattern = JUDGEMENTS[3].expectFailPattern;
  const branch = bgAskBranch(source);
  if (branch.length === 0) return [`${pattern}：后台 ask 分支（${BG_ASK_BRANCH_START}）不存在 —— 判据对象缺失`];
  const regIdx = branch.indexOf('registerSuspension(');
  if (regIdx < 0) return [`${pattern}：后台 ask 分支未登记悬置（判据锚点缺失）`];
  const guardIdx = branch.indexOf('if (isCanceled)');
  if (guardIdx < 0) return [`${pattern}：取消守卫缺失（isCanceled ⇒ 不记「已答」，不得驱动 answered）`];
  if (guardIdx > regIdx) {
    return [`${pattern}：取消守卫必须在 registerSuspension **之前**（否则取消仍被记为「已答」）`];
  }
  const guard = bracedBlockAt(branch, guardIdx);
  if (guard.length === 0) problems.push(`${pattern}：取消守卫的语句块无法解析（判据悬空）`);
  if (!/\breturn\b/.test(guard)) problems.push(`${pattern}：取消守卫必须 return（不得继续走登记 / 驱动 answered）`);
  if (!/nextAfterSettle\(\s*\{\s*kind:\s*'settle'/.test(guard) || !/force:\s*true/.test(guard)) {
    problems.push(`${pattern}：取消必须走稳态驱动集（nextAfterSettle({ kind: 'settle', force: true })）——仍必有接管者`);
  }
  if (/'answered'/.test(guard)) problems.push(`${pattern}：取消守卫内不得出现 answered 时机`);
  return problems;
}

/** 在**分支内**做字符串手术（避免误改同名的其它调用点）。 */
function patchBranch(source: string, edit: (branch: string) => string): string {
  const branch = bgAskBranch(source);
  return source.replace(branch, edit(branch));
}

test('L7X-4 后台 ask「取消」不得记「已答」：生产路径守卫（真源切片 + 三段注入反证）', () => {
  const src = readFileSync(join(PKG, SIDEPANEL_REL), 'utf8');
  const pattern = JUDGEMENTS[3].expectFailPattern;
  assert.deepEqual(bgAskCancelGuardProblems(src), [], `${pattern}：真源守卫不满足`);
  // 判据对象必须真的取到后台 ask 分支（否则「不满足」是空转）。
  const branch = bgAskBranch(src);
  assert.ok(branch.includes('bgAskIds.has(rid)') && branch.includes('ask-user-response'), '切片必须是后台 ask 分支本体');
  assert.ok(!branch.includes(BG_ASK_BRANCH_END), '切片右界必须停在 ask-resolved 派发之前（不得吞掉后续语句）');
  const guardBlock = bracedBlockAt(branch, branch.indexOf('if (isCanceled)'));
  assert.ok(guardBlock.length > 0, '真源必须存在取消守卫块（判据对象）');

  // ① 反证：删掉整段取消守卫 ⇒ 必红（review R1 BLOCK-01 的注入形态）。
  const stripped = patchBranch(src, (b) => b.replace(guardBlock, ''));
  assert.notEqual(stripped, src, '注入必须真的改到源文本（否则 FAIL 段空转）');
  assert.ok(
    bgAskCancelGuardProblems(stripped).some((p) => /取消守卫缺失/.test(p)),
    `${pattern}：删掉取消守卫必须判红`,
  );

  // ② 反证：把守卫搬到 registerSuspension **之后** ⇒ 必红（顺序错误 = 取消仍被登记）。
  const regTail = "evidence: ['session.openAsks'],\n        });";
  assert.ok(branch.includes(regTail), '注入锚点（登记块尾）必须存在');
  const moved = patchBranch(src, (b) => b.replace(guardBlock, '').replace(regTail, `${regTail}\n        ${guardBlock}`));
  assert.ok(
    bgAskCancelGuardProblems(moved).some((p) => /必须在 registerSuspension \*\*之前\*\*/.test(p)),
    `${pattern}：守卫搬到登记之后必须判红（顺序是判据的一部分）`,
  );

  // ③ 反证：守卫内改记 answered 时机 ⇒ 必红（取消不得触发 answered）。
  const answeredGuard = patchBranch(src, (b) =>
    b.replace(guardBlock, "if (isCanceled) {\n          nextAfterSettle({ kind: 'answered' });\n          return;\n        }"),
  );
  assert.notEqual(answeredGuard, src);
  assert.ok(
    bgAskCancelGuardProblems(answeredGuard).some((p) => /不得出现 answered 时机/.test(p)),
    `${pattern}：取消守卫内出现 answered 必须判红`,
  );

  // ④ 还原 ⇒ 必绿（同一判据两侧都可动，不是恒真）。
  assert.deepEqual(bgAskCancelGuardProblems(src), [], `${pattern}：还原后必须 PASS`);
});

test('L7X-1 四类「已表达意图」终态逐类：来源 → 终态 → 时刻 → 驱动者 → 可达 next', () => {
  const seen = new Set<string>();
  for (const source of S0_INTENT_SOURCES) {
    const terminal = terminalOfSource(source);
    assert.ok(terminal, `${source}: 来源键必须有单源终态映射（实测 ${String(terminal)}）`);
    assert.ok((DRIVER_TERMINALS as readonly string[]).includes(terminal), `${source}: ${terminal} 必须在单源词表内`);
    seen.add(terminal);
    const moment = DRIVER_TERMINAL_MOMENT[terminal];
    assert.ok(moment, `${terminal}: 必须有归属时刻`);
    const drivers = driversForMomentOf(moment);
    assert.ok(drivers.length >= 1, `${JUDGEMENTS[0].expectFailPattern}：${terminal}（时刻 ${moment}）必须至少 1 个驱动者`);
    const verdict = readingOf(terminal);
    assert.equal(verdict.status, 'ok', `${terminal}: 正常段必须 ok（实测 ${JSON.stringify(verdict)}）`);
    assert.equal(verdict.next, 'op.turn', `${terminal}: 必须有可达 next`);
    // 「已答」三型必须经口径①（非取消且非空）；`describe-submitted` 不在此列（空描述不入终态）。
    const requires = (DRIVER_TERMINAL_REQUIRES_ANSWER as readonly string[]).includes(terminal);
    assert.equal(requires, terminal !== 'describe-submitted', `${terminal}: 是否需要口径①必须与单源一致`);
  }
  assert.equal(seen.size, 4, `四类必须映射到四个**互异**终态（实测 ${[...seen].join(',')}）`);
  assert.deepEqual([...seen].sort(), [...DRIVER_TERMINALS].sort(), '四类来源必须覆盖全部 4 个终态词（集合相等）');
  // 「答完之后恰 ≥1 驱动者」：`answered` 时机非空（ADR-V55-002 §4）。
  assert.ok(driversForTimingOf('answered').length >= 1, "answered 时机必须有驱动者");
});

test('L7X-2 双向反证：新增终态无 next ⇒ FAIL ∧ 已有 next 被删 ⇒ FAIL → 还原 PASS', () => {
  // ① 新增一个终态（不在单源内）却无可达 next ⇒ 必红。
  const nobleed = driverTerminalReading({
    terminal: 'answered-ref',
    canceled: false,
    value: 'x',
    driversForMoment: () => [],
    nextOf: () => null,
  });
  assert.equal(nobleed.status, 'violated', `${JUDGEMENTS[1].expectFailPattern}：无驱动者 / 无 next 必须 violated`);
  // ② 已有 next 被删（nextOf 返回 null）⇒ 必红。
  for (const source of S0_INTENT_SOURCES) {
    const terminal = terminalOfSource(source) as DriverTerminal;
    const removed = readingOf(terminal, { nextOf: () => null });
    assert.equal(removed.status, 'violated', `${terminal}: 删掉可达 next 必须 violated（判据不得恒真）`);
  }
  // ③ 反向：补回驱动者 + next ⇒ 必绿（同一判据两侧都可动）。
  for (const source of S0_INTENT_SOURCES) {
    assert.equal(readingOf(terminalOfSource(source) as DriverTerminal).status, 'ok', `${source}: 还原必须 PASS`);
  }
  // ④ 口径①被破（取消 / 空值 / 迟到）⇒ 「已答」三型必不成立。
  for (const source of ['ref', 'op', 'bg'] as const) {
    const terminal = terminalOfSource(source) as DriverTerminal;
    assert.equal(readingOf(terminal, { canceled: true }).status, 'violated', `${terminal}: 取消必须 violated`);
    assert.equal(readingOf(terminal, { value: '   ' }).status, 'violated', `${terminal}: 空值必须 violated`);
    assert.equal(readingOf(terminal, { late: true }).status, 'violated', `${terminal}: 迟到必须 violated（不记「已答」）`);
    assert.equal(answeredCaliber({ canceled: true, value: 'x' }), 'cancelled');
    assert.equal(answeredCaliber({ value: '' }), 'cancelled');
    assert.equal(answeredCaliber({ late: true, value: 'x' }), 'late');
  }
});

test('L7X-3 禁恒真三段控制：正常 ⇒ ok ∧ 反证段 ⇒ violated ∧ 对照段 ⇒ n/a（不入 PASS 池）', () => {  const normal = readingOf('answered-ref');
  const removedDriver = driverTerminalReading({
    terminal: 'answered-ref',
    canceled: false,
    value: 'x',
    driversForMoment: () => [],
    nextOf: () => 'op.turn',
  });
  const absent = driverTerminalReading({
    canceled: false,
    value: 'x',
    driversForMoment: (m: string) => driversForMomentOf(m),
    nextOf: () => null,
  });
  assert.equal(normal.status, 'ok');
  assert.equal(removedDriver.status, 'violated', '终态在而驱动者被移除 ⇒ 必须 violated');
  assert.equal(absent.status, 'n/a', '终态不存在 ⇒ 必须 n/a（既非 PASS 也非 FAIL）');
  // 三态互异且都不是「恒真」：同一函数在三种前提下给出三种读数。
  assert.equal(new Set([normal.status, removedDriver.status, absent.status]).size, 3);
  // 口径①的空白元组（无任何事实）同样是 n/a —— 判据不得把「没发生」读成「已答」。
  assert.equal(answeredCaliber({}), 'n/a');
  assert.equal(answeredCaliber({ value: '有内容' }), 'answered');
});

test('L7X 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 3);
  for (const j of JUDGEMENTS) assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
});
