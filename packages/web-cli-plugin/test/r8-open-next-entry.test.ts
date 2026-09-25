/**
 * R8 缺陷修复轮（2026-09-25）—— **首开 / ready 入口**（首开面板零 next 死端）的机器判据。
 *
 * ── 缺陷（真机 01:38:33 序列 · 只读诊断置信度 0.9）─────────────────────────────
 *
 * `authorized ∧ configured` 的首开面板上 `onboarding.visible === false` ⇒
 * `maybeRecommendFirstRunEntry()` 直接 return；既无回合（`'idle'` 只在回合结束 / 失败时跑）、
 * 又无引用（`'pick'` / `'answered'` 无从触发）⇒ 生产内核 `recommendNextStep` 冷启动**永不
 * 被调用**。而末端「自由输入…」终端只由 `recommendNextStep` 注入到**已铸卡**末端
 * （`cards/nextstep.ts`）⇒ 首屏零卡 ⇒ 恒真 `when`（`providers.ts` 的 `free-input`）无从兑现
 * ⇒ 无输入入口。
 *
 * ── 本门禁判什么（每条都有 `expectFailPattern` + 反证实跑；禁恒真）────────────────
 *
 *   R8-1 **首开入口单源 ∧ 双稳定点接线** —— `function maybeRecommendOpenEntry(` 恰 1；
 *        `maybeRecommendOpenEntry();` 调用点恰 2，且每个都**紧随** `maybeRecommendFirstRunEntry();`
 *        （同一事件化点：`eventizeChannels` 尾 + `refreshLlmStatus` 落地后）。
 *   R8-2 **复用既有 `'idle'` 时机**（零新增触发词）—— 入口函数体内 `maybeRecommend('idle'`
 *        恰 1 ∧ 不含其他时机字面量；时机源闭集仍恰 5（DT-2/DT-3 不动）。
 *   R8-3 **一次性语义 ∧ 事实闸门** —— 入口读 `stateReplyApplied ∧ llmLoaded`（两事实到位）
 *        ∧ 以 `openEntryHandled = true` 消费（面板生命至多一次，事件不是重试循环）。
 *   R8-4 **首开稳态必有卡且含终端（行为面）** —— `authorized ∧ configured`（首装面已退出）
 *        的稳态 ctx：探测 `probing` ⇒ 零死端 floor 铸「仅含终端」最小卡（`terminal === true`
 *        且无规则 id）；探测 `ready` ⇒ `capability-discovery` 卡同样带终端。
 *   R8-5 **注入反证（首开零卡必红）** —— 删掉 `maybeRecommendOpenEntry();` 调用点 / 改名入口
 *        定义 ⇒ R8-1 的接线判据必红；逐字还原 ⇒ PASS（判据非恒真）。
 *   R8-6 **让位 firstRun（零双卡）** —— `configured ∧ authorized` 时 `firstRunCard.visible`
 *        必为 **false**（firstRun 入口在该稳态下 return）⇒ 两入口不同时铸同一屏的卡。
 *
 * @module test/r8-open-next-entry
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CATALOG_BASELINE_META } from '../src/insight/catalog-meta.js';
import { DRIVER_TIMINGS } from '../src/ui/sidepanel/next-registry/drivers.js';
import { recommendNextStep, type RecommendInput } from '../src/ui/sidepanel/recommend.js';
import { buildOnboarding, firstRunCard } from '../src/ui/sidepanel/view-model.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const SIDEPANEL_SRC = readFileSync(join(PKG, SIDEPANEL_REL), 'utf8');

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
/** 每条判据的失败文本（元门禁标记：`JUDGEMENTS` 表 + `expectFailPattern`）。 */
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'R8-1-open-entry-single-source', expectFailPattern: '首开入口必须单源 ∧ 双稳定点接线（紧随 firstRun 入口）' },
  { id: 'R8-2-reuse-idle-timing', expectFailPattern: '首开入口必须复用既有 idle 时机（零新增触发词）' },
  { id: 'R8-3-once-and-facts-gate', expectFailPattern: '首开入口必须一次消费 ∧ 两事实到位才求值' },
  { id: 'R8-4-open-steady-card-terminal', expectFailPattern: '首开稳态必须铸含 free-input 终端的卡（零死端 floor）' },
  { id: 'R8-5-injection-red', expectFailPattern: '移除首开入口必须判红（首开零卡）' },
  { id: 'R8-6-yield-to-firstRun', expectFailPattern: '首开入口必须让位 firstRun（零双卡）' },
];

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*/');
};

/** 注释剥离后的源码（源码判据不得被说明文字判红）。 */
export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

/** `function <name>(` 的函数体（注释剥离；截到首个 `\n}`）。 */
export function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const end = source.indexOf('\n}', start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 2);
}

/** R8-1 ~ R8-3 — 入口单源 / 调用点 / 复用 idle / 一次性闸门（源文本判据）。 */
export function openEntryWiringProblems(sidepanelSrc: string): string[] {
  const problems: string[] = [];
  const src = stripComments(sidepanelSrc);
  const defs = (src.match(/function\s+maybeRecommendOpenEntry\s*\(/g) ?? []).length;
  if (defs !== 1) problems.push(`${JUDGEMENTS[0].expectFailPattern}：function maybeRecommendOpenEntry( 实测 ${defs} 处`);

  // 调用点：`maybeRecommendOpenEntry();` 恰 2（两稳定点），且每个的**前一条非注释行**必须是
  // `maybeRecommendFirstRunEntry();`（同一事件化点、firstRun 先求值 —— 让位语义由 R8-6 承接）。
  const callLines = src
    .split('\n')
    .map((line, i) => ({ line: line.trim(), i }))
    .filter((x) => x.line === 'maybeRecommendOpenEntry();');
  if (callLines.length !== 2) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：maybeRecommendOpenEntry(); 调用点实测 ${callLines.length} 处 ≠ 2`);
  } else {
    const all = src.split('\n');
    const before = (i: number): string => {
      for (let k = i - 1; k >= 0; k -= 1) {
        const t = all[k].trim();
        if (t.length === 0 || isComment(all[k])) continue;
        return t;
      }
      return '';
    };
    for (const c of callLines) {
      if (before(c.i) !== 'maybeRecommendFirstRunEntry();') {
        problems.push(`${JUDGEMENTS[0].expectFailPattern}：调用点（源行 ${c.i + 1}）前一条语句必须恰是 maybeRecommendFirstRunEntry();，实测「${before(c.i)}」`);
      }
    }
  }

  const body = functionBody(sidepanelSrc, 'maybeRecommendOpenEntry');
  if (body.length === 0) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：首开入口函数体不得为空（定义必须存在）`);
    return problems;
  }
  // R8-2：唯一求值调用复用既有 `'idle'`；函数体内不得出现其他时机字面量。
  if ((body.match(/maybeRecommend\('idle'/g) ?? []).length !== 1) {
    problems.push(`${JUDGEMENTS[1].expectFailPattern}：入口函数体必须恰 1 处 maybeRecommend('idle'（复用既有时机）`);
  }
  const literals = [...body.matchAll(/maybeRecommend\(\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
  for (const lit of literals) {
    if (lit !== 'idle') problems.push(`${JUDGEMENTS[1].expectFailPattern}：入口不得使用非 idle 时机 '${lit}'`);
  }
  for (const t of DRIVER_TIMINGS) if (t !== 'idle' && body.includes(`'${t}'`)) problems.push(`${JUDGEMENTS[1].expectFailPattern}：入口出现既有触发词 '${t}'（应只复用 idle）`);
  // 时机源闭集仍恰 5（不新增第 6 触发词 —— DT-2/DT-3 的同源读数）。
  if ((DRIVER_TIMINGS as readonly string[]).length !== 5 || !(DRIVER_TIMINGS as readonly string[]).includes('idle')) {
    problems.push(`${JUDGEMENTS[1].expectFailPattern}：时机源闭集必须仍恰 5 且含 idle`);
  }

  // R8-3：两事实到位（state 回包 + llm-status）∧ 一次消费。
  for (const need of ['stateReplyApplied', 'llmLoaded', 'openEntryHandled = true']) {
    if (!body.includes(need)) problems.push(`${JUDGEMENTS[2].expectFailPattern}：入口函数体必须包含「${need}」`);
  }
  return problems;
}

/** R8-4 — `authorized ∧ configured`（首装面退出）的稳态 ctx：必有卡 ∧ 含终端。 */
export function openSteadyInput(probePhase: string): RecommendInput {
  return {
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'untrusted' },
    catalog: { toolCount: CATALOG_BASELINE_META.toolCount, subcommandCount: CATALOG_BASELINE_META.subcommandCount },
    probe: { phase: probePhase, steady: probePhase === 'ready' },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 1_700_000_000_000,
  };
}

/** R8-6 — 首开稳态下 firstRun 面已退出（首装 5 步的 1 = configured / 4 = authorized）。 */
export function firstRunVisibleAtOpenSteady(configured: boolean, authorized: boolean): boolean {
  return firstRunCard(
    buildOnboarding({ configured, hasOrigin: true, discovered: true, authorized, hasConversation: false }),
  ).visible;
}

test('R8-1/2/3 首开入口单源 ∧ 双稳定点接线 ∧ 复用既有 idle ∧ 两事实闸门', () => {
  assert.deepEqual(openEntryWiringProblems(SIDEPANEL_SRC), [], JUDGEMENTS[0].expectFailPattern);
  assert.ok(SIDEPANEL_SRC.includes('function maybeRecommendOpenEntry('), '入口定义必须存在');
});

test('R8-1/2/3 反证：删调用点 / 改名定义 / 换时机 ⇒ 各必红 → 还原 PASS', () => {
  const noCalls = SIDEPANEL_SRC.replace(/\n\s*maybeRecommendOpenEntry\(\);/g, '');
  assert.ok(openEntryWiringProblems(noCalls).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), '删调用点必须红');
  const renamed = SIDEPANEL_SRC.replace('function maybeRecommendOpenEntry(', 'function renamedOpenEntry(');
  assert.notEqual(renamed, SIDEPANEL_SRC, '前置：改名锚点必须存在');
  assert.ok(openEntryWiringProblems(renamed).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), '改名 / 删定义必须红');
  const wrongTiming = SIDEPANEL_SRC.replace("  maybeRecommend('idle');", "  maybeRecommend('stale');");
  assert.notEqual(wrongTiming, SIDEPANEL_SRC, '前置：时机锚点必须存在');
  assert.ok(openEntryWiringProblems(wrongTiming).some((p) => p.includes(JUDGEMENTS[1].expectFailPattern)), '换时机必须红');
  assert.deepEqual(openEntryWiringProblems(SIDEPANEL_SRC), [], '还原必须 PASS');
});

test('R8-4 首开稳态（authorized ∧ configured）必有 nextstep 卡且含 free-input 终端', () => {
  // 探测在途：零死端 floor 铸「仅含终端」最小卡（无规则 id、含终端）。
  const probing = recommendNextStep(openSteadyInput('probing'));
  assert.equal(probing.cards.length, 1, `${JUDGEMENTS[3].expectFailPattern}：探测在途也必须恰 1 卡（零死端）`);
  assert.equal(probing.cards[0]?.terminal, true, `${JUDGEMENTS[3].expectFailPattern}：卡必须带 free-input 终端`);
  assert.equal(probing.cards[0]?.rule, undefined, `${JUDGEMENTS[3].expectFailPattern}：floor 卡不得冒充任何规则候选`);
  // 探测就绪：capability-discovery 卡同样带终端（首屏可行动 + 可输入）。
  const ready = recommendNextStep(openSteadyInput('ready'));
  assert.equal(ready.cards.length, 1, `${JUDGEMENTS[3].expectFailPattern}：探测就绪也必须恰 1 卡`);
  assert.equal(ready.cards[0]?.rule, 'capability-discovery', `${JUDGEMENTS[3].expectFailPattern}：就绪态必须带出 capability-discovery`);
  assert.equal(ready.cards[0]?.terminal, true, `${JUDGEMENTS[3].expectFailPattern}：任何被铸卡都必须带 free-input 终端`);
});

test('R8-5 注入反证：移除首开入口 ⇒ 首开零卡（接线判据必红）', () => {
  // 冷启动可达性模型：稳态无回合 / 无引用 / 无 pick，唯一的生产求值点就是首开入口。
  const coldStartCards = (openEntryPresent: boolean): number =>
    openEntryPresent ? recommendNextStep(openSteadyInput('probing')).cards.length : 0;
  assert.equal(coldStartCards(true), 1, '入口在场 ⇒ 首开必有 1 卡（判据不得空转）');
  assert.equal(coldStartCards(false), 0, '入口缺席 ⇒ 首开零卡（正是本缺陷）');
  const noCalls = SIDEPANEL_SRC.replace(/\n\s*maybeRecommendOpenEntry\(\);/g, '');
  assert.notEqual(noCalls, SIDEPANEL_SRC, '前置：调用点锚点必须存在');
  assert.ok(
    openEntryWiringProblems(noCalls).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)),
    `${JUDGEMENTS[4].expectFailPattern}：移除入口必须让本门禁判红`,
  );
  assert.deepEqual(openEntryWiringProblems(SIDEPANEL_SRC), [], '还原必须 PASS');
});

test('R8-6 让位 firstRun：首开稳态下 firstRun 面已退出（两入口不同时铸）', () => {
  assert.equal(firstRunVisibleAtOpenSteady(true, true), false, `${JUDGEMENTS[5].expectFailPattern}：稳态下 firstRun 面必须已退出`);
  // 任一前提缺失 ⇒ firstRun 面在线（首开入口让位，由既有 firstRun 入口铸 onboarding 卡）。
  assert.equal(firstRunVisibleAtOpenSteady(false, true), true, '未配置 ⇒ firstRun 面在线');
  assert.equal(firstRunVisibleAtOpenSteady(true, false), true, '未授权 ⇒ firstRun 面在线');
  assert.equal(firstRunVisibleAtOpenSteady(false, false), true, '两者皆缺 ⇒ firstRun 面在线');
});

test('R8 元判据：每条 judgement 的 expectFailPattern 非占位', () => {
  assert.ok(JUDGEMENTS.length >= 6, '判据表必须覆盖 6 条以上判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});
