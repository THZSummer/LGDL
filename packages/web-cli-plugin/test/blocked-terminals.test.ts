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
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
import { RECOVERY_PROVIDER_IDS, RECOVERY_PROVIDER_TRIGGERS, builtinProviders } from '../src/ui/sidepanel/next-registry/providers.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const DEFINITION_REL = 'src/ui/sidepanel/next-registry/definition.ts';
const PROVIDERS_REL = 'src/ui/sidepanel/next-registry/providers.ts';

/**
 * The **one** allowed out-of-declaration site: `providers.ts` names two P0 providers
 * after the blocked terminals they repair. The gate asserts the literal set found
 * there is exactly THIS set — a third literal elsewhere (or a new one here) fails.
 */
export const PROVIDER_ID_LITERAL_EXCEPTION = ['binding.stale', BLOCKED_TERMINALS[0]] as const;

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
 * ③ — the total map. Three classes have a **landed** P0 provider today; the two that
 * wait for the `v5-2` ops (`op.llm-config` / `op.perm.request`) are registered with
 * a reason instead of being quietly absent (ADR-V5-009 §3 registers both seams).
 */
export const BLOCKED_P0_MAP: readonly BlockedP0Row[] = [
  { blocked: 'site.unauthorized', providerId: 'site.unauthorized', driver: 'ctx.site.authorized === false（与 firstRun 无关）', status: 'landed' },
  { blocked: 'binding.stale', providerId: 'binding.stale', driver: 'risk ∋ hardFloor', status: 'landed' },
  { blocked: 'ref.all-invalid', providerId: 'ref.stale', driver: 'ctx.ref.staleCount ≥ 1 ∨ risk ∋ refInvalid', status: 'landed' },
  {
    blocked: 'llm.unconfigured',
    providerId: null,
    driver: 'key-store 为空（clearLlm 等价）',
    status: 'pending-v5-2',
    reason: '修复 provider（触发 provider id = llm.unconfigured，chips 含 op.llm-config）随 v5-2 的 9 op 注册一并落地；v5-1 只交付阻塞态枚举单源与既有 P0 五provider 的机制基础。',
  },
  {
    blocked: 'perm.missing',
    providerId: null,
    driver: '授权 origin + 未授予可选能力',
    status: 'pending-v5-2',
    reason: '修复 provider（触发 provider id = perm.missing，chips 含 op.perm.request）随 v5-2 的 optional_permissions 放开与 9 op 注册一并落地。',
  },
];

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

test('BT-3 阻塞类 ↔ P0 provider：5 行完备单射（3 landed + 2 登记 pending-v5-2）', () => {
  assert.deepEqual(blockedMapProblems(BLOCKED_P0_MAP, [...BLOCKED_TERMINALS]), []);
  // provider 侧自身的双射：5 P0 provider ↔ 5 恢复触发。
  assert.equal(RECOVERY_PROVIDER_IDS.length, 5, 'P0 恢复 provider 必须恰 5 个');
  assert.equal(Object.keys(RECOVERY_PROVIDER_TRIGGERS).length, 5);
  const ids = [...RECOVERY_PROVIDER_IDS];
  assert.equal(new Set(ids).size, ids.length, 'P0 provider id 必须唯一');
  const triggers = Object.values(RECOVERY_PROVIDER_TRIGGERS);
  assert.equal(new Set(triggers).size, triggers.length, '触发器必须与 provider 一一对应（单射）');
  const landedIds = BLOCKED_P0_MAP.filter((r) => r.status === 'landed').map((r) => r.providerId);
  for (const id of landedIds) assert.ok(ids.includes(id as string), `已落地映射的 provider ${String(id)} 必须在 P0 provider 集合内`);
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

test('BT 元判据：每条 judgement 都声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 4, '判据表必须覆盖四条判据');
  for (const j of JUDGEMENTS) {
    assert.ok(j.expectFailPattern.trim().length >= 8, `${j.id}: expectFailPattern 不得为空/占位`);
    assert.ok(!j.expectFailPattern.includes('TODO'), `${j.id}: expectFailPattern 不得是 TODO`);
  }
});
