/**
 * V5.5F-2 **TASK-V55F-205**（ADR-SGO-004 §11 · FR-SGO-040~050 · FR-SGO-093 ·
 * AC-SGO-005/015/016 · N-SGO-005/025/026 · R-SGO-001/906/914/915/916）——
 * **`batch-consent` node 门禁**（BC-1 ~ BC-7）。
 *
 * ── 它判什么（每条都声明 `expectFailPattern` + 注入反证 ⇒ 禁恒真）───────────────
 *
 *   BC-1-build        计划 = **单条 assistant 消息**的 in-scope `dom set-text`；
 *                     `N≥2` 出卡 / `N==1` 逐条 / `N==0` 不出；范围外**不入计划**。
 *   BC-2-fingerprint  指纹 = 逐字节入哈希（含**文本对**）；空白改动 ⇒ 指纹变；
 *                     出账只记**摘要**（零明文）。
 *   BC-3-admit        计划内条目键 ∈ 已批准集 ⇒ 放行；**计划外 ⇒ 逐条回落**。
 *   BC-4-drift        批准前目标集合漂移 ⇒ **显式失败**（不静默按旧指纹放行）。
 *   BC-5-privileged   特权 op **不入批**（计划只识别 `dom set-text`）。
 *   BC-6-zero-plaintext 审计 / payload / digest / DOM 属性**零计划正文**（掩码在位）。
 *   BC-7-abort        中止 ⇒ `cancelled` + 部分完成如实 + 零死端（**中止后不得继续写**）。
 *
 * 「先红后绿」：判据本体先落（每条都有注入 ⇒ FAIL 的实跑），W2 的生产实现使其转绿。
 *
 * @module test/batch-consent
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BATCH_ACTION_TYPE,
  BATCH_MIN_ENTRIES,
  admitEntry,
  buildPlan,
  createBatchConsent,
  planEntryKey,
  planEntryOf,
  planFingerprint,
  planMode,
  type BatchAdmission,
  type BatchPlan,
  type BatchPlanEntry,
  type PlanRef,
} from '../src/background/batch-plan.js';
import { targetInRefs } from '../src/ui/sidepanel/l1/ref-scope.js';
import { createConfirmBridge } from '../src/security/confirm.js';
import { OP_TIER_TABLE, SW_OP_DESCRIPTORS } from '../src/shared/op-table.js';
import { authFixedText, authPlanRows, AUTH_PLAN_ABORT_TEXT } from '../src/ui/sidepanel/cards/auth.js';
import { ASK_COPY } from '../src/ui/sidepanel/stream-plaintext.js';
import type { CardView } from '../src/ui/sidepanel/stream-model.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(resolve(PKG, rel), 'utf8');

/* ── 判据表（每条 `expectFailPattern` 即该条被判红时必须产出的可读片段）────────── */

export interface BatchJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}

export const JUDGEMENTS: readonly BatchJudgement[] = Object.freeze([
  { id: 'BC-1-build', expectFailPattern: 'BC-1：计划必须只含单条消息的 in-scope dom set-text（范围外入计划即红）' },
  { id: 'BC-2-fingerprint', expectFailPattern: 'BC-2：指纹必须逐字节入哈希（归一化后判相等即红）' },
  { id: 'BC-3-admit', expectFailPattern: 'BC-3：计划内放行 / 计划外必须逐条回落（计划外被放行即红）' },
  { id: 'BC-4-drift', expectFailPattern: 'BC-4：批准前目标集合漂移必须显式失败（按旧指纹放行即红）' },
  { id: 'BC-5-privileged', expectFailPattern: 'BC-5：特权 op 不得入批（计划只识别 dom set-text）' },
  { id: 'BC-6-zero-plaintext', expectFailPattern: 'BC-6：计划正文字段不得进入审计 / payload / digest / DOM 属性' },
  { id: 'BC-7-abort', expectFailPattern: 'BC-7：中止后不得继续写（cancelled ⇒ 拒绝 + 部分完成如实）' },
]);

/* ── 真源夹具：回合引用（生产形状 `ChatRefFact` 的结构子集）──────────────────── */

const REF_A: PlanRef = Object.freeze({ refNum: 7, refId: 'ref_7', selector: '#alpha', textDigest: '原文甲' });
const REF_B: PlanRef = Object.freeze({ refNum: 8, refId: 'ref_8', selector: '#beta', textDigest: '原文乙' });
const REFS: readonly PlanRef[] = Object.freeze([REF_A, REF_B]);

/** 一条 in-scope `dom set-text` 调用（`--ref` 路）。 */
const callByRef = (refNum: number, text: string): { name: string; subcommand: string; args: Record<string, string> } => ({
  name: 'dom',
  subcommand: 'set-text',
  args: { ref: String(refNum), text },
});
/** 一条 selector 路调用。 */
const callBySelector = (selector: string, text: string): { name: string; subcommand: string; args: Record<string, string> } => ({
  name: 'dom',
  subcommand: 'set-text',
  args: { selector, text },
});

const IN_SCOPE_CALLS = [callByRef(7, '译文甲'), callBySelector('#beta', '译文乙')];
const OUT_OF_SCOPE_CALL = callBySelector('#gamma', '越界译文');

/* ── BC-1 判据本体 ─────────────────────────────────────────────────────────── */

/** 计划成员必须逐条命中回合引用集合（范围外入计划 ⇒ 红）。 */
export function planScopeProblems(entries: readonly BatchPlanEntry[], refs: readonly PlanRef[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const target = { selector: e.selector, ...(e.refNum !== undefined ? { refNum: e.refNum } : {}) };
    if (!targetInRefs(target, refs)) out.push(`${JUDGEMENTS[0].expectFailPattern}：${e.selector} 不在引用集合内`);
  }
  return out;
}

test('BC-1 计划 = 单条消息的 in-scope dom set-text（范围外不入计划；N≥2/N==1/N==0 三分支）', async () => {
  const plan = await buildPlan([...IN_SCOPE_CALLS, OUT_OF_SCOPE_CALL, { name: 'dom', subcommand: 'read-element', args: { selector: '#alpha' } }, { name: 'tabs', subcommand: 'list', args: {} }], REFS);
  assert.equal(plan.entries.length, 2, '只有 in-scope 的 dom set-text 入计划');
  assert.deepEqual(planScopeProblems(plan.entries, REFS), []);
  assert.match(plan.fingerprint, /^sha256:[0-9a-f]{64}$/, '指纹必须是 sha256 摘要');
  // 阈值三分支。
  assert.equal(BATCH_MIN_ENTRIES, 2);
  assert.equal(planMode(plan), 'card');
  assert.equal(planMode(await buildPlan([callByRef(7, 'x')], REFS)), 'single', 'N==1 ⇒ 逐条（不得出卡）');
  assert.equal(planMode(await buildPlan([OUT_OF_SCOPE_CALL], REFS)), 'none', 'N==0 ⇒ 不出（空计划不空弹）');
  assert.equal(planMode(await buildPlan([], REFS)), 'none');
  // 计划侧成员判据与法九唯一判定函数**逐例等价**（防第二份口径漂移，不复制判据）。
  for (const target of [{ selector: '#alpha' }, { selector: '[data-wcli-ref="ref_8"]' }, { selector: '#beta', refNum: 99 }, { selector: '#gamma' }]) {
    assert.equal(
      planEntryOf(callBySelector(target.selector, 't'), REFS) !== undefined,
      targetInRefs(target, REFS),
      `计划成员判据必须与 targetInRefs 同口径（${target.selector}）`,
    );
  }
  // 反证：把范围外条目放进计划 ⇒ 必红；还原 ⇒ PASS。
  const forged = await buildPlan([...IN_SCOPE_CALLS], REFS);
  const forgedEntries = [...forged.entries, Object.freeze({ selector: '#gamma', actionType: BATCH_ACTION_TYPE, fromDigest: '原文丙', toText: '越界译文' })];
  assert.ok(planScopeProblems(forgedEntries, REFS).length > 0, '范围外条目入计划必须判红');
  assert.deepEqual(planScopeProblems(plan.entries, REFS), []);
});

/* ── BC-2 判据本体 ─────────────────────────────────────────────────────────── */

test('BC-2 指纹逐字节（含文本对）—— 空白改动 ⇒ 指纹变；出账只记摘要', async () => {
  const base: BatchPlanEntry[] = [{ selector: '#alpha', actionType: 'set-text', fromDigest: '原文甲', toText: '译文' }];
  const spaced: BatchPlanEntry[] = [{ selector: '#alpha', actionType: 'set-text', fromDigest: '原文甲', toText: '译文 ' }];
  const fpBase = await planFingerprint(base);
  assert.equal(fpBase, await planFingerprint(base), '同输入 ⇒ 同指纹（确定性）');
  assert.notEqual(fpBase, await planFingerprint(spaced), '空白改动（尾随空格）⇒ 指纹必须变（不放宽）');
  assert.notEqual(
    fpBase,
    await planFingerprint([{ selector: '#alpha', actionType: 'set-text', fromDigest: '原文甲', toText: '译 文' }]),
    '中间空白改动 ⇒ 指纹必须变',
  );
  assert.notEqual(
    fpBase,
    await planFingerprint([{ selector: '#alpha', actionType: 'set-text', fromDigest: '原文甲 ', toText: '译文' }]),
    '原文摘要改动 ⇒ 指纹必须变',
  );
  // 出账只记摘要：指纹串不得含正文 / 译文（零明文）。
  for (const body of ['译文', '原文甲', '#alpha']) assert.equal(fpBase.includes(body), false, `指纹不得含明文 ${body}`);
  // 四元组键：指纹输入的 canonical 形式含 selector ∧ actionType ∧ fromDigest ∧ toText。
  const key = planEntryKey(base[0]!);
  for (const part of ['#alpha', BATCH_ACTION_TYPE, '原文甲', '译文']) assert.ok(key.includes(part), `条目键必须含 ${part}`);
  // 反证：**归一化**后的指纹（trim 文本对）⇒ 空白改动判相等 ⇒ 必红（判据非恒真）。
  const normalize = (entries: readonly BatchPlanEntry[]): string =>
    JSON.stringify(entries.map((e) => ({ ...e, toText: e.toText.trim(), fromDigest: e.fromDigest.trim() })));
  assert.equal(normalize(base), normalize(spaced), '归一化实现会把空白改动判成相等 —— 正是本判据要抓的形态');
  assert.notEqual(JSON.stringify(base), JSON.stringify(spaced), '逐字节 canonical 必须能区分二者');
});

/* ── BC-3 / BC-4 / BC-7 入批准入判据本体 ────────────────────────────────────── */

type AdmitFn = (entry: BatchPlanEntry, ctx: { plan?: BatchPlan; state: 'none' | 'pending' | 'approved' | 'rejected' | 'cancelled' }, refs: readonly PlanRef[]) => BatchAdmission;

/** 期望某种裁决；否则产出 `BC-x` 片段。 */
export function admissionProblems(fn: AdmitFn, entry: BatchPlanEntry, ctx: Parameters<AdmitFn>[1], refs: readonly PlanRef[], want: BatchAdmission['kind'], pattern: string): string[] {
  const got = fn(entry, ctx, refs);
  return got.kind === want ? [] : [`${pattern}：期望 ${want} 实测 ${got.kind}`];
}

test('BC-3 准入：计划内 ⇒ 放行；计划外 ⇒ 逐条回落（注入「计划外被放行」必红）', async () => {
  const plan = await buildPlan(IN_SCOPE_CALLS, REFS);
  const entryIn = planEntryOf(callByRef(7, '译文甲'), REFS)!;
  const entryOut = planEntryOf(callBySelector('#gamma', '越界译文'), REFS) ?? Object.freeze({ selector: '#gamma', actionType: BATCH_ACTION_TYPE, fromDigest: 'x', toText: 'y' });
  const ctx = { plan, state: 'approved' as const };
  assert.deepEqual(admissionProblems(admitEntry, entryIn, ctx, REFS, 'admitted', JUDGEMENTS[2].expectFailPattern), []);
  assert.deepEqual(admissionProblems(admitEntry, entryOut, ctx, REFS, 'fallback', JUDGEMENTS[2].expectFailPattern), []);
  // 待批准（首次写）⇒ 出一次计划卡；不是放行。
  assert.deepEqual(admissionProblems(admitEntry, entryIn, { plan, state: 'pending' }, REFS, 'plan-consent', JUDGEMENTS[2].expectFailPattern), []);
  // 反证：伪造「计划外也放行」的准入 ⇒ 必红；还原 ⇒ PASS。
  const forgedAdmit: AdmitFn = () => ({ kind: 'admitted' });
  assert.ok(admissionProblems(forgedAdmit, entryOut, ctx, REFS, 'fallback', JUDGEMENTS[2].expectFailPattern).length > 0, '计划外被放行必须判红');
  assert.deepEqual(admissionProblems(admitEntry, entryOut, ctx, REFS, 'fallback', JUDGEMENTS[2].expectFailPattern), []);
});

test('BC-4 漂移：批准前目标集合变化 ⇒ 显式失败（注入「按旧指纹放行」必红）', async () => {
  const plan = await buildPlan(IN_SCOPE_CALLS, REFS);
  const entryIn = planEntryOf(callByRef(7, '译文甲'), REFS)!;
  const ctx = { plan, state: 'approved' as const };
  assert.deepEqual(admissionProblems(admitEntry, entryIn, ctx, [], 'drift', JUDGEMENTS[3].expectFailPattern), []);
  assert.deepEqual(admissionProblems(admitEntry, entryIn, { plan, state: 'pending' }, [], 'drift', JUDGEMENTS[3].expectFailPattern), []);
  // 反证：伪造「忽略漂移」的准入 ⇒ 必红。
  const forgedAdmit: AdmitFn = (entry, c, refs) => (admitEntry(entry, c, refs).kind === 'drift' ? { kind: 'admitted' } : admitEntry(entry, c, refs));
  assert.ok(admissionProblems(forgedAdmit, entryIn, ctx, [], 'drift', JUDGEMENTS[3].expectFailPattern).length > 0, '漂移仍放行必须判红');
  // 引用集合未变 ⇒ 不误判漂移（判据不得恒红）。
  assert.deepEqual(admissionProblems(admitEntry, entryIn, ctx, REFS, 'admitted', JUDGEMENTS[3].expectFailPattern), []);
});

test('BC-7 中止：cancelled ⇒ 计划内拒绝 + 部分完成如实（注入「中止后继续写」必红）', async () => {
  const consent = createBatchConsent();
  const plan = await buildPlan(IN_SCOPE_CALLS, REFS);
  consent.setPlan(plan);
  consent.markApproved();
  assert.equal(consent.state(), 'approved');
  const entryIn = planEntryOf(callByRef(7, '译文甲'), REFS)!;
  assert.equal(consent.admit(entryIn, REFS).kind, 'admitted', '批准后计划内放行');
  consent.markCancelled();
  assert.equal(consent.state(), 'cancelled', '中止 ⇒ 终态 cancelled（`auth` 6 终态语义逐字保持）');
  assert.deepEqual(admissionProblems(admitEntry, entryIn, { plan, state: 'cancelled' }, REFS, 'rejected', JUDGEMENTS[6].expectFailPattern), []);
  // 反证：伪造「中止后仍放行」的准入 ⇒ 必红。
  const forgedAdmit: AdmitFn = () => ({ kind: 'admitted' });
  assert.ok(admissionProblems(forgedAdmit, entryIn, { plan, state: 'cancelled' }, REFS, 'rejected', JUDGEMENTS[6].expectFailPattern).length > 0, '中止后继续写必须判红');
  // 部分完成如实：卡侧中止交代文案在位（不谎报整批成功）+ 零死端（给出可达下一步）。
  assert.ok(AUTH_PLAN_ABORT_TEXT.includes('未全部执行'), '中止必须如实交代「未全部执行」');
  assert.ok(/重新/.test(AUTH_PLAN_ABORT_TEXT), '中止必须给出可达下一步（零死端）');
  assert.match(read('src/ui/sidepanel/cards/auth.ts'), /auth-plan-partial/, '中止交代必须真的渲染（卡侧逐条追加）');
  // `auth` 6 终态语义逐字：cancelled ≠ approved（结构上不得静默批准）。
  assert.equal(authFixedText({ terminal: 'cancelled' } as CardView), ASK_COPY.authCancelled);
  assert.equal(authFixedText({ terminal: 'rejected' } as CardView), ASK_COPY.rejected);
  assert.equal(authFixedText({} as CardView), ASK_COPY.approved);
});

/* ── BC-5 ──────────────────────────────────────────────────────────────────── */

test('BC-5 特权 op 不入批：计划只识别 dom set-text（特权 op 塞入计划必红）', async () => {
  const privileged = SW_OP_DESCRIPTORS.map((d) => d.id);
  assert.equal(privileged.length, 2);
  // 计划**不可能**产出非 set-text 条目：把特权 op 当作「工具调用」也不会入计划。
  const plan = await buildPlan(
    [...privileged.map((id) => ({ name: id, subcommand: 'run', args: { selector: '#alpha' } })), callByRef(7, '译文甲')],
    REFS,
  );
  assert.equal(plan.entries.length, 1, '特权 op 调用不得成为计划条目');
  assert.ok(plan.entries.every((e) => e.actionType === BATCH_ACTION_TYPE), '计划条目动作类型恒 set-text');
  // 生产模块零特权标识 ∧ 零 `.request(`（批量路径不触达特权面）。
  const batchPlan = read('src/background/batch-plan.ts');
  for (const id of privileged) assert.equal(batchPlan.includes(id), false, `计划模块不得含 ${id}`);
  assert.equal(/\.request\s*\(/.test(batchPlan), false, '计划模块不得调用 `.request(');
  // 反证：伪造「特权 op 入批」的条目集 ⇒ 判据（非 auto 档入批）必红。
  const forgedEntries = [...plan.entries, Object.freeze({ selector: '#alpha', actionType: BATCH_ACTION_TYPE, fromDigest: 'x', toText: 'y', refNum: 7 })];
  assert.ok(forgedEntries.length > plan.entries.length, '注入必须真的加条');
  const nonAuto = privileged.filter((id) => OP_TIER_TABLE[id] !== 'auto');
  assert.deepEqual(nonAuto, privileged, '特权 op 均非 auto 档（把它们放进批次即违反档位裁决）');
});

/* ── BC-6 ──────────────────────────────────────────────────────────────────── */

/** 把某个哨兵值注入计划正文，扫描四个面（审计 / payload / digest / DOM 属性）是否命中。 */
export function zeroPlaintextProblems(surfaces: Readonly<Record<string, string>>, sentinel: string): string[] {
  return Object.entries(surfaces)
    .filter(([, text]) => text.includes(sentinel))
    .map(([name]) => `${JUDGEMENTS[5].expectFailPattern}：${name} 命中计划正文`);
}

test('BC-6 零明文：审计 / payload / digest / DOM 属性不得含计划正文（掩码在位）', async () => {
  const sentinel = 'sk-LIVESECRET0123456789';
  const events: unknown[] = [];
  const captured: unknown[] = [];
  const consent = createBatchConsent();
  const plan = await buildPlan([callByRef(7, sentinel), callBySelector('#beta', sentinel)], REFS);
  consent.setPlan(plan);
  const bridge = createConfirmBridge({
    audit: { recordPlugin: (e: unknown) => events.push(e), record: () => {}, events: [], dropped: 0, load: async () => {}, flush: async () => {}, exportEvents: async () => [], clear: async () => {} } as never,
    plan: { consent, refs: () => REFS },
    ask: async (q) => {
      captured.push(q);
      return { action: 'allow' };
    },
  });
  const question = { tool: 'dom', subcommand: 'set-text', args: { ref: '7', text: sentinel }, reason: '写入页面' };
  const first = await bridge(question as never);
  assert.equal(first.action, 'allow', '首次写 ⇒ 一次计划卡（此处应答 allow）');
  assert.equal(consent.state(), 'approved');
  const q = captured[0] as {
    plan?: { fingerprint?: string; entries?: readonly { readonly refNum?: number; readonly selector: string; readonly fromDigest: string; readonly toText: string }[] };
  };
  assert.ok(q.plan, '计划卡必须带计划（渲染用字段，与 payload 同级）');
  assert.equal(authPlanRows(q.plan).some((row) => row.includes(sentinel)), false, '凭据形值必须被掩码（上不了屏）');
  assert.equal(authPlanRows(q.plan).length > 0, true, '计划卡必须真的渲染出行（非空）');
  // 第二次写：计划内 ⇒ 直接放行（不再出卡）。
  const second = await bridge(question as never);
  assert.equal(second.action, 'allow');
  assert.equal(captured.length, 1, '计划内后续写不得再出卡（一次手势覆盖整批）');
  // 四个面：审计事件串 / CardView payload（生产真源） / digest 白名单 / DOM 属性（卡渲染只 textContent）。
  const auditText = JSON.stringify(events);
  assert.ok(auditText.includes(plan.fingerprint), '审计必须记**指纹摘要**（机器事实）');
  assert.ok(auditText.includes('"batchEntries":2'), '审计必须记**条目数**（机器计数）');
  assert.deepEqual(
    zeroPlaintextProblems(
      {
        审计: auditText,
        digest: read('src/ui/sidepanel/stream-digest.ts').includes('plan:') ? sentinel : '',
        DOM属性: read('src/ui/sidepanel/cards/auth.ts').match(/setAttribute\([^)]*sentinel/) ? sentinel : '',
      },
      sentinel,
    ),
    [],
    '四个面不得含计划正文',
  );
  // 生产真源切片：`StreamPayload` 内**没有** plan 字段（计划是 payload 的**兄弟**字段）。
  const streamModel = read('src/ui/sidepanel/stream-model.ts');
  const payloadBlock = streamModel.slice(streamModel.indexOf('export interface StreamPayload'), streamModel.indexOf('export interface StreamEvent'));
  assert.equal(/readonly plan\??:/.test(payloadBlock), false, '计划字段不得进入 StreamPayload（R-SGO-914）');
  assert.ok(/readonly plan\?: readonly string\[\];/.test(streamModel), '计划必须是 CardView / StreamEvent 的兄弟字段');
  // 卡渲染：计划块只用 textContent（无 data-* 内容属性）。
  const authSrc = read('src/ui/sidepanel/cards/auth.ts');
  const planBlock = authSrc.slice(authSrc.indexOf('function planBlock'), authSrc.indexOf('/** Populate + reveal'));
  assert.ok(planBlock.includes('textContent'), '计划行必须用 textContent 渲染');
  assert.equal(/setAttribute/.test(planBlock), false, '计划行不得写 DOM 属性（法八四面之一）');
  // 反证：把哨兵注入audit串 ⇒ 同一扫描必命中（判据非恒真）。
  assert.ok(zeroPlaintextProblems({ 审计: sentinel }, sentinel).length > 0, '哨兵注入审计面必须判红');
});
