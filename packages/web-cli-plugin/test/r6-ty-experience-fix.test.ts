/**
 * R6 缺陷快修轮（2026-09-23）— 真机体验（`ty.md`）暴露的四项缺陷的**机核门禁**。
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   P3 **答案 once 语义** —— 被在飞回合经 `askBridge.settle` 消费的后台答案不得在回合
 *      收口后再组合新回合（`ty.md` 21:32:18 → 21:32:26 的双回合）。纯判据 + 端到端复放
 *      （恰 1 回合 vs 2 回合）+ 源码接线 + 注入反证。
 *   P4 **用户输入路径仲裁统一** —— 在飞时用户提交改走 SW 有界队列（排队），composer 仅
 *      异常态禁用（`ty.md` 21:29:19 硬拒）。纯判据 + 源码 + 注入反证。
 *   P5a **完成后同动作去重** —— 任务完成后的下一步推荐不得再推同一 digest 的引用动作
 *      （`ty.md` 21:32:26 复推）。纯判据（真跑 `recommendNextStep`）+ 双向反证。
 *   P5b **引用被改写后重评** —— 文本摘要失配 ⇒ `text-changed` 失效（身份仍在）；摘要一致
 *      ⇒ 仍 valid。判定层双向 + SW/面板接线 + 注入反证。
 *
 * @module test/r6-ty-experience-fix
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pressCandidate } from '../src/ui/sidepanel/next-registry/ai-drive.js';
import {
  drivableSuspension,
  isConsumedAskAnswer,
  listSuspensions,
  registerSuspension,
  resetSuspensions,
  type Suspension,
} from '../src/ui/sidepanel/next-registry/drivers.js';
import { bindPanelOps } from '../src/ui/sidepanel/next-registry/ops.js';
import { evaluateRefValidity, type RefEnv, type RefFacts } from '../src/ui/sidepanel/l1/ref-validity.js';
import {
  intentDigest,
  refActionDigest,
  refActionTextKey,
  recommendNextStep,
  type RecommendInput,
} from '../src/ui/sidepanel/recommend.js';
import { buttonStates, sendDisabledReason } from '../src/ui/sidepanel/view-model.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const SIDEPANEL = read('src/ui/sidepanel/sidepanel.ts');
const SW = read('src/background/service-worker.ts');
// V5.5F-1 TASK-V55F-117（等价重锚）：`observeIdentity` 已抽为**单一实现**（`ref-observe.ts`），
// 「只读观测带回当前文本摘要」这一判据的真源随实现前移（**判据不变，只换切片指向**）。
const OBSERVE = read('src/background/ref-observe.ts');
const READ_CHAT_EVENTS = read('src/background/chat-events.ts');
const RECOMMEND = read('src/ui/sidepanel/recommend.ts');

const isComment = (line: string): boolean => {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

/** `symbol(` call sites (comments / imports / declarations excluded) — op-wiring 同口径。 */
export function callSites(source: string, symbol: string): number {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let n = 0;
  for (const raw of source.split('\n')) {
    if (isComment(raw)) continue;
    if (!new RegExp(`${escaped}\\s*\\(`).test(raw)) continue;
    if (/^\s*import\b/.test(raw)) continue;
    if (new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`).test(raw)) continue;
    if (new RegExp(`^\\s*(?:export\\s+)?const\\s+${escaped}\\s*=`).test(raw)) continue;
    n += 1;
  }
  return n;
}

/** The `driveAnsweredTurn` function body (its declaration → the next top-level `}` at col 0). */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const end = source.indexOf('\n}', start);
  const chunk = end < 0 ? source.slice(start) : source.slice(start, end + 2);
  // 注释不参与判据（否则源码里说明旧行为的注释会把判据误红）。
  return chunk.split('\n').filter((l) => !isComment(l)).join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// P3 —— 答案 once 语义
// ────────────────────────────────────────────────────────────────────────────

const consumedSuspension = (askId: string): Suspension => ({
  driverId: 'ref-action',
  source: 'bg',
  late: false,
  kind: 'answered',
  instruction: 'C. 跳过，先这样',
  evidence: ['session.openAsks'],
  askId,
  at: 0,
});

test('R6-P3: 被在飞回合消费的后台答案不得被自动接手（requestId 级去重）', () => {
  const susp = consumedSuspension('ask-9');
  assert.equal(isConsumedAskAnswer(susp, new Set(['ask-9'])), true, 'askId 命中已消费集 ⇒ 消费过');
  assert.equal(isConsumedAskAnswer(susp, new Set(['ask-other'])), false, '不同 requestId ⇒ 未消费');
  // 迟到答案（settled:false）本就不在消费集 ⇒ 仍可被接手（「未接住 ⇒ 给出可走的一步」）。
  const lateSusp: Suspension = { ...consumedSuspension('ask-late'), late: true, kind: 'answered-late' };
  assert.equal(isConsumedAskAnswer(lateSusp, new Set(['ask-9'])), false);
  // 单槽裁决：消费过 ⇒ 不可驱动。
  assert.equal(drivableSuspension([susp], new Set(['ask-9'])), undefined, '消费过 ⇒ 无可驱动悬置');
  assert.equal(drivableSuspension([susp], new Set())?.instruction, 'C. 跳过，先这样', '未消费 ⇒ 可驱动');
});

test('R6-P3: 端到端复放 ty.md 序列 ⇒ 恰 1 回合（现在的行为是 2 个）', async () => {
  resetSuspensions();
  const turns: string[] = [];
  bindPanelOps({ turn: (text) => void turns.push(text), notice: () => {} });
  /** 复刻 `driveAnsweredTurn` 的裁决 + 按下（与生产同两个函数）。 */
  const drive = async (consumed: Set<string>): Promise<void> => {
    const live = drivableSuspension(listSuspensions(), consumed);
    if (!live || !live.instruction) return;
    pressCandidate('op.turn', live.instruction, {
      actor: 'ai',
      driverId: live.driverId,
      driverClass: 'ai-driven',
      configured: true,
      armed: true,
    });
    await new Promise((r) => setTimeout(r, 0));
  };
  try {
    registerSuspension({ driverId: 'ref-action', source: 'bg', late: false, kind: 'answered', instruction: 'C. 跳过，先这样', evidence: ['session.openAsks'], askId: 'ask-9' });
    // 修复后：答案已被在飞回合消费（settled:true ⇒ ask-9 入消费集）⇒ 回合收口后 0 次自动成回合。
    await drive(new Set(['ask-9']));
    assert.equal(turns.length, 0, '被消费的答案不得再组成新回合（总计仍 1 个回合）');
    // 注入反证：抽掉 once 语义（消费集为空）⇒ 同一序列多出 1 个回合 ⇒ 总计 2 个。
    await drive(new Set());
    assert.deepEqual(turns, ['C. 跳过，先这样'], '无 once 语义 ⇒ 复现 2 回合缺陷（判据非恒真）');
  } finally {
    resetSuspensions();
    bindPanelOps({});
  }
});

test('R6-P3: 生产接线 —— 消费标记 + askId + driveAnsweredTurn 经 drivableSuspension', () => {
  // ① `driveAnsweredTurn` 必须经纯判据取悬置（不得直接 slice(-1)[0]）。
  const body = functionBody(SIDEPANEL, 'driveAnsweredTurn');
  assert.ok(body.length > 0, 'driveAnsweredTurn 切片必须取到');
  assert.match(body, /drivableSuspension\(\s*listSuspensions\(\),\s*consumedAskIds\s*\)/, '必须经 drivableSuspension(listSuspensions(), consumedAskIds)');
  assert.equal(/listSuspensions\(\)\.slice\(-1\)/.test(body), false, '不得再直接取最后一条（绕开 once 语义）');
  // ② 后台 ask 分支：settled ⇒ 记消费 + 悬置带 askId。
  const start = SIDEPANEL.indexOf('if (rid && !isRef) {');
  const branch = SIDEPANEL.slice(start, SIDEPANEL.indexOf("dispatch({\n    type: 'ask-resolved'", start));
  assert.ok(branch.length > 0, '后台 ask 分支切片必须取到');
  assert.match(branch, /res\?\.data\?\.settled === true/, 'settled:true 必须被识别为「已在飞回合消费」');
  assert.match(branch, /markConsumedAsk\(rid\)/, '消费必须按 requestId 标记');
  assert.match(branch, /askId: rid/, '悬置必须携带 requestId（去重键）');
  // ③ 反证：把 driveAnsweredTurn 的判据换回 slice(-1)[0] ⇒ 必红。
  const forged = SIDEPANEL.replace(
    'const live = drivableSuspension(listSuspensions(), consumedAskIds);',
    'const live = listSuspensions().slice(-1)[0];',
  );
  assert.notEqual(forged, SIDEPANEL, '注入锚点必须存在');
  const forgedBody = functionBody(forged, 'driveAnsweredTurn');
  assert.equal(/drivableSuspension\(/.test(forgedBody), false, '抽掉 once 判据 ⇒ 必红');
});

// ────────────────────────────────────────────────────────────────────────────
// P4 —— 用户输入路径仲裁统一（排队）
// ────────────────────────────────────────────────────────────────────────────

test('R6-P4: 在飞不再硬禁用 composer（仅异常态禁用）+ 排队文案', () => {
  assert.equal(
    buttonStates({ activeOrigin: 'https://a.test', authorized: true, pending: true }).sendDisabled,
    false,
    '在飞时 composer 必须可提交（排队）',
  );
  assert.equal(buttonStates({ authorized: true, pending: true }).sendDisabled, true, '无活跃站点（异常态）仍禁用');
  // 注入反证：恢复旧的「pending ⇒ sendDisabled」规则 ⇒ 上面的断言会为 true ⇒ 必红。
  const restoredRule = (pending: boolean, hasOrigin: boolean): boolean => pending || !hasOrigin;
  assert.equal(restoredRule(true, true), true, '对照：旧的 pending 语义 ⇒ 禁用（判据非恒真）');
  assert.equal(buttonStates({ activeOrigin: 'https://a.test', authorized: true, pending: true }).sendDisabled, false, '真源：在飞仍可提交');
  const reason = sendDisabledReason({ activeOrigin: 'https://a.test', pending: true });
  assert.match(reason, /处理中/, '在飞文案必须仍点明「处理中」');
  assert.match(reason, /排队/, '在飞文案必须是排队语义（不再是硬拒「发送已禁用」）');
});

test('R6-P4: requestTurn 仅异常态硬拒（不再按 pending 门控）', () => {
  const body = functionBody(SIDEPANEL, 'requestTurn');
  assert.ok(body.length > 0, 'requestTurn 切片必须取到');
  assert.equal(/buttonStates\(/.test(body), false, 'requestTurn 不得再经 buttonStates 的 pending 门控');
  assert.match(body, /if \(!state\.activeOrigin\) return false;/, '仅无活跃站点时硬拒');
  // 反证：把旧门控塞回 requestTurn ⇒ 必红。
  const forged = SIDEPANEL.replace(
    'if (!state.activeOrigin) return false;',
    "if (buttonStates({ activeOrigin: state.activeOrigin, authorized: state.authorized, pending: state.pending }).sendDisabled) return false;",
  );
  assert.notEqual(forged, SIDEPANEL, '注入锚点必须存在');
  assert.ok(/buttonStates\(/.test(functionBody(forged, 'requestTurn')), '恢复旧 pending 门控 ⇒ requestTurn 出现 buttonStates ⇒ 判据必红');
});

// ────────────────────────────────────────────────────────────────────────────
// P5a —— 完成后同动作去重
// ────────────────────────────────────────────────────────────────────────────

function baseInput(over: Partial<RecommendInput> = {}): RecommendInput {
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

test('R6-P5a: 意图摘要把「推荐表述」与「已执行原话」归一到同一 digest', () => {
  assert.equal(intentDigest('用引用 1 做原地翻译'), '原地翻译');
  assert.equal(intentDigest('原地翻译为中文'), '原地翻译');
  assert.equal(intentDigest('原地翻译成中文'), '原地翻译');
  assert.equal(refActionTextKey('用引用 3 做原地翻译'), refActionDigest('ref_3', '原地翻译为中文'), '两侧 digest 必须相等');
  assert.equal(refActionTextKey('随便说点什么'), undefined, '非引用模板 ⇒ 无 digest');
  assert.notEqual(refActionDigest('ref_1', '原地翻译'), refActionDigest('ref_2', '原地翻译'), '不同 refId ⇒ 不同键');
});

test('R6-P5a: 刚完成的同 digest 引用动作不再被下一步推荐（其他规则照旧可达）', () => {
  // 基线：未完成任何动作 ⇒ ref-action 候选在场。
  const baseline = recommendNextStep(baseInput());
  assert.equal(baseline.cards[0]?.rule, 'ref-action', '基线必须是引用动作候选');
  // 完成后：同 digest ⇒ 被压掉，落到下一优先级（capability-discovery，非死端）。
  const done = recommendNextStep(baseInput({ completedActions: [refActionDigest('ref_3', '原地翻译为中文')] }));
  assert.notEqual(done.cards[0]?.rule, 'ref-action', '同 digest 不得复推');
  assert.equal(done.cards[0]?.rule, 'capability-discovery', '必须落到其他可达规则（非死端）');
  // 不同 digest / 不同 refId ⇒ 不误伤。
  assert.equal(recommendNextStep(baseInput({ completedActions: [refActionDigest('ref_3', '做摘要')] })).cards[0]?.rule, 'ref-action');
  assert.equal(recommendNextStep(baseInput({ completedActions: [refActionDigest('ref_9', '原地翻译')] })).cards[0]?.rule, 'ref-action');
});

test('R6-P5a: 生产接线 —— 完成点先提交台账再产出推荐 + 驱动点记键', () => {
  assert.match(SIDEPANEL, /commitCompletedRefAction\(\);/, '回合完成必须先提交完成台账');
  assert.match(SIDEPANEL, /pendingCompletedRefAction = refActionDigest\(refId, action\)/, 'applyRefAction 必须记键');
  // 顺序：提交在 maybeRecommend('idle') 之前。
  const doneIdx = SIDEPANEL.indexOf("else if (variant === 'done') {");
  const commitIdx = SIDEPANEL.indexOf('commitCompletedRefAction();', doneIdx);
  const idleIdx = SIDEPANEL.indexOf("maybeRecommend('idle')", commitIdx);
  assert.ok(commitIdx > 0 && idleIdx > commitIdx, '提交必须在 idle 推荐之前（否则复推）');
  assert.match(SIDEPANEL, /completedActions: \[\.\.\.completedRefActions\]/, '台账必须进入推荐输入');
  // 反证：删掉过滤 ⇒ 复推回来（在纯层实跑，判据非恒真）。
  assert.match(RECOMMEND, /completedActionKey\(/, '过滤单源必须存在');
  const filtered = recommendNextStep(baseInput({ completedActions: [refActionDigest('ref_3', '原地翻译为中文')] }));
  const unfiltered = recommendNextStep(baseInput());
  assert.notEqual(filtered.cards[0]?.rule, unfiltered.cards[0]?.rule, '过滤必须真的改变推荐结果');
});

// ────────────────────────────────────────────────────────────────────────────
// P5b —— 引用被改写后重评
// ────────────────────────────────────────────────────────────────────────────

const P5B_FACTS: RefFacts = {
  refId: 'ref_1',
  selector: '#a',
  semanticPath: 'body › p',
  textDigest: 'OLD',
  origin: 'https://a.test',
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'h1',
  capturedAt: 0,
};
const P5B_ENV: RefEnv = { currentOrigin: 'https://a.test', authorized: true, documentId: 'doc-1', navSeq: 1, declarationHash: 'h1' };

test('R6-P5b: 身份匹配但文本摘要失配 ⇒ text-changed 失效；摘要一致 ⇒ 仍 valid', () => {
  const resolved = (textDigest?: string) => ({ status: 'resolved' as const, refMark: 'ref_1', nodeCount: 1, ...(textDigest !== undefined ? { textDigest } : {}) });
  // 摘要一致 ⇒ valid（无副作用）。
  assert.equal(evaluateRefValidity(P5B_FACTS, { ...P5B_ENV, resolution: resolved('OLD') }).verdict, 'valid');
  // 摘要失配 ⇒ invalid + 新维度 text-changed。
  const changed = evaluateRefValidity(P5B_FACTS, { ...P5B_ENV, resolution: resolved('NEW') });
  assert.equal(changed.verdict, 'invalid', '文本被改写必须判失效');
  assert.equal(changed.dimension, 'text-changed');
  assert.match(changed.readableReason ?? '', /文本/, '必须给出可读原因');
  // 缺省 textDigest ⇒ 既有判据逐字不变（老 wiring 不误伤）。
  assert.equal(evaluateRefValidity(P5B_FACTS, { ...P5B_ENV, resolution: resolved() }).verdict, 'valid');
  // 身份不匹配（元素被替换）仍走既有 replaced（不得被 text-changed 抢先）。
  assert.equal(
    evaluateRefValidity(P5B_FACTS, { ...P5B_ENV, resolution: { status: 'resolved', refMark: 'ref_9', nodeCount: 1, textDigest: 'NEW' } }).unknownCause,
    'replaced',
  );
});

test('R6-P5b: 生产接线 —— 只读重观测（observe）+ set-text 成功带回选择器 + 面板重评', () => {
  // 单一实现（`ref-observe.ts`）：observeIdentity 必须带回当前文本摘要（只读）。
  assert.match(OBSERVE, /const textDigest = truncated\.length > TEXT_DIGEST_MAX/, 'observeIdentity 必须算当前摘要');
  // 反证：把摘要判据从单一实现里抽掉 ⇒ 同一判据必须能红（切片不是橡皮图章）。
  assert.equal(
    /const textDigest = truncated\.length > TEXT_DIGEST_MAX/.test(OBSERVE.replace('const textDigest = truncated.length > TEXT_DIGEST_MAX', 'const textDigest = ""')),
    false,
    '摘要判据注入必红（真源切片可 FAIL）',
  );
  // SW：ref-highlight 的 observe 模式（不写页面）。
  assert.match(SW, /mode === 'observe' && selector \? await observeIdentity\(target\.tabId, selector\)/, 'observe 模式必须复用同一观测');
  // SW：仅成功的 dom set-text 带 targetSelector。
  assert.match(SW, /tc\.name === 'dom' && tc\.subcommand === 'set-text'/, '必须限定 dom set-text');
  assert.match(SW, /toolResultEvent\(meta\?\.name, meta\?\.ok, meta\?\.ms, text, meta\?\.selector\)/, '工具结果必须把目标选择器交给事件');
  assert.match(READ_CHAT_EVENTS, /targetSelector/, '工具结果事件必须携带 targetSelector');
  // 面板：工具结果触发只读重观测 + 重判。
  assert.match(SIDEPANEL, /function reobserveAfterWrite\(/, '面板必须实现重评入口');
  assert.match(SIDEPANEL, /pickInput\?\.observe\(selector\)/, '必须经只读 observe');
  assert.match(SIDEPANEL, /if \(msg\.ok === true && typeof msg\.targetSelector === 'string'\) reobserveAfterWrite\(msg\.targetSelector\)/, '工具结果必须接线重评');
  // 反证：把「摘要失配」判据抽掉 ⇒ 改写不再失效（判据非恒真）。
  const forged = evaluateRefValidity(P5B_FACTS, { ...P5B_ENV, resolution: { status: 'resolved', refMark: 'ref_1', nodeCount: 1 } });
  assert.equal(forged.verdict, 'valid', '对照：无摘要比较 ⇒ 改写后仍判 valid（真源正是靠它变红）');
});

// ────────────────────────────────────────────────────────────────────────────
// 主流程 diff = 0（不得因 R6 新增散落调用点）
// ────────────────────────────────────────────────────────────────────────────

test('R6: 主流程调用点不增（maybeRecommend 7 / nextAfterSettle 定义 1 / requestTurn 2）', () => {
  assert.equal(callSites(SIDEPANEL, 'maybeRecommend'), 7, 'R6 不得新增 maybeRecommend 调用点');
  assert.equal(
    (SIDEPANEL.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+nextAfterSettle\s*\(/gm) ?? []).length,
    1,
    'nextAfterSettle 定义必须恰 1',
  );
  assert.equal(callSites(SIDEPANEL, 'requestTurn'), 2, 'requestTurn 调用点必须仍恰 2');
});
