/**
 * V4.5-1 **W1 / TASK-V45-101** — the **node-gate skeleton** for ADR-V45-010
 * (`host-registry` 零宿主反向判据 + `RETIRED_*` 扩容).
 *
 * ── Why a NEW gate (and why it ships as a skeleton first) ────────────────────
 *
 * v4-4 built the structural host registry as a「登记集合 == 实存集合」双向判据 and the
 * four remaining hosts were registered as「permanent structural home」— i.e. the
 * *gates* were used to justify the *shape* (the v4.5 theme). W2/W3 retire every
 * `li[data-host]`, so the judgement must be **restated**: any host at all is a
 * regression, and the retired containers/attrs must stay enumerable (BLOCK-02 的
 * 教训：判据必须能区分「过渡关闭」与「标记被删」).
 *
 * W1 ships the **falsifiable skeleton**: the judge is a pure function, every
 * judgement declares its `expectFailPattern`, and each of the six problem classes
 * plus the five forged readings are driven to red *in-process* on synthesized
 * inputs. The live-DOM half is materialized in W3 (`TASK-V45-111`, which points the
 * same judge at the real `l0.mjs` reading) — the judge itself never changes.
 *
 * ── Falsifiability (`expectFailPattern`) ─────────────────────────────────────
 *
 * Every judgement in {@link JUDGEMENTS} carries a **literal** `expectFailPattern`
 * (the readable problem fragment it must produce when violated). The reverse proofs
 * below assert the pattern really appears — a judgement whose pattern cannot be
 * produced is not a judgement.
 *
 * ── Coverage limits (registered, not papered over) ───────────────────────────
 *
 * W1: **no Chromium and no live DOM** — the readings are synthesized. The live
 * reading (`#stream` 子树内 `[data-host]` 计数 at three viewports) joins in
 * `TASK-V45-111` via `test/ui/l0.mjs`. `test/gate-integrity.test.ts` audits this
 * file (it declares `expectFailPattern`, so the meta-gate's node-gate scan picks it
 * up) — see the `EXPECTED_AUDITED_FILES` entry.
 *
 * @module test/host-registry
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const PKG = fileURLToPath(new URL('../../', import.meta.url));

import {
  REGISTERED_STRUCTURAL_HOSTS,
  RETIRED_CONTAINER_IDS,
  RETIRED_HOST_ATTRS,
  RETIRED_HOST_DISPOSITIONS,
  RETIRED_HOST_IDS,
  MIGRATED_CONTAINER_IDS,
  DOUBLE_WRITE_REASON_LITERALS,
  evaluateHostRegistry,
  type HostRegistryReading,
} from '../src/ui/sidepanel/host-registry.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The W3 terminal semantics — the zero-host reverse judgement
 * ──────────────────────────────────────────────────────────────────────────── */

// V4.5-1 W3: the retired attrs / containers are **the product's own constants** (single
// source). The 14-item list is additionally re-stated verbatim below as an independent
// caliber, so a silent edit of the product list cannot pass unnoticed.
/** The reading the terminal judgement consumes (one shape, every depth). */
export interface ZeroHostReading {
  /** Every `li[data-host]` value present **at any depth** inside `#stream`. */
  readonly presentHosts: readonly string[];
  /** `document.querySelectorAll('#stream [data-transitional-host]').length`. */
  readonly transitionalCount: number;
  /** The subset of the product's `RETIRED_CONTAINER_IDS` still present in the document. */
  readonly retiredContainersPresent: readonly string[];
  /** Per retired item: is its「重新引入即红」reverse-proof metadata registered? */
  readonly retiredProofRegistered: Record<string, boolean>;
  /** Does the registry **source text** still carry the dual-write rationale? */
  readonly dualWriteRationaleResidual: boolean;
  /**
   * V5-3 TASK-V5-162 — the ids of the **net-new status-bar chrome** found inside the
   * `#stream` subtree (the caller reads them by id; an empty list is the terminal state).
   */
  readonly streamChromeIds?: readonly string[];
}

/**
 * V5-3 TASK-V5-162 (ADR-V5-006 §1 · NG-ALLN-016 / N17) — the **net-new chrome** of the
 * auth chip. It is status-bar chrome: it must carry `data-chrome-control` (so the shipped
 * `assertChromeNotInStream` covers it by MARK **and** by FORM) and it must never appear
 * inside the `#stream` subtree. Read by this gate from `index.html` (below) and from the
 * live reading shape, so「不在流内」is a machine fact, not a layout hope.
 */
export const AUTH_CHROME_IDS = Object.freeze(['auth-state', 'auth-detail', 'auth-detail-actions']);

/**
 * The **terminal**（zero-host）judgement — six problem classes (ADR-V45-010 §3).
 *
 * Deliberately pure: the panel, the Chromium gate and this node gate all feed the
 * same implementation, so a second, drifting caliber cannot appear. Empty result =
 * structurally clean.
 */
export function zeroHostProblems(reading: ZeroHostReading): string[] {
  const problems: string[] = [];
  // ① any `li[data-host]` at any depth ⇒ red (no「先登记再比对」escape).
  for (const host of reading.presentHosts) {
    problems.push(`零宿主判据失败：任意深度仍存在 li[data-host="${host}"]（新增宿主必须走裁决，不得只加属性）`);
  }
  // ②+③ the retired attrs / containers must be enumerated *and* absent.
  for (const attr of RETIRED_HOST_ATTRS) {
    if (reading.presentHosts.includes(attr)) {
      problems.push(`已退役宿主 data-host="${attr}" 仍在 DOM —— 结构性清零被判据绕过`);
    }
  }
  for (const id of reading.retiredContainersPresent) {
    problems.push(`已退役容器 #${id} 仍在 DOM —— 删属性不改 DOM 不算退役`);
  }
  // ④ the transitional marker must be zero (closed, not renamed).
  if (reading.transitionalCount !== 0) {
    problems.push(`[data-transitional-host] 计数 = ${reading.transitionalCount}，必须为 0（过渡态不得重开）`);
  }
  // ⑤ every retired item must carry its「重新引入即红」reverse-proof metadata.
  const missing = [...RETIRED_HOST_ATTRS, ...RETIRED_CONTAINER_IDS].filter(
    (item) => reading.retiredProofRegistered[item] !== true,
  );
  if (missing.length > 0) {
    problems.push(`退役项缺少「重新引入即红」反证登记：${missing.join(', ')}`);
  }
  // ⑥ the dual-write rationale must be gone from the registry source (FR-V45-011).
  if (reading.dualWriteRationaleResidual) {
    problems.push('注册表源文本仍含双写理由（ALSO append-recorded）—— 单写契约未收口');
  }
  // ⑦ V5-3 TASK-V5-162：新增状态栏 chrome 不得进入 `#stream` 子树（零宿主反向判据）。
  for (const id of reading.streamChromeIds ?? []) {
    if (AUTH_CHROME_IDS.includes(id)) {
      problems.push(`#${id} 出现在 #stream 子树 —— 状态栏 chrome 不得进入流内（零宿主反向判据）`);
    }
  }
  return problems;
}

/** A clean reading: nothing present, every retired item's reverse proof registered. */
export function cleanZeroHostReading(): ZeroHostReading {
  const proofs: Record<string, boolean> = {};
  for (const item of [...RETIRED_HOST_ATTRS, ...RETIRED_CONTAINER_IDS]) proofs[item] = true;
  return {
    presentHosts: [],
    transitionalCount: 0,
    retiredContainersPresent: [],
    retiredProofRegistered: proofs,
    dualWriteRationaleResidual: false,
    streamChromeIds: [],
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. The `expectFailPattern` truth table (every judgement declares one)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface NodeJudgement {
  readonly id: string;
  /** The readable fragment the judgement MUST produce when violated (literal). */
  readonly expectFailPattern: string;
  /** `pending-w3` = the live half lands with TASK-V45-111 (W3). */
  readonly status: 'landed' | 'pending-w3';
}

export const JUDGEMENTS: readonly NodeJudgement[] = Object.freeze([
  Object.freeze({ id: 'ZH-1-any-host', expectFailPattern: '零宿主判据失败：任意深度仍存在 li[data-host=', status: 'landed' }),
  Object.freeze({ id: 'ZH-2-retired-attr', expectFailPattern: '已退役宿主 data-host=', status: 'landed' }),
  Object.freeze({ id: 'ZH-3-retired-container', expectFailPattern: '删属性不改 DOM 不算退役', status: 'landed' }),
  Object.freeze({ id: 'ZH-4-transitional', expectFailPattern: '[data-transitional-host] 计数 =', status: 'landed' }),
  Object.freeze({ id: 'ZH-5-reverse-proof-meta', expectFailPattern: '退役项缺少「重新引入即红」反证登记：', status: 'landed' }),
  Object.freeze({ id: 'ZH-6-dual-write', expectFailPattern: '注册表源文本仍含双写理由', status: 'landed' }),
  // W1 预留位：真实 DOM reading 的接入（TASK-V45-111）
  Object.freeze({ id: 'ZH-7-live-dom-reading', expectFailPattern: '零宿主判据失败：任意深度仍存在 li[data-host="strips"]', status: 'landed' }),
  // V5-3 TASK-V5-162：`#auth-state` / 管理详情 / 分隔条**不在 `#stream` 子树**（逐项断言）。
  Object.freeze({ id: 'ZH-8-auth-chrome-out-of-stream', expectFailPattern: '出现在 #stream 子树 —— 状态栏 chrome 不得进入流内', status: 'landed' }),
]);

/** `true` when at least one judgement of every class produces its declared pattern. */
export function patternCovered(problems: readonly string[], pattern: string): boolean {
  return problems.some((p) => p.includes(pattern));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 6 类问题串逐条可 FAIL（合成 reading 驱动）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 零宿主判据：干净 reading ⇒ 零问题（判据不得恒红）', () => {
  assert.deepEqual(zeroHostProblems(cleanZeroHostReading()), [], '干净 reading 必须零问题');
});

test('V45 W1 零宿主判据 ZH-1：任意深度残留 li[data-host] ⇒ 红（含改名前的等价形态）', () => {
  const problems = zeroHostProblems({ ...cleanZeroHostReading(), presentHosts: ['composer'] });
  assert.ok(patternCovered(problems, '零宿主判据失败：任意深度仍存在 li[data-host='), problems.join(' | '));
  assert.ok(problems.length >= 1, '必须至少报一条');
});

test('V45 W1 零宿主判据 ZH-2：已退役宿主 attr 存在 ⇒ 红', () => {
  const problems = zeroHostProblems({ ...cleanZeroHostReading(), presentHosts: ['strips'] });
  assert.ok(patternCovered(problems, '已退役宿主 data-host='), problems.join(' | '));
});

test('V45 W1 零宿主判据 ZH-3：已退役容器 id 仍存在 ⇒ 红（删属性不改 DOM 不算退役）', () => {
  const problems = zeroHostProblems({ ...cleanZeroHostReading(), retiredContainersPresent: ['l0-decision'] });
  assert.ok(patternCovered(problems, '已退役容器 #'), problems.join(' | '));
});

test('V45 W1 零宿主判据 ZH-4：[data-transitional-host] 计数 ≠ 0 ⇒ 红（过渡态不得重开）', () => {
  const problems = zeroHostProblems({ ...cleanZeroHostReading(), transitionalCount: 1 });
  assert.ok(patternCovered(problems, '[data-transitional-host] 计数 ='), problems.join(' | '));
});

test('V45 W1 零宿主判据 ZH-5：退役项缺「重新引入即红」反证元数据 ⇒ 红', () => {
  const reading = cleanZeroHostReading();
  const problems = zeroHostProblems({
    ...reading,
    retiredProofRegistered: { ...reading.retiredProofRegistered, 'l1-history': false },
  });
  assert.ok(patternCovered(problems, '退役项缺少「重新引入即红」反证登记：'), problems.join(' | '));
});

test('V45 W1 零宿主判据 ZH-6：源文本仍含双写理由 ⇒ 红（FR-V45-011 机器判据）', () => {
  const problems = zeroHostProblems({ ...cleanZeroHostReading(), dualWriteRationaleResidual: true });
  assert.ok(patternCovered(problems, '注册表源文本仍含双写理由'), problems.join(' | '));
});

/* ────────────────────────────────────────────────────────────────────────────
 * 4. 5 组伪造 reading 反证（R-REG-906 绕过路径封死；BLOCK-02 修法）
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 5 组伪造 reading：判据必须**逐组**红（不得有恒绿组）。
 *
 * 五组分别对应 v4-4 BLOCK-02 的绕过路径：删属性 / 改名 / 塞进卡内 / 只删标记 /
 * 空注册表但仍留 DOM。判据若对任一组保持绿，则该组即「无效判据」。
 */
export const FORGED_READINGS: readonly { readonly id: string; readonly reading: ZeroHostReading }[] = [
  // ① 只删属性（DOM 还在）：单靠「计数 = 0」会放行 ⇒ ZH-3 必须抓住
  { id: 'forge-1-attr-deleted-only', reading: { ...cleanZeroHostReading(), retiredContainersPresent: ['l1-history'] } },
  // ② 改名（换了 data-host 值）：ZH-1 必须抓住（任意深度、任意值）
  { id: 'forge-2-renamed-host', reading: { ...cleanZeroHostReading(), presentHosts: ['zone'] } },
  // ③ 塞进卡内（不在 `#stream` 直接子层）：读数按**任意深度**采集 ⇒ ZH-1 仍红
  { id: 'forge-3-nested-inside-card', reading: { ...cleanZeroHostReading(), presentHosts: ['decision'] } },
  // ④ 只删标记（属性没了、宿主换个名字留下）：ZH-2 + ZH-3 双抓
  { id: 'forge-4-marker-deleted', reading: { ...cleanZeroHostReading(), presentHosts: ['strips'], transitionalCount: 1 } },
  // ⑤ 空注册表但仍留 DOM：注册表不是判据来源 ⇒ ZH-3 必须红
  { id: 'forge-5-empty-registry-dom-remains', reading: { ...cleanZeroHostReading(), retiredContainersPresent: ['l0-kicker'] } },
];

test('V45 W1 反证：5 组伪造 reading 逐组红（R-REG-906 绕过路径封死）', () => {
  assert.equal(FORGED_READINGS.length, 5, '必须恰好 5 组伪造 reading（删除即断言减少）');
  const stillGreen: string[] = [];
  for (const forge of FORGED_READINGS) {
    if (zeroHostProblems(forge.reading).length === 0) stillGreen.push(forge.id);
  }
  assert.deepEqual(stillGreen, [], `以下伪造 reading 未被判红（判据可被绕过）：${stillGreen.join(', ')}`);
});

test('V45 W3 终态：零宿主反向判据（注册表清空 + RETIRED 扩容 + 6 类问题串逐类可 FAIL）', () => {
  // ① 注册表降级为反向判据（ADR-V45-010 §1）：`[]` = 任何 `li[data-host]` 都是回归。
  assert.deepEqual([...REGISTERED_STRUCTURAL_HOSTS], [], '注册表必须清空（零宿主是终态）');
  assert.deepEqual([...RETIRED_HOST_ATTRS], ['decision', 'composer', 'l1-panels', 'strips']);
  assert.deepEqual([...RETIRED_CONTAINER_IDS].sort(), [...TEST_RETIRED_CONTAINER_IDS].sort(), '产品常量必须与 ADR-V45-010 §2 的 13 项逐字一致');
  assert.equal(RETIRED_CONTAINER_IDS.length, 13);
  assert.equal(RETIRED_HOST_IDS.length, 17, '并集别名 = 4 + 13');
  assert.equal(RETIRED_HOST_DISPOSITIONS.length, 17, '退役真相册必须逐项登记（去向 + 反证）');
  assert.equal(DOUBLE_WRITE_REASON_LITERALS.length, 3);
  // review R1 BLOCK-01 / I-06：**迁移容器**与**真退役容器**必须互斥且各自登记 ——
  // `#l0-receipt-summary` 是迁移容器（内容 id 随载体搬入最新卡 `.card-fixed`），
  // 误收进退役清单会让 `hosts().problems` 在「已有回执态」报假阳性（时点依赖）。
  assert.equal((RETIRED_CONTAINER_IDS as readonly string[]).includes('l0-receipt-summary'), false, '迁移容器不得进入真退役清单');
  assert.ok(MIGRATED_CONTAINER_IDS.includes('l0-receipt-summary'), '回执摘要必须登记为迁移容器');
  for (const id of MIGRATED_CONTAINER_IDS) {
    assert.equal((RETIRED_HOST_IDS as readonly string[]).includes(id), false, `迁移容器 #${id} 不得进入退役并集（判别规则：保留 id、不入清单）`);
  }
  assert.ok(MIGRATED_CONTAINER_IDS.length >= 5, `迁移容器必须登记（实测 ${MIGRATED_CONTAINER_IDS.length}）`);

  // ② 干净读数（零宿主 / 零过渡标记 / 零容器残留）必须通过 —— 判据不得恒红。
  const clean: HostRegistryReading = { presentHosts: [], transitionalCount: 0, retiredPresent: [] };
  assert.deepEqual(evaluateHostRegistry(clean), [], '零宿主真实读数必须通过');

  // ③ 6 类问题串逐类可 FAIL（每类 1 条反证）。
  assert.ok(evaluateHostRegistry({ ...clean, presentHosts: ['zone'] }).some((p) => p.includes('零宿主判据：实存 li[data-host]')), '① 任意宿主');
  assert.ok(evaluateHostRegistry({ ...clean, presentHosts: ['composer'] }).some((p) => p.includes('已退役宿主')), '② 退役宿主值');
  assert.ok(evaluateHostRegistry({ ...clean, retiredPresent: ['l0-kicker'] }).some((p) => p.includes('已退役容器')), '③ 退役容器');
  assert.ok(evaluateHostRegistry({ ...clean, transitionalCount: 1 }).some((p) => p.includes('data-transitional-host')), '④ 过渡标记');
  assert.ok(
    evaluateHostRegistry(clean, RETIRED_HOST_DISPOSITIONS.map((d) => (d.item === 'strips' ? { ...d, counterProof: '' } : d))).some((p) =>
      p.includes('反证'),
    ),
    '⑤ 缺反证的退役登记',
  );
  assert.ok(
    evaluateHostRegistry({ ...clean, sources: [{ path: 'forged.ts', text: '// ALSO append-recorded' }] }).some((p) => p.includes('双写理由')),
    '⑥ 双写理由字面',
  );

  // ④ ZH-7（W3 实体化）：live DOM 读数形状与判据同源 —— `hosts()` 面板读数喂同一个判据。
  const liveShaped: HostRegistryReading = {
    presentHosts: [],
    transitionalCount: 0,
    retiredPresent: [],
    sources: [{ path: 'src/ui/sidepanel/host-registry.ts', text: '// 单写契约：事实只以流内行 / 卡单次可见' }],
  };
  assert.deepEqual(evaluateHostRegistry(liveShaped, RETIRED_HOST_DISPOSITIONS), [], '真实形状读数（含源文本）必须通过');
  assert.ok(liveShaped.sources!.length >= 1, 'live 读数必须真的带上源文本（否则 ZH-6 空转）');
  // 反证：同一形状注入双写理由 ⇒ 必须红（ZH-6 不是恒绿）。
  assert.ok(
    evaluateHostRegistry({ ...liveShaped, sources: [{ path: 'forged.ts', text: DOUBLE_WRITE_REASON_LITERALS[0] }] }).length > 0,
    'ZH-6 注入双写理由必须判红',
  );

  // ⑤ 版本化反证：任何「先登记再比对」的旧形态都无法通过 —— 注册表清空后「登记缺失」
  //    不再是问题，反而是实存集合本身即回归。
  assert.ok(evaluateHostRegistry({ presentHosts: ['decision', 'composer', 'l1-panels'], transitionalCount: 0, retiredPresent: [] }).length >= 3);
});

/** The 13真退役容器 ids, verbatim from ADR-V45-010 §2 (independent copy for the equality check). */
const TEST_RETIRED_CONTAINER_IDS = Object.freeze([
  'l0-decision',
  'l0-pick',
  'l0-status-band',
  'l0-kicker',
  'l0-more',
  'l0-ref-toggle',
  'l1-group',
  'l1-history-toggle',
  'l1-history',
  'l1-history-rows',
  'l1-local-tree-toggle',
  'l1-receipt-toggle',
  'l1-gestures-toggle',
]);

/* ────────────────────────────────────────────────────────────────────────────
 * 4b. V5-3 TASK-V5-162 — 零宿主反向判据在 v5-3 改动后仍成立（§auth-state 不在流内）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V5-3 ZH-8 零宿主复核：注册表仍空 ∧ `#auth-state` / 管理详情不在 `#stream` 子树（逐项）', () => {
  // ① v4.5 的反向判据在 v5-3 改动后仍成立（注册表清空 + 目录扫描仍纳入本文件）。
  assert.deepEqual([...REGISTERED_STRUCTURAL_HOSTS], [], '登记集合必须仍为空（零宿主是终态）');
  assert.deepEqual(zeroHostProblems(cleanZeroHostReading()), [], '干净读数必须零问题（判据不得恒红）');
  // ② `index.html` 的结构断言：三个新 chrome id 必须落在 `#stream` 之外，且带上「流外」标记。
  const html = readFileSync(join(PKG, 'src/ui/sidepanel/index.html'), 'utf8');
  const streamStart = html.indexOf('<ol id="stream"');
  const streamEnd = html.indexOf('</main>', streamStart);
  assert.ok(streamStart > 0 && streamEnd > streamStart, '前置：`#stream` 与 `</main>` 必须可定位（判据不得空转）');
  const streamBlock = html.slice(streamStart, streamEnd);
  for (const id of AUTH_CHROME_IDS) {
    assert.equal(streamBlock.includes(`id="${id}"`), false, `#${id} 不得位于 #stream 子树（零宿主）`);
    assert.ok(html.includes(`id="${id}"`), `#${id} 必须存在于 index.html（否则判据空转）`);
  }
  assert.ok(html.includes('id="auth-state" type="button" data-auth="yellow" data-chrome-control="statusbar"'), '`#auth-state` 必须带 data-chrome-control="statusbar"（流外标记 + 形态判据）');
  assert.ok(html.includes('id="auth-detail" hidden'), '管理详情必须默认折叠（hidden ⇒ 不计默认密度）');
  // ③ 反证：注入「新 chrome 在流内」读数 ⇒ 必红；还原 ⇒ 绿（判据非恒真）。
  const forged = { ...cleanZeroHostReading(), streamChromeIds: ['auth-state'] };
  const forgedProblems = zeroHostProblems(forged);
  assert.ok(patternCovered(forgedProblems, JUDGEMENTS[7].expectFailPattern), JUDGEMENTS[7].expectFailPattern);
  // 判据可产出性自证（ZH-8 的 pattern 必须真由本文件的判据产出，不得是空声明）。
  assert.ok(forgedProblems.some((p) => p.includes('出现在 #stream 子树')), forgedProblems.join(' | '));
  assert.deepEqual(zeroHostProblems(cleanZeroHostReading()), []);
});

/* ────────────────────────────────────────────────────────────────────────────
 * 5. `expectFailPattern` 表自检（每条判据必须声明，且不得是占位）
 * ──────────────────────────────────────────────────────────────────────────── */

test('V45 W1 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
  const landed = JUDGEMENTS.filter((j) => j.status === 'landed');
  assert.ok(landed.length >= 6, `已落地判据必须 ≥6 条（实测 ${landed.length}）`);
  // 已落地判据的 pattern 必须真的能被产出（代码面机核：pattern 必须是本文件判据产出的字面）。
  const produced = zeroHostProblems({
    // `strips` 同时命中 ZH-1（任意宿主）与 ZH-2（退役 attr），`y` 命中 ZH-3。
    presentHosts: ['strips'],
    transitionalCount: 1,
    retiredContainersPresent: ['y'],
    retiredProofRegistered: {},
    dualWriteRationaleResidual: true,
    streamChromeIds: ['auth-state'],
  }).join('\n');
  for (const j of landed) {
    assert.ok(produced.includes(j.expectFailPattern), `${j.id}: 声明的 expectFailPattern 无法被产出（空声明）`);
  }
});
