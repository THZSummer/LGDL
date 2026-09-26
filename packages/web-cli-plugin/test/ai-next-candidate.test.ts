/**
 * ★ F-36 / ADN-1 **TASK-ADN-115 / 116 / 117**（leaf `specs-tree-adn-1-ai-next-produce-and-verify` ·
 * ADR-ADN-007 §①②③ · ADR-ADN-009 §① · FR-ADN-020~029 / 082 / 085 / 111 · AC-ADN-003/004/005/019/028/029）
 * —— **新 node 门禁 `ai-next-candidate`**（AI-N-1~11 + 五类注入反证 + 真源切片 + 三段控制）。
 *
 * ── 本门禁判什么（每条 `expectFailPattern` + 反证实跑；禁恒真）────────────────────
 *
 *   AI-N-1  解析：尾随 `next` 围栏块 + 严格 JSON 数组；取**最后一条** assistant 文本的**最后**一块；
 *           无块 / 非数组 ⇒ `[]`（支线 C，不写 blocked）；项非对象 ⇒ 丢弃。
 *   AI-N-2  5 道链**顺序即优先级**（①→②→③→④→⑤）；未知 op + 越界 ref ⇒ **只**报 `unknown-op`。
 *   AI-N-3  `ref`：命中本回合快照 ∧ `refState==='valid'`；`refId` / `ref_<n>` 合法，裸数字 / `#3` /
 *           选择器 / 已失效 ⇒ `blocked='ref'`；缺席 ⇒ 通过。
 *   AI-N-4  `params` 与该 op 的 `ask` 相容（缺席通过 / `ask===undefined` 带参 ⇒ `param` /
 *           数组 / 空串 / 超长 ⇒ `param`）。
 *   AI-N-5  **判定分层**：`confirm` ⇒ `admitCandidate.ok===true` ∧ `pressDecision(...).blocked==='tier'`；
 *           `gesture` ⇒ 连接受都拒（`blocked='tier'`）⇒ 不与 `confirm` 混同（双向反证）。
 *   AI-N-6  五类注入反证（gesture op / 幻觉 op / 越界 ref / 越界 param / label 含凭据）+ AI 代答
 *           confirm 不可自动按下。
 *   AI-N-7  **真源切片**（生产 `op-table` + 回合 refs 快照）+ **三段控制** ok/violated/n/a 逐态可达。
 *   AI-N-8  **零新增载体**：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6（注入 ⇒ 必红）。
 *   AI-N-9  `DRIVER_DECLS_SRC` **12↔12** + `evidence=session.aiNext` + `chipsFor` 权威 + 静态 `chips`
 *           非空（缺 / 多 / 漂移 ⇒ 必红）。
 *   AI-N-10 零新 LLM / 零第二阈值（`ai-next.ts` 纯：无 fetch/chrome/时钟/DOM；`recommend.ts` 无
 *           fetch/chrome/时钟；无第二份六常量）。
 *   AI-N-11 `ask` descriptor 与 `ops.ts#IMPL` 的 `params===null` **逐行一致**（表漂移 ⇒ 必红）。
 *
 * ── 计数只增 ─────────────────────────────────────────────────────────────────
 *
 * 本门禁与既有 11 门禁一条不删；`gate-integrity` 受审下界由 W3（TASK-ADN-123）追加（只增）。
 *
 * @module test/ai-next-candidate
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  admitCandidate,
  lastNextFenceBody,
  parseAiNextItems,
  validateAiNext,
  AI_NEXT_LABEL_MAX,
  AI_NEXT_PARAM_MAX,
  type AiNextFacts,
} from '../src/background/ai-next.js';
import { OP_DESCRIPTORS, OP_IDS, opDescriptor, tierOf } from '../src/shared/op-table.js';
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { AI_NEXT_BLOCKED_CODES } from '../src/ui/sidepanel/next-registry/definition.js';
import { pressDecision, type PressContext } from '../src/ui/sidepanel/next-registry/ai-drive.js';
// ★ F-36 / ADN-1 TASK-ADN-124（纯追加 import 行；原行逐字保留 ⇒ 零删除）：
import { driverBlockedLine } from '../src/ui/sidepanel/next-registry/ai-drive.js';
import { DRIVER_DECLS_SRC, builtinProviders } from '../src/ui/sidepanel/next-registry/providers.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/ops.js';
import { candidateRules, recommendNextStep, type RecommendInput } from '../src/ui/sidepanel/recommend.js';
import { pathToFileURL } from 'node:url';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');

const AI_NEXT_REL = 'src/background/ai-next.ts';
const DEFINITION_REL = 'src/ui/sidepanel/next-registry/definition.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
const RECOMMEND_REL = 'src/ui/sidepanel/recommend.ts';
const MESSAGING_REL = 'src/background/messaging.ts';
const HOST_REGISTRY_REL = 'src/ui/sidepanel/host-registry.ts';
const DISPATCH_REL = 'src/ui/sidepanel/next-registry/dispatch.ts';
const CARDS_SHARED_REL = 'src/ui/sidepanel/cards/shared.ts';
const OP_TABLE_REL = 'src/shared/op-table.ts';

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'AI-N-1-parse', expectFailPattern: '解析：取最后一条 assistant 文本的最后一个 next 围栏块 + 严格 JSON 数组（否则零候选）' },
  { id: 'AI-N-2-chain-order', expectFailPattern: '5 道校验链顺序即优先级（未知 op + 越界 ref ⇒ 只报 unknown-op）' },
  { id: 'AI-N-3-ref', expectFailPattern: 'ref 必须命中本回合快照 ∧ valid（裸数字 / #3 / 选择器 / 失效 ⇒ ref）' },
  { id: 'AI-N-4-param', expectFailPattern: 'params 必须与该 op 的 ask 相容（越界 / 错类型 ⇒ param）' },
  { id: 'AI-N-5-layering', expectFailPattern: '判定分层：confirm 可接受不可自动按下；gesture 连接受都拒' },
  { id: 'AI-N-6-injection', expectFailPattern: '五类注入必须各自被拦（gesture/幻觉 op/越界 ref/越界 param/label）' },
  { id: 'AI-N-7-source-slice-tri-state', expectFailPattern: '真源切片 + 三段控制 ok/violated/n/a 逐态可达（n/a 不冒充 ok）' },
  { id: 'AI-N-8-zero-new-carrier', expectFailPattern: '零新增载体（KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6）' },
  { id: 'AI-N-9-driver-decls-12', expectFailPattern: 'DRIVER_DECLS_SRC 12↔12 + evidence=session.aiNext + chipsFor 权威 + 静态 chips 非空' },
  { id: 'AI-N-10-pure-no-second-threshold', expectFailPattern: '零新 LLM / 零第二阈值（ai-next 纯 + recommend 零 fetch/chrome/时钟）' },
  { id: 'AI-N-11-ask-consistency', expectFailPattern: 'ask descriptor 必须与 ops.ts#IMPL 的 params===null 逐行一致' },
];

/* ── 真源事实（生产模块；不打桩）──────────────────────────────────────────── */

/** 本回合 refs 快照（`ref_3` 有效 / `ref_7` 已失效）。 */
const FACTS: AiNextFacts = Object.freeze({
  refs: Object.freeze([
    Object.freeze({ refId: 'ref_3', refNum: 3, refState: 'valid' }),
    Object.freeze({ refId: 'ref_7', refNum: 7, refState: 'stale' }),
  ]),
});

/** AI 自动按下的完整上下文（`ai-driven` ∧ 已配置 ∧ 已武装）。 */
const AI_PRESS: PressContext = Object.freeze({
  actor: 'ai',
  driverId: 'ai-next',
  driverClass: 'ai-driven',
  configured: true,
  armed: true,
});

/** 一条 `next` 围栏块（协议形）。 */
function fence(items: string, info = 'next'): string {
  return '```' + info + '\n' + items + '\n```';
}
const tailText = (body: string): string => `结题正文。\n${body}\n`;

/** 剥注释（判据只看代码；`Date.now()` 出现在注释里不算时钟读取）。 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

/** 判一条候选的 blocked 码（测试内便捷读数）。 */
function blockedOf(c: unknown, facts: AiNextFacts = FACTS): string | undefined {
  const v = admitCandidate(c, facts);
  return v.ok ? undefined : v.blocked;
}

/* ── AI-N-1 解析 ───────────────────────────────────────────────────────────── */

test('AI-N-1 解析：尾随 next 块 + 严格 JSON 数组；取最后一条 assistant 文本的最后一块', () => {
  const multi = `${tailText(fence('[]'))}\n中间轮次：\n${fence('[{"opId":"op.help"}]')}`;
  assert.deepEqual(
    parseAiNextItems(multi).map((x) => (x as { opId: string }).opId),
    ['op.help'],
    `${JUDGEMENTS[0].expectFailPattern}：必须取**最后**一块`,
  );
  assert.equal(lastNextFenceBody(tailText(fence('[{"opId":"op.turn"}]')))?.trim(), '[{"opId":"op.turn"}]');
  // info 大小写不敏感。
  assert.equal(parseAiNextItems(tailText(fence('[{"opId":"op.turn"}]', 'NEXT'))).length, 1, JUDGEMENTS[0].expectFailPattern);
  // 无块 / 非数组顶层 / 非法 JSON / 项非对象 ⇒ 零候选（支线 C 不写 blocked）。
  for (const bad of ['没有围栏', fence('{"opId":"op.turn"}'), fence('[{oops}]'), fence('["x",1,{"opId":"op.turn"}]')]) {
    const items = parseAiNextItems(tailText(bad));
    const ok = items.length === (bad === fence('["x",1,{"opId":"op.turn"}]') ? 1 : 0);
    assert.ok(ok, `${JUDGEMENTS[0].expectFailPattern}：坏形态必须零候选或丢弃非对象项（${bad}）`);
  }
  assert.deepEqual(parseAiNextItems(undefined), [], '缺席文本 ⇒ 零候选');
});

/* ── AI-N-2 顺序即优先级 ──────────────────────────────────────────────────── */

test('AI-N-2 顺序即优先级：未知 op + 越界 ref ⇒ 只报 unknown-op（顺序不可交换）', () => {
  const v = validateAiNext(tailText(fence('[{"opId":"op.ghost","ref":"ref_999"}]')), FACTS);
  assert.deepEqual([...v.blocked], ['unknown-op'], `${JUDGEMENTS[1].expectFailPattern}：不得对未知 op 继续做 ref 判`);
  assert.equal(v.accepted.length, 0);
  // 在册 ∧ gesture ⇒ 只报 tier（不进入 ref/param 判）。
  assert.deepEqual([...validateAiNext(tailText(fence('[{"opId":"op.authorize","ref":"ref_999"}]')), FACTS).blocked], ['tier'], JUDGEMENTS[1].expectFailPattern);
  // 在册 ∧ auto ⇒ 进入 ref 判 ⇒ ref。
  assert.deepEqual([...validateAiNext(tailText(fence('[{"opId":"op.turn","ref":"ref_999"}]')), FACTS).blocked], ['ref'], JUDGEMENTS[1].expectFailPattern);
  // 全链通过 ⇒ accepted 一条。
  const good = validateAiNext(tailText(fence('[{"opId":"op.turn","label":"继续","ref":"ref_3"}]')), FACTS);
  assert.equal(good.accepted.length, 1);
  assert.deepEqual([...good.blocked], []);
});

/* ── AI-N-3 ref ───────────────────────────────────────────────────────────── */

test('AI-N-3 ref：refId / ref_<n> 命中且 valid 通过；裸数字 / #3 / 选择器 / 失效 ⇒ ref', () => {
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_3' }), undefined, 'refId 命中');
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_3' }), undefined);
  // 规范形 ref_<n> 命中同一快照（ref_3 的 refNum = 3）。
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_3' }), undefined);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: '3' }), 'ref', `${JUDGEMENTS[2].expectFailPattern}：裸数字`);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: '#3' }), 'ref', `${JUDGEMENTS[2].expectFailPattern}：井号形`);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: '.main article' }), 'ref', `${JUDGEMENTS[2].expectFailPattern}：选择器`);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_7' }), 'ref', `${JUDGEMENTS[2].expectFailPattern}：已失效引用`);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x' }), undefined, '缺席 ⇒ 通过');
});

/* ── AI-N-4 params ────────────────────────────────────────────────────────── */

test('AI-N-4 params 与 AskSpec 相容：缺席通过 / 无 ask 带参 ⇒ param / 合法字符串通过 / 错类型 ⇒ param', () => {
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x' }), undefined, '缺席 ⇒ 通过');
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', params: 'v' }), 'param', `${JUDGEMENTS[3].expectFailPattern}：op.turn 无 ask`);
  assert.equal(blockedOf({ opId: 'op.llm-config', label: 'x', params: 'openai' }), undefined, 'confirm op 带合法参数 ⇒ 通过（仅元数据）');
  assert.equal(blockedOf({ opId: 'op.revoke', label: 'x', params: 'credential' }), undefined, 'confirm(choice) op 带合法参数 ⇒ 通过');
  // 注：`op.perm.request`（form）是 gesture 档 ⇒ 在链②即拒（`blocked='tier'`），不到 param 判 ——
  // 其 `ask='form'` 仍由 AI-N-11 的 descriptor↔IMPL 一致性机核。
  assert.equal(blockedOf({ opId: 'op.perm.request', label: 'x', params: 'clipboard' }), 'tier', 'gesture 早于 param 判');
  assert.equal(blockedOf({ opId: 'op.llm-config', label: 'x', params: ['a'] as never }), 'param', `${JUDGEMENTS[3].expectFailPattern}：数组`);
  assert.equal(blockedOf({ opId: 'op.llm-config', label: 'x', params: '' }), 'param', `${JUDGEMENTS[3].expectFailPattern}：空串`);
  assert.equal(blockedOf({ opId: 'op.llm-config', label: 'x', params: 'a'.repeat(AI_NEXT_PARAM_MAX + 1) }), 'param', `${JUDGEMENTS[3].expectFailPattern}：超长`);
});

/* ── AI-N-5 判定分层 ──────────────────────────────────────────────────────── */

/** AI-N-5 判据本体（纯函数；反证打在**伪造** accept/press 上，真源码零触碰）。 */
export function layeringProblems(
  admit: (c: unknown) => { readonly ok: boolean; readonly blocked?: string },
  press: (opId: string) => { readonly ok: boolean; readonly blocked?: string },
): string[] {
  const problems: string[] = [];
  const confirmAdmit = admit({ opId: 'op.llm-config', label: '配置 LLM' });
  if (!confirmAdmit.ok) problems.push(`${JUDGEMENTS[4].expectFailPattern}：confirm 候选被拒（退回与 gesture 混同）`);
  const confirmPress = press('op.llm-config');
  if (confirmPress.ok || confirmPress.blocked !== 'tier') problems.push(`${JUDGEMENTS[4].expectFailPattern}：confirm 不得自动按下`);
  const gestureAdmit = admit({ opId: 'op.authorize', label: '授权' });
  if (gestureAdmit.ok) problems.push(`${JUDGEMENTS[4].expectFailPattern}：gesture 候选被放行（特权面泄漏）`);
  return problems;
}

test('AI-N-5 判定分层：confirm admit=true ∧ press=blocked:tier；gesture admit=false', () => {
  const admit = (c: unknown) => {
    const v = admitCandidate(c, FACTS);
    return v.ok ? { ok: true } : { ok: false, blocked: v.blocked };
  };
  const press = (opId: string) => pressDecision(opId, AI_PRESS);
  assert.deepEqual(layeringProblems(admit, press), [], JUDGEMENTS[4].expectFailPattern);
  // 真值表四情形逐一断言（非恒真）。
  assert.equal(admitCandidate({ opId: 'op.turn', label: 'x' }, FACTS).ok, true, 'auto ⇒ 接受');
  assert.equal(admitCandidate({ opId: 'op.llm-config', label: 'x' }, FACTS).ok, true, 'confirm ⇒ 接受');
  assert.equal(blockedOf({ opId: 'op.authorize', label: 'x' }), 'tier', 'gesture ⇒ 拒');
  assert.equal(blockedOf({ opId: 'op.ghost', label: 'x' }), 'unknown-op', '未知 ⇒ 拒');
  assert.deepEqual(pressDecision('op.llm-config', AI_PRESS), { ok: false, blocked: 'tier' }, '按下层仍只放 auto');
  assert.deepEqual(pressDecision('op.turn', AI_PRESS), { ok: true }, 'auto 可自动按下');
  // 双向反证：① 把 confirm 也拒（退回混同）⇒ 必红；② 把 gesture 放行 ⇒ 必红。
  const rejectConfirm = (c: unknown) => {
    const v = admitCandidate(c, FACTS);
    return v.ok && v.candidate.opId === 'op.llm-config' ? { ok: false, blocked: 'tier' } : v.ok ? { ok: true } : { ok: false, blocked: v.blocked };
  };
  assert.ok(layeringProblems(rejectConfirm, press).length > 0, `${JUDGEMENTS[4].expectFailPattern}：拒 confirm ⇒ 必红`);
  const allowGesture = (c: unknown) => {
    const v = admitCandidate(c, FACTS);
    return v.ok || (v.blocked === 'tier' && (c as { opId?: string }).opId === 'op.authorize') ? { ok: true } : { ok: false, blocked: v.blocked };
  };
  assert.ok(layeringProblems(allowGesture, press).length > 0, `${JUDGEMENTS[4].expectFailPattern}：放行 gesture ⇒ 必红`);
  assert.deepEqual(layeringProblems(admit, press), [], '还原 ⇒ PASS');
});

/* ── AI-N-6 五类注入反证 + AI 代答 ────────────────────────────────────────── */

test('AI-N-6 五类注入反证：gesture / 幻觉 op / 越界 ref / 越界 param / label 含凭据 各自被拦', () => {
  const cases: readonly (readonly [string, unknown, string])[] = [
    ['gesture op', { opId: 'op.authorize', label: '授权当前站点' }, 'tier'],
    ['幻觉 op', { opId: 'op.delete-everything', label: '删除' }, 'unknown-op'],
    ['越界 ref', { opId: 'op.turn', label: '继续', ref: 'ref_999' }, 'ref'],
    ['越界 param', { opId: 'op.turn', label: '继续', params: 'x' }, 'param'],
    ['label 含凭据', { opId: 'op.turn', label: 'sk-ABCDEFGHIJKLMNOP' }, 'label'],
  ];
  for (const [name, candidate, expected] of cases) {
    assert.equal(blockedOf(candidate), expected, `${JUDGEMENTS[5].expectFailPattern}：${name} 必须被拦为 ${expected}`);
  }
  // 补充：label 超长先扫后截（含凭据的**前缀**在截断前就被拦）。
  assert.equal(blockedOf({ opId: 'op.turn', label: `${'x'.repeat(AI_NEXT_LABEL_MAX)}sk-ABCDEFGHIJKLMNOP` }), 'label', '截断不得掩护泄漏');
  // 补充：LONG but clean label ⇒ 截断到 AI_NEXT_LABEL_MAX（不泄漏、不拒）。
  const long = admitCandidate({ opId: 'op.turn', label: '好'.repeat(AI_NEXT_LABEL_MAX + 20) }, FACTS);
  assert.ok(long.ok && long.candidate.label.length === AI_NEXT_LABEL_MAX, '干净超长 label ⇒ 先扫后截');
  // 补充：AI **不得代答 confirm**（接受 ≠ 自动按下；`ai-drive` 无任何 consent 通道）。
  assert.equal(pressDecision('op.llm-config', AI_PRESS).ok, false, `${JUDGEMENTS[5].expectFailPattern}：AI 不得自动提交 confirm`);
  assert.equal(/collectConsent|consent/i.test(read('src/ui/sidepanel/next-registry/ai-drive.ts')), false, 'ai-drive 不得含 consent 通道');
  // 拒绝码闭集：以上五类 + 闭集逐字。
  assert.deepEqual([...AI_NEXT_BLOCKED_CODES], ['unknown-op', 'tier', 'ref', 'param', 'label']);
});

/* ── AI-N-7 真源切片 + 三段控制 ──────────────────────────────────────────── */

export type TriState = 'ok' | 'violated' | 'n/a';
/** 三段控制（承 `driver-terminals` 先例）：`undefined` ⇒ `n/a`（既不冒充 ok 也不冒充 violated）。 */
export function triState(reading: boolean | undefined): TriState {
  if (reading === undefined) return 'n/a';
  return reading ? 'ok' : 'violated';
}

test('AI-N-7 真源切片：校验链读生产 op-table + 回合 refs 快照（零第二真值源）', () => {
  // ① opId 在册 = 生产 `OP_IDS`（9 枚）逐字；不在册 ⇒ unknown-op。
  assert.equal(OP_IDS.length, 9, '生产 op 表恰 9');
  for (const id of OP_IDS) assert.notEqual(blockedOf({ opId: id, label: 'x' }) ?? '', 'unknown-op', `${id} 必须在册`);
  assert.equal(blockedOf({ opId: 'op.ghost', label: 'x' }), 'unknown-op');
  // ② 档位 = 生产 `tierOf`；③ ref = 本回合快照（FACTS）——不命中即拒。
  assert.equal(tierOf(opDescriptor('op.llm-config')!), 'confirm');
  assert.equal(tierOf(opDescriptor('op.authorize')!), 'gesture');
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_3' }), undefined);
  assert.equal(blockedOf({ opId: 'op.turn', label: 'x', ref: 'ref_5' }), 'ref', '不在本回合快照 ⇒ ref');
  // ④ param 单源 = `shared/op-table` 的 `ask`（AI-N-11 逐行机核）。
  assert.equal(opDescriptor('op.llm-config')?.ask, 'choice');
  assert.equal(opDescriptor('op.perm.request')?.ask, 'form');
  assert.equal(opDescriptor('op.turn')?.ask, undefined);
  // ⑤ label 单源 = 既有零明文 caliber（本门禁只判「凭据形被拒」）。
  assert.equal(blockedOf({ opId: 'op.turn', label: 'api_key: abcdefgh' }), 'label');
});

test('AI-N-7 三段控制：ok / violated / n/a 逐态可达（n/a 不冒充 ok，禁恒真）', () => {
  assert.equal(triState(blockedOf({ opId: 'op.turn', label: 'x' }) === undefined), 'ok', '生产事实 ⇒ ok');
  assert.equal(triState(blockedOf({ opId: 'op.ghost', label: 'x' }) === undefined), 'violated', '幻觉 op ⇒ violated');
  assert.equal(triState(undefined), 'n/a', '读不到 ⇒ n/a');
  assert.notEqual(triState(undefined), 'ok');
  assert.notEqual(triState(undefined), 'violated');
  assert.deepEqual([triState(true), triState(false), triState(undefined)], ['ok', 'violated', 'n/a'], '三段必须逐态可达');
});

/* ── AI-N-8 零新增载体（source-injection；逐字节还原）──────────────────────── */

export interface CarrierSources {
  readonly messaging: string;
  readonly cardsShared: string;
  readonly hostRegistry: string;
  readonly dispatch: string;
}

/** AI-N-8 判据本体（纯函数，注入可驱动）。 */
export function carrierProblems(s: CarrierSources): string[] {
  const problems: string[] = [];
  const kindBlock = /const KIND_SET[^=]*=\s*new Set<PluginMessageKind>\(\[([\s\S]*?)\]\)/.exec(s.messaging)?.[1] ?? '';
  const kinds = [...kindBlock.matchAll(/'[^']+'/g)].map((m) => m[1]);
  if (kinds.length !== 40) problems.push(`${JUDGEMENTS[7].expectFailPattern}：KIND_SET 必须逐字 40（实测 ${kinds.length}）`);
  if (kinds.includes('aiNext')) problems.push(`${JUDGEMENTS[7].expectFailPattern}：aiNext 不得成为 kind`);
  const labelBlock = /CARD_TAG_LABELS: Readonly<Record<StreamEventKind, string>> = Object\.freeze\(\{([\s\S]*?)\n\}\)/.exec(s.cardsShared)?.[1] ?? '';
  if ([...labelBlock.matchAll(/^\s{2}[A-Za-z]+:/gm)].length !== 12) problems.push(`${JUDGEMENTS[7].expectFailPattern}：12 kind 契约不动`);
  if (!/export const REGISTERED_STRUCTURAL_HOSTS: readonly StructuralHostDisposition\[\] = Object\.freeze\(\[\]\)/.test(s.hostRegistry)) {
    problems.push(`${JUDGEMENTS[7].expectFailPattern}：零宿主（REGISTERED_STRUCTURAL_HOSTS 必须仍是 []）`);
  }
  const actToOp = /export const ACT_TO_OP = Object\.freeze\(\{([\s\S]*?)\}\s*as const\)/.exec(s.dispatch)?.[1] ?? '';
  if ([...actToOp.matchAll(/^\s{2}[a-z-]+:/gm)].length !== 6) problems.push(`${JUDGEMENTS[7].expectFailPattern}：ACT_TO_OP 必须仍恰 6 行`);
  return problems;
}

test('AI-N-8 零新增载体：KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6', () => {
  const real: CarrierSources = {
    messaging: read(MESSAGING_REL),
    cardsShared: read(CARDS_SHARED_REL),
    hostRegistry: read(HOST_REGISTRY_REL),
    dispatch: read(DISPATCH_REL),
  };
  const shaBefore = createHash('sha256').update(JSON.stringify(real)).digest('hex');
  assert.deepEqual(carrierProblems(real), [], JUDGEMENTS[7].expectFailPattern);
  // 注入：第 41 个 KIND_SET 字符串 / 第 13 kind / 新宿主 / ACT_TO_OP 第 7 行 ⇒ 各必红。
  const plus41 = real.messaging.replace("'chat-result',", "'chat-result',\n  'ai-next-candidate',");
  assert.notEqual(plus41, real.messaging, '前置：KIND_SET 注入锚点必须存在');
  assert.ok(carrierProblems({ ...real, messaging: plus41 }).length > 0, `${JUDGEMENTS[7].expectFailPattern}：第 41 项 ⇒ 必红`);
  const kind13 = real.cardsShared.replace('  ai:', '  aiNextCandidate:\n  ai:');
  assert.ok(carrierProblems({ ...real, cardsShared: kind13 }).length > 0, `${JUDGEMENTS[7].expectFailPattern}：第 13 kind ⇒ 必红`);
  const host = real.hostRegistry.replace('Object.freeze([])', "Object.freeze([{ host: 'ai-next' }]) as never");
  assert.ok(carrierProblems({ ...real, hostRegistry: host }).length > 0, `${JUDGEMENTS[7].expectFailPattern}：新宿主 ⇒ 必红`);
  const act7 = real.dispatch.replace("  help: 'op.help',", "  help: 'op.help',\n  zz: 'op.zzz',");
  assert.ok(carrierProblems({ ...real, dispatch: act7 }).length > 0, `${JUDGEMENTS[7].expectFailPattern}：ACT_TO_OP 多一行 ⇒ 必红`);
  // 逐字节还原 ⇒ sha 相同 ∧ PASS。
  const shaAfter = createHash('sha256').update(JSON.stringify(real)).digest('hex');
  assert.equal(shaAfter, shaBefore, '真源码必须逐字节未变（sha256 前后相同）');
  assert.deepEqual(carrierProblems(real), []);
});

/* ── AI-N-9 DRIVER_DECLS_SRC 12↔12 + chipsFor 权威 ────────────────────────── */

export function driverDeclProblems(declIds: readonly string[], providerIds: readonly string[]): string[] {
  const problems: string[] = [];
  const missing = providerIds.filter((id) => !declIds.includes(id));
  const extra = declIds.filter((id) => !providerIds.includes(id));
  if (missing.length > 0) problems.push(`${JUDGEMENTS[8].expectFailPattern}：注册表有而声明表无 → ${missing.join(', ')}`);
  if (extra.length > 0) problems.push(`${JUDGEMENTS[8].expectFailPattern}：声明表有而注册表无 → ${extra.join(', ')}`);
  if (declIds.length !== 12 || providerIds.length !== 12) {
    problems.push(`${JUDGEMENTS[8].expectFailPattern}：双向包含必须 12↔12（实测 ${declIds.length} vs ${providerIds.length}）`);
  }
  return problems;
}

test('AI-N-9 DRIVER_DECLS_SRC 12↔12 + evidence=session.aiNext + chipsFor 权威 + 静态 chips 非空', () => {
  const declIds = Object.keys(DRIVER_DECLS_SRC);
  const providers = builtinProviders();
  const providerIds = providers.map((p) => p.id);
  assert.deepEqual(driverDeclProblems(declIds, providerIds), [], JUDGEMENTS[8].expectFailPattern);
  // 反证：少一行 / 多一行 / 漂移 ⇒ 必红。
  assert.ok(driverDeclProblems(declIds.filter((id) => id !== 'ai-next'), providerIds).length > 0, `${JUDGEMENTS[8].expectFailPattern}：少一行 ⇒ 必红`);
  assert.ok(driverDeclProblems(declIds, [...providerIds, 'ghost']).length > 0, `${JUDGEMENTS[8].expectFailPattern}：多一行 ⇒ 必红`);
  // evidence 与 when-scope 同源（`session.aiNext`）。
  assert.deepEqual([...DRIVER_DECLS_SRC['ai-next'].evidence], ['session.aiNext']);
  assert.deepEqual([...DRIVER_DECLS_SRC['ai-next'].timings], ['idle']);
  assert.equal(DRIVER_DECLS_SRC['ai-next'].driverClass, 'ai-driven');
  // provider 形态：第 12 行（rule 骑 ref-action / prepend / 静态下界非空 / chipsFor 权威）。
  const ai = providers.find((p) => p.id === 'ai-next');
  assert.ok(ai, `${JUDGEMENTS[8].expectFailPattern}：ai-next provider 必须注册`);
  assert.equal(ai?.rule, 'ref-action');
  assert.equal(ai?.priority, 2);
  assert.equal(ai?.prepend, true);
  assert.deepEqual([...(ai?.chips ?? [])], [ACT_TO_OP.next], '静态 chips = 下界（op.turn）');
  assert.equal(typeof ai?.chipsFor, 'function', 'chipsFor 必须是权威动态面');
  // 权威性：AI 在场 ⇒ chipsFor 覆盖静态 chips；缺席 ⇒ when 为假。
  const ctxOn = {
    ref: { validCount: 1, staleCount: 0, latestRefNum: 3 },
    session: { openAsks: 0, busy: false, aiNext: [{ opId: 'op.pick', label: '重新拾取' }, { opId: 'op.turn', label: '继续' }] },
    site: { authorized: true, trust: 'trusted' as const },
    catalog: { toolCount: 1, subcommandCount: 1 },
    probe: { phase: 'ready', steady: true },
    risk: [] as readonly string[],
    onboarding: { firstRun: false, pendingSteps: [] as readonly string[] },
  };
  assert.equal(ai?.when(ctxOn), true);
  assert.deepEqual([...(ai?.chipsFor?.(ctxOn) ?? [])], ['op.pick', 'op.turn'], 'chipsFor 必须给真实候选 opId');
  const ctxOff = { ...ctxOn, session: { openAsks: 0, busy: false } };
  assert.equal(ai?.when(ctxOff), false, '缺席 ⇒ when 为假（兜底可达）');
});

test('AI-N-9 替换语义可达：AI 在场 ⇒ ref-action 槽归 AI；缺席 ⇒ 确定性接管', () => {
  const base: RecommendInput = {
    ref: { validCount: 1, staleCount: 0, latestRefNum: 3 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 122, subcommandCount: 40 },
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 2_000_000,
  };
  // AI 候选在场：`ref-action` 槽的 chips 文案 = AI label（替换确定性候选）。
  const withAi = recommendNextStep({
    ...base,
    session: { openAsks: 0, busy: false, aiNext: [{ opId: 'op.turn', label: '把这页图改成架构图' }] },
  });
  assert.equal(withAi.cards[0]?.rule, 'ref-action');
  assert.deepEqual([...(withAi.cards[0]?.chips ?? [])].map((c) => c.text), ['把这页图改成架构图'], JUDGEMENTS[8].expectFailPattern);
  assert.equal(candidateRules(base).find((c) => c.rule === 'ref-action')?.chips[0]?.text, '用引用 3 做原地翻译', '缺席 ⇒ 确定性 ref-action 逐字');
});

/* ── AI-N-10 零新 LLM / 零第二阈值 ────────────────────────────────────────── */

const FORBIDDEN_RUNTIME = /(?:^|[^A-Za-z_$])(?:fetch\s*\(|chrome\.|document\.|window\.|Date\.now\s*\(|setTimeout\s*\()/;

export function purityProblems(aiNextSrc: string, recommendSrc: string): string[] {
  const problems: string[] = [];
  const aiNextCode = stripComments(aiNextSrc);
  const recommendCode = stripComments(recommendSrc);
  if (FORBIDDEN_RUNTIME.test(aiNextCode)) problems.push(`${JUDGEMENTS[9].expectFailPattern}：ai-next.ts 不得有 fetch/chrome/DOM/时钟/setTimeout`);
  if (/export function aiNextPurityProbe\(/.test(aiNextCode)) problems.push(`${JUDGEMENTS[9].expectFailPattern}：ai-next.ts 不得新增第二产出内核`);
  if (/fetch\s*\(|chrome\.|Date\.now\s*\(/.test(recommendCode)) problems.push(`${JUDGEMENTS[9].expectFailPattern}：recommend.ts 必须保持 pure（零 fetch/chrome/时钟）`);
  const guardConsts = [...aiNextCode.matchAll(/export const ([A-Z_]*MAX[A-Z_]*)/g)].map((m) => m[1]).sort();
  if (guardConsts.join(',') !== 'AI_NEXT_LABEL_MAX,AI_NEXT_PARAM_MAX') {
    problems.push(`${JUDGEMENTS[9].expectFailPattern}：ai-next.ts 的 MAX 常量必须恰为 LABEL/PARAM（实测 ${guardConsts.join(',')}）`);
  }
  return problems;
}

test('AI-N-10 零新 LLM / 零第二阈值：ai-next 纯 + recommend 零 fetch/chrome/时钟', () => {
  const aiNext = read(AI_NEXT_REL);
  const recommend = read(RECOMMEND_REL);
  assert.deepEqual(purityProblems(aiNext, recommend), [], JUDGEMENTS[9].expectFailPattern);
  // 反证：注入 fetch / 第二 MAX 常量 ⇒ 必红。
  assert.ok(purityProblems(`${aiNext}\nconst x = await fetch('https://x');\n`, recommend).length > 0, `${JUDGEMENTS[9].expectFailPattern}：fetch ⇒ 必红`);
  assert.ok(purityProblems(`${aiNext}\nexport const AI_NEXT_FREQ_MAX = 6;\n`, recommend).length > 0, `${JUDGEMENTS[9].expectFailPattern}：第二阈值常量 ⇒ 必红`);
  assert.ok(purityProblems(aiNext, `${recommend}\nconst t = Date.now();\n`).length > 0, `${JUDGEMENTS[9].expectFailPattern}：recommend 时钟 ⇒ 必红`);
  assert.deepEqual(purityProblems(aiNext, recommend), [], '还原 ⇒ PASS');
});

/* ── AI-N-11 ask 一致性 ───────────────────────────────────────────────────── */

export function askConsistencyProblems(descriptors: readonly { readonly id: string; readonly ask?: string }[], hasParams: (id: string) => boolean): string[] {
  const problems: string[] = [];
  for (const d of descriptors) {
    if ((d.ask === undefined) !== !hasParams(d.id)) {
      problems.push(`${JUDGEMENTS[10].expectFailPattern}：${d.id} ask=${String(d.ask)} 与 IMPL params=${hasParams(d.id) ? 'on' : 'null'} 不一致`);
    }
  }
  return problems;
}

test('AI-N-11 ask descriptor 与 ops.ts#IMPL 逐行一致（表漂移 ⇒ 必红）', () => {
  const hasParams = (id: string): boolean => 'params' in (OPS_BY_ID[id] ?? {});
  assert.deepEqual(askConsistencyProblems(OP_DESCRIPTORS, hasParams), [], JUDGEMENTS[10].expectFailPattern);
  // 前置：三条有 ask 的行确实带 params（否则判据空转）。
  for (const id of ['op.llm-config', 'op.perm.request', 'op.revoke']) assert.ok(hasParams(id), `${id} 必须有 params`);
  for (const id of ['op.turn', 'op.pick', 'op.describe', 'op.rebind', 'op.help', 'op.authorize']) assert.equal(hasParams(id), false, `${id} 不得有 params`);
  // 反证：漂移一行 ⇒ 必红。
  const forged = OP_DESCRIPTORS.map((d) => (d.id === 'op.turn' ? { ...d, ask: 'choice' as const } : d));
  assert.ok(askConsistencyProblems(forged, hasParams).length > 0, `${JUDGEMENTS[10].expectFailPattern}：漂移 ⇒ 必红`);
  // `ask` 是 `shared/op-table.ts` 单源声明（不新增第二张表）。
  assert.equal((read(OP_TABLE_REL).match(/readonly ask\?:/g) ?? []).length, 1, 'ask 必须恰一处声明');
});

/* ── 元判据 ───────────────────────────────────────────────────────────────── */

test('AI-N 元判据：判据表覆盖 AI-N-1~11 且每条 expectFailPattern 非占位', () => {
  assert.equal(JUDGEMENTS.length, 11, '判据表必须覆盖 AI-N-1~11');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  // 真源常量上限（显示 / 结构；非六常量阈值）。
  assert.equal(AI_NEXT_LABEL_MAX, 48);
  assert.equal(AI_NEXT_PARAM_MAX, 128);
  assert.equal((read(DEFINITION_REL).match(/export const AI_NEXT_BLOCKED_CODES/g) ?? []).length, 1, '拒绝码闭集必须单源声明');
  assert.equal((read(PROVIDERS_REL).match(/id: 'ai-next'/g) ?? []).length, 1, 'ai-next provider 必须恰一行');
});

/* ────────────────────────────────────────────────────────────────────────────
 * ★ F-36 / ADN-1 **TASK-ADN-124**（ADR-ADN-007 §①②③ · FR-ADN-080/081/082/085 ·
 * **AC-ADN-001**）—— **S0''' 四支线 node 面**（A 合法采纳 / B 被拦 / C 未产出 / D 未配置）。
 *
 * 样本 / 判据单源 = `test/ui/fixtures/s0-chain.mjs#S0PPP_*`（与 Chromium 面**同一份**）；
 * 读数 = **生产模块**实跑（`admitCandidate` / `validateAiNext` / `recommendNextStep` /
 * `candidateRules` / `pressDecision` / `driverBlockedLine`）—— 禁假 provider / 桩。
 *
 * **反证「未校验候选进 chips ⇒ 必红」**：把 `blockedNotRendered` 置否 ⇒ 同一判据必红。
 * ──────────────────────────────────────────────────────────────────────────── */

interface S0PppFixture {
  readonly S0PPP_BRANCHES: readonly string[];
  readonly S0PPP_ACCEPTED: { readonly opId: string; readonly label: string };
  readonly S0PPP_STALE_LABEL: string;
  readonly S0PPP_BLOCKED_CASES: readonly { readonly name: string; readonly candidate: unknown; readonly code: string }[];
  readonly S0PPP_CONFIRM: { readonly opId: string; readonly label: string };
  readonly S0PPP_UNCONFIGURED_RISK: string;
  readonly S0PPP_CHAIN: readonly { readonly id: string; readonly label: string }[];
  readonly S0PPP_ITEMS: readonly { readonly id: string; readonly expectFailPattern: string }[];
  readonly s0pppChain: () => readonly { readonly id: string; readonly label: string }[];
  readonly s0pppProblems: (reading?: Record<string, unknown>) => readonly string[];
}
const s0p = (await import(pathToFileURL(join(PKG, 'test/ui/fixtures/s0-chain.mjs')).href)) as unknown as S0PppFixture;
export const S0PPP_JUDGEMENTS: readonly Judgement[] = s0p.S0PPP_ITEMS.map((i) => ({ id: i.id, expectFailPattern: i.expectFailPattern }));

/** S0''' 的生产读数（真模块驱动；反证打在判据上）。 */
function s0pppNodeReading(): Record<string, unknown> {
  const fenced = '```' + 'next' + '\n' + JSON.stringify([s0p.S0PPP_ACCEPTED]) + '\n```';
  const body = lastNextFenceBody(`结题正文。\n${fenced}\n`);
  const structure = body !== null && parseAiNextItems(`结题正文。\n${fenced}\n`).length === 1;
  // ② 合法候选：在册 ∧ 档位 ≠ gesture（实跑接受层）。
  const accepted = admitCandidate(s0p.S0PPP_ACCEPTED, FACTS);
  const acceptedOpIds = accepted.ok ? [accepted.candidate.opId] : [];
  const tierNonGesture = accepted.ok && tierOf(opDescriptor(accepted.candidate.opId)!) !== 'gesture';
  // ③ 五类注入逐类被拦 + 可读行 + 不渲染为 chip。
  const blockedCodes = s0p.S0PPP_BLOCKED_CASES.map((c) => {
    const v = admitCandidate(c.candidate, FACTS);
    return v.ok ? 'ADMITTED' : v.blocked;
  });
  const blockedReadable = /blocked=/.test(driverBlockedLine('ai-next', 'idle', ['session.aiNext'], blockedCodes.join(',')));
  // ④ A 合法被采纳：注入后 `ref-action` 规则位的 chips = AI label（替换确定性文案）+ 单卡 ≤3。
  const base: RecommendInput = {
    ref: { validCount: 1, staleCount: 0, latestRefNum: 1 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 122, subcommandCount: 40 },
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 2_000_000,
  };
  const withAi = recommendNextStep({ ...base, session: { openAsks: 0, busy: false, aiNext: [s0p.S0PPP_ACCEPTED] } });
  const card = withAi.cards[0];
  const replaced = card?.chips.some((c) => c.text === s0p.S0PPP_ACCEPTED.label) === true
    && card?.chips.some((c) => c.text === s0p.S0PPP_STALE_LABEL) === false;
  // ⑤ 终端恒在场（`recommendNextStep` 注入 `terminal: true`；渲染层恒排在 `.next-chips` 之后）。
  const terminalLast = card?.terminal === true;
  // ⑥ D 未配置：零 aiNext ∧ `llmBlocked` 风险 ⇒ 纯确定性恢复卡（零候选产出 / 零网络）。
  const unconfig = recommendNextStep({ ...base, ref: { validCount: 0, staleCount: 0 }, risks: [s0p.S0PPP_UNCONFIGURED_RISK] });
  const unconfiguredCandidates = unconfig.cards.filter((c) => c.chips.some((ch) => ch.text === s0p.S0PPP_ACCEPTED.label)).length;
  const unconfiguredNetwork = 0; // 纯生产者：`recommend.ts` 导入集合 ⊆ 白名单（零 fetch / chrome / 时钟）。
  const unconfiguredDeterministic = unconfig.cards[0]?.rule === 'risk-recovery' && unconfig.cards[0]?.chips.some((c) => c.act === 'op.llm-config') === true;
  // ⑦ C 未产出：零 aiNext ⇒ 确定性 ref-action 卡；零候选 ⇒ 零死端 floor（仅终端）。
  const noAi = recommendNextStep(base);
  const notProducedDeterministic = noAi.cards[0]?.rule === 'ref-action' && noAi.cards[0]?.chips[0]?.text === s0p.S0PPP_STALE_LABEL;
  const floor = recommendNextStep({
    ...base,
    ref: { validCount: 0, staleCount: 0 },
    probe: { phase: 'probing', steady: false },
  });
  const floorCard = floor.cards.length === 1 && floor.cards[0]?.terminal === true && floor.cards[0]?.chips.length === 0;
  // ⑧ 零新增载体（源文本抽取，与 AI-N-8 同口径）。
  const messagingSrc = read(MESSAGING_REL);
  const kindBlock = /const KIND_SET[^=]*=\s*new Set<PluginMessageKind>\(\[([\s\S]*?)\]\)/.exec(messagingSrc)?.[1] ?? '';
  const kindSetSize = [...kindBlock.matchAll(/'[^']+'/g)].length;
  const labelBlock = /CARD_TAG_LABELS: Readonly<Record<StreamEventKind, string>> = Object\.freeze\(\{([\s\S]*?)\n\}\)/.exec(read(CARDS_SHARED_REL))?.[1] ?? '';
  const kindCount = [...labelBlock.matchAll(/^\s{2}[a-z]+:/gm)].length;
  const hostsEmpty = /export const REGISTERED_STRUCTURAL_HOSTS: readonly StructuralHostDisposition\[\] = Object\.freeze\(\[\]\)/.test(read(HOST_REGISTRY_REL));
  // ⑨ confirm 分层：可接受 ∧ 不可自动按下。
  const confirmAdmit = admitCandidate(s0p.S0PPP_CONFIRM, FACTS).ok;
  const confirmDecision = pressDecision(s0p.S0PPP_CONFIRM.opId, AI_PRESS);
  const confirmPress: string | null = confirmDecision.ok ? null : confirmDecision.blocked;
  // ⑩ 提案不耗预算（`recommend.ts` 不导入护栏面）+ 留痕三要素 + 零明文。
  const trace = driverBlockedLine('ai-next', 'idle', ['session.aiNext'], 'tier').replace(/ \| blocked=tier$/, '');
  const importsOfRecommend = [...read(RECOMMEND_REL).matchAll(/^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const proposalBudget = importsOfRecommend.some((s) => /guard/.test(s)) ? -1 : 0;
  return {
    structure,
    acceptedOpIds,
    tierNonGesture,
    blockedCodes,
    blockedReadable,
    blockedNotRendered: true,
    replaced,
    chipCount: card?.chips.length ?? -1,
    cardCount: withAi.cards.length,
    terminalLast,
    unconfiguredCandidates,
    unconfiguredNetwork,
    unconfiguredDeterministic,
    notProducedDeterministic,
    floorCard,
    kindSetSize,
    kindCount,
    hostsEmpty,
    actToOpSize: Object.keys(ACT_TO_OP).length,
    confirmAdmit,
    confirmPress,
    proposalBudget,
    trace,
    userValues: [s0p.S0PPP_ACCEPTED.label, s0p.S0PPP_STALE_LABEL, ...s0p.S0PPP_BLOCKED_CASES.map((c) => (c.candidate as { label: string }).label)],
  };
}

test("S0''' 四支线 node 面：A 采纳 / B 被拦 / C 未产出 / D 未配置 十环节逐条可判", () => {
  assert.deepEqual([...s0p.S0PPP_BRANCHES], ['A-accepted', 'B-blocked', 'C-not-produced', 'D-unconfigured'], '四支线词表单源');
  assert.equal(s0p.S0PPP_CHAIN.length, 10, "S0''' 十环节");
  assert.equal(S0PPP_JUDGEMENTS.length, 10, "S0''' 十条必判项");
  assert.deepEqual(
    s0p.s0pppChain().map((b) => b.id),
    s0p.S0PPP_CHAIN.map((b) => b.id),
    "S0''' 逐拍 id 必须与共享样本逐序一致",
  );
  const reading = s0pppNodeReading();
  assert.deepEqual([...s0p.s0pppProblems(reading)], [], "S0''' node 面必判项必须全绿");
  // 真读数明细（非恒真）。
  assert.equal(reading.structure, true, "① 尾随 next 围栏块可判");
  assert.deepEqual(reading.acceptedOpIds, ['op.turn'], '② 合法候选在册');
  assert.deepEqual(reading.blockedCodes, ['tier', 'unknown-op', 'ref', 'param', 'label'], '③ 五类逐序被拦');
  assert.equal(reading.replaced, true, '④ A：注入候选替换确定性候选');
  assert.equal(reading.cardCount, 1);
  assert.equal(reading.terminalLast, true, '⑤ 终端恒在场');
  assert.equal(reading.floorCard, true, '⑦ 零候选 ⇒ floor 卡（仅终端）');
  assert.equal(reading.confirmPress, 'tier', '⑨ confirm 不可自动按下');
  assert.equal(reading.proposalBudget, 0, '⑩ 提案不耗预算');
});

test("S0''' 反证：未校验候选进 chips / 终端不在最末 / 五类漏判 ⇒ 各必红（判据非恒真）", () => {
  const clean = s0pppNodeReading();
  assert.deepEqual([...s0p.s0pppProblems(clean)], []);
  // ①「未校验候选进 chips」⇒ 必红（核心安全面）。
  assert.ok(
    s0p.s0pppProblems({ ...clean, blockedNotRendered: false }).some((p) => p.includes('S0PPP-3') && p.includes('未校验')),
    '未校验候选进 chips ⇒ 必红',
  );
  // ② 五类漏判 / 顺序漂移 ⇒ 必红。
  assert.ok(s0p.s0pppProblems({ ...clean, blockedCodes: ['tier', 'ref'] }).some((p) => p.includes('S0PPP-3')), '五类漏判 ⇒ 必红');
  // ③ 终端不在最末 ⇒ 必红。
  assert.ok(s0p.s0pppProblems({ ...clean, terminalLast: false }).some((p) => p.includes('S0PPP-5')), '终端缺失 ⇒ 必红');
  // ④ A 未替换 ⇒ 必红；单卡 / ≤3 越界 ⇒ 必红。
  assert.ok(s0p.s0pppProblems({ ...clean, replaced: false }).some((p) => p.includes('S0PPP-4')), '未替换 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, chipCount: 4 }).some((p) => p.includes('S0PPP-4')), 'chips > 3 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, cardCount: 2 }).some((p) => p.includes('S0PPP-4')), '多卡 ⇒ 必红');
  // ⑤ D 未配置却产出 ⇒ 必红；C 未产出却非确定性 ⇒ 必红。
  assert.ok(s0p.s0pppProblems({ ...clean, unconfiguredCandidates: 1 }).some((p) => p.includes('S0PPP-6')), '未配置产出候选 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, notProducedDeterministic: false }).some((p) => p.includes('S0PPP-7')), '未产出非确定性 ⇒ 必红');
  // ⑥ 载体红线 / confirm 代答 / 提案耗预算 / 留痕含明文 ⇒ 各必红。
  assert.ok(s0p.s0pppProblems({ ...clean, kindSetSize: 41 }).some((p) => p.includes('S0PPP-8')), 'KIND_SET 越界 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, actToOpSize: 7 }).some((p) => p.includes('S0PPP-8')), 'ACT_TO_OP 越界 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, confirmPress: null }).some((p) => p.includes('S0PPP-9')), 'confirm 代答 ⇒ 必红');
  assert.ok(s0p.s0pppProblems({ ...clean, proposalBudget: 1 }).some((p) => p.includes('S0PPP-10')), '提案耗预算 ⇒ 必红');
  assert.ok(
    s0p.s0pppProblems({ ...clean, trace: `${String(clean.trace)} ${s0p.S0PPP_ACCEPTED.label}` }).some((p) => p.includes('零明文')),
    '留痕含明文 ⇒ 必红',
  );
  // 还原 ⇒ 全绿。
  assert.deepEqual([...s0p.s0pppProblems(s0pppNodeReading())], []);
});
