/**
 * V5.5F-1 **TASK-V55F-113 / 114** (ADR-SGO-002 §7 · FR-SGO-070~077/092/111 ·
 * AC-SGO-003/018 · N-SGO-024/028 · R-SGO-903/909) — the **法九：范围读数**门禁（node）.
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   `L9-1-four-values`  四值 + 判定函数**唯一声明**（第二声明 ⇒ FAIL；真源扫 `src/**`）
 *   `L9-2-no-ref`       无引用 ⇒ `no-ref`（**不得**判 `in-scope`）
 *   `L9-3-in-scope`     有活跃引用且目标 ∈ 集合 ⇒ `in-scope`（**两路**：`--ref` / selector）
 *   `L9-4-unauthorized` 越界 ∧ 未征询 ⇒ `out-of-scope-unauthorized`
 *   `L9-5-authorized`   越界 ∧ 已批准 ⇒ `out-of-scope-authorized`
 *   `L9-6-write-gate`   **生产写闸切片**：`out-of-scope-unauthorized` 必被拦（deny）+ 可达 next
 *   `L9-7-not-tautology`**三段控制**（`ok` / `violated` / `n/a`；**非布尔**，`n/a` 单独计数）
 *   `L9-8-source-slice` **真源切片**：读生产模块（不读 `SYSTEM_PROMPT` / 测试自建常量）
 *
 * ── 双向反证（**实跑**，TASK-V55F-114）───────────────────────────────────────
 *
 *   ① 把 `no-ref` 分支**改判 `in-scope`** ⇒ 判红；② 删除写闸的越界拦截 ⇒ 判红。
 * 每轮：注入 ⇒ FAIL ⇒ **逐字节还原**（sha256 前后相同）⇒ PASS。**禁**「删属性充数 /
 * 自我裁决 / 换口径放松」。
 *
 * @module test/law9-scope-reading
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isWidenWholePage,
  SCOPE_WIDEN_OPTIONS,
  SCOPE_WIDEN_PROMPT,
  SCOPE_WIDEN_WHOLE_PAGE,
  SCOPE_READINGS,
  SCOPE_TRACE_FIELDS,
  scopeReading,
  scopeReadingTrace,
  scopeWriteGate,
  targetInRefs,
} from '../src/ui/sidepanel/l1/ref-scope.js';
import type { ScopeFacts, ScopeReading as ScopeReadingType } from '../src/ui/sidepanel/l1/ref-scope.js';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'L9-1-four-values', expectFailPattern: '范围读数四值必须在唯一模块声明（第二声明即红）' },
  { id: 'L9-2-no-ref', expectFailPattern: '无引用回合必须判 no-ref（判 in-scope 即红）' },
  { id: 'L9-3-in-scope', expectFailPattern: '目标在引用集合内必须判 in-scope（两路命中：--ref / selector）' },
  { id: 'L9-4-unauthorized', expectFailPattern: '未征询的越界必须判 out-of-scope-unauthorized' },
  { id: 'L9-5-authorized', expectFailPattern: '已批准的越界必须判 out-of-scope-authorized' },
  { id: 'L9-6-write-gate', expectFailPattern: '未征询的越界写必须被机制拦下（deny + 可达 next）' },
  { id: 'L9-7-not-tautology', expectFailPattern: '禁恒真：每条判据必须能 FAIL，且必须有必不判的中性输入（n/a 单独计数）' },
  { id: 'L9-8-source-slice', expectFailPattern: '真源切片：读生产模块（不读 SYSTEM_PROMPT / 测试自建常量）' },
  // V5.5F-2 TASK-V55F-213（ADR-SGO-005 §1/§2/§3）：扩围二择 + 转值单源 + AI 无写入面。
  { id: 'L9-9-widen-choice', expectFailPattern: '扩围必须由真实用户点击「整页」产生 out-of-scope-authorized（AI 自填 authorized ⇒ 必红）' },
];

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const REF_SCOPE_REL = 'src/ui/sidepanel/l1/ref-scope.ts';
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** 生产真源全量（相对路径 → 文本）。 */
export function readSrcFiles(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string, base: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      const rel = `${base}/${e.name}`;
      if (e.isDirectory()) walk(abs, rel);
      else if (e.name.endsWith('.ts')) out.set(rel, readFileSync(abs, 'utf8'));
    }
  };
  walk(join(PKG, 'src'), 'src');
  return out;
}

/* ── L9-1：四值 + 判定函数唯一声明（真源扫描）──────────────────────────────── */

export const FOUR_VALUES: readonly ScopeReadingType[] = SCOPE_READINGS;

/** 四值字面量**只允许**出现在唯一模块；判定函数 / 词表 / 留痕字段各恰一处。 */
export function fourValueProblems(files: Map<string, string>, allowed = REF_SCOPE_REL): string[] {
  const p = JUDGEMENTS[0].expectFailPattern;
  const problems: string[] = [];
  if (SCOPE_READINGS.length !== 4) problems.push(`${p}：SCOPE_READINGS 实测 ${SCOPE_READINGS.length} 项 ≠ 4`);
  const expected = ['in-scope', 'out-of-scope-authorized', 'out-of-scope-unauthorized', 'no-ref'];
  for (const v of expected) {
    if (!(SCOPE_READINGS as readonly string[]).includes(v)) problems.push(`${p}：四值缺 ${v}`);
    const holders = [...files.entries()].filter(([, text]) => text.includes(`'${v}'`)).map(([rel]) => rel);
    const outside = holders.filter((rel) => rel !== allowed);
    if (outside.length > 0) problems.push(`${p}：读数值 '${v}' 散落到 ${outside.join(', ')}（第二声明）`);
  }
  const declCount = (files.get(allowed)?.match(/export function scopeReading\s*\(/g) ?? []).length;
  if (declCount !== 1) problems.push(`${p}：scopeReading 判定函数实测 ${declCount} 处 ≠ 1`);
  const readCount = [...files.values()].filter((t) => /export function scopeReading\s*\(/.test(t)).length;
  if (readCount !== 1) problems.push(`${p}：scopeReading 在 ${readCount} 个模块声明（第二声明）`);
  return problems;
}

/* ── L9-2~L9-5：读数语义（默认读**生产**函数；可注入以证伪）─────────────────── */

const REF_A = Object.freeze({ refNum: 7, refId: 'ref_7', selector: '#alpha' });
const REF_B = Object.freeze({ refNum: 8, refId: 'ref_8', selector: '#beta' });
const REFS = Object.freeze([REF_A, REF_B]);

type Reader = (f: ScopeFacts) => ScopeReadingType;

/** L9-2：无引用 ⇒ `no-ref`（**不得**判 `in-scope`）。 */
export function noRefProblems(read: Reader = scopeReading): string[] {
  const p = JUDGEMENTS[1].expectFailPattern;
  const problems: string[] = [];
  const facts: ScopeFacts = { targets: [{ selector: '[data-wcli-ref="ref_7"]' }], refs: [], authorized: false };
  const reading = read(facts);
  if (reading === 'in-scope') problems.push(`${p}：实测 ${reading}（无引用回合不得判 in-scope）`);
  if (reading !== 'no-ref') problems.push(`${p}：实测 ${reading} ≠ no-ref`);
  // 对照：有引用时同一目标判 in-scope（证明判据不是「一律 no-ref」）。
  const withRefs: ScopeFacts = { targets: [{ selector: '[data-wcli-ref="ref_7"]' }], refs: REFS, authorized: false };
  if (read(withRefs) !== 'in-scope') problems.push(`${p}：有引用时同一目标必须判 in-scope（对照段）`);
  return problems;
}

/** L9-3：两路命中（`--ref` / selector，含合成锚）。 */
export function inScopeProblems(read: Reader = scopeReading): string[] {
  const p = JUDGEMENTS[2].expectFailPattern;
  const problems: string[] = [];
  const cases: ScopeFacts[] = [
    { targets: [{ selector: '[data-wcli-ref="ref_7"]', refNum: 7 }], refs: REFS, authorized: false }, // 路 A（--ref）
    { targets: [{ selector: '#alpha' }], refs: REFS, authorized: false }, // 路 B（存储选择器）
    { targets: [{ selector: '[data-wcli-ref="ref_8"]' }], refs: REFS, authorized: false }, // 路 B′（合成锚）
    { targets: [{ selector: '#alpha', refNum: 99 }], refs: REFS, authorized: false }, // 路 B 兜路 A 误配
  ];
  for (const [i, facts] of cases.entries()) {
    const reading = read(facts);
    if (reading !== 'in-scope') problems.push(`${p}：用例 ${i} 实测 ${reading} ≠ in-scope`);
  }
  if (!targetInRefs({ selector: '#alpha' }, REFS)) problems.push(`${p}：targetInRefs 路 B 未命中`);
  return problems;
}

/** L9-4 / L9-5：越界两态（未征询 / 已批准）。 */
export function outOfScopeProblems(read: Reader = scopeReading): string[] {
  const p4 = JUDGEMENTS[3].expectFailPattern;
  const p5 = JUDGEMENTS[4].expectFailPattern;
  const problems: string[] = [];
  const target = { selector: '#gamma' };
  const unauthorized = read({ targets: [target], refs: REFS, authorized: false });
  if (unauthorized !== 'out-of-scope-unauthorized') problems.push(`${p4}：实测 ${unauthorized}`);
  const authorized = read({ targets: [target], refs: REFS, authorized: true });
  if (authorized !== 'out-of-scope-authorized') problems.push(`${p5}：实测 ${authorized}`);
  // authorized 只是**输入事实**：同一目标两种输入 ⇒ 两种读数（不是自判）。
  if (unauthorized === authorized) problems.push(`${p4}：authorized 输入未影响读数（口径丢失）`);
  return problems;
}

/* ── L9-6：生产写闸切片（confirm 面）──────────────────────────────────────── */

/** `confirm-request` 分支切片（左闭右开到分支末的 `}`）。 */
export function confirmBranch(source: string): string {
  // ★ V5.5F-2 TASK-V55F-213：写闸从 listener 闭包提为**具名** `handleConfirmRequest`
  //（+ `presentScopeWidenAsk` / `emitConfirmCard`）⇒ 真源切片跟随生产结构（同一条路径）。
  const anchor = source.indexOf('function handleConfirmRequest(');
  if (anchor < 0) return '';
  const helper = source.indexOf('function emitConfirmCard(');
  const start = helper >= 0 && helper < anchor ? helper : anchor;
  let depth = 0;
  for (let i = source.indexOf('{', anchor); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

/** 写闸前提：只有**带目标**的 `dom set-text` 才进闸（其余 ⇒ 不适用 / n/a）。 */
export function writeGateApplicable(tool: string | undefined, subcommand: string | undefined, selector: string, refNum: number | undefined): boolean {
  return tool === 'dom' && subcommand === 'set-text' && (selector.length > 0 || refNum !== undefined);
}

export function writeGateProblems(source: string): string[] {
  const p = JUDGEMENTS[5].expectFailPattern;
  const branch = confirmBranch(source);
  if (branch.length === 0) return [`${p}：confirm-request 分支不存在（写闸接线点缺失）`];
  const problems: string[] = [];
  if (!/scopeWriteGate\(/.test(branch)) problems.push(`${p}：confirm 面未接范围写闸（scopeWriteGate 缺失）`);
  if (!/gate\.blocked/.test(branch)) problems.push(`${p}：写闸裁决未被使用（越界不会改变行为）`);
  if (!/allow:\s*false/.test(branch)) problems.push(`${p}：越界写必须 deny（allow: false）`);
  if (!/gate\.message/.test(branch)) problems.push(`${p}：越界必须给出可读理由（gate.message）`);
  if (!/scopeReadingTrace\(/.test(branch)) problems.push(`${p}：越界必须留痕（scopeReadingTrace 独立成行）`);
  // 非越界（in-scope / no-ref）必须**逐字走既有 confirm 路径**（不得被闸改道）。
  if (!/type:\s*'confirm'/.test(branch)) problems.push(`${p}：in-scope / no-ref 必须走既有 confirm 路径`);
  return problems;
}

/* ── L9-7：三段控制（非布尔；n/a 单独计数）────────────────────────────────── */

export type Law9Verdict = 'ok' | 'violated' | 'n/a';

/**
 * 判据引擎：`problems === null` ⇒ **前提不成立** ⇒ `n/a`（既非 PASS 也非 FAIL，**单独计数**）；
 * 空数组 ⇒ `ok`；非空 ⇒ `violated`。**不是布尔**（N-SGO-024）。
 */
export function law9Verdict(problems: readonly string[] | null): Law9Verdict {
  if (problems === null) return 'n/a';
  return problems.length === 0 ? 'ok' : 'violated';
}

/* ── L9-8：真源切片（读生产模块；不读 SYSTEM_PROMPT）───────────────────────── */

export function sourceSliceProblems(refScope: string, sidepanel: string): string[] {
  const p = JUDGEMENTS[7].expectFailPattern;
  const problems: string[] = [];
  if (!/if \(f\.refs\.length === 0\) return 'no-ref';/.test(refScope)) {
    problems.push(`${p}：scopeReading 必须显式判 no-ref（无引用分支缺失 / 被改判）`);
  }
  if (!/return f\.authorized \? 'out-of-scope-authorized' : 'out-of-scope-unauthorized';/.test(refScope)) {
    problems.push(`${p}：越界两态分支缺失 / 被改写`);
  }
  // 判据面**不读**提示词：读数模块与写闸切片都不得引用 SYSTEM_PROMPT（B 轨是引导）。
  if (/SYSTEM_PROMPT/.test(refScope)) problems.push(`${p}：读数模块不得引用 SYSTEM_PROMPT（门禁读提示词 = 实现错误）`);
  if (/SYSTEM_PROMPT/.test(confirmBranch(sidepanel))) {
    problems.push(`${p}：写闸切片不得依赖 SYSTEM_PROMPT（判据不读提示词）`);
  }
  return problems;
}

/* ── L9-9：扩围二择（WIDEN）真源切片 ───────────────────────────────────────── */

/**
 * V5.5F-2 **TASK-V55F-213**（ADR-SGO-005 §1/§2/§3 · FR-SGO-060~063 · R-SGO-907）——
 * 扩围落地的**真源判据**（不是数值重 pin）：
 *   ① 扩围授权 `scopeWidenAuthorized = true` **恰一处写入**，且在 sidepanel 的 WIDEN 二择
 *      解析器内、被 `isWidenWholePage(choice)`（真实点击回传值）守卫；
 *   ② AI / LLM 侧模块**零写入面**（不得出现 `scopeWidenAuthorized`）；
 *   ③ 二择复用既有 `askuser`（`SCOPE_WIDEN_OPTIONS` / `SCOPE_WIDEN_PROMPT` 被面板消费）。
 * 注入「AI 自填 authorized」⇒ 必红（R-SGO-907）。
 */
export function widenProblems(files: Map<string, string>): string[] {
  const p = JUDGEMENTS[8].expectFailPattern;
  const problems: string[] = [];
  const writeSites: string[] = [];
  for (const [rel, text] of files) if (/scopeWidenAuthorized\s*=\s*true/.test(text)) writeSites.push(rel);
  if (writeSites.length !== 1 || writeSites[0] !== SIDEPANEL_REL) {
    problems.push(`${p}：扩围授权的写入面必须恰一处且只在面板（实测 ${JSON.stringify(writeSites)}）`);
  }
  const panel = files.get(SIDEPANEL_REL) ?? '';
  if (!/if \(isWidenWholePage\(choice\)\) \{\s*scopeWidenAuthorized = true;/.test(panel)) {
    problems.push(`${p}：扩围授权必须被「整页」真实点击值守卫（isWidenWholePage(choice)）`);
  }
  // ② AI / LLM 侧零写入面：这些模块**不得**出现扩围授权标识。
  for (const [rel, text] of files) {
    if (rel === SIDEPANEL_REL) continue;
    if (/next-registry|llm|ai-drive|recommend|background/.test(rel) && /scopeWidenAuthorized/.test(text)) {
      problems.push(`${p}：AI / SW 侧模块 ${rel} 不得有扩围授权写入面`);
    }
  }
  // ③ 二择复用既有 ask 机制（选项 / 提示语被面板消费；零新增 kind）。
  if (!/SCOPE_WIDEN_OPTIONS/.test(panel) || !/SCOPE_WIDEN_PROMPT/.test(panel) || !/type: 'ask'/.test(panel)) {
    problems.push(`${p}：二择必须复用既有 ask 通道（SCOPE_WIDEN_OPTIONS / SCOPE_WIDEN_PROMPT 未被消费）`);
  }
  return problems;
}

/* ── 真源 ─────────────────────────────────────────────────────────────────── */
const SRC_FILES = readSrcFiles();
const REF_SCOPE_SRC = readFileSync(join(PKG, REF_SCOPE_REL), 'utf8');
const SIDEPANEL_SRC = readFileSync(join(PKG, SIDEPANEL_REL), 'utf8');

/* ── 判据 ─────────────────────────────────────────────────────────────────── */

test('L9-1 四值 + 判定函数唯一声明（真源扫描；第二声明必红）', () => {
  assert.deepEqual(fourValueProblems(SRC_FILES), [], JUDGEMENTS[0].expectFailPattern);
  assert.deepEqual([...SCOPE_READINGS], ['in-scope', 'out-of-scope-authorized', 'out-of-scope-unauthorized', 'no-ref']);
  // 反证：把读数值散落到第二个模块 ⇒ 必红 → 还原 PASS。
  const forged = new Map(SRC_FILES);
  forged.set('src/ui/sidepanel/ghost-scope.ts', "export const X = 'in-scope';\n");
  assert.ok(fourValueProblems(forged).some((x) => /第二声明/.test(x)), '第二声明必须判红');
  assert.deepEqual(fourValueProblems(SRC_FILES), []);
});

test('L9-2 无引用 ⇒ no-ref（不得判 in-scope）', () => {
  assert.deepEqual(noRefProblems(), [], JUDGEMENTS[1].expectFailPattern);
  // 反证：注入「去注入 ⇒ in-scope」的读数实现 ⇒ 必红（判据非恒真）→ 还原 PASS。
  const forgeInScope: Reader = (f) => (f.refs.length === 0 ? 'in-scope' : scopeReading(f));
  assert.ok(noRefProblems(forgeInScope).some((x) => /不得判 in-scope/.test(x)), '改判 in-scope 必须判红');
  assert.deepEqual(noRefProblems(), []);
});

test('L9-3 两路命中（--ref / selector）⇒ in-scope', () => {
  assert.deepEqual(inScopeProblems(), [], JUDGEMENTS[2].expectFailPattern);
  // 反证：注入「任何目标都判 out-of-scope-unauthorized」的读数 ⇒ 必红。
  const forgeAlwaysOut: Reader = () => 'out-of-scope-unauthorized';
  assert.ok(inScopeProblems(forgeAlwaysOut).length > 0, '恒判越界必须判红');
  assert.deepEqual(inScopeProblems(), []);
});

test('L9-4 / L9-5 越界两态：未征询 / 已批准', () => {
  assert.deepEqual(outOfScopeProblems(), [], `${JUDGEMENTS[3].expectFailPattern} / ${JUDGEMENTS[4].expectFailPattern}`);
  // 反证：注入「忽略 authorized 输入」的读数（自判）⇒ 必红。
  const forgeSelfJudge: Reader = () => 'out-of-scope-unauthorized';
  assert.ok(outOfScopeProblems(forgeSelfJudge).some((x) => /out-of-scope-authorized/.test(x)), '忽略 authorized 必须判红');
  assert.deepEqual(outOfScopeProblems(), []);
});

test('L9-6 生产写闸切片：越界未征询写必被拦（deny + 可达 next）', () => {
  assert.deepEqual(writeGateProblems(SIDEPANEL_SRC), [], JUDGEMENTS[5].expectFailPattern);
  const branch = confirmBranch(SIDEPANEL_SRC);
  assert.ok(branch.length > 0, '切片必须真的取到 confirm-request 处理体');
  // V5.5F-2 TASK-V55F-213：listener 必须**委托**具名 `handleConfirmRequest`（同一生产路径）。
  assert.ok(SIDEPANEL_SRC.includes('handleConfirmRequest(String(msg.requestId'), 'listener 必须委托 handleConfirmRequest');
  assert.ok(branch.includes('function handleConfirmRequest('), '切片必须含具名处理入口');
  // 动态裁决：越界未征询 ⇒ blocked + 可读理由；在范围内 ⇒ 放行（既有 confirm 路径）。
  const blocked = scopeWriteGate({ targets: [{ selector: '#gamma' }], refs: REFS, authorized: false });
  assert.equal(blocked.blocked, true, '越界未征询必须 blocked');
  assert.ok(blocked.message.length >= 20 && /引用/.test(blocked.message), '必须给出可读理由 + 可达 next');
  const allowed = scopeWriteGate({ targets: [{ selector: '#alpha' }], refs: REFS, authorized: false });
  assert.equal(allowed.blocked, false, 'in-scope 不得被拦');
  assert.equal(scopeWriteGate({ targets: [{ selector: '#gamma' }], refs: [], authorized: false }).blocked, false, 'no-ref 不得阻断（EC-SGO-008）');
  assert.equal(writeGateApplicable('dom', 'set-text', '#gamma', undefined), true);
  assert.equal(writeGateApplicable('dom', 'read-element', '#gamma', undefined), false, '读命令不进写闸（n/a）');
});

test('L9-7 禁恒真三段控制：ok / violated / n/a 逐态可达（n/a 单独计数）', () => {
  const ok = law9Verdict([]);
  const violated = law9Verdict(['注入违反面']);
  const na = law9Verdict(null);
  assert.equal(ok, 'ok');
  assert.equal(violated, 'violated');
  assert.equal(na, 'n/a');
  assert.equal(new Set([ok, violated, na]).size, 3, '三态必须互异（不是布尔）');
  // n/a **不与 PASS 混池**：中性输入（写闸前提不成立）单独计数。
  const neutral = writeGateApplicable('clipboard', 'write', 'x', undefined) ? [] : null;
  assert.equal(law9Verdict(neutral), 'n/a', '判据前提不成立必须 n/a（不得读成 ok）');
  assert.equal(law9Verdict([]), 'ok', 'n/a 不得污染 ok');
});

test('L9-8 真源切片：读生产模块（不读 SYSTEM_PROMPT）', () => {
  assert.deepEqual(sourceSliceProblems(REF_SCOPE_SRC, SIDEPANEL_SRC), [], JUDGEMENTS[7].expectFailPattern);
  assert.ok(REF_SCOPE_SRC.includes('export function scopeReading'), '切片必须取自 ref-scope 生产模块');
  assert.ok(!/SYSTEM_PROMPT/.test(REF_SCOPE_SRC), '判据不读提示词（B 轨是引导）');
});

test('L9-9 扩围二择（WIDEN）：转值单源 + 真实点击唯一写入面 + AI 零写入面', () => {
  // ① 真源：写入面恰一处（侧栏）、被「整页」真实点击值守卫；AI / SW 侧零写入面。
  assert.deepEqual(widenProblems(SRC_FILES), [], JUDGEMENTS[8].expectFailPattern);
  // ② 转值单源（`ref-scope.ts`）：选项 / 提示语 / 判据。
  assert.deepEqual([...SCOPE_WIDEN_OPTIONS], ['仅引用范围内', '整页（扩大范围）']);
  assert.equal(SCOPE_WIDEN_WHOLE_PAGE, '整页（扩大范围）');
  assert.ok(SCOPE_WIDEN_PROMPT.length > 0, '提示语不得为空');
  assert.equal(isWidenWholePage('整页（扩大范围）'), true, '「整页」⇒ 扩围获批（唯一转值判据）');
  assert.equal(isWidenWholePage('仅引用范围内'), false, '「仅引用范围内」⇒ fail-closed');
  assert.equal(isWidenWholePage(undefined), false, '取消 / 未答 ⇒ fail-closed（不得默认整页）');
  // ③ 转值读数 + 留痕（读数四值单源；扩围事实可判）。
  assert.equal(scopeWriteGate({ targets: [{ selector: '#gamma' }], refs: REFS, authorized: true }).reading, 'out-of-scope-authorized');
  assert.equal(scopeReadingTrace('out-of-scope-authorized', true), 'scope.reading=out-of-scope-authorized | scope.authorized=user');
});

test('L9-9 反证：AI 自填 authorized / 去掉「整页」守卫 / 第二写入面 ⇒ 判红 → 还原 PASS', () => {
  assert.deepEqual(widenProblems(SRC_FILES), []);
  // ① 注入「AI 自填 authorized = true」（on-disk 模拟：AI 侧模块出现写入面）⇒ 必红。
  const aiForged = new Map(SRC_FILES);
  aiForged.set('src/ui/sidepanel/next-registry/ai-drive.ts', `${SRC_FILES.get('src/ui/sidepanel/next-registry/ai-drive.ts') ?? ''}\nscopeWidenAuthorized = true; // AI 自答\n`);
  assert.ok(widenProblems(aiForged).some((x) => /AI \/ SW 侧|写入面/.test(x)), 'AI 自填 authorized ⇒ 必红');
  // ② 去掉「整页」真实点击守卫（改成无条件写）⇒ 必红。
  const unguarded = new Map(SRC_FILES);
  unguarded.set(SIDEPANEL_REL, (SRC_FILES.get(SIDEPANEL_REL) ?? '').replace('if (isWidenWholePage(choice)) {\n      scopeWidenAuthorized = true;', 'scopeWidenAuthorized = true;'));
  assert.ok(widenProblems(unguarded).some((x) => /真实点击值守卫/.test(x)), '去掉真实点击守卫 ⇒ 必红');
  // ③ 第二写入面（同一标识在 AI 模块再写一次）⇒ 必红。
  const twice = new Map(SRC_FILES);
  twice.set('src/ui/sidepanel/next-registry/recommend.ts', `${SRC_FILES.get('src/ui/sidepanel/next-registry/recommend.ts') ?? ''}\nscopeWidenAuthorized = true;\n`);
  assert.ok(widenProblems(twice).length > 0, '第二写入面 ⇒ 必红');
  // 还原 ⇒ 全绿（判据不是恒真）。
  assert.deepEqual(widenProblems(SRC_FILES), []);
});

/* ── TASK-V55F-114：双向反证族（注入 ⇒ FAIL ⇒ 逐字节还原 ⇒ PASS）──────────── */

test('L9-114 反证①：把 no-ref 分支改判 in-scope ⇒ 判红 → 逐字节还原 ⇒ PASS', () => {
  const originalSha = sha256(REF_SCOPE_SRC);
  const injected = REF_SCOPE_SRC.replace(
    "if (f.refs.length === 0) return 'no-ref';",
    "if (f.refs.length === 0) return 'in-scope';",
  );
  assert.notEqual(injected, REF_SCOPE_SRC, '前置：注入锚点必须存在');
  assert.notEqual(sha256(injected), originalSha, '注入必须真的改变字节');
  // 注入 ⇒ 真源判据 + 语义判据**双红**（实跑）。
  const problems = sourceSliceProblems(injected, SIDEPANEL_SRC);
  assert.ok(problems.some((x) => /不得判 no-ref|no-ref/.test(x)), `注入 ⇒ 必红（实测 ${problems.join(' | ')}）`);
  const forged: Reader = (f) => (f.refs.length === 0 ? 'in-scope' : scopeReading(f));
  assert.ok(noRefProblems(forged).length > 0, '注入语义 ⇒ 必红');
  // 逐字节还原 ⇒ PASS，且生产文件从未被改写（sha256 前后相同）。
  assert.equal(sha256(REF_SCOPE_SRC), originalSha, '还原后 sha256 必须与注入前逐字节相同');
  assert.deepEqual(sourceSliceProblems(REF_SCOPE_SRC, SIDEPANEL_SRC), []);
  assert.deepEqual(noRefProblems(), []);
  assert.equal(sha256(readFileSync(join(PKG, REF_SCOPE_REL), 'utf8')), originalSha, '生产文件必须零改写');
});

test('L9-114 反证②：删除写闸的越界拦截 ⇒ 判红 → 逐字节还原 ⇒ PASS', () => {
  const originalSha = sha256(SIDEPANEL_SRC);
  // 注入形态：去掉 `if (gate.blocked) { … return; }` 整块（越界不再被拦）。
  const start = SIDEPANEL_SRC.indexOf('if (gate.blocked) {');
  assert.ok(start > 0, '前置：写闸拦截块必须存在');
  let depth = 0;
  let end = start;
  for (let i = SIDEPANEL_SRC.indexOf('{', start); i < SIDEPANEL_SRC.length; i += 1) {
    if (SIDEPANEL_SRC[i] === '{') depth += 1;
    else if (SIDEPANEL_SRC[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const injected = SIDEPANEL_SRC.slice(0, start) + SIDEPANEL_SRC.slice(end);
  assert.notEqual(sha256(injected), originalSha, '注入必须真的改变字节');
  const problems = writeGateProblems(injected);
  assert.ok(problems.length > 0, `删除越界拦截 ⇒ 必红（实测 ${problems.join(' | ')}）`);
  assert.ok(problems.some((x) => /必须 deny|写闸裁决未被使用/.test(x)), '必红必须命中 deny / blocked 面');
  // 还原 ⇒ PASS（sha256 前后相同；生产文件零改写）。
  assert.equal(sha256(SIDEPANEL_SRC), originalSha);
  assert.deepEqual(writeGateProblems(SIDEPANEL_SRC), []);
  assert.equal(sha256(readFileSync(join(PKG, SIDEPANEL_REL), 'utf8')), originalSha, '生产文件必须零改写');
});

test('L9-114 反证③：恒绿检测（注入后仍 PASS ⇒ 视为缺陷）', () => {
  // 三条注入面各自都能让**对应**判据 FAIL —— 若某条注入后判据仍 PASS，即为恒真缺陷。
  const noRefInjected = REF_SCOPE_SRC.replace("return 'no-ref';", "return 'in-scope';");
  assert.notEqual(noRefInjected, REF_SCOPE_SRC);
  assert.ok(sourceSliceProblems(noRefInjected, SIDEPANEL_SRC).length > 0, 'no-ref 注入必须让真源判据 FAIL');
  const gateInjected = SIDEPANEL_SRC.replaceAll('allow: false', 'allow: true');
  assert.notEqual(gateInjected, SIDEPANEL_SRC);
  assert.ok(writeGateProblems(gateInjected).some((x) => /必须 deny/.test(x)), 'allow:false→true 必须 FAIL');
  const fourValuesLeak = new Map(SRC_FILES);
  fourValuesLeak.set('src/ui/sidepanel/leak.ts', 'const r = "out-of-scope-unauthorized";');
  fourValuesLeak.set('src/ui/sidepanel/leak2.ts', "const r = 'out-of-scope-unauthorized';");
  assert.ok(fourValueProblems(fourValuesLeak).some((x) => /第二声明/.test(x)), '四值泄漏必须 FAIL');
});

/* ── 留痕单源（TASK-V55F-112）：字段名 + 机器枚举，零用户内容值 ─────────────── */

test('L9-112 范围留痕单源：字段名 + 机器枚举（零用户内容值）', () => {
  assert.deepEqual([...SCOPE_TRACE_FIELDS], ['scope.reading', 'scope.authorized']);
  assert.equal(scopeReadingTrace('out-of-scope-unauthorized', false), 'scope.reading=out-of-scope-unauthorized | scope.authorized=none');
  assert.equal(scopeReadingTrace('out-of-scope-authorized', true), 'scope.reading=out-of-scope-authorized | scope.authorized=user');
  for (const reading of SCOPE_READINGS) {
    const line = scopeReadingTrace(reading, false);
    assert.ok(/^scope\.reading=(in-scope|out-of-scope-authorized|out-of-scope-unauthorized|no-ref) \| scope\.authorized=(user|none)$/.test(line), `留痕行格式必须机器可判（实测 ${line}）`);
    // 零用户内容值：留痕行只含字段名 + 机器枚举。
    assert.ok(!/id=[^n]|selector=|textDigest=|http/.test(line), '留痕不得含用户内容值 / 凭据 / URL');
  }
});

test('L9 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 9, '法九判据下界 ≥9（L9-1~8 + L9-9 扩围二择）');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
  }
});
