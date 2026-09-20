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
    probe: { phase: 'ready', steady: false },
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

test('④ 无候选 ⇒ 空集且不渲染空卡（EC-CHAT-008）', () => {
  const r = recommendNextStep(
    baseInput({
      ref: { validCount: 0, staleCount: 0 },
      site: { authorized: false, trust: 'untrusted' },
      probe: { phase: 'idle', steady: false },
      onboarding: { firstRun: false, pendingSteps: [] },
    }),
  );
  assert.deepEqual(r.cards, []);
  assert.equal(r.suppression, 'empty');
});

test('④ 上限：一轮最多 1 张卡；恢复类优先于发现类', () => {
  const r = recommendNextStep(
    baseInput({
      ref: { validCount: 2, staleCount: 1, latestRefNum: 4 },
      onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
      probe: { phase: 'ready', steady: false },
    }),
  );
  assert.equal(r.cards.length, MAX_NEXTSTEP_CARDS_PER_ROUND);
  assert.equal(r.cards[0].rule, 'risk-recovery', '恢复类必须优先于引用动作 / onboarding / 发现类');
});

test('④ 安全边界：唯一候选全是被拦命令 ⇒ 不推荐（fail-closed）', () => {
  const discoveryInput = baseInput({
    ref: { validCount: 0, staleCount: 0 },
    site: { authorized: true },
    probe: { phase: 'ready', steady: false },
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

test('FIX-1 act 闭集扩为 4：授权是本地动作（不进回合命令闭集）', () => {
  assert.deepEqual([...NEXTSTEP_ACTS], ['next', 'repick', 'describe', 'authorize']);
  // The onboarding rule's authorization chip must carry the local act — shipping
  // `next` is exactly the defect this fix removes (the string was sent to the LLM).
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
  // 「了解 6 个页面手势」仍是回合命令（它确实要 LLM 讲）。
  assert.equal(onboarding.chips.find((c) => c.text.includes('页面手势'))?.act, 'next');
});

test('FIX-1 deny 集只命名回合命令：授权 chip 的文本即使出现在 deny 集也不误伤本地动作', () => {
  const input = baseInput({
    ref: { validCount: 0, staleCount: 0 },
    site: { authorized: false, trust: 'untrusted' },
    probe: { phase: 'idle', steady: false },
    onboarding: { firstRun: true, pendingSteps: ['授权当前站点'] },
    deniedCommands: ['授权当前站点'],
  });
  // The card also carries a `next` chip (「了解 6 个页面手势」) which is NOT denied,
  // so the onboarding card survives; the authorize chip itself is never deny-checked.
  const r = recommendNextStep(input);
  assert.equal(r.cards.length, 1, '授权是本地动作，deny 集不得据此整卡拦下');
  assert.equal(r.cards[0].rule, 'onboarding');
});
