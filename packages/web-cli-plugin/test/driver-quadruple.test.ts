/**
 * V5.5-1 **TASK-V55-108 / 109 / 111** (ADR-V55-001/002 · FR-SELF-010/011/012/013/016/017/036 ·
 * AC-SELF-002/009/015) — the **driver quadruple + bidirectional inclusion + timing map** gate.
 *
 * ── 判据（每条都有 `expectFailPattern`，三类注入反证在文件内实跑）────────────
 *
 *   DQ-1 **双向包含** —— `DRIVERS` 键集 ≡ `builtinProviders()` id 集（多一行 / 少一行 ⇒ FAIL）。
 *   DQ-2 **四元组** —— 每个驱动者 `driverId` / `timing ⊆ DRIVER_TIMINGS` / `evidence` /
 *        `ops ⊆ OP_IDS` 四项齐备，`chips` 悬空 ⇒ FAIL。
 *   DQ-3 **evidence ⊆ `CTX_FIELD_SERVICE`** —— 且与 `providers.ts` 的 `when`-scope **源文本
 *        抽取**双向一致（声明面 ↔ 实读面；未登记字段 ⇒ FAIL，EC-SELF-003）。
 *   DQ-4 **时机 ↔ 驱动者** —— 每个时机 ≥1 驱动者、每个驱动者的时机都在闭集内；
 *        `'answered'` **恰有** `ref-action` 接手（本叶题眼）。
 *   DQ-5 **七类时刻逐类 ≥1 驱动者**（FR-SELF-012）。
 *   DQ-6 **单源** —— 四张表（时机闭集 / 七类时刻 / `driverClass` / 声明表）各恰一处声明。
 *
 * @module test/driver-quadruple
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { OP_IDS } from '../src/shared/op-table.js';
import { SET_A_PROTOCOL_ACTIONS } from '../src/ui/sidepanel/next-registry/dispatch.js';
// ★ F-36 / ADN-1 TASK-ADN-120（纯追加 import 行；原行逐字保留 ⇒ 零删除）。
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import {
  CTX_FIELD_SERVICE,
  DRIVER_CLASSES,
  DRIVER_TIMINGS,
  PROACTIVE_MOMENTS,
  driversForTiming,
  registerDriverDecl,
  resetDriverDecls,
  serviceOfCtxField,
} from '../src/ui/sidepanel/next-registry/drivers.js';
import { DRIVER_DECLS_SRC, builtinProviders } from '../src/ui/sidepanel/next-registry/providers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const DRIVERS_REL = 'src/ui/sidepanel/next-registry/drivers.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'DQ-1-bidirectional-inclusion', expectFailPattern: '驱动者声明表 ↔ 注册表必须双向包含' },
  { id: 'DQ-2-quadruple', expectFailPattern: '驱动者四元组必须齐备且 ops ⊆ 9 opId ∪ 集 A 协议动作（无悬空）' },
  { id: 'DQ-3-evidence-registered', expectFailPattern: 'evidence 必须在 CTX_FIELD_SERVICE 登记面内且与 when-scope 同源' },
  { id: 'DQ-4-timing-map', expectFailPattern: '时机 ↔ 驱动者映射必须每个时机 ≥1 驱动者' },
  { id: 'DQ-5-moment-coverage', expectFailPattern: '七类时刻必须逐类存在 ≥1 驱动者' },
  { id: 'DQ-6-single-source', expectFailPattern: '四张表必须各恰一处声明' },
];

export interface DeclLike {
  readonly driverId: string;
  readonly timings: readonly string[];
  readonly moments: readonly string[];
  readonly driverClass: string;
  readonly evidence: readonly string[];
  readonly priority?: number;
}

/* ── judges（纯函数，注入可驱动）────────────────────────────────────────── */

/** DQ-1 — two hand-written sources must agree (neither is derived from the other). */
export function bidirectionalProblems(declIds: readonly string[], providerIds: readonly string[]): string[] {
  const problems: string[] = [];
  const missing = providerIds.filter((id) => !declIds.includes(id));
  const extra = declIds.filter((id) => !providerIds.includes(id));
  if (missing.length > 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：注册表有而声明表无 → ${missing.join(', ')}`);
  if (extra.length > 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：声明表有而注册表无 → ${extra.join(', ')}`);
  return problems;
}

/** DQ-2 — every quadruple element present; chips resolve into the 9 opId ∪ 集 A protocol actions. */
export function quadrupleProblems(decls: readonly DeclLike[], chipsOf: (id: string) => readonly string[]): string[] {
  const problems: string[] = [];
  // ★ IAN-1（ADR-IAN-001 §①/§②）—— chip 的可分发词汇 = **两集模型**：opId（经 `OPS_BY_ID`）∪
  // 集 A 协议动作（`handleCardAction` 的卡族动作，如推荐卡末端的 `'free-input'`）。判据方向
  // 只增不减：既有的「chips 必须可分发」不变，新增的只是**合法的第二词汇面**（两集之外仍判红）。
  const known = new Set<string>([...OP_IDS, ...SET_A_PROTOCOL_ACTIONS]);
  for (const d of decls) {
    if (!d.driverId) problems.push(`${JUDGEMENTS[1].expectFailPattern}：缺 driverId`);
    if (!Array.isArray(d.timings) || d.timings.length === 0) problems.push(`${JUDGEMENTS[1].expectFailPattern}：${d.driverId} 缺 timing`);
    for (const t of d.timings) {
      if (!(DRIVER_TIMINGS as readonly string[]).includes(t)) problems.push(`${JUDGEMENTS[1].expectFailPattern}：${d.driverId} 的 timing ${t} 不在闭集内`);
    }
    if (!Array.isArray(d.evidence) || d.evidence.length === 0) problems.push(`${JUDGEMENTS[1].expectFailPattern}：${d.driverId} 缺 evidence`);
    const ops = chipsOf(d.driverId);
    if (!Array.isArray(ops) || ops.length === 0) problems.push(`${JUDGEMENTS[1].expectFailPattern}：${d.driverId} 缺 ops`);
    for (const op of ops) {
      if (!known.has(op)) problems.push(`${JUDGEMENTS[1].expectFailPattern}：${d.driverId} 的 chip 悬空 → ${op}`);
    }
  }
  return problems;
}

/** DQ-3 — declared evidence and the `when`-scope reads must be the same set. */
export function evidenceProblems(decls: readonly DeclLike[], sourceReads: readonly string[]): string[] {
  const problems: string[] = [];
  const declared = new Set<string>();
  for (const d of decls) for (const e of d.evidence) declared.add(e);
  for (const e of declared) {
    if (serviceOfCtxField(e) === undefined) problems.push(`${JUDGEMENTS[2].expectFailPattern}：声明字段未登记 → ${e}`);
  }
  for (const r of sourceReads) {
    if (serviceOfCtxField(r) === undefined) problems.push(`${JUDGEMENTS[2].expectFailPattern}：when-scope 读取未登记字段 → ${r}`);
    else if (!declared.has(r)) problems.push(`${JUDGEMENTS[2].expectFailPattern}：when-scope 读取 ${r} 但无驱动者声明（证据面缺口）`);
  }
  for (const e of declared) {
    if (!sourceReads.includes(e)) problems.push(`${JUDGEMENTS[2].expectFailPattern}：声明 evidence ${e} 在 when-scope 中并未读取（声明失真）`);
  }
  return problems;
}

/** DQ-4 — every timing has ≥1 driver; every declared timing belongs to the closed set. */
export function timingMappingProblems(decls: readonly DeclLike[], timings: readonly string[] = DRIVER_TIMINGS): string[] {
  const problems: string[] = [];
  for (const t of timings) {
    if (!(DRIVER_TIMINGS as readonly string[]).includes(t)) {
      problems.push(`${JUDGEMENTS[3].expectFailPattern}：悬空 timing ${t}（不在闭集内）`);
      continue;
    }
    if (!decls.some((d) => d.timings.includes(t))) problems.push(`${JUDGEMENTS[3].expectFailPattern}：时机 ${t} 无任何驱动者`);
  }
  for (const d of decls) {
    for (const t of d.timings) {
      if (!(DRIVER_TIMINGS as readonly string[]).includes(t)) problems.push(`${JUDGEMENTS[3].expectFailPattern}：${d.driverId} 声明了悬空 timing ${t}`);
    }
  }
  return problems;
}

/** DQ-5 — the seven moments are each covered. */
export function momentCoverageProblems(decls: readonly DeclLike[], moments: readonly string[] = PROACTIVE_MOMENTS): string[] {
  const problems: string[] = [];
  if (moments.length !== 7) problems.push(`${JUDGEMENTS[4].expectFailPattern}：七类时刻必须恰 7（实测 ${moments.length}）`);
  for (const m of moments) {
    if (!(PROACTIVE_MOMENTS as readonly string[]).includes(m)) problems.push(`${JUDGEMENTS[4].expectFailPattern}：悬空时刻 ${m}`);
    else if (!decls.some((d) => d.moments.includes(m))) problems.push(`${JUDGEMENTS[4].expectFailPattern}：时刻 ${m} 无驱动者`);
  }
  return problems;
}

export function srcTsFiles(dir = join(PKG, 'src')): { readonly rel: string; readonly text: string }[] {
  const out: { rel: string; text: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push({ rel: full.slice(full.indexOf(PKG) + PKG.length), text: readFileSync(full, 'utf8') });
  }
  return out;
}

/** DQ-6 — each of the four tables is declared exactly once. */
export function singleSourceProblems(files: readonly { readonly rel: string; readonly text: string }[]): string[] {
  const problems: string[] = [];
  const check = (marker: RegExp, label: string, rel: string): void => {
    const sites = files
      .map((f) => ({ rel: f.rel, n: (f.text.match(marker) ?? []).length }))
      .filter((f) => f.n > 0)
      .map((f) => `${f.rel}×${f.n}`);
    const total = sites.reduce((n, s) => n + Number(s.split('×')[1]), 0);
    if (total !== 1 || sites.join(',') !== `${rel}×1`) {
      problems.push(`${JUDGEMENTS[5].expectFailPattern}：${label} 声明点 = ${sites.join(', ') || '<无>'}`);
    }
  };
  check(/export const DRIVER_TIMINGS\b/, 'DRIVER_TIMINGS', DRIVERS_REL);
  check(/export const PROACTIVE_MOMENTS\b/, 'PROACTIVE_MOMENTS', DRIVERS_REL);
  check(/export const DRIVER_CLASSES\b/, 'DRIVER_CLASSES', DRIVERS_REL);
  check(/export const DRIVER_DECLS_SRC\b/, 'DRIVER_DECLS_SRC', PROVIDERS_REL);
  return problems;
}

/* ── the `when`-scope source extraction（自源文本抽取，非人工对账）──────────── */

/** The `when`-scope of `providers.ts`: the `triggerMatch` body + every `when:` fragment. */
export function whenScope(source: string): string {
  const parts: string[] = [];
  const tm = /function\s+triggerMatch\([\s\S]*?\n\}/.exec(source);
  if (tm) parts.push(tm[0]);
  for (let i = source.indexOf('when:'); i >= 0; i = source.indexOf('when:', i + 5)) {
    let j = i + 'when:'.length;
    let depth = 0;
    let arrow = false;
    for (; j < source.length; j += 1) {
      const ch = source[j];
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') {
        depth -= 1;
        if (depth < 0) break;
      } else if (ch === '=' && source[j + 1] === '>') {
        arrow = true;
        j += 1;
      } else if (ch === ',' && depth === 0 && arrow) break;
    }
    parts.push(source.slice(i, j));
  }
  return parts.join('\n');
}

/** `ctx` field paths actually read in a scope（`ctx.risk.includes(` ⇒ `risk`）。 */
export function ctxReads(scope: string): string[] {
  const out = new Set<string>();
  for (const m of scope.matchAll(/ctx\.([A-Za-z]+)(?:\.([A-Za-z]+))?/g)) {
    const rest = scope.slice((m.index ?? 0) + m[0].length);
    if (rest.startsWith('(')) out.add(m[1]);
    else out.add(m[2] ? `${m[1]}.${m[2]}` : m[1]);
  }
  return [...out].sort();
}

/* ── the real data ───────────────────────────────────────────────────────── */

const FILES = srcTsFiles();
const PROVIDERS_SRC = read(PROVIDERS_REL);
const PROVIDERS = builtinProviders();
const DECLS = Object.values(DRIVER_DECLS_SRC) as readonly DeclLike[];
const DECL_IDS = Object.keys(DRIVER_DECLS_SRC);
const PROVIDER_IDS = PROVIDERS.map((p) => p.id);
const chipsOf = (id: string): readonly string[] => PROVIDERS.find((p) => p.id === id)?.chips ?? [];
const SOURCE_READS = ctxReads(whenScope(PROVIDERS_SRC));

test('DQ-1 驱动者声明表 ↔ 注册表双向包含（两个手写源）', () => {
  assert.deepEqual(bidirectionalProblems(DECL_IDS, PROVIDER_IDS), [], JUDGEMENTS[0].expectFailPattern);
  assert.ok(DECL_IDS.length >= 10, '驱动者集合必须覆盖既有 provider 集合（不得空转）');
  // ★ F-36 / ADN-1 TASK-ADN-120：既有 11 行 + `ai-next` 第 12 行 ⇒ 双向包含随 count **12↔12**。
  assert.equal(DECL_IDS.length, 12, `${JUDGEMENTS[0].expectFailPattern}：声明表必须恰 12 行（11 + ai-next）`);
  assert.equal(PROVIDER_IDS.length, 12, `${JUDGEMENTS[0].expectFailPattern}：注册表必须恰 12 行（11 + ai-next）`);
  assert.deepEqual([...DECL_IDS].sort(), [...PROVIDER_IDS].sort(), '12↔12 必须逐项同集（不是只对数）');
});

test('DQ-1 反证：声明表多一行 / 少一行 ⇒ 必红 → 还原 PASS', () => {
  assert.ok(bidirectionalProblems([...DECL_IDS, 'ghost-driver'], PROVIDER_IDS).length > 0, `${JUDGEMENTS[0].expectFailPattern}：多一行必须红`);
  assert.ok(bidirectionalProblems(DECL_IDS.filter((id) => id !== 'ref-action'), PROVIDER_IDS).length > 0, `${JUDGEMENTS[0].expectFailPattern}：少一行必须红`);
  assert.deepEqual(bidirectionalProblems(DECL_IDS, PROVIDER_IDS), []);
});

test('DQ-2 四元组齐备 + chips ⊆ 9 opId ∪ 集 A 协议动作（无悬空）', () => {
  assert.deepEqual(quadrupleProblems(DECLS, chipsOf), [], JUDGEMENTS[1].expectFailPattern);
});

test('DQ-2 集 A 词汇面（IAN-1）：终端 chip 合法 ∧ 两集之外仍判悬空', () => {
  // 前置：`'free-input'` 必须真的是集 A 成员（否则下面的「合法」断言是空转）。
  assert.ok(SET_A_PROTOCOL_ACTIONS.includes('free-input'), '集 A 必须含 free-input（ADR-IAN-001 §②）');
  // 生产形态：free-input provider 的 chip = 集 A 协议动作 ⇒ 合法（不悬空）。
  assert.deepEqual(quadrupleProblems(DECLS, chipsOf), [], JUDGEMENTS[1].expectFailPattern);
  // 反证：两集之外的 chip ⇒ 悬空（本判据不是「什么都不判」）。
  const forged = quadrupleProblems(DECLS, (id) => (id === 'free-input' ? ['free-input-ghost'] : chipsOf(id)));
  assert.ok(forged.some((p) => p.includes('悬空')), `${JUDGEMENTS[1].expectFailPattern}：两集之外的 chip 必须判悬空`);
});

test('DQ-2 反证：缺元 / 悬空 chips ⇒ 必红 → 还原 PASS', () => {
  const noEvidence = DECLS.map((d) => (d.driverId === 'ref-action' ? { ...d, evidence: [] } : d));
  assert.ok(quadrupleProblems(noEvidence, chipsOf).length > 0, `${JUDGEMENTS[1].expectFailPattern}：缺 evidence 必须红`);
  const dangling = quadrupleProblems(DECLS, (id) => (id === 'ref-action' ? ['op.ghost'] : chipsOf(id)));
  assert.ok(dangling.some((p) => p.includes('悬空')), `${JUDGEMENTS[1].expectFailPattern}：悬空 chips 必须红`);
  assert.deepEqual(quadrupleProblems(DECLS, chipsOf), []);});

test('DQ-3 evidence 登记 + 与 when-scope 源文本双向一致', () => {
  assert.deepEqual(evidenceProblems(DECLS, SOURCE_READS), [], JUDGEMENTS[2].expectFailPattern);
  assert.ok(SOURCE_READS.length >= 8, `when-scope 抽取不得空转（实测 ${SOURCE_READS.length} 个字段）`);
  assert.ok(Object.keys(CTX_FIELD_SERVICE).includes('session.proactive'), 'CTX_FIELD_SERVICE 必须登记新增字段组');
});

test('DQ-3 反证：未登记字段 / 声明失真 ⇒ 必红 → 还原 PASS', () => {
  const forgedDecl = DECLS.map((d) => (d.driverId === 'ref-action' ? { ...d, evidence: [...d.evidence, 'telemetry'] } : d));
  assert.ok(evidenceProblems(forgedDecl, SOURCE_READS).some((p) => p.includes('未登记')), `${JUDGEMENTS[2].expectFailPattern}：未登记字段必须红`);
  assert.ok(evidenceProblems(DECLS, [...SOURCE_READS, 'ghost.field']).some((p) => p.includes('未登记')), `${JUDGEMENTS[2].expectFailPattern}：源读未登记字段必须红`);
  const missing = DECLS.map((d) => (d.driverId === 'onboarding' ? { ...d, evidence: ['risk'] } : d));
  assert.ok(evidenceProblems(missing, SOURCE_READS).length > 0, `${JUDGEMENTS[2].expectFailPattern}：声明与实读脱钩必须红`);
  assert.deepEqual(evidenceProblems(DECLS, SOURCE_READS), []);
});

/* ★ F-36 / ADN-1 **TASK-ADN-120**（ADR-ADN-004 §②/§③ · ADR-ADN-009 · FR-ADN-096 · AC-ADN-010）——
 * DQ-2 静态下界 + DQ-3 **evidence 同源**（`session.aiNext` 由 `when`-scope 源文本抽取）。
 * 缺声明 / 多声明 / evidence 漂移 ⇒ 必红（三类反证逐条实跑）。
 * ──────────────────────────────────────────────────────────────────────────── */
test('★ ADN-1 120：ai-next 静态 chips=["op.turn"] ⊆ OP_IDS ∧ DQ-3 evidence=session.aiNext 与 when-scope 同源', () => {
  // ① 静态下界：`chips` 是**下界面**（≥1 opId），必须 ⊆ OP_IDS（`op.turn`）。
  const ai = PROVIDERS.find((p) => p.id === 'ai-next');
  assert.ok(ai, 'ai-next provider 必须注册（第 12 行）');
  assert.deepEqual([...(ai?.chips ?? [])], [ACT_TO_OP.next], 'ai-next 静态 chips 必须 = [op.turn]（`ACT_TO_OP.next` 单源）');
  for (const op of ai?.chips ?? []) assert.ok(OP_IDS.includes(op), `${JUDGEMENTS[1].expectFailPattern}：静态 chip ${op} 必须 ∈ OP_IDS`);
  assert.equal(typeof ai?.chipsFor, 'function', 'chipsFor 必须是权威动态面');
  // ② DQ-3 收纳 `session.aiNext`：when-scope 源文本抽取必须真的读到它（与 evidence 同源）。
  assert.ok(SOURCE_READS.includes('session.aiNext'), `${JUDGEMENTS[2].expectFailPattern}：when-scope 必须抽取到 session.aiNext（实测 ${JSON.stringify(SOURCE_READS)}）`);
  assert.deepEqual([...DRIVER_DECLS_SRC['ai-next'].evidence], ['session.aiNext'], 'evidence 必须与 when-scope 同源');
  // ③ 反证三类：缺声明 / 多声明 / evidence 漂移 ⇒ 各必红 → 还原 PASS。
  assert.ok(bidirectionalProblems(DECL_IDS.filter((id) => id !== 'ai-next'), PROVIDER_IDS).length > 0, `${JUDGEMENTS[0].expectFailPattern}：缺声明 ⇒ 必红`);
  assert.ok(bidirectionalProblems([...DECL_IDS, 'ghost-driver'], PROVIDER_IDS).length > 0, `${JUDGEMENTS[0].expectFailPattern}：多声明 ⇒ 必红`);
  const drifted = DECLS.map((d) => (d.driverId === 'ai-next' ? { ...d, evidence: ['telemetry'] } : d));
  assert.ok(evidenceProblems(drifted, SOURCE_READS).length > 0, `${JUDGEMENTS[2].expectFailPattern}：evidence 漂移 ⇒ 必红`);
  assert.deepEqual(bidirectionalProblems(DECL_IDS, PROVIDER_IDS), []);
  assert.deepEqual(evidenceProblems(DECLS, SOURCE_READS), []);
});

test('DQ-4 时机 ↔ 驱动者映射：每时机 ≥1 驱动者；answered 恰由 ref-action 接手', () => {
  assert.deepEqual(timingMappingProblems(DECLS), [], JUDGEMENTS[3].expectFailPattern);
  const answered = DECLS.filter((d) => d.timings.includes('answered')).map((d) => d.driverId);
  assert.deepEqual(answered, ['ref-action'], `${JUDGEMENTS[3].expectFailPattern}：答完之后必须恰有 ref-action 接手`);
  const driver = DECLS.find((d) => d.driverId === 'ref-action');
  assert.equal(driver?.driverClass, 'ai-driven', `${JUDGEMENTS[3].expectFailPattern}：ref-action 必须是 ai-driven`);
});

test('DQ-4 反证：删掉 answered 驱动者 / 悬空 timing / 时机闭集多一行 ⇒ 各 FAIL → 还原 PASS', () => {
  const noAnswered = DECLS.map((d) => (d.driverId === 'ref-action' ? { ...d, timings: d.timings.filter((t) => t !== 'answered') } : d));
  assert.ok(timingMappingProblems(noAnswered).some((p) => p.includes('answered')), `${JUDGEMENTS[3].expectFailPattern}：删 answered 驱动者必须红`);
  const dangling = DECLS.map((d) => (d.driverId === 'onboarding' ? { ...d, timings: [...d.timings, 'ghost'] } : d));
  assert.ok(timingMappingProblems(dangling).some((p) => p.includes('悬空')), `${JUDGEMENTS[3].expectFailPattern}：悬空 timing 必须红`);
  /* I-01（v55-1 review R1）：本行原为 `… === 0 || true` 的**恒真断言**（永远通过，违反 FR-SELF-111
     「反证不空转」）。改为真实断言：本判据只看**时机闭集**，故「多一行」的可红形态 = 闭集多一项
     ⇒ 必判「悬空」。（「驱动者声明表多一行」不由本判据承担 —— 它由 DQ-1 的 `bidirectionalProblems`
     断言 FAIL，见上文「多一行必须红」；这里不再用一条空转断言冒充覆盖。） */
  const extraTiming = timingMappingProblems(DECLS, [...DRIVER_TIMINGS, 'ghost-timing']);
  assert.ok(
    extraTiming.some((p) => p.includes('悬空')),
    `${JUDGEMENTS[3].expectFailPattern}：时机闭集多一行必须红（不得是恒真断言）`,
  );
  assert.ok(extraTiming.length > 0, '时机闭集多一行必须产生 ≥1 条 problem（判据非恒真）');
  assert.deepEqual(timingMappingProblems(DECLS), []);
});

test('DQ-5 七类时刻逐类 ≥1 驱动者（恰 7）', () => {
  assert.equal(PROACTIVE_MOMENTS.length, 7);
  assert.deepEqual(momentCoverageProblems(DECLS), [], JUDGEMENTS[4].expectFailPattern);
});

test('DQ-5 反证：移除某类时刻的全部驱动者 / 时刻集非 7 ⇒ 必红 → 还原 PASS', () => {
  const noTurnEnd = DECLS.map((d) => ({ ...d, moments: d.moments.filter((m) => m !== 'turn-end') }));
  assert.ok(momentCoverageProblems(noTurnEnd).some((p) => p.includes('turn-end')), `${JUDGEMENTS[4].expectFailPattern}：覆盖缺口必须红`);
  assert.ok(momentCoverageProblems(DECLS, ['answered-ask']).length > 0, `${JUDGEMENTS[4].expectFailPattern}：时刻数非 7 必须红`);
  assert.deepEqual(momentCoverageProblems(DECLS), []);
});

test('DQ-6 四张表各恰一处声明', () => {
  assert.deepEqual(singleSourceProblems(FILES), [], JUDGEMENTS[5].expectFailPattern);
});

test('DQ-6 反证：第二声明 ⇒ 必红 → 还原 PASS', () => {
  const forged = [...FILES, { rel: 'src/ui/sidepanel/next-registry/ghost.ts', text: 'export const PROACTIVE_MOMENTS = [] as const;\n' }];
  assert.ok(singleSourceProblems(forged).some((p) => p.includes('PROACTIVE_MOMENTS')), `${JUDGEMENTS[5].expectFailPattern}：第二声明必须红`);
  assert.deepEqual(singleSourceProblems(FILES), []);
});

test('DQ 注册表语义：声明注册 loud（重复 id / 未登记 evidence）+ driversForTiming 从注册抽取', () => {
  resetDriverDecls();
  try {
    for (const d of Object.values(DRIVER_DECLS_SRC)) assert.equal(registerDriverDecl(d).ok, true, `${d.driverId} 必须注册成功`);
    assert.deepEqual([...driversForTiming('answered')], ['ref-action']);
    assert.equal(registerDriverDecl({ ...DRIVER_DECLS_SRC['ref-action'] }).ok, false, '重复 driverId 必须 loud');
    assert.equal(
      registerDriverDecl({ ...DRIVER_DECLS_SRC['ref-action'], driverId: 'ghost', evidence: ['telemetry'] }).ok,
      false,
      '未登记 evidence 必须 loud（EC-SELF-003）',
    );
  } finally {
    resetDriverDecls();
  }
});

test('DQ 元判据：每条 judgement 的 expectFailPattern 非占位', () => {
  assert.equal(JUDGEMENTS.length, 6);
  for (const j of JUDGEMENTS) assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
  for (const c of DRIVER_CLASSES) assert.ok(['deterministic', 'ai-driven'].includes(c));
});
