/**
 * V5.5-1 **TASK-V55-105 / 106** (ADR-V55-002 §1 · ADR-V55-001 §2.3 · FR-SELF-030/032/033 ·
 * FR-SELF-011/019 · AC-SELF-009 / EC-SELF-003) — the **timing-source single-source gate**
 * + the **`NextCtx` 加法字段登记** gate.
 *
 * ── 判据（每条都有 `expectFailPattern`，反证在文件内实跑）──────────────────────
 *
 *   DT-1 **时机源恰一处声明** —— `export const DRIVER_TIMINGS` ∧ `type RecommendTrigger =`
 *        各恰 1 处（均在 `drivers.ts`）。
 *   DT-2 **恰 5 含 `'answered'`** —— 值集恰 5、互异、含新增项。
 *   DT-3 **旧 4 逐字** —— 前四项逐字等于 `['pick','stale','idle','firstRun']`（纯加法）。
 *   DT-4 **散落字面量零命中** —— 全部 `maybeRecommend('<lit>'` 的实参 ∈ 闭集（且恰 8 处
 *        调用点，不增）；除单源外没有任何一行**再声明**该时机联合（4 项同现 / answered 与
 *        旧项同现）。★ R8：+1 = 首开 / ready 入口（复用既有 `'idle'`，零新增触发词）。
 *   DT-5 **求值入口恰 1 定义** —— `function maybeRecommend(` 恰 1 ∧ `recommendNextStep(`
 *        在 `sidepanel.ts` 恰 1 个调用点（推荐器家族单一入口）。
 *   DT-6 **`NextCtx` 加法字段已登记**（TASK-V55-106 / EC-SELF-003）—— 从 `definition.ts`
 *        源文本抽取 `NextCtx` 字段路径，逐条经 `CTX_FIELD_SERVICE` 登记校验；未登记 ⇒ FAIL。
 *
 * @module test/driver-timings
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CTX_FIELD_SERVICE,
  DRIVER_TIMINGS,
  DRIVER_TIMINGS_LEGACY4,
  DRIVER_TIMING_ANSWERED,
  serviceOfCtxField,
  validateCtxFieldRegistration,
} from '../src/ui/sidepanel/next-registry/drivers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const DRIVERS_REL = 'src/ui/sidepanel/next-registry/drivers.ts';
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const DEFINITION_REL = 'src/ui/sidepanel/next-registry/definition.ts';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
/** 每条判据的失败文本（元门禁标记：`JUDGEMENTS` 表 + `expectFailPattern`）。 */
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'DT-1-single-source', expectFailPattern: '时机源必须恰一处声明' },
  { id: 'DT-2-exactly-five', expectFailPattern: '时机源闭集必须恰 5 项且含 answered' },
  { id: 'DT-3-legacy-verbatim', expectFailPattern: '时机源旧 4 必须逐字保留' },
  { id: 'DT-4-no-stray-literal', expectFailPattern: '散落时机字面量（闭集外实参 / 第二联合声明）' },
  { id: 'DT-5-single-eval-entry', expectFailPattern: '求值入口必须恰 1 定义' },
  { id: 'DT-6-ctx-field-registered', expectFailPattern: '未登记的 NextCtx 字段' },
];

/** Every `src/**` TypeScript file (recursive). */
export function srcTsFiles(dir = join(PKG, 'src')): { readonly rel: string; readonly text: string }[] {
  const out: { rel: string; text: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push({ rel: full.slice(full.indexOf(PKG) + PKG.length), text: readFileSync(full, 'utf8') });
  }
  return out;
}

const stripLineComments = (line: string): string => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') ? '' : line;
};

/** DT-1 — the timing vocabulary is declared exactly once, in `drivers.ts`. */
export function timingSingleSourceProblems(files: readonly { readonly rel: string; readonly text: string }[]): string[] {
  const problems: string[] = [];
  const declSites = files.filter((f) => /export const DRIVER_TIMINGS\b/.test(f.text)).map((f) => f.rel);
  if (declSites.length !== 1 || declSites[0] !== DRIVERS_REL) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：DRIVER_TIMINGS 声明点 = ${declSites.join(', ') || '<无>'}`);
  }
  const typeSites = files.filter((f) => /(?:^|\n)\s*(?:export\s+)?type RecommendTrigger\s*=/.test(f.text)).map((f) => f.rel);
  if (typeSites.length !== 1 || typeSites[0] !== DRIVERS_REL) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：type RecommendTrigger 定义点 = ${typeSites.join(', ') || '<无>'}`);
  }
  return problems;
}

/** DT-2 — exactly five, distinct, includes `'answered'`. */
export function timingSetProblems(timings: readonly string[]): string[] {
  const problems: string[] = [];
  if (timings.length !== 5) problems.push(`${JUDGEMENTS[1].expectFailPattern}：实测 ${timings.length} 项（${timings.join(', ')}）`);
  if (new Set(timings).size !== timings.length) problems.push(`${JUDGEMENTS[1].expectFailPattern}：存在重复项`);
  if (!timings.includes(DRIVER_TIMING_ANSWERED)) problems.push(`${JUDGEMENTS[1].expectFailPattern}：缺 ${DRIVER_TIMING_ANSWERED}`);
  return problems;
}

/** DT-3 — the legacy four stay verbatim (append-only expansion). */
export function legacyVerbatimProblems(timings: readonly string[]): string[] {
  const head = timings.slice(0, DRIVER_TIMINGS_LEGACY4.length);
  if (head.join('|') !== DRIVER_TIMINGS_LEGACY4.join('|')) {
    return [`${JUDGEMENTS[2].expectFailPattern}：实测前四项 [${head.join(', ')}] ≠ [${DRIVER_TIMINGS_LEGACY4.join(', ')}]`];
  }
  return [];
}

/**
 * DT-4 — no stray timing literal:
 *   (a) every `maybeRecommend('<lit>'` argument ∈ the closed set（且调用点恰 8，不增）；
 *   (b) no file other than the single source **re-declares** the timing union
 *       （一行同现 4 项旧字面量，或 answered 与任一旧项同现）。
 *
 * 「散落」按**时机词汇的上下文**判：`'stale'` / `'idle'` / `'firstRun'` 在参照状态机 /
 * 探测相位 / 事件通道里是**别的词表**（合法），因此本判据只钉「时机联合的再声明」与
 * 「求值调用点的实参」两处 —— 这恰是 v5.5 要防的两条漂移路径。
 */
export function strayTimingLiteralProblems(files: readonly { readonly rel: string; readonly text: string }[]): string[] {
  const problems: string[] = [];
  const legacy = DRIVER_TIMINGS_LEGACY4 as readonly string[];
  let callSites = 0;
  let mappingSites = 0;
  for (const f of files) {
    for (const raw of f.text.split('\n')) {
      const line = stripLineComments(raw);
      if (!line) continue;
      // V5.5-1 TASK-V55-113/114: the call-site count is now over **every** `maybeRecommend(`
      // invocation (literal or not) — the `'answered'` trigger reaches the single evaluation
      // entry through `nextAfterSettle`'s ONE `maybeRecommend(timingOfSettle(…))`, so the
      // count仍恰 8（★ R8：+1 = 首开 / ready 入口，复用既有 `'idle'`）and the timing仍 from the single source.
      const isCall = /maybeRecommend\(/.test(line) && !/function\s+maybeRecommend\s*\(/.test(line);
      if (isCall) {
        callSites += 1;
        for (const m of line.matchAll(/maybeRecommend\(\s*'([A-Za-z]+)'/g)) {
          if (!(DRIVER_TIMINGS as readonly string[]).includes(m[1])) {
            problems.push(`${JUDGEMENTS[3].expectFailPattern}：${f.rel} 出现闭集外时机 '${m[1]}'`);
          }
        }
        // 非字面量实参只允许**一处**：`timingOfSettle(`（结算 → 时机的单一映射）。
        if (/maybeRecommend\(\s*timingOfSettle\s*\(/.test(line)) mappingSites += 1;
        else if (!/maybeRecommend\(\s*'[A-Za-z]+'/.test(line)) {
          problems.push(`${JUDGEMENTS[3].expectFailPattern}：${f.rel} 的调用点实参既不是闭集字面量、也不是单一映射 timingOfSettle(`);
        }
      }
      if (f.rel === DRIVERS_REL) continue;
      // 驱动者声明行的 `timings: [...]` 是**合法**的第二处（声明表登记，非「散落时机联合」）：
      // 它登记的是某个驱动者的时机集合；词汇闭集本身仍只在 `drivers.ts` 单源。
      if (/timings\s*:/.test(line)) continue;
      const hit = legacy.filter((t) => line.includes(`'${t}'`));
      const hasAnswered = line.includes(`'${DRIVER_TIMING_ANSWERED}'`);
      if (hit.length === legacy.length) {
        problems.push(`${JUDGEMENTS[3].expectFailPattern}：${f.rel} 再声明了完整时机联合（${hit.join(', ')}）`);
      } else if (hasAnswered && hit.length > 0) {
        problems.push(`${JUDGEMENTS[3].expectFailPattern}：${f.rel} 把 answered 与旧时机（${hit.join(', ')}）写在同一行`);
      }
    }
  }
  if (callSites !== 8) problems.push(`${JUDGEMENTS[3].expectFailPattern}：maybeRecommend( 调用点必须恰 8（不增），实测 ${callSites}`);
  if (mappingSites !== 1) problems.push(`${JUDGEMENTS[3].expectFailPattern}：结算 → 时机映射（maybeRecommend(timingOfSettle(…)）必须恰 1 处，实测 ${mappingSites}`);
  return problems;
}

/** DT-5 — the producer family has exactly one evaluation-entry definition (zero second producer). */
export function evaluationEntryProblems(sidepanelSrc: string, recommendSrc: string): string[] {
  const problems: string[] = [];
  const defs = (sidepanelSrc.match(/function\s+maybeRecommend\s*\(/g) ?? []).length;
  if (defs !== 1) problems.push(`${JUDGEMENTS[4].expectFailPattern}：function maybeRecommend( 实测 ${defs} 处`);
  // 推荐器内核（`recommendNextStep`）也必须恰 1 定义 —— 第二份实现 = 第二个推荐器（R-SELF-902）。
  const kernelDefs = (recommendSrc.match(/export function\s+recommendNextStep\s*\(/g) ?? []).length;
  if (kernelDefs !== 1) problems.push(`${JUDGEMENTS[4].expectFailPattern}：export function recommendNextStep( 实测 ${kernelDefs} 处`);
  if (!/maybeRecommendFirstRunEntry\s*\(/.test(sidepanelSrc)) problems.push(`${JUDGEMENTS[4].expectFailPattern}：firstRun 入口不得被顺手删除`);
  return problems;
}

/** DT-6 — `NextCtx` field paths（顶层 + 一层嵌套）from the source text. */
export function nextCtxFieldPaths(definitionSrc: string): string[] {
  const body = /export interface NextCtx \{([\s\S]*?)\n\}/.exec(definitionSrc);
  if (!body) return [];
  const paths: string[] = [];
  let top: string | null = null;
  for (const line of body[1].split('\n')) {
    const m2 = /^ {2}readonly ([A-Za-z]+)\s*:/.exec(line);
    if (m2) {
      top = m2[1];
      paths.push(top);
      // 单行内联 `{ … };` ⇒ 该字段不再有嵌套块。
      if (/:\s*\{[^}]*\}\s*;/.test(line)) top = null;
      continue;
    }
    const m4 = /^ {4}readonly ([A-Za-z]+)\s*\??:/.exec(line);
    if (m4 && top) paths.push(`${top}.${m4[1]}`);
    if (/^ {2}\};?\s*$/.test(line)) top = null;
  }
  return paths;
}

/** DT-6 judge — every extracted field must resolve to a registered service. */
export function ctxFieldRegistrationProblems(definitionSrc: string): string[] {
  const fields = nextCtxFieldPaths(definitionSrc);
  if (fields.length === 0) return [`${JUDGEMENTS[5].expectFailPattern}：未抽取到任何 NextCtx 字段（判据不得空转）`];
  const v = validateCtxFieldRegistration(fields);
  if (v.ok) return [];
  return [`${JUDGEMENTS[5].expectFailPattern}：${v.error}`];
}

const FILES = srcTsFiles();
const SIDEPANEL_SRC = read(SIDEPANEL_REL);
const DEFINITION_SRC = read(DEFINITION_REL);
const RECOMMEND_REL = 'src/ui/sidepanel/recommend.ts';
const RECOMMEND_SRC = read(RECOMMEND_REL);

test('DT-1 时机源恰一处声明（DRIVER_TIMINGS ∧ RecommendTrigger 均在单源）', () => {
  assert.deepEqual(timingSingleSourceProblems(FILES), [], JUDGEMENTS[0].expectFailPattern);
  assert.ok((read(DRIVERS_REL) as string).includes('export const DRIVER_TIMINGS'), '单源必须导出 DRIVER_TIMINGS');
});

test('DT-1 反证：把时机源再声明一次 ⇒ 必红（仓库文件零触碰）', () => {
  const forged = [...FILES, { rel: 'src/ui/sidepanel/ghost.ts', text: "export const DRIVER_TIMINGS = ['pick'] as const;\ntype RecommendTrigger = 'pick';\n" }];
  assert.ok(timingSingleSourceProblems(forged).some((p) => p.includes(JUDGEMENTS[0].expectFailPattern)), '第二声明必须被判红');
  assert.deepEqual(timingSingleSourceProblems(FILES), [], '真源必须仍绿（判据非恒真）');
});

test('DT-2 恰 5 且含 answered；DT-3 旧 4 逐字', () => {
  assert.deepEqual(timingSetProblems([...DRIVER_TIMINGS]), [], JUDGEMENTS[1].expectFailPattern);
  assert.deepEqual(legacyVerbatimProblems([...DRIVER_TIMINGS]), [], JUDGEMENTS[2].expectFailPattern);
  assert.equal(DRIVER_TIMINGS.length, 5);
});

test('DT-2/DT-3 反证：删 answered / 删旧项 / 追加第 6 项 ⇒ 各 FAIL → 还原 PASS', () => {
  const noAnswered = (DRIVER_TIMINGS as readonly string[]).filter((t) => t !== 'answered');
  assert.ok(timingSetProblems(noAnswered).length > 0, `${JUDGEMENTS[1].expectFailPattern}：删 answered 必须红`);
  assert.ok(timingSetProblems([...DRIVER_TIMINGS, 'ghost']).length > 0, `${JUDGEMENTS[1].expectFailPattern}：第 6 项必须红`);
  const mutated = ['pick', 'stale', 'idle', 'idle2', 'answered'];
  assert.ok(legacyVerbatimProblems(mutated).length > 0, `${JUDGEMENTS[2].expectFailPattern}：改写旧项必须红`);
  // 还原
  assert.deepEqual(timingSetProblems([...DRIVER_TIMINGS]), []);
  assert.deepEqual(legacyVerbatimProblems([...DRIVER_TIMINGS]), []);
});

test('DT-4 散落字面量零命中（8 调用点实参 ∈ 闭集 ∧ 无第二联合声明）', () => {
  assert.deepEqual(strayTimingLiteralProblems(FILES), [], JUDGEMENTS[3].expectFailPattern);
});

test('DT-4 反证：闭集外实参 / 第二联合声明 ⇒ 必红 → 还原 PASS', () => {
  const ghostCall = [...FILES, { rel: 'src/ui/sidepanel/ghost.ts', text: "maybeRecommend('ghost');\n" }];
  assert.ok(strayTimingLiteralProblems(ghostCall).length > 0, `${JUDGEMENTS[3].expectFailPattern}：闭集外实参必须红`);
  const redeclared = FILES.map((f) =>
    f.rel === SIDEPANEL_REL ? { ...f, text: `${f.text}\ntype Again = 'pick' | 'stale' | 'idle' | 'firstRun';\n` } : f,
  );
  assert.ok(strayTimingLiteralProblems(redeclared).length > 0, `${JUDGEMENTS[3].expectFailPattern}：第二联合声明必须红`);
  assert.ok(
    strayTimingLiteralProblems(FILES.map((f) => (f.rel === SIDEPANEL_REL ? { ...f, text: `${f.text}\nmaybeRecommend('answered');\n` } : f))).some(
      (p) => p.includes('调用点必须恰 8'),
    ),
    `${JUDGEMENTS[3].expectFailPattern}：第 9 个调用点必须红`,
  );
  assert.deepEqual(strayTimingLiteralProblems(FILES), []);
});

test('DT-5 求值入口恰 1 定义（无第二推荐器）', () => {
  assert.deepEqual(evaluationEntryProblems(SIDEPANEL_SRC, RECOMMEND_SRC), [], JUDGEMENTS[4].expectFailPattern);
});

test('DT-5 反证：新增第二个推荐器 ⇒ 必红 → 还原 PASS', () => {
  const forged = `${SIDEPANEL_SRC}\nfunction maybeRecommend(trigger: RecommendTrigger) { return null; }\n`;
  assert.ok(evaluationEntryProblems(forged, RECOMMEND_SRC).some((p) => p.includes(JUDGEMENTS[4].expectFailPattern)), '第二定义必须红');
  const secondKernel = `${RECOMMEND_SRC}\nexport function recommendNextStep(x) { return { cards: [] }; }\n`;
  assert.ok(evaluationEntryProblems(SIDEPANEL_SRC, secondKernel).some((p) => p.includes(JUDGEMENTS[4].expectFailPattern)), '第二推荐器内核必须红');
  assert.deepEqual(evaluationEntryProblems(SIDEPANEL_SRC, RECOMMEND_SRC), []);
});

test('DT-6 NextCtx 加法字段经 CTX_FIELD_SERVICE 登记（含 session.proactive）', () => {
  assert.deepEqual(ctxFieldRegistrationProblems(DEFINITION_SRC), [], JUDGEMENTS[5].expectFailPattern);
  const fields = nextCtxFieldPaths(DEFINITION_SRC);
  assert.ok(fields.includes('session.proactive'), 'DT-6：加法字段组 session.proactive 必须被抽取到');
  for (const f of fields) assert.ok(serviceOfCtxField(f) !== undefined || f.startsWith('session.proactive'), `${f} 必须可解析到服务面`);
});

/* ★ F-36 / ADN-1 **TASK-ADN-119**（ADR-ADN-009 · FR-ADN-010/013 · AC-ADN-002/012）——
 * **DT-6 加法字段显式重锚（判据力只升）**：`session.aiNext` 注入槽经**既有 `session` 前缀**
 * 登记 ⇒ `CTX_FIELD_SERVICE` **零新增登记行**（登记表长度不变）。
 * 反证：把 `session.aiNext` 改成顶层 `aiNext`（无前缀登记）⇒ 同一登记判据必红。
 * ──────────────────────────────────────────────────────────────────────────── */
test('★ ADN-1 119（DT-6 扩）：`session.aiNext` 经既有 session 前缀登记 ⇒ CTX_FIELD_SERVICE 零新增登记行', () => {
  const fields = nextCtxFieldPaths(DEFINITION_SRC);
  assert.ok(fields.includes('session.aiNext'), 'DT-6：ADN-1 注入槽 session.aiNext 必须被抽取到');
  assert.equal(serviceOfCtxField('session.aiNext'), 'session', 'session.aiNext 必须经既有 session 前缀解析');
  // 零新增登记行：登记表长度仍为既有 8 行（session 前缀覆盖 ⇒ 不为 aiNext 另立一行）。
  assert.equal(Object.keys(CTX_FIELD_SERVICE).length, 8, 'CTX_FIELD_SERVICE 必须零新增登记行（实测恰 8）');
  assert.equal(Object.prototype.hasOwnProperty.call(CTX_FIELD_SERVICE, 'session.aiNext'), false, '不得为 aiNext 另立登记行');
  // 反证：把注入槽挪成**未登记的顶层字段** ⇒ 同一判据必红（判据非恒真）。
  const forged = DEFINITION_SRC.replace(
    '    readonly aiNext?: readonly AiNextCandidate[];',
    '',
  ).replace('  readonly session: {', '  readonly aiNextRogue: readonly string[];\n  readonly session: {');
  assert.notEqual(forged, DEFINITION_SRC, '前置：注入槽锚点必须存在');
  assert.ok(nextCtxFieldPaths(forged).includes('aiNextRogue'), '注入字段必须被抽取到（判据不得空转）');
  assert.ok(ctxFieldRegistrationProblems(forged).some((p) => p.includes(JUDGEMENTS[5].expectFailPattern)), '未登记顶层字段必须被判红');
  assert.deepEqual(ctxFieldRegistrationProblems(DEFINITION_SRC), [], '还原必须 PASS');
});

test('DT-6 反证：加一个未登记字段 ⇒ 注册校验 FAIL → 还原 PASS；既有 7 源零改名零删除', () => {
  const forged = DEFINITION_SRC.replace(
    '  readonly onboarding:',
    '  readonly telemetry: { readonly n: number };\n  readonly onboarding:',
  );
  assert.notEqual(forged, DEFINITION_SRC, '前置：注入锚点必须存在');
  assert.ok(ctxFieldRegistrationProblems(forged).some((p) => p.includes(JUDGEMENTS[5].expectFailPattern)), '未登记字段必须 loud');
  assert.ok(nextCtxFieldPaths(forged).includes('telemetry'), '注入字段必须被抽取到（判据不得空转）');
  // 「既有 7 源零改名 / 零删除」：顶层字段集逐字等于 7 源白名单。
  const top = nextCtxFieldPaths(DEFINITION_SRC).filter((f) => !f.includes('.'));
  assert.deepEqual([...top].sort(), ['catalog', 'onboarding', 'probe', 'ref', 'risk', 'session', 'site'].sort(), '既有 7 源不得改名/删除');
  assert.deepEqual(ctxFieldRegistrationProblems(DEFINITION_SRC), [], '还原必须 PASS');
});

test('DT 元判据：每条 judgement 的 expectFailPattern 非占位', () => {
  assert.ok(JUDGEMENTS.length >= 5, '判据表必须覆盖 5 条以上判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  assert.ok((FILES.find((f) => f.rel === DRIVERS_REL)?.text ?? '').includes('DRIVER_TIMINGS_LEGACY4'), '旧 4 值集必须也在单源里');
  assert.ok(Object.keys(CTX_FIELD_SERVICE).includes('session.proactive'), 'CTX_FIELD_SERVICE 必须登记 session.proactive');
});

/* ── ★ F-36 / ADN-2 **TASK-ADN-213**（ADR-ADN-009 §② · FR-ADN-110/111 · AC-ADN-024）——
 * 升级 6 **终态对账**（保留 / 等价重锚 / 显式取代三态齐；断言零删除、计数只增）。
 * 真源：既有导入的常量（DT-2 恰 5 / DT-3 旧 4 逐字 / answered 唯一新增）。纯追加。
 * ──────────────────────────────────────────────────────────────────────────── */
test('★ ADN-2 213（DT 终态）：时机源恰 5 ∧ 旧 4 逐字 ∧ answered 唯一加法（等价重锚，非取代）', () => {
  assert.equal(DRIVER_TIMINGS.length, 5, 'DT-2：时机源恰 5（AI 骑既有 idle ⇒ 零新增第 6 触发词）');
  assert.deepEqual([...DRIVER_TIMINGS_LEGACY4], ['pick', 'stale', 'idle', 'firstRun'], 'DT-3：旧 4 项逐字保留');
  assert.equal(DRIVER_TIMING_ANSWERED, 'answered', 'DT：answered 单源');
  assert.deepEqual([...DRIVER_TIMINGS], [...DRIVER_TIMINGS_LEGACY4, 'answered'], '纯加法（零删除）');
});
