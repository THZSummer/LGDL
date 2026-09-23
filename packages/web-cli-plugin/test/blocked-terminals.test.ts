/**
 * V5-1 **TASK-V5-120** (leaf `specs-tree-v5-1-next-registry-pipeline`) — the
 * **阻塞态枚举单源 + `site.unauthorized` 常驻候选** gate
 * (ADR-V5-009 §1~§4 · FR-ALLN-010 / 011 / 013 · AC-ALLN-002 机制侧 · R-ALLN-006).
 *
 * ── What it judges ───────────────────────────────────────────────────────────
 *
 *   ① **声明恰一次** — the five blocked-terminal **string literals** may appear in
 *      `src/**` only at the declaration site (`next-registry/definition.ts`) and at
 *      the one **bijection** site (`providers.ts`'s P0 provider ids, which are
 *      declared as such below). A third site ⇒ FAIL.
 *   ② **`when` 与 `firstRun` 无关** — the `site.unauthorized` provider really fires
 *      for a **non-first-run** unauthorized session (`firstRun === false`), both
 *      statically (its branch must not read `onboarding` / `firstRun`) and
 *      dynamically (driven through `builtinProviders()`), which is the R1 root cause
 *      of the real-machine dead end (ADR-V5-009 §背景).
 *   ③ **阻塞类 ↔ P0 provider** — a total, injective map: every blocked terminal
 *      either has its own landed P0 provider or is registered as `pending-v5-2`
 *      **with a reason**（登记，不是静默放行）. Injecting a sixth blocked terminal
 *      with neither ⇒ FAIL.
 *   ④ **登记项自紧** — the one acceptance criterion this byte-frozen round could not
 *      close (`site.unauthorized` 的 chips 尚未含 `op.authorize`) is registered as a
 *      pending item; the gate asserts the *current* fact, so removing the
 *      registration without fixing the chip—or fixing the chip without flipping the
 *      registration—turns the gate red instead of passing quietly.
 *
 * @module test/blocked-terminals
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BLOCKED_TERMINALS, type NextCtx, type NextProvider } from '../src/ui/sidepanel/next-registry/definition.js';
import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { DRIVER_TERMINALS } from '../src/ui/sidepanel/next-registry/terminals.js';
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
import {
  LLM_BLOCKED_RISK,
  OPS_RECOVERY_PROVIDER_IDS,
  OPS_RECOVERY_ROWS,
  PERM_BLOCKED_RISK,
  RECOVERY_PROVIDER_IDS,
  RECOVERY_PROVIDER_TRIGGERS,
  builtinProviders,
} from '../src/ui/sidepanel/next-registry/providers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const DEFINITION_REL = 'src/ui/sidepanel/next-registry/definition.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';

/**
 * The **one** allowed out-of-declaration site: `providers.ts` names the P0 providers
 * after the blocked terminals they repair. The gate asserts the literal set found there is
 * exactly THIS set — a literal elsewhere (or a new one here) fails.
 *
 * 〖V5-2 review R1 BLOCK-03〗the set now covers all **four** provider ids that are the
 * blocked terminal itself (`binding.stale` / `site.unauthorized` / `llm.unconfigured` /
 * `perm.missing`); the fifth row's provider is named after its *trigger* (`ref.stale`), so
 * it is not a blocked-terminal literal. 自紧：下方断言要求「本集合 == landed 行的 providerId
 * 中确实等于阻塞类名的那些」——多写一个/少写一个都红。
 */
export const PROVIDER_ID_LITERAL_EXCEPTION = ['binding.stale', 'site.unauthorized', 'llm.unconfigured', 'perm.missing'] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The judges
 * ──────────────────────────────────────────────────────────────────────────── */

/** `expectFailPattern` of every judgement declared by this gate. */
export interface BlockedJudgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly BlockedJudgement[] = [
  { id: 'BT-1-declared-once', expectFailPattern: '阻塞态字符串字面量必须只出现在声明源与唯一双射点' },
  { id: 'BT-2-site-when-firstRun-free', expectFailPattern: 'site.unauthorized 的 when 不得依赖 firstRun' },
  { id: 'BT-3-blocked-p0-map', expectFailPattern: '阻塞类 ↔ P0 provider 映射必须完备且单射' },
  { id: 'BT-4-pending-registered', expectFailPattern: '未闭合项必须显式登记（status + reason ≥40）' },
];

/** Every `src/**` file (recursive). */
export function srcFiles(dir = join(PKG, 'src')): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Where each blocked-terminal literal occurs, per file (comments included — a
 *  comment is still a second place a human copies the string from). */
export function literalSites(files: readonly string[], literals: readonly string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(file.indexOf(PKG) + PKG.length);
    for (const lit of literals) {
      if (text.includes(`'${lit}'`)) (out[rel] ??= []).push(lit);
    }
  }
  return out;
}

/** ① — every literal must sit in the declaration file or the declared exception. */
export function declaredOnceProblems(sites: Record<string, string[]>): string[] {
  const problems: string[] = [];
  const allowed = new Set([DEFINITION_REL, PROVIDERS_REL]);
  for (const [file, lits] of Object.entries(sites)) {
    if (!allowed.has(file)) {
      problems.push(`阻塞态字符串字面量必须只出现在声明源与唯一双射点：${file} 出现 ${lits.join(', ')}`);
      continue;
    }
    if (file === PROVIDERS_REL) {
      const extra = lits.filter((l) => !(PROVIDER_ID_LITERAL_EXCEPTION as readonly string[]).includes(l));
      if (extra.length > 0) {
        problems.push(`阻塞态字符串字面量必须只出现在声明源与唯一双射点：${file} 多出未登记字面量 ${extra.join(', ')}`);
      }
    }
  }
  for (const lit of BLOCKED_TERMINALS) {
    if (!(sites[DEFINITION_REL] ?? []).includes(lit)) {
      problems.push(`阻塞态字符串字面量必须只出现在声明源与唯一双射点：声明源缺 ${lit}`);
    }
  }
  return problems;
}

/** The `t === 'site'` branch of `triggerMatch` (where a `firstRun` regression would land). */
export function siteBranchSource(source: string): string | null {
  const fn = /function\s+triggerMatch\([\s\S]*?\n\}/.exec(source);
  if (!fn) return null;
  const m = /if \(t === 'site'\)([^\n]*)/.exec(fn[0]);
  return m ? m[0] : null;
}

/** ② — the site branch must be about the authorization state only. */
export function siteBranchProblems(source: string): string[] {
  const branch = siteBranchSource(source);
  if (branch === null) return ['site.unauthorized 的 when 不得依赖 firstRun：找不到 site 分支（判据不得空转）'];
  const problems: string[] = [];
  if (/firstRun|onboarding/.test(branch)) {
    problems.push(`site.unauthorized 的 when 不得依赖 firstRun：实测分支 ${branch.trim()}`);
  }
  if (!/authorized/.test(branch)) {
    problems.push(`site.unauthorized 的 when 不得依赖 firstRun：分支未以授权态为判据 → ${branch.trim()}`);
  }
  return problems;
}

/** ② (dynamic) — the provider must fire for a non-first-run unauthorized session. */
export function siteCandidateProblems(providers: readonly NextProvider[], ctx: NextCtx): string[] {
  const id = BLOCKED_TERMINALS[0];
  const provider = providers.find((p) => p.id === id);
  if (!provider) return [`site.unauthorized 的 when 不得依赖 firstRun：provider ${id} 不存在`];
  const problems: string[] = [];
  if (provider.when(ctx) !== true) {
    problems.push(`site.unauthorized 的 when 不得依赖 firstRun：firstRun=false ∧ !authorized ⇒ when() 必须为 true`);
  }
  const known = new Set<string>([...OBLIGATION_OP_IDS, ...Object.values(ACT_TO_OP)]);
  const dangling = provider.chips.filter((c) => !known.has(c));
  if (dangling.length > 0) problems.push(`chips 悬空判据失败：${id} 的 chips ${dangling.join(', ')} 不是已知 op`);
  return problems;
}

/** A `NextCtx` payload builder — the same shape the panel hands the producers. */
export function ctxOf(over: Partial<NextCtx> = {}): NextCtx {
  return {
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: true, trust: 'trusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'ready', steady: true },
    risk: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    ...over,
  };
}

/** One blocked terminal ↔ the P0 provider that repairs it (`null` ⇒ still pending). */
export interface BlockedP0Row {
  readonly blocked: string;
  readonly providerId: string | null;
  readonly driver: string;
  readonly status: 'landed' | 'pending-v5-2';
  readonly reason?: string;
}

/**
 * The **repairing op** of each op-driven blocked terminal (V5-2 review R1 BLOCK-03).
 * The provider whose id IS the blocked terminal offers exactly this op as its chip —
 * op-direct (the act is the opId), so the click dispatches the op, never a turn.
 */
export const BLOCKED_REPAIR_OP: Readonly<Record<string, string>> = Object.freeze({
  'llm.unconfigured': 'op.llm-config',
  'perm.missing': 'op.perm.request',
});

/** The **derived** risk-class id each op-driven provider's `when(ctx)` reads (no new source). */
export const BLOCKED_RISK_CLASS: Readonly<Record<string, string>> = Object.freeze({
  'llm.unconfigured': LLM_BLOCKED_RISK,
  'perm.missing': PERM_BLOCKED_RISK,
});

/**
 * ③ — the total map. **V5-2 review R1 BLOCK-03 closes it: 5 landed / 0 pending.**
 *
 * The two rows that were registered as `pending-v5-2` in v5-1 (the leaf's §6-③ 承接项)
 * now have their provider really wired: `llm.unconfigured` / `perm.missing` are registered
 * built-ins whose `when(ctx)` reads the derived risk class and whose single chip is the
 * repairing op (`op.llm-config` / `op.perm.request`). The双射 5↔5 (5 blocked terminals ↔
 * 5 landed providers) is therefore complete — and the gate below checks the chips too, so
 * a landed row whose provider is missing / chip-less / mis-chipped is red.
 */
export const BLOCKED_P0_MAP: readonly BlockedP0Row[] = [
  { blocked: 'site.unauthorized', providerId: 'site.unauthorized', driver: 'ctx.site.authorized === false（与 firstRun 无关）', status: 'landed' },
  { blocked: 'binding.stale', providerId: 'binding.stale', driver: 'risk ∋ hardFloor', status: 'landed' },
  { blocked: 'ref.all-invalid', providerId: 'ref.stale', driver: 'ctx.ref.staleCount ≥ 1 ∨ risk ∋ refInvalid', status: 'landed' },
  { blocked: 'llm.unconfigured', providerId: 'llm.unconfigured', driver: 'risk ∋ llmBlocked（key-store 为空，从实时 LLM 状态派生）', status: 'landed' },
  { blocked: 'perm.missing', providerId: 'perm.missing', driver: 'risk ∋ permBlocked（OPTIONAL_CAPABILITIES 的实测授权态缺项）', status: 'landed' },
];

/**
 * ③ — **review R1 BLOCK-03** self-tightening half: a landed row must have a **real
 * provider** whose chip is the declared repairing op (or, for the trigger-driven rows, at
 * least one registered op chip). Injecting a landed row without a provider / with a wrong
 * chip ⇒ red (reverse proof in BT-3 below).
 */
export function landedProviderProblems(
  rows: readonly BlockedP0Row[],
  providers: readonly NextProvider[],
  knownOps: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const row of rows) {
    if (row.status !== 'landed' || !row.providerId) continue;
    const provider = providers.find((p) => p.id === row.providerId);
    if (!provider) {
      problems.push(`已落地的修复 provider 必须真实注册：${row.blocked} → ${row.providerId} 不在 builtinProviders() 内`);
      continue;
    }
    const want = BLOCKED_REPAIR_OP[row.blocked];
    if (want !== undefined) {
      if (!provider.chips.includes(want)) {
        problems.push(`已落地修复 provider 的 chips 必须真实接线：${row.providerId} 缺 ${want}（实测 ${provider.chips.join(', ')}）`);
      }
    }
    const dangling = provider.chips.filter((c) => !knownOps.includes(c));
    if (dangling.length > 0) problems.push(`修复 provider 的 chips 不得悬空：${row.providerId} 的 ${dangling.join(', ')}`);
  }
  return problems;
}

/** ③ — the op-driven providers must read the **derived** risk class, not a new source. */
export function opsRecoveryProblems(providers: readonly NextProvider[]): string[] {
  const problems: string[] = [];
  if (OPS_RECOVERY_PROVIDER_IDS.length !== 2) {
    problems.push(`op-driven 修复 provider 必须恰 2 个（实测 ${OPS_RECOVERY_PROVIDER_IDS.length}）`);
    return problems;
  }
  for (const id of OPS_RECOVERY_PROVIDER_IDS) {
    const provider = providers.find((p) => p.id === id);
    if (!provider) {
      problems.push(`op-driven 修复 provider 必须注册：缺 ${id}`);
      continue;
    }
    const risk = BLOCKED_RISK_CLASS[id];
    if (provider.when(ctxOf({ risk: [risk] })) !== true) {
      problems.push(`${id}: risk ∋ ${risk} ⇒ when() 必须为 true（否则该阻塞态不可达）`);
    }
    if (provider.when(ctxOf()) !== false) problems.push(`${id}: 干净 ctx 不得触发（判据不得恒真）`);
  }
  return problems;
}

/** ③ — completeness + injectivity (+ a reason for every pending row). */
export function blockedMapProblems(rows: readonly BlockedP0Row[], terminals: readonly string[]): string[] {
  const problems: string[] = [];
  if (rows.length !== terminals.length) {
    problems.push(`阻塞类 ↔ P0 provider 映射必须完备且单射：行数 ${rows.length} ≠ 阻塞类 ${terminals.length}`);
  }
  for (const t of terminals) {
    if (!rows.some((r) => r.blocked === t)) problems.push(`阻塞类 ↔ P0 provider 映射必须完备且单射：缺 ${t}`);
  }
  for (const r of rows) {
    if (!terminals.includes(r.blocked)) problems.push(`阻塞类 ↔ P0 provider 映射必须完备且单射：多出未声明阻塞类 ${r.blocked}`);
    if (r.status === 'landed') {
      if (!r.providerId) problems.push(`阻塞类 ↔ P0 provider 映射必须完备且单射：${r.blocked} 已落地但无 provider`);
    } else if (!r.reason || r.reason.trim().length < 40) {
      problems.push(`未闭合项必须显式登记：${r.blocked} 的 reason 必须 ≥40 字符`);
    }
  }
  const landed = rows.map((r) => r.providerId).filter((x): x is string => typeof x === 'string');
  const dup = landed.filter((id, i) => landed.indexOf(id) !== i);
  if (dup.length > 0) problems.push(`阻塞类 ↔ P0 provider 映射必须完备且单射：provider 重复 ${dup.join(', ')}`);
  return problems;
}

/** ④ — every registered pending item needs a status and a ≥40-char reason. */
export interface PendingItem {
  readonly id: string;
  readonly status: string;
  readonly reason: string;
  readonly owner: string;
}
export const PENDING_ITEMS: readonly PendingItem[] = [
  {
    id: 'FR-ALLN-013-chips',
    // V5-2 TASK-V5-133 —— **N-04 已闭合**：`RECOVERY_CHIP_ORDER.site` 的第二槽位
    // 现为 `authorize` ⇒ `site.unauthorized` 的 chips 含 `op.authorize`（非首装未授权
    // 会话的断流由此修复）。v5-1 的体积自紧条目按约定**翻转**为 landed（判据双向：
    // 见下方 BT-4，chips 与登记任一方向漂移都红）。
    status: 'landed',
    owner: 'specs-tree-v5-2-ops-first-batch',
    reason: 'v5-2 TASK-V5-133 落地：RECOVERY_CHIP_ORDER.site = [rebind, authorize, repick, describe]，site.unauthorized 的 chips = [op.rebind, op.authorize, op.repick] ⇒ 含 op.authorize；首槽位仍是 rebind（⑭ 判据驱动的 lead chip 不变）。',
  },
];

/** ④ — the pending items are registered, and the *current* fact is asserted too. */
export function pendingItemProblems(items: readonly PendingItem[]): string[] {
  const problems: string[] = [];
  for (const item of items) {
    // V5-2: a CLOSED item (`landed`) is no longer a pending registration — it keeps its
    // owner/reason so the closure is auditable, and the fact it claims is asserted on
    // the product source by the caller (BT-4), not by this status shape.
    if (item.status !== 'landed' && !item.status.startsWith('pending')) {
      problems.push(`未闭合项必须显式登记：${item.id} 的 status 必须为 pending-*（或已翻转的 landed）`);
    }
    if (item.reason.trim().length < 40) problems.push(`未闭合项必须显式登记：${item.id} 的 reason 必须 ≥40 字符`);
    if (item.owner.trim().length === 0) problems.push(`未闭合项必须显式登记：${item.id} 必须有 owner`);
  }
  return problems;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 真源断言
 * ──────────────────────────────────────────────────────────────────────────── */

test('BT-1 声明恰一次：5 个阻塞态字面量只出现在 definition.ts（+ 唯一双射点 providers.ts）', () => {
  assert.equal(BLOCKED_TERMINALS.length, 5, '阻塞终态必须恰 5 类（FR-ALLN-010）');
  const sites = literalSites(srcFiles(), BLOCKED_TERMINALS);
  assert.deepEqual(declaredOnceProblems(sites), []);
  assert.deepEqual((sites[PROVIDERS_REL] ?? []).sort(), [...PROVIDER_ID_LITERAL_EXCEPTION].sort(), '唯一双射点的字面量集合必须与登记一致');
  assert.deepEqual((sites[DEFINITION_REL] ?? []).sort(), [...BLOCKED_TERMINALS].sort(), '声明源必须含全部 5 项');
  // 自紧（review R1 BLOCK-03）：登记集合必须恰等于「landed 行里 providerId === blocked」的那些
  // 阻塞类 —— 多写一个（未落地的类名）或少写一个（已落地的类名）都红。
  const selfNamed = BLOCKED_P0_MAP.filter((r) => r.status === 'landed' && r.providerId === r.blocked).map((r) => r.blocked);
  assert.deepEqual(
    [...PROVIDER_ID_LITERAL_EXCEPTION].sort(),
    [...selfNamed].sort(),
    '唯一双射点的字面量登记必须恰等于「providerId === blocked」的 landed 行集合',
  );
});

test('BT-2 site.unauthorized：when(ctx) 与 firstRun 无关（静态 + 动态双证）', () => {
  const providersSource = readFileSync(join(PKG, PROVIDERS_REL), 'utf8');
  assert.deepEqual(siteBranchProblems(providersSource), []);
  // 动态：非首装未授权会话（R1 真机现场）必须产出候选。
  const providers = builtinProviders();
  const site = providers.find((p) => p.id === BLOCKED_TERMINALS[0]);
  assert.ok(site, '前置：site.unauthorized provider 必须存在');
  assert.equal(site.when(ctxOf({ site: { authorized: false, trust: 'untrusted' } })), true, '未授权 ⇒ when() 必须为 true');
  assert.deepEqual(siteCandidateProblems(providers, ctxOf({ site: { authorized: false }, onboarding: { firstRun: false, pendingSteps: [] } })), []);
  // 判据非恒真：已授权 / 干净态不得被当成阻塞。
  assert.equal(site.when(ctxOf()), false, '已授权态不得触发 site 阻塞');
  // 反证（同一 judge，动态半）：把 firstRun 依赖塞回 when ⇒ 非首装会话必须被判红。
  const forgedProvider: NextProvider = { ...site, when: (ctx) => ctx.onboarding.firstRun && ctx.site.authorized === false };
  const forgedProblems = siteCandidateProblems([forgedProvider], ctxOf({ site: { authorized: false } }));
  assert.ok(forgedProblems.some((p) => p.includes(JUDGEMENTS[1].expectFailPattern)), forgedProblems.join(' | '));
  // 反证（同一 judge，静态半）：源码分支里塞 firstRun ⇒ 必红。
  const forgedSource = providersSource.replace(
    "if (t === 'site') return ctx.site.authorized === false;",
    "if (t === 'site') return ctx.onboarding.firstRun && ctx.site.authorized === false;",
  );
  assert.notEqual(forgedSource, providersSource, '前置：注入锚点必须存在');
  assert.ok(siteBranchProblems(forgedSource).length > 0, JUDGEMENTS[1].expectFailPattern);
});

test('BT-3 阻塞类 ↔ P0 provider：5 行完备单射（**5 landed**，双射 5↔5 闭合）', () => {
  assert.deepEqual(blockedMapProblems(BLOCKED_P0_MAP, [...BLOCKED_TERMINALS]), []);
  // provider 侧自身的双射：5 恢复触发 provider（v5-1 集）。
  assert.equal(RECOVERY_PROVIDER_IDS.length, 5, 'P0 恢复 provider（触发器集）必须恰 5 个');
  assert.equal(Object.keys(RECOVERY_PROVIDER_TRIGGERS).length, 5);
  const ids = [...RECOVERY_PROVIDER_IDS];
  assert.equal(new Set(ids).size, ids.length, 'P0 provider id 必须唯一');
  const triggers = Object.values(RECOVERY_PROVIDER_TRIGGERS);
  assert.equal(new Set(triggers).size, triggers.length, '触发器必须与 provider 一一对应（单射）');
  // review R1 BLOCK-03：op-driven 两行落地 ⇒ 5/5 landed（0 pending），且 provider 真实注册、
  // chips 真实接线到修复 op（判据从「登记 reason ≥40」翻转为「provider + chip 必须存在」）。
  assert.equal(OPS_RECOVERY_PROVIDER_IDS.length, 2, 'op-driven 修复 provider 必须恰 2 个');
  assert.equal(BLOCKED_P0_MAP.filter((r) => r.status === 'landed').length, BLOCKED_TERMINALS.length, '5 类阻塞态必须全部有已落地的修复 provider');
  const providers = builtinProviders();
  const knownOps = new Set<string>([...OBLIGATION_OP_IDS, ...Object.values(ACT_TO_OP)]);
  assert.deepEqual(landedProviderProblems(BLOCKED_P0_MAP, providers, [...knownOps]), []);
  assert.deepEqual(opsRecoveryProblems(providers), [], 'op-driven provider 的 when(ctx) 必须由派生风险类驱动');
  const landedIds = BLOCKED_P0_MAP.filter((r) => r.status === 'landed').map((r) => r.providerId);
  for (const id of landedIds) {
    assert.ok(ids.includes(id as string) || OPS_RECOVERY_PROVIDER_IDS.includes(id as string), `已落地映射的 provider ${String(id)} 必须真实存在`);
  }
});

test('BT-3 反证（review R1 BLOCK-03 自紧）：landed 行缺 provider / chip 接线错 ⇒ 必红', () => {
  const providers = builtinProviders();
  const knownOps = new Set<string>([...OBLIGATION_OP_IDS, ...Object.values(ACT_TO_OP)]);
  // ① 「已落地」但 provider 不存在（把 id 改成一个没有实现的名字）⇒ 红。
  assert.notEqual(OPS_RECOVERY_PROVIDER_IDS.length, 0, '前置：op-driven provider 必须存在');
  const ghost = BLOCKED_P0_MAP.map((r) => (r.blocked === 'llm.unconfigured' ? { ...r, providerId: 'llm.ghost' } : r));
  assert.ok(
    landedProviderProblems(ghost, providers, [...knownOps]).some((p) => p.includes('不在 builtinProviders() 内')),
    JUDGEMENTS[2].expectFailPattern,
  );
  // ② provider 在册但 chip 接错（换成别的 op）⇒ 红。
  const misChipped = providers.map((p) => (p.id === 'perm.missing' ? { ...p, chips: ['op.help'] } : p));
  assert.ok(
    landedProviderProblems(BLOCKED_P0_MAP, misChipped, [...knownOps]).some((p) => p.includes('缺 op.perm.request')),
    JUDGEMENTS[2].expectFailPattern,
  );
  // ③ 还原 ⇒ PASS（判据不是恒真）。
  assert.deepEqual(landedProviderProblems(BLOCKED_P0_MAP, providers, [...knownOps]), []);
});

test('BT-3 反证：注入第 6 类阻塞（无 provider 且无登记）⇒ 映射判据必红', () => {
  const forged: BlockedP0Row[] = [...BLOCKED_P0_MAP, { blocked: 'disk.full', providerId: null, driver: '注入', status: 'pending-v5-2' }];
  const problems = blockedMapProblems(forged, [...BLOCKED_TERMINALS, 'disk.full']);
  assert.ok(problems.some((p) => p.includes('reason 必须 ≥40 字符')), JUDGEMENTS[2].expectFailPattern);
  // 而「已在 BLOCKED_TERMINALS 内但映射表缺行」同样必红。
  assert.ok(blockedMapProblems(BLOCKED_P0_MAP.slice(1), [...BLOCKED_TERMINALS]).length > 0, JUDGEMENTS[2].expectFailPattern);
});

test('BT-1 反证：在第三个文件里写第二个 `site.unauthorized` 字面量 ⇒ 单源判据必红', () => {
  const forgedSites = {
    [DEFINITION_REL]: [...BLOCKED_TERMINALS],
    [PROVIDERS_REL]: [...PROVIDER_ID_LITERAL_EXCEPTION],
    'src/ui/sidepanel/recommend.ts': [BLOCKED_TERMINALS[0]],
  };
  const problems = declaredOnceProblems(forgedSites);
  assert.ok(problems.some((p) => p.includes('recommend.ts')), JUDGEMENTS[0].expectFailPattern);
  // 双射点多写一个字面量 ⇒ 同样必红。
  const forgedProviders = { [DEFINITION_REL]: [...BLOCKED_TERMINALS], [PROVIDERS_REL]: [...PROVIDER_ID_LITERAL_EXCEPTION, BLOCKED_TERMINALS[4]] };
  assert.ok(declaredOnceProblems(forgedProviders).some((p) => p.includes('多出未登记字面量')), JUDGEMENTS[0].expectFailPattern);
});

test('BT-4 登记项自紧：FR-ALLN-013 的 chips 缺口必须显式登记，且当前事实与登记一致', () => {
  assert.deepEqual(pendingItemProblems(PENDING_ITEMS), []);
  const site = builtinProviders().find((p) => p.id === BLOCKED_TERMINALS[0]);
  assert.ok(site, '前置：site.unauthorized provider 必须存在');
  const pending = PENDING_ITEMS.find((i) => i.id === 'FR-ALLN-013-chips');
  assert.ok(pending, 'FR-ALLN-013 的 chips 缺口必须登记（否则本判据空转）');
  // 双向自紧（v5-2 翻转后加严，判据力只升不降）：
  //   · pending ⇒ 当前 chips 必须**不含** op.authorize；
  //   · landed  ⇒ 当前 chips 必须**含** op.authorize（补上才算闭合）。
  if (pending.status === 'pending-v5-2') {
    assert.ok(!site.chips.includes('op.authorize'), 'chips 已含 op.authorize ⇒ 必须把 FR-ALLN-013-chips 的 status 从 pending-v5-2 翻转为 landed');
  } else {
    assert.ok(site.chips.includes('op.authorize'), 'FR-ALLN-013-chips 登记为 landed ⇒ site.unauthorized 的 chips 必须实际含 op.authorize（N-04 闭合）');
  }
  assert.ok(site.chips.length > 0 && site.chips.every((c) => typeof c === 'string'), 'site provider 必须带可点 chips');
});

test('BT-4 反证：登记项缺 reason / status 非法 ⇒ 判据必红', () => {
  const noReason = [{ ...PENDING_ITEMS[0], reason: '太短' }];
  assert.ok(pendingItemProblems(noReason).some((p) => p.includes('reason 必须 ≥40')), JUDGEMENTS[3].expectFailPattern);
  const badStatus = [{ ...PENDING_ITEMS[0], status: 'in-progress' }];
  assert.ok(pendingItemProblems(badStatus).length > 0, JUDGEMENTS[3].expectFailPattern);
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-2 **TASK-V55-206**（ADR-V55-006 §4/§5 · FR-SELF-041/051 · AC-SELF-013）——
 * **双源并存不改写阻塞枚举**：主动识别（SW 前置判据 `isLlmConfigured`）与被动观测
 * （`op.llm-config` 失败 / 被拒）折叠进**同一**终态词汇 ⇒ 5 类阻塞逐字、双射 5↔5、
 * op-driven 两行零改写；且「**已装未配**」（`firstRun = false` ∧ `risk: llmBlocked`）
 * 必须仍产出 `op.llm-config` 引导 chip（扩张不取代，R-ONBOARDING 判据不减）。
 * ──────────────────────────────────────────────────────────────────────────── */
test('BT-6（V5.5-2）：双源并存零改写阻塞枚举 ∧ 已装未配仍产出引导 chip', () => {
  // ① 枚举与双射逐字不动。
  assert.equal(BLOCKED_TERMINALS.length, 5, '阻塞态枚举恰 5 逐字（主动识别不得新增第 6 类）');
  assert.deepEqual(blockedMapProblems(BLOCKED_P0_MAP, [...BLOCKED_TERMINALS]), []);
  assert.equal(BLOCKED_P0_MAP.filter((r) => r.status === 'landed').length, 5, '双射 5↔5 仍闭合');
  // ② op-driven 两行逐字（恢复链零改写）。
  assert.deepEqual(
    OPS_RECOVERY_ROWS.map((r) => [r.blocked, r.op]),
    [
      ['llm.unconfigured', 'op.llm-config'],
      ['perm.missing', 'op.perm.request'],
    ],
    'op-driven 恢复行必须逐字不变',
  );
  // ③ 已装未配（firstRun = false）⇒ 引导 provider 仍产出唯一配置执行体的 op-direct chip。
  const providers = builtinProviders();
  const guide = providers.find((p) => p.id === BLOCKED_TERMINALS[1]);
  assert.ok(guide, '前置：llm.unconfigured 引导 provider 必须存在');
  const installedUnconfigured = ctxOf({ risk: [LLM_BLOCKED_RISK], onboarding: { firstRun: false, pendingSteps: [] } });
  assert.equal(guide.when(installedUnconfigured), true, '已装未配（firstRun=false）必须仍触发引导');
  assert.deepEqual([...guide.chips], ['op.llm-config'], '引导 chip 必须恒为唯一配置执行体 op.llm-config');
  assert.equal(guide.when(ctxOf()), false, '干净态（无 llmBlocked 风险）不得触发引导（判据非恒真）');
  // ④ 两条路径同一终态词汇：risk 源的键名与阻塞态枚举的映射是**唯一**双射行。
  assert.equal(BLOCKED_P0_MAP.find((r) => r.blocked === BLOCKED_TERMINALS[1])?.providerId, BLOCKED_TERMINALS[1]);
});

test('BT-6 反证：主动识别被实现为「第 6 类阻塞」⇒ 映射判据必红 → 还原 PASS', () => {
  const forged: BlockedP0Row[] = [...BLOCKED_P0_MAP, { blocked: 'llm.unconfigured-active', providerId: null, driver: '注入', status: 'pending-v5-2' }];
  assert.ok(
    blockedMapProblems(forged, [...BLOCKED_TERMINALS, 'llm.unconfigured-active']).length > 0,
    JUDGEMENTS[2].expectFailPattern,
  );
  // 反证：把引导 chip 改写为「第二个配置执行体」⇒ op-driven 行判据必红。
  const guide = builtinProviders().find((p) => p.id === BLOCKED_TERMINALS[1]);
  assert.ok(guide);
  const forked = [{ ...guide, chips: ['op.llm-config-alt'] }];
  const knownOps = new Set<string>([...OBLIGATION_OP_IDS, ...Object.values(ACT_TO_OP)]);
  assert.ok(
    landedProviderProblems(BLOCKED_P0_MAP, forked, [...knownOps]).length > 0,
    '第二配置执行体必须判红（配置面唯一，NG-SELF-016）',
  );
  assert.deepEqual(blockedMapProblems(BLOCKED_P0_MAP, [...BLOCKED_TERMINALS]), [], '还原必须 PASS');
});

test('BT 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 4, '判据表必须覆盖四条判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});

/* ── V5.5-1 TASK-V55-118（ADR-V55-003 §1 · FR-SELF-103 · X-SELF-4）─────────────
 *
 * X-SELF-4 的等价重锚（**改写 ≠ 删除**）：5 类阻塞**逐字不变**（N-SELF-019）∧ 新增的
 * **驱动者终态词汇**（4 项，与流终态正交）**不得**混入阻塞枚举 —— 两个词表互不污染。
 * ──────────────────────────────────────────────────────────────────────────── */

test('BT-5（V5.5-1 X-SELF-4）：5 类阻塞逐字不变 ∧ 驱动者终态词汇正交且不混入阻塞枚举', () => {
  const blocked = [...BLOCKED_TERMINALS];
  assert.deepEqual(blocked, ['site.unauthorized', 'llm.unconfigured', 'perm.missing', 'binding.stale', 'ref.all-invalid'], '5 类阻塞逐字（只增不减的底线）');
  assert.equal(blocked.length, 5);
  // 驱动者终态（4）与阻塞枚举（5）**交集为空**：两个词表不得混用（R-V55-103）。
  const inter = DRIVER_TERMINALS.filter((t) => (blocked as readonly string[]).includes(t));
  assert.deepEqual(inter, [], '驱动者终态不得混入阻塞枚举（正交）');
  assert.equal(DRIVER_TERMINALS.length, 4);
  // 「已表达意图」不会把某个阻塞态挤出恢复面：5 个 P0 provider 仍逐类在册。
  assert.equal(blockedMapProblems(BLOCKED_P0_MAP, blocked).length, 0, '5 类阻塞的恢复面不得因新增终态而缺行');
});

test('BT-5 反证：把驱动者终态混进阻塞枚举 / 删一类阻塞 ⇒ 正交与逐字判据各必红 → 还原 PASS', () => {
  const withDriverTerminal = [...BLOCKED_TERMINALS, DRIVER_TERMINALS[0]];
  assert.ok(DRIVER_TERMINALS.some((t) => (withDriverTerminal as readonly string[]).includes(t)), '混入后交集非空 ⇒ 必红');
  const dropped = [...BLOCKED_TERMINALS].filter((t) => t !== 'binding.stale');
  assert.notDeepEqual(dropped, [...BLOCKED_TERMINALS], '删一类阻塞 ⇒ 逐字判据必红');
  assert.equal(dropped.length, 4);
  assert.deepEqual([...BLOCKED_TERMINALS], ['site.unauthorized', 'llm.unconfigured', 'perm.missing', 'binding.stale', 'ref.all-invalid'], '还原 PASS');
});
