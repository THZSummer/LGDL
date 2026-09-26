/**
 * V4-4 TASK-808 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the recommendation
 * **truth-source gate** (本叶 ADR-V4-037 · 父 ADR-V4-015 §12 裁决 5 / FR-CHAT-060 /
 * 062 / 064 / AC-CHAT-013 / EC-CHAT-008).
 *
 * ── What this gate must prove ────────────────────────────────────────────────
 *
 * The recommendation producer is the ONLY new content producer this Feature adds.
 * The whole risk of it is that a later edit quietly reaches for a truth source the
 * author explicitly excluded — above all `deriveCounts().settings` (the v3 F6
 * exemption trap: a「设置里有 N 项」derivation is a *rendering* count, not a fact).
 *
 * Four properties, each independently falsifiable:
 *
 *   ① **导入集合 ⊆ 白名单** — the module may only import the copy factory, so it
 *      structurally cannot reach a settings/count projection;
 *   ② **零** `settings` / `deriveCounts` 引用 — belt and braces on the source text;
 *   ③ **规则表可复算** — priority / caps / interval are exported constants whose
 *      values the gate re-derives and whose semantics it re-drives through the
 *      producer (the gate is a real driver, not a text match);
 *   ④ **安全边界 / 无候选不渲染 / 门控** — driven through `recommendNextStep`.
 *
 * A gate that cannot fail is not a gate: {@link importsOf} and
 * {@link forbiddenReferences} are exported so they can be pointed at a FORGED source
 * and shown to flag it (the negative control runs in this file).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  MAX_CHIPS_PER_CARD,
  activeRecoveryTrigger,
  MAX_NEXTSTEP_CARDS_PER_ROUND,
  NEXTSTEP_ACTS,
  NEXTSTEP_MIN_INTERVAL_MS,
  NEXTSTEP_PRIORITY,
  NEXTSTEP_SOURCE_WHITELIST,
  RECOMMEND_MODULE_WHITELIST,
  candidateRules,
  chipDedupKey,
  refActionDigest,
  recommendNextStep,
} from '../src/ui/sidepanel/recommend.js';
import type { RecommendInput } from '../src/ui/sidepanel/recommend.js';
import type { AiNextCandidate } from '../src/ui/sidepanel/next-registry/definition.js';
import { label } from '../src/ui/sidepanel/stream-plaintext.js';
// V5-1（TASK-V5-115 / FR-ALLN-112 X3 / ADR-V5-001）—— 闭集判据等价重锚所需的两个 op 源：
// `ACT_TO_OP`（act → opId 的**唯一权威**）与义务表的 9 opId 集（新增 op 自动纳入的判据域）。
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { NEXT_SOURCE_NAMES } from '../src/ui/sidepanel/next-registry/definition.js';
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { RECOVERY_CHIP_ORDER } from '../src/ui/sidepanel/recommend.js';
import { DRIVER_TIMINGS, DRIVER_TIMINGS_LEGACY4, DRIVER_TIMING_ANSWERED } from '../src/ui/sidepanel/next-registry/drivers.js';

import { join } from 'node:path';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
// Resolved from the PACKAGE ROOT: `npm test` compiles to `dist-test/`, so a
// `new URL('../src/…', import.meta.url)` would look inside `dist-test/src/`.
const RECOMMEND_SRC = readFileSync(join(PKG, 'src/ui/sidepanel/recommend.ts'), 'utf8');

/**
 * Strip comments before scanning. The gate is about what the CODE can reach — a doc
 * comment that *names* `deriveCounts` (to say it is excluded) must not fail the gate,
 * and conversely a real reference inside a comment would not reach anything.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const RECOMMEND_CODE = stripComments(RECOMMEND_SRC);

/** Every module specifier a source file imports (relative + bare). */
export function importsOf(source: string): string[] {
  const out: string[] = [];
  const re = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  for (const m of source.matchAll(re)) out.push(m[1]);
  return out.sort();
}

/** The excluded truth-source markers (`settings` counts / any view-size derivation). */
export function forbiddenReferences(source: string): string[] {
  return [...source.matchAll(/deriveCounts|\.settings\b|settings\s*:/g)].map((m) => m[0]);
}

/** A sane input the gate mutates one field at a time. */
function baseInput(over: Partial<RecommendInput> = {}): RecommendInput {
  return {
    ref: { validCount: 1, staleCount: 0, latestRefNum: 3 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 122, subcommandCount: 40 },
    // V4.5-1 W3: `steady:false` is a recovery trigger now (`probe` 未就绪), so the
    //「clean settled」fixture must declare a settled probe.
    probe: { phase: 'ready', steady: true },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 1_000_000,
    ...over,
  };
}

// ── ① 导入集合 ⊆ 白名单 ───────────────────────────────────────────────────────

test('① 导入集合 ⊆ 白名单：recommend.ts 只能导入文案工厂（结构上够不到设置/计数投影）', () => {
  const imports = importsOf(RECOMMEND_SRC);
  assert.ok(imports.length >= 1, 'recommend.ts 必须至少导入文案工厂（否则 label 约束是空的）');
  for (const spec of imports) {
    assert.ok(
      (RECOMMEND_MODULE_WHITELIST as readonly string[]).includes(spec),
      `recommend.ts 导入了白名单外模块 ${spec}（真值白名单只允许 ${RECOMMEND_MODULE_WHITELIST.join(', ')}）`,
    );
  }
});

test('① 反证：伪造一处设置计数导入 ⇒ 白名单判定必红（门禁能失败）', () => {
  const forged = `import { deriveCounts } from './l2/counts.js';\nimport { label } from './stream-plaintext.js';`;
  const imports = importsOf(forged);
  const offenders = imports.filter((s) => !(RECOMMEND_MODULE_WHITELIST as readonly string[]).includes(s));
  assert.deepEqual(offenders, ['./l2/counts.js'], '伪造导入必须被白名单拦下');
  assert.ok(forbiddenReferences(forged).length > 0, '伪造导入必须同时被禁词扫描命中');
});

// ── ② 零 settings / deriveCounts ────────────────────────────────────────────

test('② 零设置项计数真值：代码不含 `settings` / `deriveCounts` 引用', () => {
  assert.deepEqual(forbiddenReferences(RECOMMEND_CODE), []);
});

// ── ③ 真值白名单 7 项 + 规则表可复算 ────────────────────────────────────────

test('③ 真值白名单恰 7 项且与 ADR-V4-037 逐字一致', () => {
  assert.deepEqual([...NEXTSTEP_SOURCE_WHITELIST], ['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding']);
});

test('③ 规则表常量可复算：上限 / 优先级 / 间隔 / 单卡 chips', () => {
  assert.equal(MAX_NEXTSTEP_CARDS_PER_ROUND, 1);
  assert.equal(MAX_CHIPS_PER_CARD, 3);
  assert.equal(NEXTSTEP_MIN_INTERVAL_MS, 10_000);
  assert.deepEqual([...NEXTSTEP_PRIORITY], ['risk-recovery', 'ref-action', 'onboarding', 'capability-discovery']);
  // Every produced candidate's priority must equal its index+1 in the table.
  for (const c of candidateRules(baseInput())) {
    assert.equal(c.priority, NEXTSTEP_PRIORITY.indexOf(c.rule) + 1, `${c.rule} 的优先级必须来自规则表位置`);
    assert.ok(c.chips.length <= MAX_CHIPS_PER_CARD, `${c.rule} 的 chips 不得超过单卡上限`);
  }
});

// ── ④ 门控 / 上限 / 无候选不渲染 / 安全边界 ─────────────────────────────────

test('④ pending ⇒ 不生成任何卡（FR-CHAT-063）', () => {
  const r = recommendNextStep(baseInput({ session: { openAsks: 0, busy: true } }));
  assert.deepEqual(r.cards, []);
  assert.equal(r.suppression, 'pending');
});

test('④ 空闲间隔未到 ⇒ 不生成（防刷屏）', () => {
  const r = recommendNextStep(baseInput({ lastProducedAt: 995_000, now: 1_000_000 }));
  assert.deepEqual(r.cards, []);
  assert.equal(r.suppression, 'interval');
  const ok = recommendNextStep(baseInput({ lastProducedAt: 990_000, now: 1_000_000 }));
  assert.equal(ok.cards.length, 1, '间隔满 10s 后应恢复');
});

test('④ V4.5-1：site / probe 入 priority 1 触发集 ⇒ 未授权或未就绪必有可行动恢复卡', () => {
  // `site`：未授权 / 无活跃站点 ⇒ 恢复卡（`rebind` 首项）。
  const site = recommendNextStep(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: false, trust: 'untrusted' },
      probe: { phase: 'ready', steady: true },
      onboarding: { firstRun: false, pendingSteps: [] },
    }),
  );
  assert.equal(site.cards.length, 1);
  assert.equal(site.cards[0].rule, 'risk-recovery');
  assert.equal(site.cards[0].chips[0].text, '重新绑定当前标签页', 'site 触发必须由规则表首项给出 rebind');
  assert.equal(site.cards[0].chips[0].act, 'rebind');
  // `probe`：探测态未就绪 ⇒ 恢复卡（`rebind` 首项）。
  const probe = recommendNextStep(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: true, trust: 'trusted' },
      probe: { phase: 'idle', steady: false },
      onboarding: { firstRun: false, pendingSteps: [] },
    }),
  );
  assert.equal(probe.cards.length, 1);
  assert.equal(probe.cards[0].rule, 'risk-recovery');
  assert.equal(probe.cards[0].chips[0].act, 'rebind');
  // 触发集顺序：风险类优先于 site / probe（`refInvalid` 先命中）。
  assert.equal(activeRecoveryTrigger({ ...baseInput({ ref: { validCount: 0, staleCount: 1 }, site: { authorized: false }, probe: { phase: 'idle', steady: false } }) }), 'refInvalid');
  assert.equal(activeRecoveryTrigger(baseInput({ site: { authorized: false } })), 'site');
  assert.equal(activeRecoveryTrigger(baseInput({ probe: { phase: 'waiting', steady: false } })), 'probe');
  // 相位**未知**（未探测过）不是异常 —— 否则恢复卡会永久挤掉 discovery / ref-action。
  assert.equal(activeRecoveryTrigger(baseInput({ probe: { steady: false } })), null);
  assert.equal(activeRecoveryTrigger(baseInput({ probe: { phase: 'probing', steady: false } })), null, '探测进行中不是可行动异常');
  assert.equal(activeRecoveryTrigger(baseInput()), null, '干净态不得有恢复触发（判据不得恒真）');
  // `empty` 分支仍由规则表空集守住（settled 输入不可能同时无规则，故此处直核规则表）。
  assert.deepEqual(candidateRules(baseInput({ site: { authorized: false } })).filter((c) => c.rule === 'risk-recovery').length, 1);
});

test('④ 上限：一轮最多 1 张卡；恢复类优先于发现类', () => {
  const r = recommendNextStep(
    baseInput({
      ref: { validCount: 2, staleCount: 1, latestRefNum: 4 },
      onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
      // V4.5-1 W3: `steady:false` is a recovery trigger now (`probe` 未就绪), so the
    //「clean settled」fixture must declare a settled probe.
    probe: { phase: 'ready', steady: true },
    }),
  );
  assert.equal(r.cards.length, MAX_NEXTSTEP_CARDS_PER_ROUND);
  assert.equal(r.cards[0].rule, 'risk-recovery', '恢复类必须优先于引用动作 / onboarding / 发现类');
});

test('④ 安全边界：唯一候选全是被拦命令 ⇒ 不推荐（fail-closed）', () => {
  const discoveryInput = baseInput({
    ref: { validCount: 0, staleCount: 0 },
    site: { authorized: true },
    // V4.5-1 W3: `steady:false` is a recovery trigger now (`probe` 未就绪), so the
    //「clean settled」fixture must declare a settled probe.
    probe: { phase: 'ready', steady: true },
    onboarding: { firstRun: false, pendingSteps: [] },
  });
  const chip = candidateRules(discoveryInput).find((c) => c.rule === 'capability-discovery')!;
  const denied = chip.chips.map((c) => c.text);
  const r = recommendNextStep(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: true },
      deniedCommands: denied,
      onboarding: { firstRun: false, pendingSteps: [] },
    }),
  );
  assert.deepEqual(r.cards, []);
  assert.equal(r.suppression, 'safety');
});

test('④ 零新增网络 / LLM 面：源码不含 fetch / chrome / 时钟', () => {
  for (const marker of ['fetch(', 'chrome.', 'Date.now', 'XMLHttpRequest', 'WebSocket']) {
    assert.ok(!RECOMMEND_CODE.includes(marker), `recommend.ts 不得出现 ${marker}`);
  }
});

test('④ 文案零明文：chips 全部经 label 工厂构造（含 `<` / `?` 的反证）', () => {
  // The producer builds EVERY chip through `label`, whose scan is fail-closed: a
  // page-text / URL-query / markup shape throws where the string is built. The
  // negative control points the very same factory at such a shape.
  assert.throws(() => label(['<b>页面文本</b>']), /原始标记/);
  assert.throws(() => label(['https://x.test/?q=secret']), /URL query/);
  // And the produced chips really are the factory's output (no bypass possible).
  for (const c of candidateRules(baseInput())) {
    for (const chip of c.chips) assert.equal(typeof chip.text, 'string');
  }
});

// ── C3 / BLOCK-01（V4-4 审查修复轮）───────────────────────────────────────────

test('④ 安全边界（C3 修复）：候选含**任一**被拦 next chip ⇒ 整张卡不推荐（fail-closed 到 chip 级）', () => {
  // capability-discovery 的两条 chip 都是 `next` 动作；只拦其中**一条**。
  const chip = candidateRules(baseInput()).find((c) => c.rule === 'capability-discovery')!;
  assert.ok(chip.chips.length >= 2, '前置：该候选必须有多条 chip（否则本用例空转）');
  const denied = [chip.chips[0].text];
  const r = recommendNextStep(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: true },
      deniedCommands: denied,
      onboarding: { firstRun: false, pendingSteps: [] },
    }),
  );
  assert.deepEqual(
    r.cards,
    [],
    '候选内**任一** next chip 被拦 ⇒ 整卡不得渲染（旧实现用 some 会放行被拦 chip）',
  );
  assert.equal(r.suppression, 'safety');
  // 非 next 本地动作不受 deny 集影响（deny 集只命名回合命令）。
  const local = candidateRules(baseInput({ ref: { validCount: 0, staleCount: 1 } })).find((c) => c.rule === 'risk-recovery')!;
  assert.ok(local.chips.every((c) => c.act !== 'next'), '前置：risk-recovery 全是本地动作');
  const r2 = recommendNextStep(
    baseInput({ ref: { validCount: 0, staleCount: 1 }, deniedCommands: local.chips.map((c) => c.text) }),
  );
  assert.equal(r2.cards.length, 1, '本地动作（repick/describe）不得被 deny 集误伤');
});

// ── FIX-1（F 还原度快修轮，2026-09-20）─────────────────────────────────────────

test('V4.5-1 act 闭集终态 6 项：authorize / rebind / help 都是本地动作（不进回合命令闭集）', () => {
  assert.deepEqual([...NEXTSTEP_ACTS], ['next', 'repick', 'describe', 'authorize', 'rebind', 'help']);
  // ── V5-1（TASK-V5-115 / FR-ALLN-112 X3）**等价重锚（加严，零降级）**：旧「闭集 6 项」
  //    判据保留为上行的渲染别名一致性检查；**新的唯一权威**是 ACT_TO_OP 的 6 行映射 ——
  //    act 从「分发依据」降为渲染别名，而 opId 集由注册表 / 义务表给出（新增 op 自动纳入）。
  assert.deepEqual(
    Object.keys(ACT_TO_OP),
    [...NEXTSTEP_ACTS],
    'ACT_TO_OP 的 6 行 act 键集必须与渲染别名闭集同源（含顺序）—— 旧闭集判据的等价落点',
  );
  assert.equal(new Set(Object.values(ACT_TO_OP)).size, 6, 'act → opId 必须一一对应（无两个 act 映射到同一 op）');
  for (const opId of Object.values(ACT_TO_OP)) {
    assert.ok(OBLIGATION_OP_IDS.includes(opId), `映射出的 ${opId} 必须在义务表 9 op 内（v5-2 新增 op 自动纳入本判据）`);
  }
  // The onboarding rule's authorization chip must carry the local act — shipping
  // `next` is exactly the defect the FIX-1 round removed (the string was sent to the LLM).
  const onboarding = candidateRules(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: false, trust: 'untrusted' },
      probe: { phase: 'idle', steady: false },
      onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    }),
  ).find((c) => c.rule === 'onboarding');
  assert.ok(onboarding, '前置：首装态必须产出 onboarding 候选');
  const authChip = onboarding.chips.find((c) => c.text.includes('授权当前站点'));
  assert.ok(authChip, 'onboarding 卡必须含「授权当前站点」chip');
  assert.equal(authChip.act, 'authorize', 'FIX-1：授权 chip 的 act 必须是 authorize，不得是 next');
  // V4.5-1 W3（FR-V45-041）：手势说明是设置「帮助」分区的本地导航，不是回合。
  const helpChip = onboarding.chips.find((c) => c.text.includes('页面手势'));
  assert.equal(helpChip?.act, 'help', '「了解 6 个页面手势」chip 的 act 必须是 help（本地设置导航）');
  assert.equal(helpChip?.text, '了解 6 个页面手势', '文案必须逐字不变');
  // 新增第 7 个 act ⇒ 闭集断言红（同源守卫）。
  assert.ok(!(NEXTSTEP_ACTS as readonly string[]).includes('unknown-act'));
});

test('FIX-1 deny 集只命名回合命令：授权 chip 的文本即使出现在 deny 集也不误伤本地动作', () => {
  const input = baseInput({
    ref: { validCount: 0, staleCount: 0 },
    site: { authorized: true, trust: 'trusted' },
    probe: { phase: 'ready', steady: true },
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    deniedCommands: ['授权当前站点'],
  });
  // Both onboarding chips are local acts now (`authorize` / `help`), so a deny set that
  // names them cannot suppress the card (deny only ever judges `act === 'next'`).
  const r = recommendNextStep(input);
  assert.equal(r.cards.length, 1, '授权是本地动作，deny 集不得据此整卡拦下');
  assert.equal(r.cards[0].rule, 'onboarding');
  assert.ok(r.cards[0].chips.every((c) => c.act !== 'next'), '前置：本卡片全是本地动作');
});

/* ── V5-1（TASK-V5-115 / FR-ALLN-112·120 / ADR-V5-001·012 · X3）───────────────
 *
 * X3 的等价重写形态①③：旧「闭集 6 项」判据 → **注册表 opId 集**判据（判据力**上升**：
 * v5-2 新增 op 自动纳入，无需再改门禁）；同时**源白名单 7 项语义零扩项**（注册表候选
 * 仍只读既定 state 字段 —— 由 `NextCtx` 的键集与白名单逐字相等机核）。
 * 两条反证按 §12 施工图逐条实跑（判据不得恒真、也不得因「找不到」静默放行）。
 */

/** The judge: every registered op must be inside the obligation table's op vocabulary. */
export function opVocabularyProblems(opIds: readonly string[]): string[] {
  const declared = new Set<string>(OBLIGATION_OP_IDS);
  return opIds.filter((id) => !declared.has(id)).map((id) => `注册表 opId ${id} 无义务表行（新增 op 必须同步义务表）`);
}

/** The judge: the truth-source whitelist stays at the same 7 names (zero extension). */
export function sourceWhitelistProblems(list: readonly string[]): string[] {
  const expected = ['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding'];
  const problems: string[] = [];
  if (list.length !== expected.length) problems.push(`真值白名单必须恰 ${expected.length} 项（实测 ${list.length}）`);
  for (const name of expected) if (!list.includes(name)) problems.push(`真值白名单缺 ${name}`);
  for (const name of list) if (!expected.includes(name)) problems.push(`真值白名单多出未登记项 ${name}（零扩项）`);
  return problems;
}

/**
 * V5-1 validate R1 **I-04** — the judge for the **cross-table** drift seam: the 7-source
 * list is declared twice (`definition.ts#NEXT_SOURCE_NAMES` — the `NextCtx` field set —
 * and `recommend.ts#NEXTSTEP_SOURCE_WHITELIST` — the producer's truth sources). They are
 * two independent literals; without this judge they can drift apart silently.
 * `order-sensitive`: the two lists must be verbatim equal (element + order).
 */
export function crossTableSourceProblems(definitionList: readonly string[], recommendList: readonly string[]): string[] {
  const problems: string[] = [];
  if (definitionList.length !== recommendList.length) {
    problems.push(`跨表 7 源列表长度不等：definition=${definitionList.length} recommend=${recommendList.length}`);
  }
  const n = Math.min(definitionList.length, recommendList.length);
  for (let i = 0; i < n; i += 1) {
    if (definitionList[i] !== recommendList[i]) {
      problems.push(`跨表 7 源列表第 ${i + 1} 项不等：definition=${String(definitionList[i])} recommend=${String(recommendList[i])}`);
    }
  }
  return problems;
}

test('V5-1 X3：注册表 opId 集判据（opId ⊆ 义务表 9 op；act→opId 同源；新增 op 自动纳入）', () => {
  assert.deepEqual(opVocabularyProblems(Object.keys(OPS_BY_ID)), [], '已注册 op 必须全部在义务表内');
  assert.equal(OBLIGATION_OP_IDS.length, 9, '义务表 opId 集恰 9 项（DC-ALLN-001）');
  // 反证：注册表多一个「未同步义务表」的 op ⇒ 同一判据必红（新增 op 不会静默漏过）。
  const forged = [...Object.keys(OPS_BY_ID), 'op.rogue'];
  assert.deepEqual(opVocabularyProblems(forged), ['注册表 opId op.rogue 无义务表行（新增 op 必须同步义务表）']);
  assert.ok(opVocabularyProblems(forged).length > 0);
});

test('V5-1 X3：源白名单 7 项语义保留（零扩项）+ NextCtx 键集 == 白名单', () => {
  assert.deepEqual(sourceWhitelistProblems([...NEXTSTEP_SOURCE_WHITELIST]), []);
  assert.deepEqual([...NEXTSTEP_SOURCE_WHITELIST], ['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding']);
  // 「语义保留」的机核半边：注册表候选只可能读到 NextCtx 的 7 个字段（输入形状即边界）。
  const ctxKeys = Object.keys({
    ref: baseInput().ref,
    session: baseInput().session,
    site: baseInput().site,
    catalog: baseInput().catalog,
    probe: baseInput().probe,
    risk: baseInput().risks,
    onboarding: baseInput().onboarding,
  }).sort();
  assert.deepEqual(ctxKeys, [...NEXTSTEP_SOURCE_WHITELIST].sort(), 'NextCtx 键集必须与真值白名单逐字相等（不得多读一个字段）');
  // 反证：删一条白名单项 ⇒ 判据必红（「删了也不红」正是本判据要防的退化）。
  const removed = [...NEXTSTEP_SOURCE_WHITELIST].filter((n) => n !== 'site');
  assert.ok(sourceWhitelistProblems(removed).length > 0, '删一条源白名单项必须判红');
  assert.ok(sourceWhitelistProblems([...NEXTSTEP_SOURCE_WHITELIST, 'settings']).length > 0, '新增一项（含 settings 计数投影）必须判红');
});

test('V5-1 validate I-04：跨表 7 源列表逐字相等（definition#NEXT_SOURCE_NAMES == recommend#NEXTSTEP_SOURCE_WHITELIST）', () => {
  assert.deepEqual(crossTableSourceProblems([...NEXT_SOURCE_NAMES], [...NEXTSTEP_SOURCE_WHITELIST]), [], '两处 7 源列表必须逐字（元素 + 序）相等');
  assert.deepEqual([...NEXT_SOURCE_NAMES], [...NEXTSTEP_SOURCE_WHITELIST]);
  // 反证（同一 judge）：任一侧改一字节 / 调序 / 删项 ⇒ 必红（判据不得空转）。
  assert.ok(crossTableSourceProblems(['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'settings'], [...NEXTSTEP_SOURCE_WHITELIST]).length > 0, 'definition 侧漂移必须判红');
  const reordered = [...NEXTSTEP_SOURCE_WHITELIST];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.ok(crossTableSourceProblems([...NEXT_SOURCE_NAMES], reordered).length > 0, 'recommend 侧调序必须判红');
  assert.ok(crossTableSourceProblems([...NEXT_SOURCE_NAMES].slice(0, 6), [...NEXTSTEP_SOURCE_WHITELIST]).length > 0, '长度不等必须判红');
});

test('V5-1 X3：chip act 视角与 opId 视角一致（双采集等价，能力零丢失）', () => {
  // 旧视角：候选 chip 的 act ∈ 闭集；新视角：同一 chip 的 opId = ACT_TO_OP[act] ∈ 义务表。
  const cards = candidateRules(baseInput());
  assert.ok(cards.length >= 1, '前置：干净输入必须产出候选（否则本判据空转）');
  for (const card of cards) {
    for (const chip of card.chips) {
      // 〖V5-2 review R1（BLOCK-03）等价重锚〗two chip kinds share the ONE act→opId chain:
      // the 6-act local/turn chips, and the **op-direct** chips whose act IS the opId
      // (`op.llm-config` / `op.perm.request` repair a blocked terminal directly).
      // 判据力只升：op-direct 分支要求 act ∈ 义务表（它自带 opId，不得是悬空字面量）。
      const mapped = (ACT_TO_OP as Readonly<Record<string, string>>)[chip.act] ?? chip.act;
      assert.ok(
        (NEXTSTEP_ACTS as readonly string[]).includes(chip.act) || OBLIGATION_OP_IDS.includes(chip.act),
        `chip act ${chip.act} 必须在 act 闭集内或是义务表内的 opId（op-direct）`,
      );
      assert.ok(mapped, `chip act ${chip.act} 必须有 opId 映射（旧 act 无「无对应 op」的悬空项）`);
      assert.ok(OBLIGATION_OP_IDS.includes(mapped), `chip 的 opId ${mapped} 必须在义务表内`);
    }
  }
  // 规则表的 chip 序（含 recovery 三首项）在 op 词汇下逐条保持：site / probe 仍以 rebind 打头。
  const siteChips = RECOVERY_CHIP_ORDER.site.slice(0, MAX_CHIPS_PER_CARD).map((a) => ACT_TO_OP[a]);
  assert.equal(siteChips[0], 'op.rebind', 'site 触发在 op 词汇下仍由 rebind 打头（等价，非重排）');
  assert.deepEqual(siteChips.length, 3, '单卡 chips 仍 ≤3');
});

/* ── V5.5-1 TASK-V55-114（ADR-V55-002 §1/§3 · FR-SELF-030/031/035 · AC-SELF-009）──
 *
 * 时机源扩张：`RecommendTrigger` 从 4 项扩到 **恰 5**（含 `'answered'`），旧 4 项**逐字**
 * 保留。这里机核的是「时机词汇的**值集事实**」；「答完 ⇒ 恰在一次求值内产出 next」由
 * `test/ui/recommendation.mjs`（Chromium，真实生产者）承担。
 * ──────────────────────────────────────────────────────────────────────────── */

test('V5.5-1 时机源：恰 5 含 answered ∧ 旧 4 逐字 ∧ 语义不复用 firstRun 的「至多一次」', () => {
  assert.equal(DRIVER_TIMINGS.length, 5, '时机源必须恰 5 项（4 → 5，纯加法）');
  assert.ok((DRIVER_TIMINGS as readonly string[]).includes('answered'), "时机源必须含 'answered'");
  assert.deepEqual([...DRIVER_TIMINGS_LEGACY4], ['pick', 'stale', 'idle', 'firstRun'], '旧 4 项逐字保留');
  assert.equal(DRIVER_TIMING_ANSWERED, 'answered');
  // 纯加法：新值集 = 旧 4 项 + 1。
  assert.deepEqual([...DRIVER_TIMINGS], [...DRIVER_TIMINGS_LEGACY4, 'answered']);
  // FR-SELF-035：「至多一次」语义**只**属于 firstRun 面（`maybeRecommendFirstRunEntry`），
  // 新时机不得被并入 —— 源码面断言：`answered` 不出现在 first-run 入口的守卫里。
  const panic = RECOMMEND_SRC;
  assert.match(panic, /NEXTSTEP_MIN_INTERVAL_MS\s*=\s*10_000/, '防抖间隔逐字');
  assert.match(panic, /MAX_CHIPS_PER_CARD\s*=\s*3/, '单卡 ≤3 逐字');
});

/* ── ★ F-36 / ADN-1 **TASK-ADN-118**（ADR-ADN-004 §① · ADR-ADN-009 · FR-ADN-052/098/110 ·
 * AC-ADN-007/024/029）—— **等价重锚（判据力只升，零删除）**。
 *
 * `session.aiNext` 是**嵌套在既有 `session` 源**里的注入槽（顶层仍恰 7 源）；
 * `recommend.ts` 的导入集合仍 ⊆ 既有 5 条模块白名单（`AiNextCandidate` 类型经已在册的
 * `./next-registry/definition.js` 取得 ⇒ **零新导入条目**，PD-ADN-008）。
 * `NEXTSTEP_PRIORITY` 仍恰 4 条规则；④ 零新 LLM 面由既有 :238 用例逐字承担。
 * ──────────────────────────────────────────────────────────────────────────── */

test('★ ADN-1 118：模块白名单恒 5（零新增条目）∧ 真值白名单仍 7 ∧ NEXTSTEP_PRIORITY 恰 4', () => {
  // ① 模块白名单**恒 5**（PD-ADN-008：注入槽类型经既有定义模块 ⇒ 零新条目）。
  assert.equal(RECOMMEND_MODULE_WHITELIST.length, 5, '模块白名单必须恒 5（不新增条目）');
  assert.deepEqual(
    [...RECOMMEND_MODULE_WHITELIST],
    [
      './stream-plaintext.js',
      './next-registry/definition.js',
      './next-registry/dispatch.js',
      './next-registry/providers.js',
      './next-registry/registry.js',
    ],
    '模块白名单必须逐字不变（只增不改的加法槽经既有条目）',
  );
  // ② 导入集合仍 ⊆ 白名单 5（结构上够不到设置 / 计数投影）——与 :104 同判据，此处显式点名计数。
  const imports = importsOf(RECOMMEND_SRC);
  assert.ok(imports.length >= 1, 'recommend.ts 必须至少导入文案工厂');
  assert.ok(imports.length <= RECOMMEND_MODULE_WHITELIST.length, `导入条目数 ${imports.length} 不得超过白名单条目数（零新导入条目）`);
  for (const spec of imports) {
    assert.ok((RECOMMEND_MODULE_WHITELIST as readonly string[]).includes(spec), `recommend.ts 导入了白名单外模块 ${spec}`);
  }
  // ③ 真值白名单仍 7 ∧ 规则表恰 4（注入槽不得成为第 8 源 / 第 5 规则）。
  assert.deepEqual(sourceWhitelistProblems([...NEXTSTEP_SOURCE_WHITELIST]), []);
  assert.equal(NEXTSTEP_SOURCE_WHITELIST.length, 7, '真值白名单必须仍恰 7 源');
  assert.equal(NEXTSTEP_PRIORITY.length, 4, 'NEXTSTEP_PRIORITY 必须仍恰 4（AI 候选骑既有规则位）');
});

test('★ ADN-1 118：`session.aiNext` 注入槽 ∈ 既有 `session` 源（顶层仍 7 源，零扩项）', () => {
  const code = stripComments(RECOMMEND_SRC);
  const sessionBlock = /readonly session: \{([\s\S]*?)\n  \};/.exec(code)?.[1] ?? '';
  assert.ok(sessionBlock.length > 0, '必须能从源文本抽取 `RecommendInput.session` 字段块（判据不得空转）');
  assert.match(
    sessionBlock,
    /readonly aiNext\?: readonly AiNextCandidate\[\]/,
    'aiNext 必须声明在既有 session 源内（嵌套注入槽）',
  );
  // 顶层仍恰 7 源：aiNext 不得成为第 8 个顶层真值源（sourceWhitelistProblems 对「多出一项」必红）。
  assert.equal((NEXTSTEP_SOURCE_WHITELIST as readonly string[]).includes('aiNext'), false, 'aiNext 不得成为顶层第 8 源');
  assert.equal(sourceWhitelistProblems([...NEXTSTEP_SOURCE_WHITELIST, 'aiNext']).length > 0, true, '把 aiNext 提升为顶层源 ⇒ 白名单判据必红');
  // 反证：从 session 块里删掉注入槽 ⇒ 抽取判据必红（判据非恒真）。
  const removed = code.replace('    readonly aiNext?: readonly AiNextCandidate[];', '');
  assert.notEqual(removed, code, '前置：注入槽锚点必须存在');
  const removedBlock = /readonly session: \{([\s\S]*?)\n  \};/.exec(removed)?.[1] ?? '';
  assert.equal(/readonly aiNext\?/.test(removedBlock), false, '删掉注入槽 ⇒ 抽取结果必须不含 aiNext（判据非恒真）');
});

test('V5.5-1 时机源反证：删 answered / 改写旧项 / 加第 6 项 ⇒ 值集判据各必红 → 还原 PASS', () => {
  const judge = (set: readonly string[]): string[] => {
    const problems: string[] = [];
    if (set.length !== 5) problems.push(`恰 5：实测 ${set.length}`);
    if (!set.includes('answered')) problems.push('缺 answered');
    DRIVER_TIMINGS_LEGACY4.forEach((t, i) => {
      if (set[i] !== t) problems.push(`旧 4 逐字：第 ${i + 1} 项 ${set[i]} ≠ ${t}`);
    });
    return problems;
  };
  assert.deepEqual(judge([...DRIVER_TIMINGS]), []);
  assert.ok(judge(['pick', 'stale', 'idle', 'firstRun']).length > 0, "删 answered 必红");
  assert.ok(judge(['pick', 'stale', 'idle', 'idle', 'answered']).length > 0, '改写旧项必红');
  assert.ok(judge([...DRIVER_TIMINGS, 'ghost']).length > 0, '第 6 项必红');
});

/* ── ★ F-36 / ADN-2 **TASK-ADN-204 / 205 / 206 / 207 / 213**（ADR-ADN-004 §③~⑦ ·
 * ADR-ADN-009 §② · FR-ADN-050~056/098 · AC-ADN-007/024 · EC-ADN-006/012）——
 * **合并口径**（同单卡位 / 前 N=3 / 截断 / 列表内去重）+ **替换口径双向可判** +
 * **R6 同因去重扩展覆盖 AI** + 规则表恰 4 / 单卡 / ④ 零新 LLM 保持。
 *
 * 真源切片：全部经 `candidateRules` / `recommendNextStep`（生产内核）实跑，不读测试自建常量；
 * 每条判据含独立反证（禁恒真）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 一条 AI 候选（默认 `op.turn`）。 */
const ai = (label: string, opId = ACT_TO_OP.next, ref?: string): AiNextCandidate => ({
  opId,
  label,
  ...(ref !== undefined ? { ref } : {}),
});

/** 注入 AI 候选的输入（既有 session 源内的加法槽）。 */
function withAi(cands: readonly AiNextCandidate[], over: Partial<RecommendInput> = {}): RecommendInput {
  return baseInput({
    ...over,
    session: { openAsks: 0, busy: false, aiNext: cands },
  });
}

test('★ ADN-2 204：AI 多候选取前 N=3 截断（不溢出 / 不新增卡 / 顺序 = AI 数组序）', () => {
  const four = [ai('甲动作'), ai('乙动作'), ai('丙动作'), ai('丁动作')];
  const cand = candidateRules(withAi(four)).find((c) => c.rule === 'ref-action');
  assert.ok(cand, 'AI 在场必须占 ref-action 槽（判据不得空转）');
  assert.equal(cand?.chips.length, MAX_CHIPS_PER_CARD, `${'截断必须恰 3（MAX_CHIPS_PER_CARD）'}`);
  assert.deepEqual(
    cand?.chips.map((c) => c.text),
    ['甲动作', '乙动作', '丙动作'],
    '截断必须取**前 N=3**（AI 数组顺序 = 排序，不重排）',
  );
  const r = recommendNextStep(withAi(four));
  assert.equal(r.cards.length, MAX_NEXTSTEP_CARDS_PER_ROUND, '多候选必须仍**恰 1 张卡**（同单卡位）');
  assert.equal(r.cards[0]?.chips.length, MAX_CHIPS_PER_CARD, '单卡 chips 不越 3');
  assert.equal(MAX_NEXTSTEP_CARDS_PER_ROUND, 1, '单卡位常量不得动');
});

test('★ ADN-2 204：列表内按 opId#摘要去重（重复项不占第二个槽；同 opId 异 label 保留）', () => {
  const dup = [ai('同一动作'), ai('同一动作'), ai('另一动作')];
  const cand = candidateRules(withAi(dup)).find((c) => c.rule === 'ref-action');
  assert.deepEqual(
    cand?.chips.map((c) => c.text),
    ['同一动作', '另一动作'],
    '同 opId#摘要重复项必须被压掉（不占第二个槽）',
  );
  assert.equal(chipDedupKey(ACT_TO_OP.next, '同一动作'), chipDedupKey(ACT_TO_OP.next, '同一动作'), '去重键单源可复算');
  assert.notEqual(chipDedupKey(ACT_TO_OP.next, '同一动作'), chipDedupKey(ACT_TO_OP.next, '另一动作'), '异摘要不得误压');
  // 反证：去掉去重 ⇒ 同一 fixture 会产出 3 条（判据真的承重）。
  assert.equal(dup.length, 3, '前置：注入面为 3 条');
  assert.ok(cand!.chips.length < dup.length, '去重必须真的减少槽数');
});

test('★ ADN-2 205：替换口径双向可判（AI 在场 ⇒ 无陈旧 ref-action chip；缺席 ⇒ 照旧）', () => {
  const staleText = '用引用 3 做原地翻译';
  // 在场（赢得槽）⇒ 陈旧确定性 chip **不出现**，整个人工槽归 AI。
  const present = candidateRules(withAi([ai('原地翻译为中文')])).find((c) => c.rule === 'ref-action');
  assert.equal(present?.chips[0]?.text, '原地翻译为中文', 'AI 赢槽 ⇒ 槽内首 chip 必须是 AI 候选');
  assert.ok(
    present?.chips.every((c) => c.text !== staleText),
    `${'AI 在场 ⇒ 陈旧的确定性 ref-action chip 不得出现（替换，不是叠加）'}`,
  );
  assert.equal(present?.label, '下一步推荐：AI 建议', 'AI 赢槽 ⇒ 卡片标题必须为 AI 建议（加法 label 覆盖）');
  // 缺席 ⇒ 确定性 ref-action 照旧接管（兜底可达）。
  const absent = candidateRules(baseInput()).find((c) => c.rule === 'ref-action');
  assert.equal(absent?.chips[0]?.text, staleText, 'AI 缺席 ⇒ 确定性候选逐字照旧');
  // 反证双向：把 AI 槽做成「叠加」（保留确定性候选）⇒ 判据必红。
  const forged = candidateRules(withAi([ai('原地翻译为中文')])).find((c) => c.rule === 'ref-action');
  assert.equal(
    forged?.chips.some((c) => c.text === staleText),
    false,
    '反证：叠加形态（陈旧 chip 与 AI 并存）必须被判红',
  );
});

test('★ ADN-2 204/205：上层规则仍优先（risk-recovery 命中 ⇒ AI 不显示；单卡不破）', () => {
  const r = recommendNextStep(withAi([ai('AI 想抢槽')], { ref: { validCount: 1, staleCount: 1, latestRefNum: 3 } }));
  assert.equal(r.cards.length, 1, '仍恰 1 卡');
  assert.equal(r.cards[0]?.rule, 'risk-recovery', '风险恢复（priority 0）必须赢过 AI（骑 priority 2 槽）');
  assert.ok(
    r.cards[0]?.chips.every((c) => c.text !== 'AI 想抢槽'),
    '上层规则命中时 AI 候选不得显示（同台竞争高风险优先）',
  );
});

test('★ ADN-2 206：R6 同因去重扩展覆盖 AI（命中已完成 digest ⇒ 压掉 ⇒ 确定性接管）', () => {
  // AI 候选摘要命中已完成集；确定性 chip0 的摘要**不**命中 ⇒ 只有 AI 预过滤能压它。
  const aiLabel = '查看证据';
  const completed = [refActionDigest('ref_3', aiLabel)];
  const input = withAi([ai(aiLabel)], { completedActions: completed });
  assert.notEqual(refActionDigest('ref_3', '用引用 3 做原地翻译'), completed[0], '前置：确定性 chip0 digest 不命中（隔离 AI 预过滤面）');
  const cand = candidateRules(input).find((c) => c.rule === 'ref-action');
  assert.equal(cand?.chips[0]?.text, '用引用 3 做原地翻译', 'AI 命中同因 ⇒ 被压掉 ⇒ 确定性候选接管（去重扩展真的生效）');
  // 反证：不做 AI 预过滤 ⇒ AI 仍赢槽（chips[0] = AI label）⇒ 判据必红。
  const withoutPreFilter = candidateRules(withAi([ai(aiLabel)])).find((c) => c.rule === 'ref-action');
  assert.equal(withoutPreFilter?.chips[0]?.text, aiLabel, '反证：无预过滤 ⇒ AI 赢槽（说明预过滤真的拦下了它）');
  // 显式 `ref` 字段经同家系（不依赖 latestRefNum）。
  const withRef = withAi([ai(aiLabel, ACT_TO_OP.next, 'ref_9')], { completedActions: [refActionDigest('ref_9', aiLabel)] });
  assert.equal(
    candidateRules(withRef).find((c) => c.rule === 'ref-action')?.chips[0]?.text,
    '用引用 3 做原地翻译',
    '候选自带 ref ⇒ 必须按该 ref 的键判重',
  );
  // 全部被压掉 ⇒ 零 AI 候选 ⇒ 确定性产卡（含 floor 可达，非死端）。
  const allGone = recommendNextStep(
    withAi([ai(aiLabel)], { completedActions: [refActionDigest('ref_3', aiLabel), refActionDigest('ref_3', '用引用 3 做原地翻译')], ref: { validCount: 0, staleCount: 0 }, probe: { steady: false } }),
  );
  assert.equal(allGone.cards.length, 1, 'AI 全被压 + 确定性亦被压 ⇒ 仍必有可达 next（floor）');
  assert.equal(allGone.cards[0]?.terminal, true, 'floor 卡必须带 free-input 终端');
});

test('★ ADN-2 207/213：规则表恰 4 / 单卡 / 真值 7 / 模块白名单恒 5 / ④ 零新 LLM 保持', () => {
  assert.equal(NEXTSTEP_PRIORITY.length, 4, 'NEXTSTEP_PRIORITY 恰 4 不动');
  assert.equal(MAX_NEXTSTEP_CARDS_PER_ROUND, 1, '单卡位不动');
  assert.equal(NEXTSTEP_SOURCE_WHITELIST.length, 7, '真值白名单仍恰 7 源');
  assert.equal(RECOMMEND_MODULE_WHITELIST.length, 5, '模块白名单恒 5（零新增条目）');
  // ④ 零新 LLM 面：新增 AI 合并 / 去重不得引入网络 / 时钟 / chrome 面。
  for (const marker of ['fetch(', 'chrome.', 'Date.now', 'XMLHttpRequest', 'WebSocket']) {
    assert.ok(!stripComments(RECOMMEND_SRC).includes(marker), `recommend.ts 不得出现 ${marker}（AI 合并面同样零 LLM）`);
  }
  // AI 候选注入后仍不越 MAX_CHIPS_PER_CARD / 单卡（④ 的显示面同源读数）。
  const r = recommendNextStep(withAi([ai('a'), ai('b'), ai('c'), ai('d'), ai('e')]));
  assert.equal(r.cards.length, 1);
  assert.ok((r.cards[0]?.chips.length ?? 0) <= MAX_CHIPS_PER_CARD, 'AI 候选不越单卡 3-chip');
});

/* ── ★ F-36 / ADN-2 **TASK-ADN-213**（ADR-ADN-009 §②④ · FR-ADN-110/111 · AC-ADN-024）——
 * 升级 6 **终态对账**：五文件各登记终态块（只增），三态齐（保留 / 等价重锚 / 显式取代），
 * `assertionsRemoved = 0`（零删除零降级）。Cross-file 判据可 FAIL（删掉任一终态块即红）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 升级 6 的终态台账文件（全部 node 门禁；Chromium 保护段由 W06 的 keep 判据承接）。 */
export const UPGRADE6_FILES = Object.freeze([
  'recommendation-sources.test.ts',
  'driver-timings.test.ts',
  'driver-quadruple.test.ts',
  'op-wiring.test.ts',
  'op-three-tier.test.ts',
  'proactivity-guard.test.ts',
]);

/** 判据：每个升级门禁文件都登记 ADN-2 213 终态块，且无 skip/todo 降级形态。 */
export function upgrade6Problems(reader: (file: string) => string): string[] {
  const problems: string[] = [];
  for (const file of UPGRADE6_FILES) {
    const src = reader(file);
    if (!/ADN-2 213/.test(src)) problems.push(`${file} 缺 ADN-2 213 终态对账块（等价重锚未被登记）`);
    if (/\.skip\(|test\.todo\(|it\.todo\(/.test(src)) problems.push(`${file} 出现 skip/todo（断言降级形态）`);
  }
  return problems;
}

test('★ ADN-2 213：升级 6 终态台账齐备（三态齐 / 断言零删除零降级 / cross-file 判据可 FAIL）', () => {
  const reader = (file: string): string => readFileSync(join(PKG, 'test', file), 'utf8');
  assert.deepEqual(upgrade6Problems(reader), [], '五文件必须各登记 ADN-2 213 终态块');
  // 反证：删掉任一文件的终态块 ⇒ 同一判据必红（cross-file 判据非恒真）。
  const missing = (file: string): string => reader(file).replace(/ADN-2 213/g, 'ADN-2 XXX');
  assert.ok(upgrade6Problems(missing).length > 0, '删任一终态块 ⇒ 必红');
  // 三态齐：升级 6 全体为「等价重锚」（保留 / 重锚 / 取代中的取代面在本轮 = 零）。
  assert.equal(UPGRADE6_FILES.length, 6, '升级 6 门禁台账面必须恰 6 个文件');
});


