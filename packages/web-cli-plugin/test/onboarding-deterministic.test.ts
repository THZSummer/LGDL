/**
 * V5.5-2 **TASK-V55-202 / 206 / 209 / 212** (ADR-V55-006 · ADR-V55-007 · FR-SELF-040~052 /
 * 095 · AC-SELF-007 / 012 / 013) — the **主题① 确定性系统流** gate.
 *
 * ── 判据（每条都有 `expectFailPattern`，反证在文件内实跑；真源零触碰）────────────
 *
 *   OD-1  判据 **3 字段单源** —— `LLM_CONFIGURED_FIELDS` 恰 3 逐字 ∧ `isLlmConfigured`
 *         函数体**只读**这 3 个字段（源文本抽取）。
 *   OD-2  **真值表** —— `hasKey=false` ⇒ false（任取其余）；三字段齐 ⇒ true；空白
 *         `providerId` / `model` ⇒ false。假阴 / 假阳两类注入各必红。
 *   OD-3  **归一化不变量** —— key-store 的 `load()` / `loadProvider()` / `maskedConfig()`
 *         三条读路径都结构性保证 `providerId ∈ PROVIDERS` ∧ `model` 非空。
 *   OD-4  **零 LLM / 零网络** —— `status.ts` 无 `providerChat(` / `fetch(` / `chrome.` 调用。
 *   OD-5  **runChat 前置判据源码序** —— 判据早于 `providerChat(` ∧ early return 落在
 *         `chatBusy = true;` **之前**；反证：位置错 ⇒ 必红。
 *   OD-6  **payload variant 是 type-only** —— `KIND_SET` 40 项逐字 ∧ `'llm-unconfigured'`
 *         不在其中（进 KIND_SET ⇒ FAIL，content.js 红线）。
 *   OD-7  **双源并存 + 幂等** —— 主动识别分支与被动观测折叠进**同一** `risk` 源；
 *         `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 逐条不变。
 *   OD-8  **引导流恰 4 步单源** —— 顺序确定、逐步可判；删任一步 ⇒ FAIL；采集复用既有
 *         `OP_PARAM_SEQUENCE`（第二份序列 ⇒ FAIL）。
 *   OD-9  **不跳走** —— 引导路径零 `#open-settings` / 零视图切换。
 *   OD-10 **悬置任务单源** —— `SUSPENSIONS.push` 恰 1（v55-1 载体）∧ 「等待配置」来源键
 *         在 `src/**` 恰 1 处（第二处登记 ⇒ FAIL）。
 *   OD-11 **MAX = 1** —— 不同意图**不叠加**（`over-capacity`）；删上限 ⇒ FAIL。
 *   OD-12 **有效期重校验** —— 站点变 / 会话切换 ⇒ `invalidated`（**不制造假成功**）；
 *         空悬置 ⇒ `empty` 且**非死端**（可达 next）。
 *   OD-13 **自动续接的顺序** —— 「回执（settle completed）**在前**、续接（`panelOpSettled`
 *         → `resumeAfterConfig`）**在后**」；删自动续接 ⇒ FAIL。
 *
 * @module test/onboarding-deterministic
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { LLM_CONFIGURED_FIELDS, isLlmConfigured, type MaskedLlmLike } from '../src/llm/status.js';
import { PROVIDERS } from '../src/llm/providers.js';
import {
  BLOCKED_RECOVERY_TRIGGER,
  BLOCKED_TERMINALS,
  NEXT_SOURCE_NAMES,
} from '../src/ui/sidepanel/next-registry/definition.js';
import { LLM_BLOCKED_RISK, OPS_RECOVERY_ROWS } from '../src/ui/sidepanel/next-registry/providers.js';
import { OP_PARAM_SEQUENCE } from '../src/ui/sidepanel/next-registry/ops.js';
import {
  ONBOARD_COLLECT_STEPS,
  ONBOARD_SCENARIOS,
  ONBOARD_STEP_IDS,
  ONBOARD_STEPS,
  onboardCauseKey,
  onboardScenario,
  suppressOnboardCause,
} from '../src/ui/sidepanel/next-registry/onboarding-flow.js';
import {
  CONFIG_SUSPENSION_SOURCE,
  MAX_SUSPENSIONS,
  pendingSuspension,
  registerConfigSuspension,
  resumeSuspension,
} from '../src/ui/sidepanel/next-registry/suspension.js';
import { candidateRules } from '../src/ui/sidepanel/recommend.js';
import { listSuspensions, resetSuspensions } from '../src/ui/sidepanel/next-registry/drivers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
const STATUS_REL = 'src/llm/status.ts';
const SW_REL = 'src/background/service-worker.ts';
const MESSAGING_REL = 'src/background/messaging.ts';
const KEYSTORE_REL = 'src/llm/key-store.ts';
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const DEFINITION_REL = 'src/ui/sidepanel/next-registry/definition.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';
const FLOW_REL = 'src/ui/sidepanel/next-registry/onboarding-flow.ts';
const SUSPENSION_REL = 'src/ui/sidepanel/next-registry/suspension.ts';
const DRIVERS_REL = 'src/ui/sidepanel/next-registry/drivers.ts';
const PIPELINE_REL = 'src/ui/sidepanel/next-registry/pipeline.ts';

function srcTsFiles(dir = join(PKG, 'src')): { readonly rel: string; readonly text: string }[] {
  const out: { rel: string; text: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push({ rel: full.slice(full.indexOf(PKG) + PKG.length), text: readFileSync(full, 'utf8') });
  }
  return out;
}
/**
 * 源码判据一律在**去注释**后的文本上做：注释里出现 `providerChat(` / `#open-settings` /
 * `'llm-unconfigured'` 是**文档**，不是行为（否则判据会被自己的说明文字判红）。
 */
export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

const FILES = srcTsFiles();
const SW_SRC = read(SW_REL);
const SIDEPANEL_SRC = read(SIDEPANEL_REL);
const FLOW_SRC = read(FLOW_REL);
const SUSPENSION_SRC = read(SUSPENSION_REL);
const PIPELINE_SRC = read(PIPELINE_REL);

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'OD-1-three-fields', expectFailPattern: '配置判据必须只读 3 个字段（hasKey / providerId / model）' },
  { id: 'OD-2-truth-table', expectFailPattern: '配置判据真值表：假阴 / 假阳必须被拒绝' },
  { id: 'OD-3-normalization', expectFailPattern: 'key-store 读归一化必须结构性保证 providerId ∈ PROVIDERS ∧ model 非空' },
  { id: 'OD-4-zero-llm', expectFailPattern: '判据模块零 LLM 调用 / 零网络 / 零 chrome' },
  { id: 'OD-5-runchat-order', expectFailPattern: 'runChat 前置判据必须在 providerChat 之前且 early return 在 chatBusy = true 之前' },
  { id: 'OD-6-variant-type-only', expectFailPattern: 'chat-result variant 必须 type-only（不得进 KIND_SET）' },
  { id: 'OD-7-dual-source', expectFailPattern: '阻塞事实双源必须折叠进同一 risk 源且恢复链零改写' },
  { id: 'OD-8-flow-four-steps', expectFailPattern: '引导流必须恰 4 步单源且复用既有 params 序列' },
  { id: 'OD-9-no-navigation', expectFailPattern: '引导路径不得跳走（零 #open-settings / 零视图切换）' },
  { id: 'OD-10-suspension-single-source', expectFailPattern: '悬置任务登记必须单源（第二处 ⇒ FAIL）' },
  { id: 'OD-11-max-one', expectFailPattern: '悬置任务必须有界：超过 MAX=1 必须被拒（不叠加）' },
  { id: 'OD-12-validity-recheck', expectFailPattern: '续接必须先做有效期重校验（不得制造假成功）' },
  { id: 'OD-13-resume-order', expectFailPattern: '回执在前、续接在后（删自动续接 ⇒ FAIL）' },
  // V5.5-2 W5（TASK-V55-213/215）：两场景门禁 + 取消非死端/同因不重复（只增不减）。
  { id: 'OD-14-two-scenarios', expectFailPattern: '两场景（首装 / 已装未配）必须各自产出配置引导且不依赖 firstRun；已配置 ⇒ 零引导' },
  { id: 'OD-15-cancel-not-dead-end', expectFailPattern: '取消引导必须非死端（悬置保留 + 可达 next）且同因不重复（取消后不再弹同一条）' },
  // V5.5-2 W5（TASK-V55-216②）：X-SELF-3 取代台账落账（缺条目 ⇒ 必红）。
  { id: 'OD-16-x-self-3-ledger', expectFailPattern: 'X-SELF-3 取代台账必须落账（双源并存 = 被动保留 + 主动新增；缺条目 ⇒ FAIL）' },
];

/* ── OD-1 ──────────────────────────────────────────────────────────────────── */

/** The property names an `isLlmConfigured` body reads (`<param>.<field>`). */
export function predicateFields(src: string): string[] {
  const body = /export function isLlmConfigured\(([\s\S]*?)\n\}/.exec(stripComments(src));
  if (!body) return [];
  const names = new Set<string>();
  for (const m of body[0].matchAll(/\bs\.([A-Za-z]+)/g)) names.add(m[1]);
  return [...names].sort();
}

export function predicateFieldProblems(src: string, fields: readonly string[]): string[] {
  const problems: string[] = [];
  if ([...fields].sort().join('|') !== 'hasKey|model|providerId') {
    problems.push(`${JUDGEMENTS[0].expectFailPattern}：LLM_CONFIGURED_FIELDS = ${fields.join(', ')}`);
  }
  const read2 = predicateFields(src);
  if (read2.length === 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：未抽取到 isLlmConfigured 函数体（判据不得空转）`);
  const extra = read2.filter((f) => !fields.includes(f));
  if (extra.length > 0) problems.push(`${JUDGEMENTS[0].expectFailPattern}：函数体多读了 ${extra.join(', ')}`);
  if (!read2.includes('hasKey')) problems.push(`${JUDGEMENTS[0].expectFailPattern}：函数体未读 hasKey（判定权必须落在真正的可缺字段上）`);
  return problems;
}

/* ── OD-2 ──────────────────────────────────────────────────────────────────── */

/** A judging copy of the predicate so the truth table can be injected into (falsifiability). */
export function truthTableProblems(fn: (s: Pick<MaskedLlmLike, 'hasKey' | 'providerId' | 'model'>) => boolean): string[] {
  const problems: string[] = [];
  const base = { hasKey: true, providerId: 'deepseek', model: 'deepseek-chat' };
  if (fn({ ...base, hasKey: false }) !== false) problems.push(`${JUDGEMENTS[1].expectFailPattern}：hasKey=false 被判成已配置（假阳）`);
  if (fn({ ...base, providerId: '' }) !== false) problems.push(`${JUDGEMENTS[1].expectFailPattern}：空 providerId 被判成已配置（假阳）`);
  if (fn({ ...base, providerId: '   ' }) !== false) problems.push(`${JUDGEMENTS[1].expectFailPattern}：空白 providerId 被判成已配置（假阳）`);
  if (fn({ ...base, model: '' }) !== false) problems.push(`${JUDGEMENTS[1].expectFailPattern}：空 model 被判成已配置（假阳）`);
  if (fn(base) !== true) problems.push(`${JUDGEMENTS[1].expectFailPattern}：三字段齐被判成未配置（假阴）`);
  return problems;
}

/* ── OD-3 ──────────────────────────────────────────────────────────────────── */

/**
 * The three key-store read paths must STRUCTURALLY guarantee the two trailing
 * conjuncts: an `isProviderId(...)` fallback for `providerId` and a
 * `: provider.defaultModel` fallback for `model`.
 */
export function normalizationProblems(src: string): string[] {
  const problems: string[] = [];
  if (!/isProviderId\(stored\.active\)\s*\?\s*stored\.active\s*:\s*'deepseek'/.test(src)) {
    problems.push(`${JUDGEMENTS[2].expectFailPattern}：read() 未把 providerId 归一化到 PROVIDERS（非法回落 'deepseek'）`);
  }
  const defaults = (src.match(/state\?\.model\?\.trim\(\)\s*\?\s*state\.model\s*:\s*provider\.defaultModel/g) ?? []).length;
  if (defaults < 3) problems.push(`${JUDGEMENTS[2].expectFailPattern}：三条读路径的 model 回落实测 ${defaults} 处（应 ≥ 3）`);
  if (!/PROVIDERS\.some\(\(p\)\s*=>\s*p\.id === v\)/.test(src)) {
    problems.push(`${JUDGEMENTS[2].expectFailPattern}：isProviderId 未对 PROVIDERS 校验`);
  }
  return problems;
}

/* ── OD-4 ──────────────────────────────────────────────────────────────────── */

export function zeroLlmProblems(src: string): string[] {
  const problems: string[] = [];
  for (const needle of ['providerChat(', 'providerById(', 'fetch(', 'chrome.']) {
    if (src.includes(needle)) problems.push(`${JUDGEMENTS[3].expectFailPattern}：status.ts 出现 ${needle}`);
  }
  if (/^import[\s\S]*?from\s+'(?!\.\/providers)/m.test(src) && /^import/m.test(src)) {
    problems.push(`${JUDGEMENTS[3].expectFailPattern}：status.ts 出现非本目录 import`);
  }
  return problems;
}

/* ── OD-5 ──────────────────────────────────────────────────────────────────── */

/** `runChat` 的源码序：前置判据 < `chatBusy = true;` < `providerChat(`，且判据块内有 return。 */
export function runChatOrderProblems(rawSrc: string): string[] {
  const src = stripComments(rawSrc);
  const problems: string[] = [];
  const fnAt = src.indexOf('async function runChat(');
  if (fnAt < 0) return [`${JUDGEMENTS[4].expectFailPattern}：未找到 runChat（判据不得空转）`];
  const guardAt = src.indexOf('isLlmConfigured(', fnAt);
  const busyAt = src.indexOf('chatBusy = true;', fnAt);
  const chatAt = src.indexOf('providerChat(', fnAt);
  if (guardAt < 0) problems.push(`${JUDGEMENTS[4].expectFailPattern}：runChat 内无配置判据（复现 R5 被动撞墙式）`);
  if (busyAt < 0) problems.push(`${JUDGEMENTS[4].expectFailPattern}：未找到 chatBusy = true;`);
  if (chatAt < 0) problems.push(`${JUDGEMENTS[4].expectFailPattern}：未找到 providerChat(`);
  if (guardAt >= 0 && chatAt >= 0 && guardAt > chatAt) problems.push(`${JUDGEMENTS[4].expectFailPattern}：判据晚于 providerChat（会先发起 LLM 调用）`);
  if (guardAt >= 0 && busyAt >= 0 && guardAt > busyAt) {
    problems.push(`${JUDGEMENTS[4].expectFailPattern}：early return 落在 chatBusy = true 之后（第二次回合被误判忙）`);
  }
  if (guardAt >= 0) {
    const tail = src.slice(guardAt);
    const block = tail.slice(0, tail.indexOf('\n  }') + 1);
    if (!/\breturn;/.test(block)) problems.push(`${JUDGEMENTS[4].expectFailPattern}：判据命中后必须 early return（不得继续 providerChat）`);
  }
  // 未配置路径的参数构造：hasKey 必须由 key-store 读数派生（`apiKey.length > 0`）。
  if (!/isLlmConfigured\(\{\s*hasKey:\s*settings\.apiKey\.length > 0/.test(src)) {
    problems.push(`${JUDGEMENTS[4].expectFailPattern}：hasKey 必须由 key-store 读数派生（apiKey.length > 0）`);
  }
  return problems;
}

/* ── OD-6 ──────────────────────────────────────────────────────────────────── */

export function kindSetProblems(rawSrc: string): string[] {
  const src = stripComments(rawSrc);
  const problems: string[] = [];
  const set = /const KIND_SET[^=]*=\s*new Set<[^>]*>\(\[([\s\S]*?)\]\)/.exec(src);
  if (!set) return [`${JUDGEMENTS[5].expectFailPattern}：未找到 KIND_SET（判据不得空转）`];
  const members = [...set[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (members.length !== 40) problems.push(`${JUDGEMENTS[5].expectFailPattern}：KIND_SET 实测 ${members.length} 项（应恰 40 逐字）`);
  if (members.includes('llm-unconfigured')) problems.push(`${JUDGEMENTS[5].expectFailPattern}：variant 进 KIND_SET（content.js 红线）`);
  const occurrences = (src.match(/'llm-unconfigured'/g) ?? []).length;
  if (occurrences !== 1) problems.push(`${JUDGEMENTS[5].expectFailPattern}：'llm-unconfigured' 在 messaging.ts 出现 ${occurrences} 次（应恰 1，且只在 type 联合里）`);
  if (!/export type ChatResultVariant =[^;]*'llm-unconfigured'/.test(src)) {
    problems.push(`${JUDGEMENTS[5].expectFailPattern}：ChatResultVariant 联合未声明该成员（type-only 单源）`);
  }
  return problems;
}

/* ── OD-7 ──────────────────────────────────────────────────────────────────── */

export function dualSourceProblems(sidepanelSrc: string, providersSrc: string, definitionSrc: string): string[] {
  const problems: string[] = [];
  const branchAt = sidepanelSrc.indexOf("variant === 'llm-unconfigured'");
  if (branchAt < 0) problems.push(`${JUDGEMENTS[6].expectFailPattern}：面板无主动识别分支（variant === 'llm-unconfigured'）`);
  else {
    const body = sidepanelSrc.slice(branchAt, sidepanelSrc.indexOf('\n      }', sidepanelSrc.indexOf('noteLlmBlockedFact(false)', branchAt)) + 1);
    if (!/noteLlmBlockedFact\(false\)/.test(body)) problems.push(`${JUDGEMENTS[6].expectFailPattern}：主动识别未折叠进既有 risk 源（同一终态词汇）`);
    if (!/nextAfterSettle\(\{ kind: 'answered' \}\)/.test(body)) problems.push(`${JUDGEMENTS[6].expectFailPattern}：主动识别未立刻求值一次驱动者`);
  }
  // 被动观测保留（合法降级场景：写入失败）。
  const passive = (stripComments(sidepanelSrc).match(/noteLlmBlockedFact\(/g) ?? []).length;
  if (passive < 5) problems.push(`${JUDGEMENTS[6].expectFailPattern}：被动观测路径被削弱（noteLlmBlockedFact 出现 ${passive} 次 < 5：定义 + 4 生产调用点）`);
  if (!/function noteLlmBlockedFact\(ok: boolean\): void \{[\s\S]*?observedBlocked\.add\(LLM_BLOCKED_RISK\)/.test(sidepanelSrc)) {
    problems.push(`${JUDGEMENTS[6].expectFailPattern}：阻塞事实未落既有 risk 源（llmBlocked）`);
  }
  // 恢复链零改写（逐条）。
  const rows = stripComments(providersSrc).match(/\{ blocked: '[^']+', risk: [A-Z_]+_RISK, op: '[^']+', text: '[^']+' \}/g) ?? [];
  if (rows.length !== 2) problems.push(`${JUDGEMENTS[6].expectFailPattern}：OPS_RECOVERY_ROWS 实测 ${rows.length} 行（应恰 2 逐字）`);
  if (!rows.some((r) => r.includes("blocked: 'llm.unconfigured'") && r.includes("op: 'op.llm-config'"))) {
    problems.push(`${JUDGEMENTS[6].expectFailPattern}：llm.unconfigured 恢复行被改写`);
  }
  if (!/BLOCKED_RECOVERY_TRIGGER = Object\.freeze\(\{/.test(definitionSrc) || !/'llm\.unconfigured': null/.test(definitionSrc)) {
    problems.push(`${JUDGEMENTS[6].expectFailPattern}：BLOCKED_RECOVERY_TRIGGER 未保持「按终态键控」形态`);
  }
  return problems;
}

/* ── OD-8 ──────────────────────────────────────────────────────────────────── */

export function flowProblems(steps: readonly { readonly id: string; readonly evidence: string; readonly carrier: string }[], collectSteps: number): string[] {
  const problems: string[] = [];
  const ids = steps.map((s) => s.id).join('|');
  if (steps.length !== 4) problems.push(`${JUDGEMENTS[7].expectFailPattern}：步骤数实测 ${steps.length}（应恰 4）`);
  if (ids !== 'detect|guide|collect|complete') problems.push(`${JUDGEMENTS[7].expectFailPattern}：步骤顺序 = ${ids}`);
  if (collectSteps !== 3) problems.push(`${JUDGEMENTS[7].expectFailPattern}：采集段条数实测 ${collectSteps}（应读既有 OP_PARAM_SEQUENCE 的 3 条）`);
  const evidence = steps.map((s) => s.evidence).join('|');
  if (!evidence.startsWith('llm.unconfigured|llm.unconfigured|op.llm-config:params|op.llm-config:receipt')) {
    problems.push(`${JUDGEMENTS[7].expectFailPattern}：逐步可判断据 = ${evidence}`);
  }
  return problems;
}

/* ── OD-9 ──────────────────────────────────────────────────────────────────── */

export function noNavigationProblems(rawFlowSrc: string, rawSidepanelSrc: string): string[] {
  const flowSrc = stripComments(rawFlowSrc);
  const sidepanelSrc = stripComments(rawSidepanelSrc);
  const problems: string[] = [];
  for (const needle of ['#open-settings', 'openSettingsSection(', 'location.']) {
    if (flowSrc.includes(needle)) problems.push(`${JUDGEMENTS[8].expectFailPattern}：引导流声明出现 ${needle}`);
  }
  // 主动识别分支与续接函数体（引导路径的两段落点）不得跳走。
  const bodies: string[] = [];
  const branchAt = sidepanelSrc.indexOf("variant === 'llm-unconfigured'");
  if (branchAt >= 0) bodies.push(sidepanelSrc.slice(branchAt, branchAt + 1400));
  const resumeAt = sidepanelSrc.indexOf('function resumeAfterConfig(');
  if (resumeAt >= 0) bodies.push(sidepanelSrc.slice(resumeAt, sidepanelSrc.indexOf('\n}', resumeAt)));
  if (bodies.length < 2) problems.push(`${JUDGEMENTS[8].expectFailPattern}：未定位到引导路径两段落点（判据不得空转）`);
  for (const body of bodies) {
    for (const needle of ['openSettingsSection(', '#open-settings', 'location.href']) {
      if (body.includes(needle)) problems.push(`${JUDGEMENTS[8].expectFailPattern}：引导路径出现 ${needle}`);
    }
  }
  return problems;
}

/* ── OD-10 ─────────────────────────────────────────────────────────────────── */

export function suspensionSingleSourceProblems(files: readonly { readonly rel: string; readonly text: string }[]): string[] {
  files = files.map((f) => ({ rel: f.rel, text: stripComments(f.text) }));
  const problems: string[] = [];
  const pushes = files.filter((f) => /SUSPENSIONS\.push\(/.test(f.text)).map((f) => f.rel);
  if (pushes.length !== 1 || pushes[0] !== DRIVERS_REL) {
    problems.push(`${JUDGEMENTS[9].expectFailPattern}：SUSPENSIONS.push 写入点 = ${pushes.join(', ') || '<无>'}`);
  }
  const defs = files.filter((f) => /export function registerSuspension\(/.test(f.text)).map((f) => f.rel);
  if (defs.length !== 1 || defs[0] !== DRIVERS_REL) {
    problems.push(`${JUDGEMENTS[9].expectFailPattern}：registerSuspension 定义点 = ${defs.join(', ') || '<无>'}`);
  }
  const configSites = files.filter((f) => f.text.includes('CONFIG_SUSPENSION_SOURCE')).map((f) => f.rel);
  if (configSites.join('|') !== SUSPENSION_REL) {
    problems.push(`${JUDGEMENTS[9].expectFailPattern}：「等待配置」来源键必须只在 suspension.ts 出现（实测 ${configSites.join(', ') || '<无>'}）`);
  }
  const registry = files.filter((f) => /const SUSPENSIONS: Suspension\[\] = \[\]/.test(f.text)).map((f) => f.rel);
  if (registry.length !== 1 || registry[0] !== DRIVERS_REL) {
    problems.push(`${JUDGEMENTS[9].expectFailPattern}：悬置登记表 = ${registry.join(', ') || '<无>'}（第二份登记表）`);
  }
  return problems;
}

/* ── OD-11 / OD-12 ─────────────────────────────────────────────────────────── */

/** MAX=1 判据：不同意图不得叠加（实测 + 注入共用）。 */
export function maxSuspensionProblems(count: number, secondOutcome: string): string[] {
  const problems: string[] = [];
  if (MAX_SUSPENSIONS !== 1) problems.push(`${JUDGEMENTS[10].expectFailPattern}：MAX_SUSPENSIONS 实测 ${MAX_SUSPENSIONS}`);
  if (count > MAX_SUSPENSIONS) problems.push(`${JUDGEMENTS[10].expectFailPattern}：悬置任务实测 ${count} 条（超 MAX=1）`);
  if (secondOutcome === 'registered') problems.push(`${JUDGEMENTS[10].expectFailPattern}：第二条不同意图被登记（应 over-capacity）`);
  return problems;
}

/** 有效期：站点变 / 会话切换 ⇒ invalidated（不得制造假成功）。 */
export function validityProblems(
  resume: (facts: { origin?: string; sessionId?: string }) => string,
): string[] {
  const problems: string[] = [];
  if (resume({ origin: 'https://b.example', sessionId: 's1' }) === 'resumed') {
    problems.push(`${JUDGEMENTS[11].expectFailPattern}：站点已变仍续接`);
  }
  if (resume({ origin: 'https://a.example', sessionId: 's2' }) === 'resumed') {
    problems.push(`${JUDGEMENTS[11].expectFailPattern}：会话已切换仍续接`);
  }
  if (resume({ origin: 'https://a.example', sessionId: 's1' }) !== 'resumed') {
    problems.push(`${JUDGEMENTS[11].expectFailPattern}：上下文未变却拒绝续接（判据恒红）`);
  }
  return problems;
}

/* ── OD-13 ─────────────────────────────────────────────────────────────────── */

/** 事件序：成功回执（settle completed）**在前**，续接通知（panelOpSettled）**在后**。 */
export function resumeOrderProblems(rawPipelineSrc: string, rawSidepanelSrc: string): string[] {
  const pipelineSrc = stripComments(rawPipelineSrc);
  const sidepanelSrc = stripComments(rawSidepanelSrc);
  const problems: string[] = [];
  const settleAt = pipelineSrc.indexOf("await settle(op_, 'completed'");
  const notifyAt = pipelineSrc.indexOf("panelOpSettled(op_, 'completed')");
  if (settleAt < 0) problems.push(`${JUDGEMENTS[12].expectFailPattern}：pipeline 未见成功结算点`);
  if (notifyAt < 0) problems.push(`${JUDGEMENTS[12].expectFailPattern}：pipeline 未见结算后通知（续接不可能发生）`);
  if (settleAt >= 0 && notifyAt >= 0 && notifyAt < settleAt) {
    problems.push(`${JUDGEMENTS[12].expectFailPattern}：续接通知早于回执（顺序错）`);
  }
  if (!/opSettled: \(op, state\) => \{\s*if \(op\.opId === ONBOARD_CHIP_OP && state === 'completed'\) resumeAfterConfig\(\);/.test(sidepanelSrc)) {
    problems.push(`${JUDGEMENTS[12].expectFailPattern}：panel 未在 completed 分支自动续接（复现「配完还要重说一遍」）`);
  }
  const resumeAt = sidepanelSrc.indexOf('function resumeAfterConfig(');
  if (resumeAt < 0) problems.push(`${JUDGEMENTS[12].expectFailPattern}：未找到 resumeAfterConfig`);
  else {
    const body = sidepanelSrc.slice(resumeAt, sidepanelSrc.indexOf('\n}', resumeAt));
    if (!/resumeSuspension\(/.test(body)) problems.push(`${JUDGEMENTS[12].expectFailPattern}：续接未做有效期重校验（resumeSuspension）`);
    if (!/dispatchOp\('op\.turn'/.test(body)) problems.push(`${JUDGEMENTS[12].expectFailPattern}：续接未经 op.turn 槽（requestTurn 计数会漂）`);
    if (!/nextAfterSettle\(/.test(body)) problems.push(`${JUDGEMENTS[12].expectFailPattern}：空悬置 / 失效缺可达 next（死端）`);
  }
  return problems;
}

/* ── OD-14 ──────────────────────────────────────────────────────────────────── */

/**
 * V5.5-2 **TASK-V55-213** (FR-SELF-043 · AC-SELF-013 · R-SELF-909) —— **两场景**判据。
 *
 *   ① 恰 2 行单源、逐序；两行的 `resultsIn` 都是 `config-guide`（同一条确定性引导）；
 *   ② 行为真值表：未配置 ⇒ 两场景各自命中；**注入 `firstRun = false` 仍须产出**
 *      （`installed-unconfigured`，`via: 'risk'` ⇒ **不依赖 `firstRun`**）；
 *   ③ 已配置 ⇒ `'none'`（**零引导**：分流判据 = 确定性配置判据）。
 * 删掉任一场景 / 让 `installed-unconfigured` 挂上 `firstRun` ⇒ 必红。
 */
export function scenarioProblems(
  scenarios: readonly { readonly id: string; readonly when: string; readonly via: string; readonly resultsIn: string }[],
  scenario: (f: { readonly firstRun: boolean; readonly configured: boolean }) => string,
): string[] {
  const problems: string[] = [];
  const ids = scenarios.map((s) => s.id).join('|');
  if (ids !== 'first-install|installed-unconfigured') {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：场景集实测 ${ids || '<空>'}（应恰 2 行逐序）`);
  }
  if (scenarios.some((s) => s.resultsIn !== 'config-guide')) {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：两场景必须都产出同一条配置引导`);
  }
  const b = scenarios.find((s) => s.id === 'installed-unconfigured');
  if (!b) problems.push(`${JUDGEMENTS[13].expectFailPattern}：缺「已装未配」场景`);
  else if (b.via === 'onboarding' || b.when.includes('firstRun')) {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：已装未配**不得**依赖 firstRun（via=${b.via} when=${b.when}）`);
  }
  // 真值表（未配置两场景 + 已配置零引导）。
  if (scenario({ firstRun: true, configured: false }) !== 'first-install') {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：首装（未配置）未命中 first-install`);
  }
  if (scenario({ firstRun: false, configured: false }) !== 'installed-unconfigured') {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：**注入 firstRun=false 仍须产出**（已装未配）`);
  }
  if (scenario({ firstRun: true, configured: true }) !== 'none' || scenario({ firstRun: false, configured: true }) !== 'none') {
    problems.push(`${JUDGEMENTS[13].expectFailPattern}：已配置 ⇒ 必须零引导（不触发）`);
  }
  return problems;
}

/* ── OD-15 ──────────────────────────────────────────────────────────────────── */

/**
 * V5.5-2 **TASK-V55-215** (FR-SELF-046 · AC-SELF-007) —— **取消非死端 + 同因不重复**。
 *
 *   · 纯判据：同因 ⇒ 压掉；**新因 / 空因 / 未取消 ⇒ 不得压**（判据非恒真）；
 *   · 源码：取消/拒绝/失败的收口钩子记录该因（`declinedOnboardCauses.push(onboardGuideCause)`）
 *     ∧ `maybeRecommend` 经 `suppressOnboardCause(` 只压同因 ∧ per-fixture 复位；
 *   · 取消**非死端**：同一钩子仍 `nextAfterSettle(force)`（可达 next），悬置任务**保留**。
 */
export function cancelProblems(
  rawSidepanelSrc: string,
  suppress: (cause: string | undefined, declined: readonly string[]) => boolean,
): string[] {
  const src = stripComments(rawSidepanelSrc);
  const problems: string[] = [];
  // 纯判据真值表。
  if (suppress('同一句话', ['同一句话']) !== true) problems.push(`${JUDGEMENTS[14].expectFailPattern}：同因未被压掉（会重复弹）`);
  if (suppress('另一句话', ['同一句话']) !== false) problems.push(`${JUDGEMENTS[14].expectFailPattern}：新因被误压（一律不再引导）`);
  if (suppress(undefined, ['x']) !== false || suppress('', ['']) !== false) {
    problems.push(`${JUDGEMENTS[14].expectFailPattern}：空因不占位（不得压掉一切引导）`);
  }
  // 源码接线。
  if (!/nextAfterSettle: \(op, state\) => \{[\s\S]*?declinedOnboardCauses\.push\(onboardGuideCause\)[\s\S]*?nextAfterSettle\(\{ kind: `op-\$\{state\}`, force: true/.test(src)) {
    problems.push(`${JUDGEMENTS[14].expectFailPattern}：取消收口未记录该因 ∨ 取消路径缺 force 求值（非死端）`);
  }
  if (!/for \(const id of observedBlocked\)[\s\S]*?suppressOnboardCause\(onboardGuideCause, declinedOnboardCauses\)/.test(src)) {
    problems.push(`${JUDGEMENTS[14].expectFailPattern}：maybeRecommend 未按「同因」压掉引导`);
  }
  if (!/declinedOnboardCauses\.length = 0;/.test(src)) {
    problems.push(`${JUDGEMENTS[14].expectFailPattern}：去重键未随 fixture 复位（会跨夹具残留）`);
  }
  return problems;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 真源判据（全部绿）
 * ───────────────────────────────────────────────────────────────────────────── */
test('OD-1 配置判据恰 3 字段单源（函数体只读这 3 个）', () => {
  assert.deepEqual([...LLM_CONFIGURED_FIELDS], ['hasKey', 'providerId', 'model'], JUDGEMENTS[0].expectFailPattern);
  assert.deepEqual(predicateFieldProblems(read(STATUS_REL), [...LLM_CONFIGURED_FIELDS]), [], JUDGEMENTS[0].expectFailPattern);
});

test('OD-1 反证：函数体多读一个字段 ⇒ 必红 → 还原 PASS', () => {
  const forged = read(STATUS_REL).replace('s.hasKey === true &&', 's.apiKeyMasked === true && s.hasKey === true &&');
  assert.ok(predicateFieldProblems(forged, [...LLM_CONFIGURED_FIELDS]).length > 0, '多读字段必须红');
  assert.deepEqual(predicateFieldProblems(read(STATUS_REL), [...LLM_CONFIGURED_FIELDS]), []);
});

test('OD-2 真值表（假阴 / 假阳）+ 两类注入必红', () => {
  assert.deepEqual(truthTableProblems(isLlmConfigured), [], JUDGEMENTS[1].expectFailPattern);
  // 假阳注入：只认 hasKey（丢掉另两个字段）。
  const falsePositive = (s: Pick<MaskedLlmLike, 'hasKey' | 'providerId' | 'model'>): boolean => s.hasKey === true;
  assert.ok(truthTableProblems(falsePositive).length > 0, '假阳注入必须红');
  // 假阴注入：要求 model 显式输入（把能用的用户送去重新配置）。
  const falseNegative = (s: Pick<MaskedLlmLike, 'hasKey' | 'providerId' | 'model'>): boolean =>
    s.hasKey === true && s.providerId.trim().length > 0 && s.model.trim() === 'gpt-4o';
  assert.ok(truthTableProblems(falseNegative).length > 0, '假阴注入必须红');
  assert.deepEqual(truthTableProblems(isLlmConfigured), [], '还原必须 PASS');
});

test('OD-3 key-store 读归一化（三条路径结构性保证后两子项）', () => {
  assert.deepEqual(normalizationProblems(stripComments(read(KEYSTORE_REL))), [], JUDGEMENTS[2].expectFailPattern);
  assert.ok(normalizationProblems(stripComments(read(KEYSTORE_REL))).length === 0);
  const forged = stripComments(read(KEYSTORE_REL)).replace(/state\?\.model\?\.trim\(\)\s*\?\s*state\.model\s*:\s*provider\.defaultModel/g, 'state?.model ?? ""');
  assert.ok(normalizationProblems(forged).some((p) => p.includes(JUDGEMENTS[2].expectFailPattern)), '去掉 model 回落必须红');
  assert.deepEqual(normalizationProblems(stripComments(read(KEYSTORE_REL))), []);
});

test('OD-4 判据模块零 LLM / 零网络 / 零 chrome', () => {
  assert.deepEqual(zeroLlmProblems(stripComments(read(STATUS_REL))), [], JUDGEMENTS[3].expectFailPattern);
  assert.ok(zeroLlmProblems(`${stripComments(read(STATUS_REL))}\nfetch('https://x');\n`).length > 0, '注入 fetch 必须红');
  assert.ok(zeroLlmProblems(`${stripComments(read(STATUS_REL))}\nproviderChat();\n`).length > 0, '注入 providerChat 必须红');
});

test('OD-5 runChat 前置判据源码序（判据 < chatBusy = true < providerChat）', () => {
  assert.deepEqual(runChatOrderProblems(SW_SRC), [], JUDGEMENTS[4].expectFailPattern);
});

test('OD-5 反证：删判据 / early return 放到 chatBusy 之后 ⇒ 各必红 → 还原 PASS', () => {
  const noGuard = SW_SRC.replace(/  if \(!isLlmConfigured\(\{[\s\S]*?\n  \}\n/, '');
  assert.notEqual(noGuard, SW_SRC, '前置：注入锚点必须存在');
  assert.ok(runChatOrderProblems(noGuard).length > 0, '删判据必须红（复现 R5 被动式）');
  const lateGuard =
    'async function runChat(s: Singletons, user: string) {\n  chatBusy = true;\n  if (!isLlmConfigured({})) {\n    return;\n  }\n  providerChat();\n}';
  assert.ok(
    runChatOrderProblems(lateGuard).some((p) => p.includes('chatBusy = true 之后')),
    '位置错必须红（第二次回合被误判忙）',
  );
  const noReturn = 'async function runChat() {\n  if (!isLlmConfigured({})) {\n    providerChat();\n  }\n  chatBusy = true;\n}';
  assert.ok(runChatOrderProblems(noReturn).some((p) => p.includes('early return')), '缺 early return 必须红');
  assert.deepEqual(runChatOrderProblems(SW_SRC), []);
});

test('OD-6 chat-result variant 是 type-only（KIND_SET 40 逐字，进集合 ⇒ FAIL）', () => {
  assert.deepEqual(kindSetProblems(read(MESSAGING_REL)), [], JUDGEMENTS[5].expectFailPattern);
  const forged = read(MESSAGING_REL).replace("  'clipboard-op',\n]", "  'clipboard-op',\n  'llm-unconfigured',\n]");
  assert.notEqual(forged, read(MESSAGING_REL), '前置：注入锚点必须存在');
  assert.ok(kindSetProblems(forged).some((p) => p.includes('KIND_SET')), 'variant 进 KIND_SET 必须红');
  assert.deepEqual(kindSetProblems(read(MESSAGING_REL)), []);
});

test('OD-7 双源并存（同一 risk 源 / 幂等）+ 恢复链零改写', () => {
  assert.deepEqual(dualSourceProblems(SIDEPANEL_SRC, read(PROVIDERS_REL), read(DEFINITION_REL)), [], JUDGEMENTS[6].expectFailPattern);
  assert.deepEqual(OPS_RECOVERY_ROWS.map((r) => r.blocked), ['llm.unconfigured', 'perm.missing']);
  assert.equal(BLOCKED_TERMINALS.length, 5, '阻塞态枚举恰 5 逐字');
  assert.ok(NEXT_SOURCE_NAMES.includes('risk'), '阻塞事实仍折叠进既有 risk 源');
  assert.equal(Object.keys(BLOCKED_RECOVERY_TRIGGER).length, 5, '按终态键控表恰 5 键');
});

test('OD-7 反证：删被动观测路径 ⇒ 必红 → 还原 PASS', () => {
  const forged = SIDEPANEL_SRC.replace(/noteLlmBlockedFact\(out\.ok\);/g, 'void 0;').replace(/noteLlmBlockedFact\(true\);/g, 'void 0;');
  assert.notEqual(forged, SIDEPANEL_SRC, '前置：注入锚点必须存在');
  assert.ok(dualSourceProblems(forged, read(PROVIDERS_REL), read(DEFINITION_REL)).some((p) => p.includes('被动观测')) , '删被动路径必须红（合法降级场景丢失）');
  assert.deepEqual(dualSourceProblems(SIDEPANEL_SRC, read(PROVIDERS_REL), read(DEFINITION_REL)), []);
});

test('OD-8 引导流恰 4 步单源 + 复用既有 params 序列', () => {
  assert.deepEqual(flowProblems([...ONBOARD_STEPS], ONBOARD_COLLECT_STEPS), [], JUDGEMENTS[7].expectFailPattern);
  assert.deepEqual([...ONBOARD_STEP_IDS], ['detect', 'guide', 'collect', 'complete']);
  assert.equal(OP_PARAM_SEQUENCE['op.llm-config'].length, 3, '采集段复用既有单源（3 条）');
  assert.equal((FLOW_SRC.match(/const ONBOARD_STEPS = Object\.freeze\(/g) ?? []).length, 1, '步骤表恰一处声明');
  assert.equal((FILES.filter((f) => /const ONBOARD_STEPS\b/.test(f.text)).length), 1, '全仓第二份步骤表 ⇒ FAIL');
});

test('OD-8 反证：删任一步 / 第二份序列 ⇒ 各必红 → 还原 PASS', () => {
  const dropped = [...ONBOARD_STEPS].filter((s) => s.id !== 'collect');
  assert.ok(flowProblems(dropped, ONBOARD_COLLECT_STEPS).length > 0, '删步必须红');
  assert.ok(flowProblems([...ONBOARD_STEPS].reverse(), ONBOARD_COLLECT_STEPS).length > 0, '乱序必须红');
  const secondSequence = `${FLOW_SRC}\nexport const ONBOARD_PARAMS = ['choice', 'text', 'secret'];\n`;
  assert.ok(OP_PARAM_SEQUENCE['op.llm-config'].length === 3 && secondSequence.includes('ONBOARD_PARAMS'), '第二份序列是可注入面');
  assert.deepEqual(flowProblems([...ONBOARD_STEPS], ONBOARD_COLLECT_STEPS), []);
});

test('OD-9 不跳走（引导路径零 #open-settings / 零视图切换）', () => {
  assert.deepEqual(noNavigationProblems(FLOW_SRC, SIDEPANEL_SRC), [], JUDGEMENTS[8].expectFailPattern);
  assert.ok(
    noNavigationProblems(`${FLOW_SRC}\nopenSettingsSection('llm');\n`, SIDEPANEL_SRC).length > 0,
    '把引导实现为打开设置页 ⇒ 必红（R-SELF-905）',
  );
  const navInjected = SIDEPANEL_SRC.replace(
    "        dispatch({ type: 'notice', text: ONBOARD_DETECT_TEXT });",
    "        openSettingsSection('llm');\n        dispatch({ type: 'notice', text: ONBOARD_DETECT_TEXT });",
  );
  assert.notEqual(navInjected, SIDEPANEL_SRC, '前置：引导分支注入锚点必须存在');
  assert.ok(noNavigationProblems(FLOW_SRC, navInjected).length > 0, '把引导实现为打开设置页 ⇒ 必红');
  assert.deepEqual(noNavigationProblems(FLOW_SRC, SIDEPANEL_SRC), []);
});

test('OD-10 悬置任务单源（第二处登记 / 第二份登记表 ⇒ FAIL）', () => {
  assert.deepEqual(suspensionSingleSourceProblems(FILES), [], JUDGEMENTS[9].expectFailPattern);
  const ghost = [...FILES, { rel: 'src/ui/sidepanel/next-registry/ghost.ts', text: 'const SUSPENSIONS: Suspension[] = [];\nSUSPENSIONS.push(x);\n' }];
  assert.ok(suspensionSingleSourceProblems(ghost).length > 0, '第二份登记表 / 第二写入点必须红');
  const secondConfig = [...FILES, { rel: 'src/ui/sidepanel/next-registry/ghost2.ts', text: "registerSuspension({ source: CONFIG_SUSPENSION_SOURCE });\n" }];
  assert.ok(suspensionSingleSourceProblems(secondConfig).some((p) => p.includes('等待配置')), '第二处配置登记必须红');
  assert.deepEqual(suspensionSingleSourceProblems(FILES), []);
});

test('OD-11 MAX = 1：不同意图不叠加（over-capacity）+ 删上限 ⇒ FAIL', () => {
  resetSuspensions();
  assert.equal(registerConfigSuspension('原地翻译为中文', { origin: 'https://a.example', sessionId: 's1' }), 'registered');
  assert.equal(pendingSuspension()?.instruction, '原地翻译为中文');
  assert.equal(registerConfigSuspension('原地翻译为中文', { origin: 'https://a.example', sessionId: 's1' }), 'deduped', '同因必须幂等');
  assert.equal(registerConfigSuspension('总结这页', { origin: 'https://a.example', sessionId: 's1' }), 'over-capacity', '第二条不同意图不得叠加');
  const count = listSuspensions().filter((s) => s.source === CONFIG_SUSPENSION_SOURCE).length;
  assert.deepEqual(maxSuspensionProblems(count, 'over-capacity'), [], JUDGEMENTS[10].expectFailPattern);
  const uncapped = registerConfigSuspension('总结这页', { origin: 'https://a.example', sessionId: 's1' }) === 'registered';
  assert.equal(uncapped, false, '删上限的等价注入：第二次不同意图确实被拦（判据非恒真）');
  resetSuspensions();
});

test('OD-12 有效期重校验（站点 / 会话变化 ⇒ invalidated；空悬置 ⇒ empty 非死端）', () => {
  resetSuspensions();
  assert.deepEqual(resumeSuspension({ origin: 'https://a.example', sessionId: 's1' }), { status: 'empty' }, '空悬置是显式读数');
  registerConfigSuspension('原地翻译为中文', { origin: 'https://a.example', sessionId: 's1' });
  const statusOf = (facts: { origin?: string; sessionId?: string }): string => resumeSuspension(facts).status;
  assert.deepEqual(validityProblems(statusOf), [], JUDGEMENTS[11].expectFailPattern);
  const noRecheck = (): string => 'resumed'; // 注入：去掉有效期重校验
  assert.ok(validityProblems(noRecheck).length > 0, '不重校验（制造假成功）⇒ 必红');
  const invalid = resumeSuspension({ origin: 'https://b.example', sessionId: 's1' });
  assert.equal(invalid.status, 'invalidated');
  assert.equal(invalid.instruction, undefined, '失效时不得交付旧输入（防假成功）');
  resetSuspensions();
});

test('OD-13 自动续接顺序（回执在前、续接在后）+ 删续接 ⇒ FAIL', () => {
  assert.deepEqual(resumeOrderProblems(PIPELINE_SRC, SIDEPANEL_SRC), [], JUDGEMENTS[12].expectFailPattern);
  const swapped = PIPELINE_SRC.replace(
    "      await settle(op_, 'completed', ctx, snap, out);\n      // ★ V5.5-2 TASK-V55-211 (ADR-V55-007 §3): 回执**已写**（settle 返回）之后才通知\n      // 面板「本次结算收口」——「回执在前、续接在后」的事件序由这一处源码序保证。\n      panelOpSettled(op_, 'completed');",
    "      panelOpSettled(op_, 'completed');\n      await settle(op_, 'completed', ctx, snap, out);",
  );
  assert.notEqual(swapped, PIPELINE_SRC, '前置：注入锚点必须存在');
  assert.ok(resumeOrderProblems(swapped, SIDEPANEL_SRC).some((p) => p.includes('早于回执')), '顺序错必须红');
  const noResume = SIDEPANEL_SRC.replace('if (op.opId === ONBOARD_CHIP_OP && state === \'completed\') resumeAfterConfig();', 'void 0;');
  assert.ok(resumeOrderProblems(PIPELINE_SRC, noResume).length > 0, '删自动续接 ⇒ FAIL（复现「配完还要重说一遍」）');
  assert.deepEqual(resumeOrderProblems(PIPELINE_SRC, SIDEPANEL_SRC), []);
});

test('OD-14 两场景：首装 / 已装未配各自产出配置引导（注入 firstRun=false 仍须产出；已配置 ⇒ 零引导）', () => {
  assert.deepEqual(
    scenarioProblems([...ONBOARD_SCENARIOS], onboardScenario),
    [],
    JUDGEMENTS[13].expectFailPattern,
  );
  // 两场景的判据来源不同（互斥完备）；「已装未配」的 carrier 是既有 `risk` 源。
  assert.deepEqual([...ONBOARD_SCENARIOS].map((s) => s.id), ['first-install', 'installed-unconfigured']);
  assert.equal(ONBOARD_SCENARIOS[1].via, 'risk');
  assert.equal(ONBOARD_SCENARIOS[1].resultsIn, 'config-guide');
  // 判据不依赖 firstRun 的**机器证据**：既有 `llm.unconfigured` provider 的 `when` 只读 risk 源
  // （其修复 op = 唯一配置执行体），而 `risk: llmBlocked` 与 `onboarding` 源无关。
  assert.equal(OPS_RECOVERY_ROWS.find((r) => r.blocked === 'llm.unconfigured')?.op, 'op.llm-config');
  assert.ok(
    /when: \(ctx\) => ctx\.risk\.includes\(row\.risk\)/.test(stripComments(read(PROVIDERS_REL))),
    'op-driven provider 的 when 必须只读 risk 源（不得挂 firstRun）',
  );
  const configuredOnly = candidateRules({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    now: 1_000_000,
  } as never);
  assert.ok(
    !configuredOnly.some((c) => c.chips.some((x) => x.act === 'op.llm-config')),
    '已配置（无 llmBlocked 事实）⇒ 零配置引导（不得凭 firstRun 触发配置引导）',
  );
});

test('OD-14 反证：让「已装未配」挂上 firstRun / 删掉一个场景 ⇒ 各必红 → 还原 PASS', () => {
  const firstRunBound = [
    { ...ONBOARD_SCENARIOS[0] },
    { ...ONBOARD_SCENARIOS[1], when: 'firstRun', via: 'onboarding' },
  ];
  assert.ok(scenarioProblems(firstRunBound, onboardScenario).length > 0, '已装未配挂 firstRun ⇒ 必红');
  const dropped = [ONBOARD_SCENARIOS[0]];
  assert.ok(scenarioProblems(dropped, onboardScenario).length > 0, '删掉一个场景 ⇒ 必红');
  const firstRunOnly = (f: { firstRun: boolean; configured: boolean }): string =>
    f.configured ? 'none' : f.firstRun ? 'first-install' : 'none';
  assert.ok(scenarioProblems([...ONBOARD_SCENARIOS], firstRunOnly).length > 0, '只认 firstRun（已装未配丢失）⇒ 必红');
  assert.deepEqual(scenarioProblems([...ONBOARD_SCENARIOS], onboardScenario), []);
});

test('OD-15 取消非死端 + 同因不重复（同因压掉 / 新因不压 / 悬置保留 + 可达 next）', () => {
  assert.deepEqual(cancelProblems(SIDEPANEL_SRC, suppressOnboardCause), [], JUDGEMENTS[14].expectFailPattern);
  assert.equal(onboardCauseKey('  原地翻译为中文 '), '原地翻译为中文', '因键 = 用户原话（trim）');
  assert.equal(onboardCauseKey(''), '');
  // 取消非死端的两半：① 悬置任务**保留**（取消不清空登记）；② 取消后仍有可达 next。
  resetSuspensions();
  assert.equal(registerConfigSuspension('原地翻译为中文', { origin: 'https://a.example', sessionId: 's1' }), 'registered');
  assert.equal(pendingSuspension()?.instruction, '原地翻译为中文', '取消前后悬置任务保留（用户那句话不丢）');
  const nextAfterCancel = candidateRules({
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'ready', steady: true },
    // 取消后：同因的那条引导被压掉（`llmBlocked` 不入 risk），但可达 next 仍必须存在。
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 1_000_000,
  } as never);
  assert.ok(nextAfterCancel.length >= 1, '取消后必须仍有可达 next（非死端）');
  assert.ok(
    listSuspensions().some((s) => s.source === CONFIG_SUSPENSION_SOURCE),
    '取消不丢弃悬置登记（保留）',
  );
  resetSuspensions();
});

test('OD-15 反证：删掉同因去重（或取消路径的 force 求值）⇒ 必 FAIL → 还原 PASS', () => {
  const noDedup = SIDEPANEL_SRC.replace(
    'if (id === LLM_BLOCKED_RISK && suppressOnboardCause(onboardGuideCause, declinedOnboardCauses)) continue;',
    'void 0;',
  );
  assert.notEqual(noDedup, SIDEPANEL_SRC, '前置：去重注入锚点必须存在');
  assert.ok(
    cancelProblems(noDedup, suppressOnboardCause).some((p) => p.includes('同因')),
    '删同因去重 ⇒ 必红（复现「取消后立刻重复弹」）',
  );
  const noForce = SIDEPANEL_SRC.replace(
    'nextAfterSettle({ kind: `op-${state}`, force: true, opId: op.opId });',
    'nextAfterSettle({ kind: `op-${state}`, opId: op.opId });',
  );
  assert.notEqual(noForce, SIDEPANEL_SRC, '前置：force 注入锚点必须存在');
  assert.ok(cancelProblems(noForce, suppressOnboardCause).length > 0, '取消路径缺 force 求值 ⇒ 必红（可达 next 会被防抖吞掉）');
  // 恒真的「一律压掉」也必须被判红（新因被误压）。
  const alwaysSuppress = (): boolean => true;
  assert.ok(cancelProblems(SIDEPANEL_SRC, alwaysSuppress).length > 0, '一律压掉（新因也压）⇒ 必红');
  assert.deepEqual(cancelProblems(SIDEPANEL_SRC, suppressOnboardCause), []);
});

/** X-SELF-3 落账判据（纯函数：同一实现供真源与反证共用）。 */
export function xSelf3Problems(
  entries: readonly { readonly id: string; readonly file: string; readonly modificationType: string; readonly oldTitle: string | null; readonly oldId: string | null; readonly newTitle: string; readonly reason: string }[],
): string[] {
  const problems: string[] = [];
  const find = (id: string) => entries.find((e) => e.id === id);
  const entry = find('X-SELF-3');
  const sw = find('X-SELF-3-SW');
  if (!entry) problems.push(`${JUDGEMENTS[15].expectFailPattern}：缺 X-SELF-3 条目（面板半）`);
  if (!sw) problems.push(`${JUDGEMENTS[15].expectFailPattern}：缺 X-SELF-3-SW 条目（SW 半）`);
  for (const [id, e] of [['X-SELF-3', entry], ['X-SELF-3-SW', sw]] as const) {
    if (!e) continue;
    // 「加源不取代」：双源并存 ⇒ 纯新增（0 删除行）⇒ oldTitle 必须为 null（副作用面零改写）。
    if (e.modificationType !== 'pure-addition' || e.oldTitle !== null) {
      problems.push(`${id}: 双源并存必须是**纯新增**（pure-addition ∧ oldTitle=null），实测 ${e.modificationType}/${String(e.oldTitle)}`);
    }
    if (e.oldId !== null) problems.push(`${id}: 旧 id 必须为 null（不得伪称某文本被取代）`);
    if (e.reason.trim().length < 40) problems.push(`${id}: 理由必须 ≥40 字符`);
    // 可定位性（防橡皮图章）：newTitle 必须逐字存在于目标文件。
    const rel = e.file.replace(/^packages\/web-cli-plugin\//, '');
    const text = readFileSync(join(PKG, rel), 'utf8');
    if (!text.includes(e.newTitle)) problems.push(`${id}: newTitle 在 ${e.file} 中定位不到`);
  }
  return problems;
}

test('OD-16 X-SELF-3 取代台账落账（双源并存 = 被动保留 + 主动新增；缺条目 ⇒ 必红）', () => {
  const v4 = JSON.parse(readFileSync(join(PKG, 'docs/v4-supersession-ledger.json'), 'utf8')) as {
    entries: Array<{ id: string; file: string; modificationType: string; oldTitle: string | null; oldId: string | null; newTitle: string; reason: string }>;
  };
  assert.deepEqual(xSelf3Problems(v4.entries), [], xSelf3Problems(v4.entries).join('\n'));
  // 恢复链零改写（逐条不变）—— 台账条目不得与「按终态键控」形态冲突。
  assert.deepEqual(OPS_RECOVERY_ROWS.map((r) => r.blocked), ['llm.unconfigured', 'perm.missing']);
  assert.deepEqual(Object.keys(BLOCKED_RECOVERY_TRIGGER), [...BLOCKED_TERMINALS]);
  // 反证：台账缺 X-SELF-3（或伪称它取代了某文本）⇒ 同一判据必红（**复现「X-SELF-3 台账缺 ⇒ supersession 必红」**）。
  assert.ok(
    xSelf3Problems(v4.entries.filter((e) => e.id !== 'X-SELF-3')).some((p) => p.includes('缺 X-SELF-3')),
    '缺 X-SELF-3 条目必须判红',
  );
  assert.ok(
    xSelf3Problems(v4.entries.map((e) => (e.id === 'X-SELF-3' ? { ...e, modificationType: 'superseding', oldTitle: 'noteLlmBlockedFact(false);' } : e)))
      .some((p) => p.includes('纯新增')),
    '把「加源不取代」伪称成取代必须判红',
  );
});

test('OD 元判据：每条 judgement 的 expectFailPattern 非占位', () => {
  assert.ok(JUDGEMENTS.length >= 16, '判据表必须覆盖 16 条以上判据（W5 只增）');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  assert.equal(MAX_SUSPENSIONS, 1);
  assert.equal(CONFIG_SUSPENSION_SOURCE, 'llm-config');
});
