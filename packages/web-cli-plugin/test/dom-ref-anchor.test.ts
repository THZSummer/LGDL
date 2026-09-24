/**
 * V5.5F-1 **TASK-V55F-121** (ADR-SGO-003 §1/§2/§3/§4/§9 · FR-SGO-030~038 ·
 * AC-SGO-007/022/025 · R-SGO-904) — **`dom --ref` 锚定门禁（node）**.
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   DRA-1 **解析链逐级**：词法 / 互斥 / 序号越界 / 非 `set-text` / 失效引用 ⇒ 逐条可读错误；
 *   DRA-2 **live 单节点闸**：0 命中 / 多命中 / 标记缺失 / 身份不一致 ⇒ 失配；
 *         `nodeCount === 1` 为**唯一**通过条件（AC-SGO-022）；
 *   DRA-3 **`risk` 不放宽**：逐字段对照 base（`risk` / `subcommandRisks` / 子命令集合）；
 *         注入降档 ⇒ **必红**（R-SGO-904）；
 *   DRA-4 **schema 覆写仅增 `ref`** ∧ **零新子命令**（FR-SGO-030 / N-SGO-010）；
 *   DRA-5 **仍交基线 `baseExecutor`**：锚定通过 ⇒ 合成锚选择器 + `ref` 参数被剥离；
 *         失配 ⇒ 基线 executor **不被调用**（fail-closed 非静默）；
 *   DRA-6 **base 零 diff + 判定链零触碰**（`zeroDiffFiles` 9 项）+ `observeIdentity` **同源单实现**。
 *
 * 每条判据都带 `expectFailPattern` 与注入反证（注入 ⇒ 必红 ⇒ 还原 ⇒ PASS）。
 *
 * @module test/dom-ref-anchor
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createDomToolEntry, parseToolArguments, type PlatformEnv, type ToolEntry } from '@lgdl/web-cli-base';
import {
  ANCHOR_ERRORS,
  REF_ANCHOR_SUBCOMMAND,
  anchorSelectorFor,
  resolveRefAnchor,
  wrapDomEntryForAnchor,
} from '../src/tools/dom-anchor.js';
import { refTurnHolder } from '../src/background/ref-turn.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const readSrc = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const SW_REL = 'src/background/service-worker.ts';
const OBSERVE_REL = 'src/background/ref-observe.ts';
const ANCHOR_REL = 'src/tools/dom-anchor.ts';
const BASE_DOM_REL = '../web-cli-base/src/dom-tools.ts';
const V4_LEDGER_REL = 'docs/v4-supersession-ledger.json';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}

export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'DRA-1-parse-chain', expectFailPattern: '`--ref` 解析链必须逐级 fail-closed 且非静默（词法 / 互斥 / 越界 / 非 set-text / 失效）' },
  { id: 'DRA-2-single-node-gate', expectFailPattern: 'live 单节点闸：仅 `nodeCount === 1` 通过；0 / 多命中 / 标记缺失一律失配' },
  { id: 'DRA-3-risk-not-widened', expectFailPattern: '包装层不得放宽 risk / subcommandRisks / 子命令集合（逐字段对照 base）' },
  { id: 'DRA-4-schema-additive', expectFailPattern: 'schema 覆写只能把 `ref` 新增到 `args.properties` 内（顶层不得有 ref / 零新子命令 / required 不动）' },
  { id: 'DRA-5-base-executor-handoff', expectFailPattern: '锚定通过必须交基线 executor（合成锚选择器）；失配时基线 executor 不得被调用' },
  { id: 'DRA-6-base-zero-diff-and-single-observe', expectFailPattern: 'base 零 diff ∧ 判定链零触碰 ∧ `observeIdentity` 同源单实现（禁第二份副本）' },
  { id: 'DRA-7-parse-layer-parity', expectFailPattern: 'LLM 依 schema 发的 JSON 必须经 `parseToolArguments` 回到 `args.ref`（顶层 ref 会被静默丢弃 ⇒ 真机「缺少 --selector」）' },
];

/* ── fixtures ──────────────────────────────────────────────────────────────── */

type Obs = { status: string; refMark?: string; nodeCount?: number } | undefined;

function fakeEnv(onSetText?: (selector: string, text: string) => void): PlatformEnv {
  const ops = {
    async setText(selector: string, text: string) {
      onSetText?.(selector, text);
      return { ok: true, output: `✓ 已写入 ${selector}` };
    },
  };
  return { dom: { ops, state: { snapshot: async () => ({ injected: true }) } } } as unknown as PlatformEnv;
}

function baseEntry(onSetText?: (selector: string, text: string) => void): ToolEntry {
  return createDomToolEntry(fakeEnv(onSetText));
}

/** 注入式解析依赖（不依赖真 `chrome.*`）。 */
function chainDeps(observe: (tabId: number, selector: string) => Promise<Obs> = async () => undefined) {
  return {
    refs: [
      { refNum: 1, refId: 'ref_1', refState: 'valid', selector: '#target' },
      { refNum: 2, refId: 'ref_2', refState: 'invalid', selector: '#stale' },
    ],
    observeTarget: { tabId: 7, observe },
  };
}

const resolvedObs = async (): Promise<Obs> => ({ status: 'resolved', refMark: 'ref_1', nodeCount: 1 });

/* ── DRA-1 解析链逐级 ──────────────────────────────────────────────────────── */

type Resolver = typeof resolveRefAnchor;
type ChainDeps = Parameters<Resolver>[1];

/** 解析链判据本体（注入 resolver ⇒ 反证可打在判据上，不写第二份实现）。 */
export async function parseChainProblems(resolve: Resolver, deps: ChainDeps): Promise<string[]> {
  const p = JUDGEMENTS[0].expectFailPattern;
  const problems: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (got !== want) problems.push(`${p}：${label} 期望 ${JSON.stringify(want)}，实测 ${JSON.stringify(got)}`);
  };
  eq('非 set-text 必须 EC-SGO-017', (await resolve({ subcommand: 'read-element', args: { ref: '1' } }, deps)).error, ANCHOR_ERRORS.onlySetText);
  eq('`--ref` 与 `--selector` 同给必须 EC-SGO-015', (await resolve({ subcommand: 'set-text', args: { ref: '1', selector: '#x', text: 't' } }, deps)).error, ANCHOR_ERRORS.mutualExclusive);
  for (const bad of ['0', '1.5', '-1', '01', 'abc', '1a']) {
    eq(`词法 ${bad}`, (await resolve({ subcommand: 'set-text', args: { ref: bad, text: 't' } }, deps)).error, ANCHOR_ERRORS.lexical);
  }
  eq('序号越界必须 EC-SGO-016', (await resolve({ subcommand: 'set-text', args: { ref: '9', text: 't' } }, deps)).error, ANCHOR_ERRORS.outOfRange);
  eq('失效引用必须 EC-SGO-004', (await resolve({ subcommand: 'set-text', args: { ref: '2', text: 't' } }, deps)).error, ANCHOR_ERRORS.staleRef);
  const good = await resolve({ subcommand: 'set-text', args: { ref: '1', text: 't' } }, deps);
  if (!good.ok || good.selector !== '[data-wcli-ref="ref_1"]' || good.refNum !== 1) {
    problems.push(`${p}：合法输入必须判 ok 且给出合成锚（实测 ${JSON.stringify(good)}）`);
  }
  return problems;
}

test('DRA-1 解析链逐级 fail-closed：非 set-text / 互斥 / 词法 / 越界 / 失效 ⇒ 逐条可读错误', async () => {
  const p = JUDGEMENTS[0].expectFailPattern;
  const deps = chainDeps(resolvedObs);
  const run = (tc: Parameters<Resolver>[0]) => resolveRefAnchor(tc, deps);
  // ① 非 set-text 传 `--ref` ⇒ EC-SGO-017。
  const readCmd = await run({ subcommand: 'read-element', args: { ref: '1' } });
  assert.equal(readCmd.ok, false);
  assert.equal(readCmd.error, ANCHOR_ERRORS.onlySetText, p);
  assert.match(readCmd.error as string, /EC-SGO-017/);
  // ② 与 `--selector` 同给 ⇒ EC-SGO-015（不静默择一）。
  const both = await run({ subcommand: 'set-text', args: { ref: '1', selector: '#x', text: 't' } });
  assert.equal(both.error, ANCHOR_ERRORS.mutualExclusive, p);
  // ③ 词法（0 / 小数 / 负数 / 前导零 / 非数字）。
  for (const bad of ['0', '1.5', '-1', '01', 'abc', '1a']) {
    const r = await run({ subcommand: 'set-text', args: { ref: bad, text: 't' } });
    assert.equal(r.ok, false, `${bad} 必须判词法错误（${p}）`);
    assert.equal(r.error, ANCHOR_ERRORS.lexical);
  }
  // ④ 序号越界 ⇒ EC-SGO-016。
  const oor = await run({ subcommand: 'set-text', args: { ref: '9', text: 't' } });
  assert.equal(oor.error, ANCHOR_ERRORS.outOfRange, p);
  assert.match(oor.error as string, /引用序号/);
  // ⑤ 失效引用 ⇒ EC-SGO-004（不沿用失效引用的选择器）。
  const stale = await run({ subcommand: 'set-text', args: { ref: '2', text: 't' } });
  assert.equal(stale.error, ANCHOR_ERRORS.staleRef, p);
  // ⑥ 合法 ⇒ 合成锚（恰一处铸造的口径）。
  const good = await run({ subcommand: 'set-text', args: { ref: '1', text: 't' } });
  assert.deepEqual(good, { ok: true, selector: '[data-wcli-ref="ref_1"]', refNum: 1 }, p);
  assert.equal(anchorSelectorFor(1), '[data-wcli-ref="ref_1"]');
  assert.equal(REF_ANCHOR_SUBCOMMAND, 'set-text', '本阶段唯一落地 `--ref` 的子命令 = set-text');
  // ── 反证（注入 ⇒ 必红 ⇒ 还原 ⇒ PASS）────────────────────────────────────
  // 注入：伪造一个**漏掉第一级（非 set-text 拦截）**的解析链 —— 复现「读命令也按引用写」的形态。
  const forgedNoGuard: Resolver = async (tc, d) => {
    if (String(tc.args?.ref ?? '').trim().length === 0) return { ok: false, error: '' };
    const n = Number(tc.args.ref);
    const ref = d.refs.find((r) => r.refNum === n);
    if (!ref) return { ok: false, error: ANCHOR_ERRORS.outOfRange };
    return { ok: true, selector: anchorSelectorFor(n), refNum: n };
  };
  const red = await forgedNoGuard({ subcommand: 'read-element', args: { ref: '1' } }, deps);
  assert.notEqual(red.error, ANCHOR_ERRORS.onlySetText, `注入漏级实现 ⇒ 必须能看出它不再拦读命令（${p}）`);
  assert.equal(red.ok, true, '注入实现会让读命令继续成锚 ⇒ 真实现的 EC-SGO-017 拦截是承重的');
  const forgedProblems = await parseChainProblems(forgedNoGuard, deps);
  assert.ok(forgedProblems.some((x) => x.includes('EC-SGO-017')), `注入漏级 ⇒ 判据本体必须红（${p}）`);
  // 还原 ⇒ 真实现逐级拦截（判据不是恒真）。
  assert.equal((await run({ subcommand: 'read-element', args: { ref: '1' } })).error, ANCHOR_ERRORS.onlySetText);
  assert.deepEqual(await parseChainProblems(resolveRefAnchor, deps), []);
});

/* ── DRA-2 live 单节点闸 ───────────────────────────────────────────────────── */

test('DRA-2 live 单节点闸：nodeCount === 1 唯一通过；0 / 多命中 / 标记缺失 / 身份不一致 ⇒ 失配', async () => {
  const p = JUDGEMENTS[1].expectFailPattern;
  const call = (observe: (t: number, s: string) => Promise<Obs>) =>
    resolveRefAnchor({ subcommand: 'set-text', args: { ref: '1', text: 't' } }, chainDeps(observe));
  // 0 命中 ⇒ EC-SGO-001（不回退 --selector）。
  const missing = await call(async () => ({ status: 'missing' }));
  assert.equal(missing.error, ANCHOR_ERRORS.notFound, p);
  assert.match(missing.error as string, /EC-SGO-001/);
  // 多命中 ⇒ EC-SGO-002 + 显式命中数（不按首元素）。
  const amb = await call(async () => ({ status: 'ambiguous', nodeCount: 2 }));
  assert.equal(amb.error, `${ANCHOR_ERRORS.nodeCountMismatch}（实测命中 2 个节点）`, p);
  assert.match(amb.error as string, /不按首元素|不唯一/);
  // 标记缺失（resolved 但 refMark 不等 / 缺）⇒ EC-SGO-003。
  const noMark = await call(async () => ({ status: 'resolved', nodeCount: 1 }));
  assert.equal(noMark.error, ANCHOR_ERRORS.markMissing, p);
  const otherMark = await call(async () => ({ status: 'resolved', nodeCount: 1, refMark: 'ref_9' }));
  assert.equal(otherMark.error, ANCHOR_ERRORS.markMissing, p);
  // 页面侧不可达（观测返回 undefined）⇒ 非静默（不得当作 0 命中的事实）。
  const unreachable = await call(async () => undefined);
  assert.equal(unreachable.error, ANCHOR_ERRORS.markMissing, p);
  // 无 tabId / 无观测缝 ⇒ 无法完成单节点校验 ⇒ fail-closed。
  const noTarget = await resolveRefAnchor({ subcommand: 'set-text', args: { ref: '1', text: 't' } }, { refs: chainDeps().refs, observeTarget: undefined });
  assert.equal(noTarget.ok, false, p);
  // resolved 但 nodeCount !== 1（观测面自相矛盾）⇒ 失配（唯一通过条件被机核）。
  const inconsistent = await call(async () => ({ status: 'resolved', nodeCount: 3, refMark: 'ref_1' }));
  assert.equal(inconsistent.ok, false, p);
  // 唯一通过条件：resolved ∧ nodeCount === 1 ∧ refMark === refId。
  const pass = await call(resolvedObs);
  assert.equal(pass.ok, true, p);
});

/* ── DRA-3 risk 不放宽 ─────────────────────────────────────────────────────── */

/** 逐字段对照：包装层与 base 在 risk 面**必须逐字一致**（R-SGO-904）。 */
export function riskParityProblems(base: ToolEntry, wrapped: ToolEntry): string[] {
  const p = JUDGEMENTS[2].expectFailPattern;
  const problems: string[] = [];
  if (wrapped.risk !== base.risk) problems.push(`${p}：risk ${String(wrapped.risk)} ≠ base ${String(base.risk)}`);
  const b = (base.subcommandRisks ?? {}) as Record<string, string>;
  const w = (wrapped.subcommandRisks ?? {}) as Record<string, string>;
  if (JSON.stringify(Object.keys(b).sort()) !== JSON.stringify(Object.keys(w).sort())) {
    problems.push(`${p}：subcommandRisks 键集与 base 不一致`);
  }
  for (const k of Object.keys(b)) if (w[k] !== b[k]) problems.push(`${p}：${k} 档 ${String(w[k])} ≠ base ${String(b[k])}`);
  if (wrapped.name !== base.name) problems.push(`${p}：name 不得改写`);
  return problems;
}

test('DRA-3 risk 不放宽：逐字段对照 base（含注入降档 ⇒ 必红 ⇒ 还原 PASS）', () => {
  const base = baseEntry();
  const wrapped = wrapDomEntryForAnchor(base, fakeEnv());
  assert.deepEqual(riskParityProblems(base, wrapped), [], JUDGEMENTS[2].expectFailPattern);
  assert.equal(wrapped.risk, 'ui', 'entry.risk 与 base 逐字一致');
  assert.equal((wrapped.subcommandRisks as Record<string, string>)['set-text'], 'write', 'set-text 仍 write（缺省 ask）');
  // 反证（R-SGO-904 的原始缺陷形态）：把 `--ref` 路径的 risk 降档 ⇒ 必红。
  const lowered = { ...wrapped, risk: 'read' as const };
  assert.ok(riskParityProblems(base, lowered).some((x) => x.includes('risk')), 'risk 降档必须判红');
  const widened = {
    ...wrapped,
    subcommandRisks: { ...(wrapped.subcommandRisks as Record<string, 'read'>), 'set-text': 'read' },
  } as unknown as ToolEntry;
  assert.ok(riskParityProblems(base, widened).some((x) => x.includes('set-text')), 'set-text 降档必须判红');
  const extraSub = {
    ...wrapped,
    subcommandRisks: { ...(wrapped.subcommandRisks as Record<string, 'write'>), 'ref-write': 'write' },
  } as unknown as ToolEntry;
  assert.ok(riskParityProblems(base, extraSub).length > 0, '新增子命令档位必须判红');
  // 还原 ⇒ 全绿（判据不是恒真）。
  assert.deepEqual(riskParityProblems(base, wrapDomEntryForAnchor(baseEntry(), fakeEnv())), []);
  // 真源切片：本模块**不得出现** `risk:` / `subcommandRisks:` 字面量（不放宽的结构性证据）。
  const src = readSrc(ANCHOR_REL);
  assert.equal(/^\s*(risk|subcommandRisks)\s*:/m.test(src), false, '`dom-anchor.ts` 不得声明 risk / subcommandRisks');
});

/* ── DRA-4 schema 覆写仅增 ref（且必须嵌套在 args 内） ─────────────────────── */

/** 顶层 `properties`（`subcommand` / `args` 所在层）。 */
function topPropsOf(entry: ToolEntry): Record<string, unknown> {
  return (entry.schema.parameters as { properties?: Record<string, unknown> }).properties ?? {};
}

/** `args` 子 schema 的 `properties`（缺省空对象）。 */
function argPropsOf(entry: ToolEntry): Record<string, unknown> {
  const args = (topPropsOf(entry).args ?? {}) as { properties?: Record<string, unknown> };
  return args.properties ?? {};
}

test('DRA-4 schema 覆写只把 `ref` 新增到 `args.properties`（顶层不得有 ref / 零新子命令 / required 不动）', () => {
  const p = JUDGEMENTS[3].expectFailPattern;
  const base = baseEntry();
  const wrapped = wrapDomEntryForAnchor(base, fakeEnv());
  const bp = base.schema.parameters as { properties: Record<string, unknown>; required?: string[] };
  const wp = wrapped.schema.parameters as { properties: Record<string, unknown>; required?: string[] };
  // ① 顶层键集必须与 base 逐字一致 —— `ref` 不得出现在顶层（R7 真机失效根因）。
  const addedTop = Object.keys(wp.properties).filter((k) => !(k in bp.properties));
  const removedTop = Object.keys(bp.properties).filter((k) => !(k in wp.properties));
  assert.deepEqual(addedTop, [], `${p}：顶层不得新增参数（ref 必须嵌套在 args 内）`);
  assert.deepEqual(removedTop, [], `${p}：不得移除顶层参数`);
  assert.equal('ref' in wp.properties, false, `${p}：顶层不得出现 ref`);
  // ② `ref` 必须在 `args.properties` 内，与 selector / text 同级。
  const baseArgs = argPropsOf(base);
  const wrappedArgs = argPropsOf(wrapped);
  const addedArgs = Object.keys(wrappedArgs).filter((k) => !(k in baseArgs));
  const removedArgs = Object.keys(baseArgs).filter((k) => !(k in wrappedArgs));
  assert.deepEqual(addedArgs, ['ref'], `${p}：args.properties 只允许新增 ref（实测 ${JSON.stringify(addedArgs)}）`);
  assert.deepEqual(removedArgs, [], `${p}：args 既有参数不得移除`);
  assert.equal('selector' in wrappedArgs && 'text' in wrappedArgs, true, `${p}：ref 必须与 selector/text 同级`);
  assert.deepEqual(wp.required, bp.required, `${p}：required 必须逐字不动`);
  const enumOf = (t: ToolEntry) =>
    (t.schema.parameters as { properties: { subcommand: { enum: string[] } } }).properties.subcommand.enum;
  assert.deepEqual(enumOf(wrapped), enumOf(base), `${p}：子命令集合必须逐字不动（零新子命令）`);
  assert.equal(enumOf(wrapped).includes('ref'), false, '`--ref` 不得成为子命令');
  assert.equal(typeof (wrappedArgs.ref as { description?: string }).description, 'string');
  assert.ok((wrappedArgs.ref as { description: string }).description.includes('set-text'), 'ref 参数说明必须写明仅 set-text 生效');
  // ③ 反证：顶层多增一个参数 ⇒ 必红（R7 原始缺陷形态必须能被判据检出）。
  const forgedTop = {
    ...wrapped,
    schema: { ...wrapped.schema, parameters: { ...wp, properties: { ...wp.properties, ghost: { type: 'string' } } } },
  };
  const forgedTopAdded = Object.keys(topPropsOf(forgedTop)).filter((k) => !(k in bp.properties));
  assert.deepEqual(forgedTopAdded, ['ghost'], '顶层新增参数必须能被判据检出（否则 R7 形态会漏网）');
  // ④ 反证：args 内多增一个参数 ⇒ 必红（判据不是「凡新增皆过」）。
  const forgedArgs = {
    ...wrapped,
    schema: {
      ...wrapped.schema,
      parameters: {
        ...wp,
        properties: {
          ...wp.properties,
          args: { type: 'object', properties: { ...wrappedArgs, ghost: { type: 'string' } } },
        },
      },
    },
  };
  const forgedArgsAdded = Object.keys(argPropsOf(forgedArgs)).filter((k) => !(k in baseArgs));
  assert.notDeepEqual(forgedArgsAdded, ['ref'], 'args 内多增一个参数必须能被判据检出');
});

/* ── DRA-5 交基线 executor ─────────────────────────────────────────────────── */

test('DRA-5 锚定通过 ⇒ 交基线 executor（合成锚 + ref 剥离）；失配 ⇒ 基线 executor 不执行', async () => {
  const p = JUDGEMENTS[4].expectFailPattern;
  const seen: Array<[string, string]> = [];
  const wrapped = wrapDomEntryForAnchor(baseEntry((s, t) => seen.push([s, t])), fakeEnv());
  // 无回合（holder 空）⇒ 越界（基线 executor 不得被调用）。
  refTurnHolder.clear();
  const noTurn = await wrapped.executor({ subcommand: 'set-text', args: { ref: '1', text: '你好' } }, {});
  assert.equal(noTurn.ok, false, p);
  assert.equal(seen.length, 0, '未锚定 ⇒ 基线 executor 不得被调用（fail-closed 非静默）');
  // 有回合 + 单节点 ⇒ 基线 executor 收到**合成锚**且 args 内不再有 ref。
  refTurnHolder.set({
    refs: [{ refNum: 1, refId: 'ref_1', selector: '#target', refMark: 'ref_1', textDigest: 'd', refState: 'valid' }],
    tabId: 7,
    observe: async () => ({ status: 'resolved', refMark: 'ref_1', nodeCount: 1 }),
  });
  const ok = await wrapped.executor({ subcommand: 'set-text', args: { ref: '1', text: '你好' } }, {});
  assert.equal(ok.ok, true, `${p}：锚定通过必须交基线 executor`);
  assert.deepEqual(seen, [['[data-wcli-ref="ref_1"]', '你好']], `${p}：写入目标必须是合成锚（不是 --selector / 不是首元素）`);
  // 多命中 ⇒ 拦截，且基线 executor 未被调用第二次。
  refTurnHolder.set({
    refs: [{ refNum: 1, refId: 'ref_1', selector: '#target', refMark: 'ref_1', textDigest: 'd', refState: 'valid' }],
    tabId: 7,
    observe: async () => ({ status: 'ambiguous', nodeCount: 2 }),
  });
  const amb = await wrapped.executor({ subcommand: 'set-text', args: { ref: '1', text: 'x' } }, {});
  assert.equal(amb.ok, false);
  assert.equal(seen.length, 1, '失配 ⇒ 基线 executor 不得被调用');
  // 不给 `--ref` ⇒ 既有路径逐字不变（直接交基线 executor）。
  const plain = await wrapped.executor({ subcommand: 'set-text', args: { selector: '#plain', text: 'y' } }, {});
  assert.equal(plain.ok, true, '无 --ref ⇒ 既有行为逐字不变');
  assert.deepEqual(seen[1], ['#plain', 'y']);
  refTurnHolder.clear();
  // 反证：把「失配即 return」改成「静默回退 --selector」⇒ 会写出到错误目标（判据承重）。
  const silentFallback = await wrapped.executor({ subcommand: 'set-text', args: { ref: '1', selector: '#fallback', text: 'z' } }, {});
  assert.equal(silentFallback.ok, false, '互斥（EC-SGO-015）不得静默择一 ⇒ 不产生第三次写入');
  assert.equal(seen.length, 2);
});

/* ── DRA-7 解析层回归（R7 真机路径） ───────────────────────────────────────── */

/**
 * 依 **schema** 合成 LLM 会发出的 arguments JSON —— 模拟真机：模型按声明的
 * `parameters.properties` 决定 `ref` 放**顶层**还是放进 `args`。这正是原门禁绕过的一层：
 * 手工构 `tc` 直调 executor 跳过了 `parseToolArguments`（base `llm.ts` 只读
 * `subcommand`/`args`，未知顶层键静默丢弃）。
 */
function llmArgsJson(entry: ToolEntry, subcommand: string, args: Record<string, string>): string {
  const argsKeys = new Set(Object.keys(argPropsOf(entry)));
  const top: Record<string, unknown> = { subcommand };
  const inner: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    if (argsKeys.has(k)) inner[k] = v;
    else top[k] = v;
  }
  top.args = inner;
  return JSON.stringify(top);
}

test('DRA-7 解析层回归：LLM 依 schema 发的 JSON 经 `parseToolArguments` 后仍能锚定（真机路径）', async () => {
  const p = JUDGEMENTS[6].expectFailPattern;
  const seen: Array<[string, string]> = [];
  const base = baseEntry();
  const wrapped = wrapDomEntryForAnchor(baseEntry((s, t) => seen.push([s, t])), fakeEnv());
  refTurnHolder.set({
    refs: [{ refNum: 1, refId: 'ref_1', selector: '#target', refMark: 'ref_1', textDigest: 'd', refState: 'valid' }],
    tabId: 7,
    observe: async () => ({ status: 'resolved', refMark: 'ref_1', nodeCount: 1 }),
  });
  // 真机形态：`ref` 依 schema 落在 `args.properties`
  // ⇒ JSON = {"subcommand":"set-text","args":{"ref":"1","text":"…"}}。
  const raw = llmArgsJson(wrapped, 'set-text', { ref: '1', text: '你好' });
  assert.equal(
    raw,
    JSON.stringify({ subcommand: 'set-text', args: { ref: '1', text: '你好' } }),
    `${p}：schema 必须把 ref 声明在 args 内，模型才会把它放进 args`,
  );
  const tc = parseToolArguments('call-1', 'dom', raw);
  assert.equal(tc.subcommand, 'set-text');
  assert.equal(tc.args.ref, '1', `${p}：解析层必须保留 args.ref（否则回退基线 ⇒ 缺少 --selector）`);
  assert.equal(tc.args.text, '你好');
  const res = await wrapped.executor(tc, {});
  assert.equal(res.ok, true, `${p}：真机路径必须锚定成功`);
  assert.deepEqual(seen, [['[data-wcli-ref="ref_1"]', '你好']], `${p}：写入目标必须是合成锚`);
  // ── 注入反证：把 `ref` 放回**顶层**（R7 原始缺陷形态）⇒ 该用例必红 ──────────
  // 从 **base** 顶层重建（其 `args.properties` 无 ref）再把 ref 挂到顶层。
  const reverted: ToolEntry = {
    ...wrapped,
    schema: {
      ...wrapped.schema,
      parameters: {
        ...(wrapped.schema.parameters as Record<string, unknown>),
        properties: { ...topPropsOf(base), ref: { type: 'string', description: '顶层 ref（R7 缺陷形态）' } },
      },
    },
  };
  const buggyRaw = llmArgsJson(reverted, 'set-text', { ref: '1', text: '你好' });
  assert.equal(
    buggyRaw,
    JSON.stringify({ subcommand: 'set-text', ref: '1', args: { text: '你好' } }),
    '注入形态必须复现「顶层 ref」',
  );
  const buggyTc = parseToolArguments('call-2', 'dom', buggyRaw);
  assert.equal(buggyTc.args.ref, undefined, `${p}：顶层 ref 被解析层静默丢弃（base 只读 subcommand/args）`);
  const buggyRes = await reverted.executor(buggyTc, {});
  assert.equal(buggyRes.ok, false, `${p}：回退顶层嵌套 ⇒ 该用例必红`);
  assert.match(String(buggyRes.error ?? buggyRes.output ?? ''), /缺少 --selector/, `${p}：真机逐字失败信息 = 缺少 --selector`);
  assert.equal(seen.length, 1, '反证路径不得产生第二次写入');
  refTurnHolder.clear();
});

/* ── DRA-6 base 零 diff + 同源单实现 ───────────────────────────────────────── */

test('DRA-6 base 零 diff（schema 无 ref）∧ 判定链零触碰 ∧ observeIdentity 同源单实现', () => {
  const p = JUDGEMENTS[5].expectFailPattern;
  // ① base `dom` schema 零 `ref` 参数（`--ref` 只能由 plugin 侧包装提供）。
  const base = baseEntry();
  const baseProps = (base.schema.parameters as { properties: Record<string, unknown> }).properties;
  assert.equal('ref' in baseProps, false, `${p}：base schema 不得有 ref（否则不是 plugin 侧包装）`);
  const baseSrc = readSrc(BASE_DOM_REL);
  assert.equal(/wrapDomEntryForAnchor/.test(baseSrc), false, '包装层不得进 base');
  // ② `observeIdentity` **恰一处**实现 + 两处同源 import（第二副本 ⇒ FAIL）。
  const sw = readSrc(SW_REL);
  const observe = readSrc(OBSERVE_REL);
  const anchor = readSrc(ANCHOR_REL);
  assert.equal((observe.match(/export async function observeIdentity\(/g) ?? []).length, 1, '单实现必须恰一处');
  assert.equal((sw.match(/function observeIdentity\(/g) ?? []).length, 0, `${p}：SW 不得保留第二份副本`);
  assert.match(sw, /from '\.\/ref-observe\.js'/, 'SW 必须同源 import');
  assert.match(anchor, /from '\.\.\/background\/ref-observe\.js'/, '包装层必须同源 import');
  assert.equal(/function observeIdentity\(/.test(anchor), false, `${p}：包装层不得自实现观测`);
  // ③ 判定链零触碰（`zeroDiffFiles` 9 项含 policy / auto-authorize；本模块零 import）。
  const ledger = JSON.parse(readSrc(V4_LEDGER_REL)) as { zeroDiffFiles: string[] };
  assert.equal(ledger.zeroDiffFiles.length, 9, `${p}：判定链不动面必须恰 9 项`);
  for (const f of ['src/security/policy.ts', 'src/security/auto-authorize.ts']) {
    assert.ok(ledger.zeroDiffFiles.some((z) => z.endsWith(f)), `${p}：${f} 必须在 zeroDiffFiles 内`);
  }
  assert.equal(
    /from\s+'[^']*security\/(policy|auto-authorize)/.test(anchor),
    false,
    `${p}：包装层不得 import 判定链（零触碰）`,
  );
  // ④ 反证：给 SW 注入第二份副本 ⇒ 同一条判据必红。
  const dup = `${sw}\nasync function observeIdentity() { return undefined; }\n`;
  assert.equal((dup.match(/function observeIdentity\(/g) ?? []).length, 1, '注入第二副本必须能被计数判据检出');
});

test('DRA 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 6, '本门禁判据下界 ≥6');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
  }
});
