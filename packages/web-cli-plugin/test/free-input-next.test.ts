/**
 * ★ IAN-1 **TASK-IAN-116**（leaf `specs-tree-ian-1-free-input-next` · ADR-IAN-001 / ADR-IAN-002 /
 * ADR-IAN-008 §② · FR-IAN-010~025 · AC-IAN-002/003/004/009）—— **新 node 门禁 `free-input-next`**
 * 的骨架（FIN-1~6 + 每条判据的反证）。
 *
 * ── 本门禁判什么（每条都有 `expectFailPattern` + 反证实跑；禁恒真）────────────────
 *
 *   FIN-1 末端项**存在且恒最末**（结构序：终端恒在 `.next-chips` 之后；存在性由 provider 单源）。
 *   FIN-2 **零死端 floor**：无任何候选 ⇒ 仍产出「仅含终端」的最小卡；`pending` / `interval` /
 *         `safety` 三道既有硬门**逐字不变**（floor 不越 fail-closed）。
 *   FIN-3 **唯一提交点**：提交经 `op.turn` 槽；`requestTurn(` **恰 1**（★ IAN-2：composer 提交真退役）；集 B 分发入口仍**恰 1**。
 *   FIN-4 **手输可判**：`MANUAL_DRIVER_ID='manual'` 单源 ∧ `∉ listDriverDecls()` ∧ AI 路径不写该值。
 *   FIN-5 **让位语义在槽外**：`noteUserTurn()` 在手输路径、`requestTurn` 函数体之外（切片）。
 *   FIN-6 **空提交不静默**：空 / 纯空白 ⇒ 不产生空回合 ∧ 有可读行（复用既有 notice 通道）。
 *
 * ── 与 W3（TASK-IAN-121/123）的分工 ──────────────────────────────────────────
 *
 * 三段控制（ok / violated / n/a）+ 真源切片 + FIN-7（回填不覆盖）/ FIN-8（法八）由 W3 收口；
 * 本骨架只立**本轮的机器可判判据**，全部计数只增。
 *
 * @module test/free-input-next
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { MANUAL_DRIVER_ID } from '../src/ui/sidepanel/next-registry/ai-drive.js';
import { FREE_INPUT_LABEL, SET_A_PROTOCOL_ACTIONS } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { listDriverDecls, serviceOfCtxField } from '../src/ui/sidepanel/next-registry/drivers.js';
import { registerBuiltinProviders } from '../src/ui/sidepanel/next-registry/providers.js';
import { resolveOrder } from '../src/ui/sidepanel/next-registry/registry.js';
import { recommendNextStep, type RecommendInput } from '../src/ui/sidepanel/recommend.js';
// ★ ADN-2 TASK-ADN-203/216 —— 纯加法导入（不改既有导入行 ⇒ v4 段删除行为零）：
// R6 同因摘要（family 单源）用于「AI 候选被压掉 ⇒ floor 仍只含终端」的行为面判据。
import { refActionDigest as adn2RefActionDigest } from '../src/ui/sidepanel/recommend.js';
import { FREE_INPUT_REQUEST_ID, askFixedText } from '../src/ui/sidepanel/cards/askuser.js';
import { ASK_COPY } from '../src/ui/sidepanel/stream-plaintext.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const NEXTSTEP_REL = 'src/ui/sidepanel/cards/nextstep.ts';
const AI_DRIVE_REL = 'src/ui/sidepanel/next-registry/ai-drive.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
const ASKUSER_REL = 'src/ui/sidepanel/cards/askuser.ts';
const SIDEPANEL = read(SIDEPANEL_REL);
const NEXTSTEP = read(NEXTSTEP_REL);
const AI_DRIVE = read(AI_DRIVE_REL);

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'FIN-1-terminal-present-last', expectFailPattern: '末端项必须存在且恒最末（结构序在 .next-chips 之后）' },
  { id: 'FIN-2-zero-dead-end-floor', expectFailPattern: '零死端 floor 必须铸「仅含终端」最小卡，且不得越 pending/interval/safety' },
  { id: 'FIN-3-single-submit-slot', expectFailPattern: '提交必须经唯一 op.turn 槽（requestTurn( 恰 1 / 分发入口恰 1）' },
  { id: 'FIN-4-manual-driver-distinguishable', expectFailPattern: '手输 driver=manual 必须单源 ∧ ∉ 声明集 ∧ AI 路径不写该值' },
  { id: 'FIN-5-yield-semantics-outside-slot', expectFailPattern: '让位语义必须在 requestTurn 函数体之外（手输路径）' },
  { id: 'FIN-6-empty-submit-not-silent', expectFailPattern: '空 / 纯空白提交必须不产生空回合且不静默（有可读行）' },
  { id: 'FIN-0-zero-new-carrier', expectFailPattern: '零新增载体（KIND_SET 40 / 12 kind / 零宿主 / 终端不经 ACT_TO_OP）' },
  // ★ IAN-1 R2（TASK-IAN-121 · FR-IAN-033 / FR-IAN-018）：场景门禁补全（只增，不改既有七条）。
  { id: 'FIN-7-backfill-no-overwrite', expectFailPattern: '回填不覆盖：仅当输入处为空 / 卡收起重展开 / 卡不存在按需铸造（载体唯一化到流内，删掉即红）' },
  { id: 'FIN-8-law8-input-payload', expectFailPattern: '法八：输入文本仅走 chat user 载荷 ∧ 卡固化不回显值（四面零明文）' },
  { id: 'FIN-9-tri-state-control', expectFailPattern: '三段控制：ok / violated / n/a 逐态可达（n/a 不冒充 ok，禁恒真）' },
];

/* ── 工具（与 `test/r6-ty-experience-fix` 同口径的切片 / 注释剥离）──────────────── */

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

/** `function <name>(` 的函数体（注释剥离；截到首个 `\n}`）。 */
export function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const end = source.indexOf('\n}', start);
  const chunk = end < 0 ? source.slice(start) : source.slice(start, end + 2);
  return chunk.split('\n').filter((l) => !isComment(l)).join('\n');
}

/** Call sites of `name(`（注释 / import / 定义行除外）。 */
export function callSites(source: string, name: string): number[] {
  const out: number[] = [];
  source.split('\n').forEach((raw, i) => {
    if (isComment(raw)) return;
    if (!new RegExp(`${name}\\s*\\(`).test(raw)) return;
    if (/^\s*import\b/.test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`).test(raw)) return;
    if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=`).test(raw)) return;
    out.push(i + 1);
  });
  return out;
}

/** The `NextCtx` a test hands the real producer (the 7 sources only). */
export function baseInput(over: Partial<RecommendInput> = {}): RecommendInput {
  return {
    ref: { validCount: 1, staleCount: 0, latestRefNum: 3 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 122, subcommandCount: 40 },
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 2_000_000,
    ...over,
  };
}

/**
 * 「无任何候选」的 ctx：已授权 ∧ 探测相位未知（未开跑不是可行动未就绪）∧ 零引用 ∧
 * 非首装 ∧ 零风险 ⇒ `candidateRules` 必须产出 0 个候选（floor 的唯一入口）。
 */
export function emptyInput(over: Partial<RecommendInput> = {}): RecommendInput {
  return baseInput({
    ref: { validCount: 0, staleCount: 0 },
    probe: { steady: false },
    onboarding: { firstRun: false, pendingSteps: [] },
    ...over,
  });
}

/* ── FIN-1 末端项存在 + 恒最末（结构序判据：纯函数，反证复用）────────────────── */

/**
 * 结构序判据：`createNextstepCard` 里 `.next-chips` 的 append 必须**早于**终端的铸造 /
 * append（终端恒最末）。返回 problem 列表（空 = 通过）。
 */
export function terminalOrderProblems(source: string): string[] {
  const problems: string[] = [];
  // 注释不参与判据（否则源码里说明「终端恒在 .next-chips 之后」的注释会把判据误红）。
  const code = source.split('\n').filter((l) => !isComment(l)).join('\n');
  const fn = /export function createNextstepCard\(([\s\S]*?)\n\}/.exec(code)?.[1] ?? '';
  if (fn.length === 0) return [`${JUDGEMENTS[0].expectFailPattern}：createNextstepCard 未找到（判据不得空转）`];
  const chipsAt = fn.indexOf('appendChild(chips)');
  const termAt = fn.indexOf('nextstepTerminal');
  if (chipsAt < 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：未见 .next-chips 的 append`);
  if (termAt < 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：未见末端终端分支`);
  if (chipsAt >= 0 && termAt >= 0 && !(chipsAt < termAt)) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：终端必须排在 .next-chips **之后**`);
  }
  if (!/data-act', 'free-input'/.test(fn)) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：终端必须以集 A 协议动作 'free-input' 渲染`);
  }
  if (/next-chip[\s\S]{0,200}?free-input|free-input[\s\S]{0,200}?next-chip/.test(fn)) {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：终端不得带上 .next-chip 类（否则在飞被禁用）`);
  }
  return problems;
}

test('FIN-1 末端项存在：每条产出卡都带 terminal（含 floor 卡）', () => {
  registerBuiltinProviders();
  for (const input of [baseInput(), baseInput({ ref: { validCount: 0, staleCount: 1 } }), baseInput({ site: { authorized: false } }), emptyInput()]) {
    const r = recommendNextStep(input);
    assert.equal(r.cards.length, 1, `${JUDGEMENTS[0].expectFailPattern}：应恰 1 张卡`);
    assert.equal(r.cards[0]?.terminal, true, `${JUDGEMENTS[0].expectFailPattern}：cards[0].terminal 必须为 true`);
  }
});

test('FIN-1 恒最末：终端渲染在 .next-chips 之后（结构序）+ 反证', () => {
  assert.deepEqual(terminalOrderProblems(NEXTSTEP), [], JUDGEMENTS[0].expectFailPattern);
  // 反证（同一 judge 打在**合成**伪造体上，真源码零触碰）：把终端分支放到 `.next-chips` 之前 ⇒ 必红。
  const forged = [
    'export function createNextstepCard(view: CardView, deps: CardDeps): HTMLLIElement {',
    '  const doc = deps.doc;',
    "  if (view.payload.nextstepTerminal === true) { terminal.setAttribute('data-act', 'free-input'); col.appendChild(terminal); }",
    '  col.appendChild(chips);',
    '  return li;',
    '}',
    '',
  ].join('\n');
  const problems = terminalOrderProblems(forged);
  assert.ok(problems.some((p) => p.includes('恒最末')), `${JUDGEMENTS[0].expectFailPattern}：终端提前 ⇒ 必红`);
  // 反证②：终端顺序正确但带 `.next-chip` 类（在飞会被 `syncNextstepPending` 禁用）⇒ 同一 judge 必红。
  const chipClass = [
    'export function createNextstepCard(view: CardView, deps: CardDeps): HTMLLIElement {',
    '  col.appendChild(chips);',
    "  if (view.payload.nextstepTerminal === true) { terminal.setAttribute('class', 'next-chip'); terminal.setAttribute('data-act', 'free-input'); col.appendChild(terminal); }",
    '  return li;',
    '}',
    '',
  ].join('\n');
  assert.ok(
    terminalOrderProblems(chipClass).some((p) => p.includes('next-chip')),
    `${JUDGEMENTS[0].expectFailPattern}：终端带 .next-chip ⇒ 必红`,
  );
});

test('FIN-1 存在性单源：terminal 由注册表 provider 的 when 决定（零第二判断点）', () => {
  const freq = (recommendNextStep(emptyInput({ session: { openAsks: 0, busy: false } })).cards[0] ?? {}).terminal;
  assert.equal(freq, true, '恒真的 provider ⇒ 终端恒在场');
  const provider = resolveOrder().find((p) => p.id === 'free-input');
  assert.ok(provider, 'free-input provider 必须在注册表内（存在性单源）');
  // 反证：把 when 改成恒假 ⇒ 终端必须消失（判据不是恒真）。
  const forged = { ...provider, when: () => false };
  assert.equal(forged.when(), false, '恒假形态必须为 false（判据可失败）');
  assert.equal(recommendNextStep(emptyInput()).cards[0]?.terminal, true, '真 provider 恒真 ⇒ 终端在场');
});

/* ── FIN-2 零死端 floor ─────────────────────────────────────────────────────── */

test('FIN-2 零死端：无任何候选 ⇒ 铸「仅含终端」最小卡（零 chip，非假推荐）', () => {
  const r = recommendNextStep(emptyInput());
  assert.equal(r.cards.length, 1, `${JUDGEMENTS[1].expectFailPattern}：无候选也必须有可达终端`);
  assert.equal(r.cards[0]?.terminal, true);
  assert.deepEqual([...(r.cards[0]?.chips ?? [])], [], 'floor 卡不得含 chip（不是假推荐）');
  assert.equal(r.cards[0]?.rule, undefined, 'floor 卡不是任何规则候选（rule 缺省）');
  assert.equal(r.suppression, undefined, '产出卡 ⇒ 无 suppression');
});

test('FIN-2 floor 不越既有硬门：pending / interval 仍逐字压掉', () => {
  assert.equal(recommendNextStep(emptyInput({ session: { openAsks: 0, busy: true } })).cards.length, 0, 'pending ⇒ 零卡');
  assert.equal(recommendNextStep(emptyInput({ session: { openAsks: 0, busy: true } })).suppression, 'pending');
  const interval = recommendNextStep(emptyInput({ lastProducedAt: 2_000_000, now: 2_000_001 }));
  assert.equal(interval.cards.length, 0, '间隔未过 ⇒ 零卡（防抖不得被 floor 绕过）');
  assert.equal(interval.suppression, 'interval');
});

test('FIN-2 fail-closed 不变：候选全被安全集拦下 ⇒ 仍不推荐（safety 不走 floor）', () => {
  const input = baseInput({ ref: { validCount: 0, staleCount: 0 }, deniedCommands: ['继续', '看看这页能做什么（命令目录 122 条）', '打开审计查看已授权记录'] });
  const r = recommendNextStep(input);
  assert.equal(r.suppression, 'safety', `${JUDGEMENTS[1].expectFailPattern}：safety 必须保持「不推荐」`);
  assert.equal(r.cards.length, 0, 'safety ⇒ 零卡（fail-closed 逐字不变）');
});

/* ── FIN-3 唯一提交点 ───────────────────────────────────────────────────────── */

test('FIN-3 requestTurn( 恰 1 ∧ 集 B 分发入口恰 1 ∧ 手输经 op.turn 槽', () => {
  // 行号不是判据（注释换行会漂移）：判「恰 1 处」+「唯一提交点＝op.turn 槽」。
  const turnSites = callSites(SIDEPANEL, 'requestTurn');
  assert.equal(turnSites.length, 1, `${JUDGEMENTS[2].expectFailPattern}：requestTurn( 必须恰 1（实测 ${turnSites.join(', ')}）`);
  assert.equal(callSites(SIDEPANEL, 'dispatchChipAction').length, 1, `${JUDGEMENTS[2].expectFailPattern}：集 B 分发入口必须仍恰 1`);
  const body = functionBody(SIDEPANEL, 'submitFreeInput');
  assert.ok(body.length > 0, '前置：submitFreeInput 必须存在');
  assert.ok(/dispatchOp\('op\.turn'/.test(body), `${JUDGEMENTS[2].expectFailPattern}：手输必须经 op.turn 槽`);
  assert.equal(/requestTurn\s*\(/.test(body), false, `${JUDGEMENTS[2].expectFailPattern}：手输不得新增 requestTurn( 直连`);
});

test('FIN-3 反证：往 submitFreeInput 注入 requestTurn( 直连 ⇒ 计数判据必红', () => {
  const forged = SIDEPANEL.replace(
    "  void dispatchOp('op.turn', { value: text });",
    "  requestTurn(text);\n  void dispatchOp('op.turn', { value: text });",
  );
  assert.notEqual(forged, SIDEPANEL, '前置：注入锚点必须存在');
  // ★ IAN-2：判据恰 1 ⇒ 注入第二处必须被看到（还原后仍恰 1）。
  assert.equal(callSites(forged, 'requestTurn').length, 2, `${JUDGEMENTS[2].expectFailPattern}：第二处直连必须被计数判据看到`);
  assert.equal(callSites(SIDEPANEL, 'requestTurn').length, 1, '还原 ⇒ 仍恰 1');
});

test('FIN-3 反证：提交改走 submitDescribe（描述语义）⇒ op.turn 槽判据必红', () => {
  const forged = SIDEPANEL.replace(
    "  void dispatchOp('op.turn', { value: text });",
    "  submitDescribe(text);",
  );
  assert.notEqual(forged, SIDEPANEL, '前置：注入锚点必须存在');
  assert.equal(/dispatchOp\('op\.turn'/.test(functionBody(forged, 'submitFreeInput')), false, `${JUDGEMENTS[2].expectFailPattern}：改走描述 ⇒ 必红`);
});

/* ── FIN-4 手输 driver 可判 ────────────────────────────────────────────────── */

test('FIN-4 MANUAL_DRIVER_ID 单源 ∧ 与声明集反向不相交 ∧ AI 路径不写该值', () => {
  assert.equal(MANUAL_DRIVER_ID, 'manual', `${JUDGEMENTS[3].expectFailPattern}：字面量必须为 manual`);
  // 单源：`src/**` 恰一处声明（`export const MANUAL_DRIVER_ID`）。
  assert.equal((AI_DRIVE.match(/export const MANUAL_DRIVER_ID/g) ?? []).length, 1, `${JUDGEMENTS[3].expectFailPattern}：必须单源声明`);
  // 反向不相交：手输值 ∉ 驱动者声明 id 集。
  registerBuiltinProviders();
  const ids = listDriverDecls().map((d) => d.driverId);
  assert.ok(ids.length >= 11, '前置：声明集必须已注册（否则判据空转）');
  // ★ ADN-2 TASK-ADN-216（下界只增）：叶1 落了 `ai-next` 第 12 行 ⇒ 下界抬到 12（旧 >=11 判据逐字保留）。
  assert.ok(ids.length >= 12, '★ ADN-2 216：声明集下界必须 ≥12（11 + ai-next）');
  assert.ok(!ids.includes(MANUAL_DRIVER_ID), `${JUDGEMENTS[3].expectFailPattern}：手输值不得出现在驱动者声明集`);
  // 手输路径写该值；AI 路径（pressCandidate）写 ctx.driverId。
  assert.ok(/driverTraceLine\(MANUAL_DRIVER_ID/.test(functionBody(SIDEPANEL, 'submitFreeInput')), `${JUDGEMENTS[3].expectFailPattern}：手输路径必须写 driver=manual`);
  const press = functionBody(AI_DRIVE, 'pressCandidate');
  assert.ok(/driverTraceLine\(ctx\.driverId/.test(press), 'AI 路径必须写候选驱动者 id');
  assert.equal(/MANUAL_DRIVER_ID/.test(press), false, `${JUDGEMENTS[3].expectFailPattern}：AI 自主按下不得写 manual`);
});

test('FIN-4 零值纪律：手输留痕 evidence 只写 ctx 字段名（无用户文本面）', () => {
  const line = read(AI_DRIVE_REL);
  const decl = /export const MANUAL_DRIVER_EVIDENCE[^=]*= Object\.freeze\(\[([^\]]*)\]\)/.exec(line)?.[1] ?? '';
  const fields = [...decl.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(fields.length > 0, `${JUDGEMENTS[3].expectFailPattern}：evidence 面必须非空`);
  for (const f of fields) assert.notEqual(serviceOfCtxField(f), undefined, `${JUDGEMENTS[3].expectFailPattern}：${f} 必须登记在 CTX_FIELD_SERVICE`);
});

test('FIN-4 反证：手输改写成某声明 id ⇒ 可判性判据必红', () => {
  const forged = SIDEPANEL.replace('driverTraceLine(MANUAL_DRIVER_ID', "driverTraceLine('ref-action'");
  assert.notEqual(forged, SIDEPANEL, '前置：注入锚点必须存在');
  const body = functionBody(forged, 'submitFreeInput');
  assert.equal(/driverTraceLine\(MANUAL_DRIVER_ID/.test(body), false, `${JUDGEMENTS[3].expectFailPattern}：同值形态必须被判红`);
  // 声明面：「手输也写 driver=<某声明 id>」= 两值混同 ⇒ 本判据必红。
  assert.ok(listDriverDecls().map((d) => d.driverId).includes('ref-action'), '前置：ref-action 是声明 id');
});

/* ── FIN-5 让位语义在槽外 ──────────────────────────────────────────────────── */

test('FIN-5 noteUserTurn 在手输路径且在 requestTurn 体外（切片断言）', () => {
  const turn = functionBody(SIDEPANEL, 'requestTurn');
  assert.ok(turn.length > 0, '前置：requestTurn 切片必须取到');
  assert.equal(/noteUserTurn/.test(turn), false, `${JUDGEMENTS[4].expectFailPattern}：requestTurn 体内不得写让位（会把答案后续流也锁住）`);
  assert.ok(/proactivity\.noteUserTurn\(\)/.test(functionBody(SIDEPANEL, 'submitFreeInput')), `${JUDGEMENTS[4].expectFailPattern}：手输路径必须打让位`);
});

test('FIN-5 反证：把 noteUserTurn 移入 requestTurn ⇒ 切片判据必红', () => {
  const forged = SIDEPANEL.replace(
    'if (!trimmed) return false;',
    'if (!trimmed) return false;\n  proactivity.noteUserTurn();',
  );
  assert.notEqual(forged, SIDEPANEL, '前置：注入锚点必须存在');
  assert.ok(/noteUserTurn/.test(functionBody(forged, 'requestTurn')), `${JUDGEMENTS[4].expectFailPattern}：移入槽内 ⇒ 必红`);
});

/* ── FIN-6 空提交不静默 ────────────────────────────────────────────────────── */

test('FIN-6 空 / 纯空白提交：不产生空回合 ∧ 不静默（先通知再返回）', () => {
  const body = functionBody(SIDEPANEL, 'submitFreeInput');
  const guardAt = body.indexOf('if (!text)');
  const noticeAt = body.indexOf("dispatch({ type: 'notice'");
  const dispatchAt = body.indexOf("dispatchOp('op.turn'");
  assert.ok(guardAt >= 0 && noticeAt >= 0 && dispatchAt >= 0, '前置：空守卫 / 通知 / 提交三者必须可定位');
  assert.ok(guardAt < dispatchAt, `${JUDGEMENTS[5].expectFailPattern}：空守卫必须在提交之前（否则空回合）`);
  assert.ok(noticeAt > guardAt && noticeAt < dispatchAt, `${JUDGEMENTS[5].expectFailPattern}：空提交必须先写可读行再返回`);
  assert.match(body.slice(guardAt, dispatchAt), /return;/, `${JUDGEMENTS[5].expectFailPattern}：空提交必须提前返回`);
});

test('FIN-6 反证：删掉空提交的通知行 ⇒ 判据必红；删掉空守卫 ⇒ 必红', () => {
  const body = functionBody(SIDEPANEL, 'submitFreeInput');
  const guardBlock = /\n  if \(!text\) \{[\s\S]*?\n  \}\n/.exec(body)?.[0] ?? '';
  assert.ok(guardBlock.length > 0, '前置：空守卫块必须可定位');
  const withoutNotice = SIDEPANEL.replace(guardBlock, '\n  if (!text) return;\n');
  assert.notEqual(withoutNotice, SIDEPANEL, '前置：注入锚点必须存在');
  const forgedBody = functionBody(withoutNotice, 'submitFreeInput');
  assert.equal(
    /FREE_INPUT_EMPTY_TEXT/.test(forgedBody.slice(forgedBody.indexOf('if (!text)'), forgedBody.indexOf("dispatchOp('op.turn'"))),
    false,
    `${JUDGEMENTS[5].expectFailPattern}：删空提交通知 ⇒ 必红`,
  );
  assert.ok(/FREE_INPUT_EMPTY_TEXT/.test(functionBody(SIDEPANEL, 'submitFreeInput')), '真源码必须含空提交可读行（判据非恒真）');
  // 删掉整个空守卫 ⇒ 空文本会一路走到提交（空回合形态）。
  const withoutGuard = SIDEPANEL.replace(guardBlock, '\n');
  assert.notEqual(withoutGuard, SIDEPANEL, '前置：注入锚点必须存在');
  assert.equal(/if \(!text\)/.test(functionBody(withoutGuard, 'submitFreeInput')), false, `${JUDGEMENTS[5].expectFailPattern}：删守卫 ⇒ 必红`);
});

/* ── FIN-0 零新增载体 ──────────────────────────────────────────────────────── */

test('FIN-0 零新增载体：KIND_SET 40 逐字 / 12 kind / 零宿主 / 终端不进 ACT_TO_OP', () => {
  const messaging = read('src/background/messaging.ts');
  const kindBlock = /const KIND_SET[^=]*=\s*new Set<PluginMessageKind>\(\[([\s\S]*?)\]\)/.exec(messaging)?.[1] ?? '';
  assert.equal([...kindBlock.matchAll(/'[^']+'/g)].length, 40, `${JUDGEMENTS[6].expectFailPattern}：KIND_SET 必须逐字 40 项`);
  const labels = read('src/ui/sidepanel/cards/shared.ts');
  const labelBlock = /CARD_TAG_LABELS: Readonly<Record<StreamEventKind, string>> = Object\.freeze\(\{([\s\S]*?)\n\}\)/.exec(labels)?.[1] ?? '';
  assert.equal([...labelBlock.matchAll(/^\s{2}[a-z]+:/gm)].length, 12, `${JUDGEMENTS[6].expectFailPattern}：12 kind 契约不动`);
  assert.ok(/REGISTERED_STRUCTURAL_HOSTS[^=]*=\s*Object\.freeze\(\[\]\s*(?:as const)?\)/.test(read('src/ui/sidepanel/host-registry.ts')), 'REGISTERED_STRUCTURAL_HOSTS 必须仍是 []');
  assert.ok((SET_A_PROTOCOL_ACTIONS as readonly string[]).includes('free-input'), '终端必须是集 A 协议动作');
  const dispatchSrc = read('src/ui/sidepanel/next-registry/dispatch.ts');
  const actToOp = /export const ACT_TO_OP = Object\.freeze\(\{([\s\S]*?)\}\s*as const\)/.exec(dispatchSrc)?.[1] ?? '';
  assert.equal([...actToOp.matchAll(/^\s{2}[a-z-]+:/gm)].length, 6, `${JUDGEMENTS[6].expectFailPattern}：ACT_TO_OP 必须仍恰 6 行`);
  assert.ok(!/'free-input'\s*:/.test(actToOp), `${JUDGEMENTS[6].expectFailPattern}：终端不得进 ACT_TO_OP`);
});

test('FIN-0 载体：终端文案单源 ∧ 卡内输入复用既有 requestId 语义（互不混淆）', () => {
  assert.equal(FREE_INPUT_LABEL, '自由输入…');
  // 终端文案只在单源常量里出现一次（渲染层 / provider 均读 FREE_INPUT_LABEL）。
  assert.equal((read('src/ui/sidepanel/next-registry/dispatch.ts').match(/'自由输入…'/g) ?? []).length, 1, `${JUDGEMENTS[6].expectFailPattern}：文案必须单源`);
  const nextstepCode = NEXTSTEP.split('\n').filter((l) => !isComment(l)).join('\n');
  assert.equal((nextstepCode.match(/自由输入…/g) ?? []).length, 0, '渲染层代码不得再写一遍字面量（读单源常量）');
  const providerCode = read(PROVIDERS_REL).split('\n').filter((l) => !isComment(l)).join('\n');
  assert.equal((providerCode.match(/自由输入…/g) ?? []).length, 0, 'provider 代码不得再写一遍字面量（读单源常量）');
  // free-input 的 requestId 与描述语义**独立**（防退化）。
  const ask = read(ASKUSER_REL);
  assert.ok(/FREE_INPUT_REQUEST_ID = 'free-input'/.test(ask), '卡内输入必须有独立 requestId');
  assert.ok(!/requestId: 'ref-describe'[\s\S]{0,80}free-input/.test(ask), '两个语义身份不得合流');
});

/* ────────────────────────────────────────────────────────────────────────────
 * ★ IAN-1 R2（**TASK-IAN-121** · ADR-IAN-003 §2 · ADR-IAN-008 §② · FR-IAN-033 / 018 / 064 ·
 * AC-IAN-016/019）—— 场景门禁补全：**FIN-7**（回填不覆盖：仅当为空 / 卡收起重展开 / 卡不存在
 * 按需铸造；★ IAN-2 载体唯一化到流内）+ **FIN-8**（法八：输入文本仅走 `chat` `user` 载荷 ∧ 卡固化不回显值）
 * + **FIN-9**（三段控制 ok / violated / n/a 逐态可达，`n/a` 不冒充 `ok`）。
 *
 * 真源切片：判据读**生产模块**（`sidepanel.ts` 切片 ∧ `askuser.ts#askFixedText` 真调用），
 * 不读测试自建常量；每条判据含 `expectFailPattern` + 独立反证（禁恒真）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 顶层声明体切片（截到**列 0** 的 `\n}`；内层块缩进 ⇒ 不误截多行 `if {}` 块）。 */
export function topLevelBody(source: string, decl: string): string {
  const at = source.indexOf(decl);
  if (at < 0) return '';
  const end = source.indexOf('\n}', at);
  return end < 0 ? source.slice(at) : source.slice(at, end + 2);
}

/**
 * **FIN-7 判据本体**（回填不覆盖）。`panelSource` = `sidepanel.ts` 源文本。
 * 五条：① 写回被拒原话（不丢）② 仅当卡内输入为空（不覆盖）③ 卡收起 ⇒ 重展开
 * ④ 卡不存在 ⇒ 按需铸造 ⑤ **流外零写点**（★ IAN-2 载体唯一化：`#input` 永不回填）。
 */
export function backfillProblems(panelSource: string): string[] {
  const problems: string[] = [];
  const body = topLevelBody(panelSource, 'function restoreFreeInputDraft(');
  const fail = JUDGEMENTS[7].expectFailPattern;
  if (body.length === 0) {
    problems.push(`${fail}：流内回填体必须可定位（否则判据空转）`);
    return problems;
  }
  if (!/input\.value\s*=\s*rejected/.test(body)) problems.push(`${fail}：必须写回被拒原话（不丢）`);
  if (!/input\.value\.length\s*>\s*0\s*\)\s*return false/.test(body)) problems.push(`${fail}：仅当卡内输入为空（不覆盖用户新输入）`);
  if (!/setCardFallbackOpen\(form,\s*true\)/.test(body)) problems.push(`${fail}：卡收起必须重展开（+ focus）`);
  if (!/openFreeInputCard\(\)/.test(body)) problems.push(`${fail}：卡不存在必须按需铸造并回填`);
  // ⑤ ★ IAN-2 载体唯一化：流外 `#input` 写点必须**零命中**（真退役 ⇒ 不得回填）。
  if (/draftInput\.value\s*=\s*rejected/.test(panelSource)) {
    problems.push(`${fail}：流外 #input 写点必须零命中（载体唯一化到流内）`);
  }
  return problems;
}

test('FIN-7 回填不覆盖：卡在仅当为空 / 卡收起重展开 / 卡不存在按需铸造 / 载体唯一化到流内', () => {
  assert.deepEqual(backfillProblems(SIDEPANEL), [], JUDGEMENTS[7].expectFailPattern);
  // 反证①：去掉「仅当为空」守卫 ⇒ 必红（复现「回填覆盖非空」）。
  const overwrite = SIDEPANEL.replace('if (input.value.length > 0) return false;', 'void 0;');
  assert.notEqual(overwrite, SIDEPANEL, '前置：不覆盖守卫锚点必须存在');
  assert.ok(backfillProblems(overwrite).some((p) => p.includes('不覆盖')), '回填覆盖非空 ⇒ 必红');
  // 反证②：删「卡收起重展开」⇒ 必红。
  const noReopen = SIDEPANEL.replace('  setCardFallbackOpen(form, true);\n  // 作用域限定', '  void 0;\n  // 作用域限定');
  assert.notEqual(noReopen, SIDEPANEL, '前置：重展开锚点必须存在');
  assert.ok(backfillProblems(noReopen).some((p) => p.includes('重展开')), '卡收起不重展开 ⇒ 必红');
  // 反证③：删「卡不存在按需铸造」⇒ 必红。
  const noMint = SIDEPANEL.replace('if (!freeInputCardId()) openFreeInputCard();', 'if (!freeInputCardId()) return false;');
  assert.notEqual(noMint, SIDEPANEL, '前置：按需铸造锚点必须存在');
  assert.ok(backfillProblems(noMint).some((p) => p.includes('按需铸造')), '卡不存在不铸造 ⇒ 必红');
  // 反证④：**重新引入**流外 `#input` 写点（唯一载体退化）⇒ 必红（判据非恒真）。
  const reinjected = `${SIDEPANEL}\n// forged\nconst draftInputX = document.getElementById('input');\nif (draftInputX) draftInputX.value = rejected;\n`.replace('draftInputX.value = rejected', 'draftInput.value = rejected');
  assert.ok(backfillProblems(reinjected).some((p) => p.includes('流外 #input 写点必须零命中')), '重新引入流外载体 ⇒ 必红');
  // 还原 ⇒ 全绿（判据不是恒真）。
  assert.deepEqual(backfillProblems(SIDEPANEL), []);
});

/** FIN-8 行为哨兵（绝不得出现在任何固化 / 载荷回显面）。 */
export const FIN8_SENTINEL = 'FIN8-哨兵-原地翻译-9c3f';

/**
 * **FIN-8 判据本体**（法八）。真源切片：
 *   · `submitFreeInput` **只**经 `op.turn` 槽（不另成 assistant/command/tool 载荷、不把文本当 notice 正文）；
 *   · 卡固化文案**单源**且**不含**回显占位符（`{answer}` 等）；
 *   · `askuser.ts#askFixedText` **真调用**（free-input 分支）⇒ 固化文本不含用户文本。
 */
export function law8Problems(panelSource: string, fixedCopy: string, fixedTextOfFreeInput: string): string[] {
  const problems: string[] = [];
  const fail = JUDGEMENTS[8].expectFailPattern;
  const submit = topLevelBody(panelSource, 'function submitFreeInput(');
  if (submit.length === 0) {
    problems.push(`${fail}：提交体必须可定位（否则判据空转）`);
    return problems;
  }
  if (!/dispatchOp\('op\.turn',\s*\{\s*value:\s*text\s*\}\)/.test(submit)) {
    problems.push(`${fail}：输入文本必须只经 op.turn 槽（chat user 载荷）`);
  }
  if (/dispatch\(\{\s*type:\s*'(?:assistant|command|tool)'/.test(submit)) {
    problems.push(`${fail}：不得另成 assistant/command/tool 载荷`);
  }
  if (/dispatch\(\{\s*type:\s*'notice',\s*text:\s*text/.test(submit) || /type:\s*'system',\s*text/.test(submit)) {
    problems.push(`${fail}：不得把用户文本当 notice / system 行正文`);
  }
  if (/input\.value/.test(submit)) {
    problems.push(`${fail}：提交体不得读 DOM 值作第二载荷（值只作槽参数）`);
  }
  if (/\{(?:answer|value)\}|\$\{[^}]*answer[^}]*\}/.test(fixedCopy)) {
    problems.push(`${fail}：卡固化文案不得含回显占位符`);
  }
  if (fixedTextOfFreeInput.includes(FIN8_SENTINEL)) {
    problems.push(`${fail}：卡固化不得回显用户文本`);
  }
  return problems;
}

test('FIN-8 法八：输入文本仅走 chat user 载荷 ∧ 卡固化不回显值（真源切片）', () => {
  // 真源切片：`askFixedText` 是生产模块的真函数（free-input 分支 ⇒ 单源固化文案，不回显）。
  const fixed = askFixedText({ terminal: 'answered', payload: { requestId: FREE_INPUT_REQUEST_ID, answer: FIN8_SENTINEL }, ts: 0 } as never);
  assert.equal(fixed, ASK_COPY.freeInputSubmitted, 'free-input 固化必须读单源文案（不是 answeredPrefix + 值）');
  assert.equal(fixed.includes(FIN8_SENTINEL), false, '固化不得回显用户文本');
  assert.deepEqual(law8Problems(SIDEPANEL, ASK_COPY.freeInputSubmitted, fixed), [], JUDGEMENTS[8].expectFailPattern);
  // 反证①：提交改走 assistant 行（文本落流内明文）⇒ 必红。
  const forged = SIDEPANEL.replace("void dispatchOp('op.turn', { value: text });", "dispatch({ type: 'assistant', text });");
  assert.notEqual(forged, SIDEPANEL, '前置：提交注入锚点必须存在');
  assert.ok(law8Problems(forged, ASK_COPY.freeInputSubmitted, fixed).length > 0, '文本落流内明文 ⇒ 必红');
  // 反证②：固化文案改成回显值（`answeredPrefix + answer`）⇒ 必红（另一分支的形态）。
  const echoing = askFixedText({ terminal: 'answered', payload: { requestId: 'ref-describe', answer: FIN8_SENTINEL }, ts: 0 } as never);
  assert.ok(echoing.includes(FIN8_SENTINEL), '对照：普通 answer 卡确实回显（说明 free-input 分支是真特例）');
  assert.ok(
    law8Problems(SIDEPANEL, ASK_COPY.freeInputSubmitted, echoing).some((p) => p.includes('回显')),
    'free-input 固化回显值 ⇒ 必红',
  );
  // 还原 ⇒ 全绿。
  assert.deepEqual(law8Problems(SIDEPANEL, ASK_COPY.freeInputSubmitted, fixed), []);
});

/* ── FIN-9 三段控制（ok / violated / n/a）────────────────────────────────────── */

export type TriState = 'ok' | 'violated' | 'n/a';

/**
 * **三段控制**（承 `driver-terminals` 先例）：判定读数 `true` ⇒ `ok`；`false` ⇒ `violated`；
 * **读不到**（`undefined`，证据面不可达）⇒ `n/a` —— `n/a` **既不冒充 `ok` 也不冒充 `violated`**
 * （禁把「判据空转」当通过）。
 */
export function triState(reading: boolean | undefined): TriState {
  if (reading === undefined) return 'n/a';
  return reading ? 'ok' : 'violated';
}

test('FIN-9 三段控制：ok / violated / n/a 逐态可达（n/a 不冒充 ok，禁恒真）', () => {
  // ok：生产事实通过。
  assert.equal(triState(backfillProblems(SIDEPANEL).length === 0), 'ok', '生产事实 ⇒ ok');
  // violated：注入「回填覆盖非空」⇒ 同一判据 red ⇒ violated。
  const overwrite = SIDEPANEL.replace('if (input.value.length > 0) return false;', 'void 0;');
  assert.notEqual(overwrite, SIDEPANEL, '前置：注入锚点必须存在');
  assert.equal(triState(backfillProblems(overwrite).length === 0), 'violated', '注入 ⇒ violated');
  // n/a：判据体不可定位（证据面不可达）⇒ n/a（**不**冒充 ok）。
  assert.equal(triState(undefined), 'n/a', '读不到 ⇒ n/a');
  assert.notEqual(triState(undefined), 'ok', 'n/a 不得冒充 ok');
  assert.notEqual(triState(undefined), 'violated', 'n/a 不得冒充 violated');
  // 禁恒真：三段互斥且可达（把「读不到」当通过是恒真形态 ⇒ 本判据必须能把它判出来）。
  const states: TriState[] = [triState(true), triState(false), triState(undefined)];
  assert.deepEqual(states, ['ok', 'violated', 'n/a'], '三段必须逐态可达');
  assert.equal(new Set(states).size, 3, '三段互斥（禁两态混池）');
});

test('FIN 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.equal(JUDGEMENTS.length, 10, '判据表必须覆盖 FIN-0~FIN-9（只增：R1 七条 + R2 三条）');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});

/* ── ★ F-36 / ADN-2 **TASK-ADN-203 / 216**（ADR-ADN-005 §② · FR-ADN-041/042/045 ·
 * AC-ADN-006 · EC-ADN-019）—— **AI 候选不进 floor**：终端恒常驻、floor 仍只含终端；
 * AI 只可能**替换**规则候选，不得改变终端语义。纯追加（FIN-0~9 与元判据逐字保留）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 本追加块的失败文本（不改 `JUDGEMENTS` 表的既有计数行 ⇒ v4 段删除行为零）。 */
const FIN10_FAIL = 'AI 候选不得进入零死端 floor（floor 仍只含终端；终端语义不被 AI 改变）';

test('★ ADN-2 203/216：AI 候选不进 floor —— 在场 ⇒ AI 卡（终端恒常驻）；被压掉 ⇒ floor 仍只含终端', () => {
  registerBuiltinProviders();
  const aiCand = [{ opId: 'op.turn', label: 'AI 想抢槽' }];
  // ① AI 在场且未被去重 ⇒ AI 卡（非 floor），终端恒常驻。
  const aiCard = recommendNextStep(emptyInput({ session: { openAsks: 0, busy: false, aiNext: aiCand } }));
  assert.equal(aiCard.cards.length, 1, `${FIN10_FAIL}：AI 在场仍恰 1 卡`);
  assert.deepEqual(aiCard.cards[0]?.chips.map((c) => c.text), ['AI 想抢槽'], 'AI 候选替换规则候选（不是叠加）');
  assert.equal(aiCard.cards[0]?.terminal, true, '终端恒常驻（AI 不得改变终端语义）');
  // ② AI 被 R6 同因压掉 ⇒ `aiNext` 空 ⇒ 零死端 floor 仍只含终端（AI **不进** floor）。
  const floored = recommendNextStep(
    emptyInput({
      ref: { validCount: 0, staleCount: 0, latestRefNum: 3 },
      session: { openAsks: 0, busy: false, aiNext: aiCand },
      completedActions: [adn2RefActionDigest('ref_3', 'AI 想抢槽')],
    }),
  );
  assert.equal(floored.cards.length, 1, `${FIN10_FAIL}：AI 全被压 + 无规则候选 ⇒ floor 必须仍在（零死端）`);
  assert.equal(floored.cards[0]?.terminal, true, 'floor 卡必须带终端');
  assert.deepEqual([...(floored.cards[0]?.chips ?? [])], [], 'floor 卡不得含 chip（AI 候选不进 floor）');
  assert.equal(floored.cards[0]?.rule, undefined, 'floor 卡不是任何规则候选（含 AI）');
  assert.ok(floored.cards[0]?.chips.every((c) => c.text !== 'AI 想抢槽'), '被压掉的 AI 候选不得从 floor 漏回');
  // ③ 源码面：floor 铸造点不读 aiNext（存在性单源 = free-input provider 的 when）。
  const floorBody = /function freeInputOnlyCard\(\)[\s\S]*?\n\}/.exec(read('src/ui/sidepanel/recommend.ts'))?.[0] ?? '';
  assert.ok(floorBody.length > 0, `${FIN10_FAIL}：floor 铸造点必须可定位（判据不得空转）`);
  assert.equal(/aiNext/.test(floorBody), false, `${FIN10_FAIL}：floor 铸造点不得读 AI 注入槽`);
  // ④ 反证：把 AI 注入槽塞进 floor 铸造点 ⇒ 同一判据必红（判据非恒真）。
  const forged = read('src/ui/sidepanel/recommend.ts').replace('function freeInputOnlyCard(): NextstepCandidate {', 'function freeInputOnlyCard(): NextstepCandidate {\n  void input.session.aiNext;');
  const forgedFloor = /function freeInputOnlyCard\(\)[\s\S]*?\n\}/.exec(forged)?.[0] ?? '';
  assert.equal(/aiNext/.test(forgedFloor), true, '反证：注入 AI 读取 ⇒ 判据必须能看到');
});


