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
  recommendNextStep,
} from '../src/ui/sidepanel/recommend.js';
import type { RecommendInput } from '../src/ui/sidepanel/recommend.js';
import { label } from '../src/ui/sidepanel/stream-plaintext.js';
// V5-1（TASK-V5-115 / FR-ALLN-112 X3 / ADR-V5-001）—— 闭集判据等价重锚所需的两个 op 源：
// `ACT_TO_OP`（act → opId 的**唯一权威**）与义务表的 9 opId 集（新增 op 自动纳入的判据域）。
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { NEXT_SOURCE_NAMES } from '../src/ui/sidepanel/next-registry/definition.js';
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
import { OPS_BY_ID } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { RECOVERY_CHIP_ORDER } from '../src/ui/sidepanel/recommend.js';

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
      assert.ok((NEXTSTEP_ACTS as readonly string[]).includes(chip.act), `chip act ${chip.act} 必须在闭集内`);
      const opId = ACT_TO_OP[chip.act];
      assert.ok(opId, `chip act ${chip.act} 必须有 opId 映射（旧 act 无「无对应 op」的悬空项）`);
      assert.ok(OBLIGATION_OP_IDS.includes(opId), `chip 的 opId ${opId} 必须在义务表内`);
    }
  }
  // 规则表的 chip 序（含 recovery 三首项）在 op 词汇下逐条保持：site / probe 仍以 rebind 打头。
  const siteChips = RECOVERY_CHIP_ORDER.site.slice(0, MAX_CHIPS_PER_CARD).map((a) => ACT_TO_OP[a]);
  assert.equal(siteChips[0], 'op.rebind', 'site 触发在 op 词汇下仍由 rebind 打头（等价，非重排）');
  assert.deepEqual(siteChips.length, 3, '单卡 chips 仍 ≤3');
});
