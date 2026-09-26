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
import { createHash } from 'node:crypto';
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
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
const RECOMMEND_REL = 'src/ui/sidepanel/recommend.ts';
const SIDEPANEL_SRC = readFileSync(join(PKG, SIDEPANEL_REL), 'utf8');
const PROVIDERS_SRC = readFileSync(join(PKG, PROVIDERS_REL), 'utf8');
const RECOMMEND_SRC = readFileSync(join(PKG, RECOMMEND_REL), 'utf8');

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
  // ★ ADN-2 TASK-ADN-211 / 212（纯追加；R8-1~6 逐字保留）。
  { id: 'R8-7-open-deterministic-no-ai-next', expectFailPattern: '首开求值必须保持确定性（结构上无 AI 初始 next；零 LLM 往返依赖）' },
  { id: 'R8-8-fallback-deletion-red', expectFailPattern: '删 free-input 恒真 when / 删零死端 floor ⇒ 必红（兜底判据非恒真）' },
  { id: 'R8-9-byte-for-byte-restore', expectFailPattern: '注入反证必须逐字节还原（sha256 前后相同）后 PASS' },
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

/* ── ★ F-36 / ADN-2 **TASK-ADN-211 / 212**（ADR-ADN-005 §①⑤ · ADR-ADN-007 ·
 * FR-ADN-044/045/070~073 · AC-ADN-006/009/019 · EC-ADN-013/019 · N-ADN-025）——
 * 首开确定性 + 兜底反证（删兜底 / 删终端 ⇒ 必红）+ 逐字节还原。
 * 纯追加：R8-1~6 与既有用例逐字保留（断言零删除、计数只增）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** ★ ADN-2 211 —— 首开求值保持确定性：入口体内**不得**出现 AI 注入面（结构上无 AI 初始 next）。 */
export function openDeterministicProblems(sidepanelSrc: string): string[] {
  const problems: string[] = [];
  const body = functionBody(sidepanelSrc, 'maybeRecommendOpenEntry');
  if (body.length === 0) return [`${JUDGEMENTS[6].expectFailPattern}：首开入口体必须可定位（否则判据空转）`];
  if (/aiNext|pendingAiNext|proactivity/.test(stripComments(body))) {
    problems.push(`${JUDGEMENTS[6].expectFailPattern}：首开入口体内不得出现 AI 注入面（AI 初始 next 明列后续轮）`);
  }
  return problems;
}

/** ★ ADN-2 212 —— 兜底 / 终端的**存在性**判据（删掉任一 ⇒ 同一判据必红）。 */
export function fallbackProblems(providersSrc: string, recommendSrc: string): string[] {
  const problems: string[] = [];
  const fail = JUDGEMENTS[7].expectFailPattern;
  const cleanP = stripComments(providersSrc);
  const cleanR = stripComments(recommendSrc);
  // ① 终端存在性单源：`free-input` provider 的恒真 `when`（读 `session.busy` 的两条穷尽分支）。
  if (!/id:\s*FREE_INPUT_PROVIDER_ID/.test(cleanP)) problems.push(`${fail}：free-input provider 声明处必须仍在`);
  if (!/when:\s*\(ctx\)\s*=>\s*ctx\.session\.busy === true \|\| ctx\.session\.busy === false/.test(cleanP)) {
    problems.push(`${fail}：free-input 的恒真 when 必须仍在（删掉 ⇒ 终端消失 ⇒ 零死端回归）`);
  }
  // ② 零死端 floor：无候选 ∧ 终端在场 ⇒ 铸「仅含终端」最小卡。
  if (!/suppression:\s*'empty'/.test(cleanR)) problems.push(`${fail}：floor 的 empty 分支必须仍在`);
  if (!/freeInputOnlyCard\(\)/.test(cleanR)) problems.push(`${fail}：floor 必须铸「仅含终端」最小卡（freeInputOnlyCard）`);
  if (!/cards:\s*Object\.freeze\(terminal \? \[freeInputOnlyCard\(\)\] : \[\]\)/.test(cleanR)) {
    problems.push(`${fail}：floor 必须由「终端在场」决定（不得无条件铸卡 / 不得删终端条件）`);
  }
  // ③ fail-closed：`safety` 仍不走 floor。
  if (!/suppression:\s*'safety'/.test(cleanR)) problems.push(`${fail}：safety 必须仍保持「不推荐」（不走 floor）`);
  return problems;
}

/** 逐字节还原判据（sha256 前后相同）。 */
const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

export type TriState = 'ok' | 'violated' | 'n/a';
/** 三段控制：`true ⇒ ok` / `false ⇒ violated` / 读不到（undefined）⇒ `n/a`（不冒充 ok）。 */
export function triState(reading: boolean | undefined): TriState {
  if (reading === undefined) return 'n/a';
  return reading ? 'ok' : 'violated';
}

test('★ ADN-2 211：首开保持确定性（结构上无 AI 初始 next / 零 LLM 往返依赖 / 让位 firstRun）', () => {
  assert.deepEqual(openDeterministicProblems(SIDEPANEL_SRC), [], JUDGEMENTS[6].expectFailPattern);
  // 结构事实：首开稳态输入**不含** `session.aiNext`（面板刚起、无回合结题）。
  const input = openSteadyInput('probing');
  assert.equal('aiNext' in input.session, false, '首开求值时结构上不可能有 AI 初始 next');
  // 行为面：首开稳态仍由确定性路径铸卡（floor / capability-discovery），零 LLM 依赖。
  const probing = recommendNextStep(input);
  assert.equal(probing.cards.length, 1, JUDGEMENTS[6].expectFailPattern);
  assert.equal(probing.cards[0]?.terminal, true, '首开卡必须带 free-input 终端');
  assert.equal(probing.cards[0]?.label.includes('AI'), false, '首开不得出现 AI 建议标题');
  // 反证：把 AI 注入面塞进首开入口 ⇒ 同一判据必红。
  const forged = SIDEPANEL_SRC.replace(
    '  openEntryHandled = true;',
    "  openEntryHandled = true;\n  void pendingAiNext;",
  );
  assert.notEqual(forged, SIDEPANEL_SRC, '前置：首开入口注入锚点必须存在');
  assert.ok(openDeterministicProblems(forged).some((p) => p.includes(JUDGEMENTS[6].expectFailPattern)), '首开混入 AI 注入面 ⇒ 必红');
});

test('★ ADN-2 212：兜底反证（删恒真 when / 删 floor ⇒ 必红）+ 逐字节还原（sha256 前后相同）', () => {
  // 生产源实测 PASS。
  assert.deepEqual(fallbackProblems(PROVIDERS_SRC, RECOMMEND_SRC), [], JUDGEMENTS[7].expectFailPattern);
  const before = { p: sha256(PROVIDERS_SRC), r: sha256(RECOMMEND_SRC) };

  // 反证①：删掉 free-input 的恒真 when（改成恒假）⇒ 终端消失 ⇒ 必红。
  const noTerminal = PROVIDERS_SRC.replace(
    'when: (ctx) => ctx.session.busy === true || ctx.session.busy === false,',
    'when: () => false,',
  );
  assert.notEqual(noTerminal, PROVIDERS_SRC, '前置：恒真 when 锚点必须存在');
  assert.ok(fallbackProblems(noTerminal, RECOMMEND_SRC).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)), '删恒真 when ⇒ 必红');

  // 反证②：删掉零死端 floor 的「仅含终端」最小卡 ⇒ 必红。
  const noFloor = RECOMMEND_SRC.replace('cards: Object.freeze(terminal ? [freeInputOnlyCard()] : []),', 'cards: Object.freeze([]),');
  assert.notEqual(noFloor, RECOMMEND_SRC, '前置：floor 锚点必须存在');
  assert.ok(fallbackProblems(PROVIDERS_SRC, noFloor).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)), '删 floor ⇒ 必红');

  // 反证③：把 safety 也走 floor（放宽 fail-closed）⇒ 必红。
  const safetyFloor = RECOMMEND_SRC.replace("suppression: 'safety'", "suppression: undefined");
  assert.ok(fallbackProblems(PROVIDERS_SRC, safetyFloor).some((p) => p.includes(JUDGEMENTS[7].expectFailPattern)), 'safety 走 floor ⇒ 必红');

  // 逐字节还原：sha256 前后相同 ⇒ PASS（判据不得靠持久改写源码通过）。
  assert.equal(sha256(PROVIDERS_SRC), before.p, 'fixture 未被就地改写');
  assert.equal(sha256(RECOMMEND_SRC), before.r, 'fixture 未被就地改写');
  assert.deepEqual(fallbackProblems(PROVIDERS_SRC, RECOMMEND_SRC), [], `${JUDGEMENTS[8].expectFailPattern}：还原 ⇒ PASS`);
});

test('★ ADN-2 212：三段控制 ok / violated / n/a 逐态可达（n/a 不冒充 ok）', () => {
  assert.equal(triState(fallbackProblems(PROVIDERS_SRC, RECOMMEND_SRC).length === 0), 'ok', '生产事实 ⇒ ok');
  const forged = PROVIDERS_SRC.replace('when: (ctx) => ctx.session.busy === true || ctx.session.busy === false,', 'when: () => false,');
  assert.equal(triState(fallbackProblems(forged, RECOMMEND_SRC).length === 0), 'violated', '注入 ⇒ violated');
  assert.equal(triState(undefined), 'n/a', '读不到 ⇒ n/a（证据面不可达）');
  assert.notEqual(triState(undefined), 'ok', 'n/a 不得冒充 ok');
  assert.deepEqual([triState(true), triState(false), triState(undefined)], ['ok', 'violated', 'n/a'], '三段互斥且可达');
});

test('★ ADN-2 212：判据表随纯追加增长（R8-7~9 ∈ JUDGEMENTS，旧 6 条逐字保留）', () => {
  const ids = JUDGEMENTS.map((j) => j.id);
  for (const legacy of ['R8-1-open-entry-single-source', 'R8-2-reuse-idle-timing', 'R8-3-once-and-facts-gate', 'R8-4-open-steady-card-terminal', 'R8-5-injection-red', 'R8-6-yield-to-firstRun']) {
    assert.ok(ids.includes(legacy), `旧判据 ${legacy} 必须逐字保留（断言零删除）`);
  }
  for (const added of ['R8-7-open-deterministic-no-ai-next', 'R8-8-fallback-deletion-red', 'R8-9-byte-for-byte-restore']) {
    assert.ok(ids.includes(added), `新增判据 ${added} 必须登记`);
  }
});

