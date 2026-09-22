/**
 * V5-2 **TASK-V5-149** (ADR-V5-009 §3/§5 · FR-ALLN-016 · **AC-ALLN-001** · EC-ALLN-005) —
 * the **S2 断流全链共享样本 + 驱动 seam**.
 *
 * ── Why this file is a plain `.mjs` with injected deps ──────────────────────
 *
 * The S2 chain (`绑定 → 探测 → 未授权 → ✖ 阻塞 → 授权 next 产出 → auth 卡 → 握手 → ✓ 回执
 * → 探测恢复 → 拾取 next 产出`) is judged in **two** places:
 *
 *   · the node judge `test/s2-deadend-chain.test.ts` (this leaf, TASK-V5-149/150);
 *   · the death-end guard `test/ui/no-dead-end.mjs` (**v5-3**, 单点落地, FR-ALLN-004).
 *
 * The two must drive the **same sample** (`不复制`), so the sample lives here as pure data
 * + pure functions, and every production capability is **injected** by the caller
 * (`{ candidates, actToOp, opIds, selectables }`). Zero DOM, zero chrome, zero imports —
 * importable from a browser gate and from a compiled node test alike.
 *
 * @module test/ui/fixtures/s2-chain
 */

/** The 10 steps of the S2 chain, in order (an id + the human label of the chain beat). */
export const S2_CHAIN = Object.freeze([
  { id: 'bind', label: '① 绑定当前标签页' },
  { id: 'probe', label: '② 探测声明' },
  { id: 'unauthorized', label: '③ 未授权' },
  { id: 'blocked', label: '④ ✖ 阻塞（行内可判）' },
  { id: 'authorize-next', label: '⑤ 授权 next 产出' },
  { id: 'auth-card', label: '⑥ auth 卡（consent）' },
  { id: 'execute', label: '⑦ 握手执行（probe → 手势 → commit）' },
  { id: 'receipt', label: '⑧ ✓ 回执（留痕）' },
  { id: 'probe-recovered', label: '⑨ 探测恢复' },
  { id: 'pick-next', label: '⑩ 拾取 next 产出' },
]);

/** The 5 blocked terminals (the chain's ④ beats). Literal order = `BLOCKED_TERMINALS`. */
export const S2_BLOCKED_STATES = Object.freeze([
  'site.unauthorized',
  'llm.unconfigured',
  'perm.missing',
  'binding.stale',
  'ref.all-invalid',
]);

/**
 * The 7-source context of one chain state (the same shape the panel hands the producers).
 * `over` merges on top, so a caller can drive any beat without restating the 7 sources.
 */
export function s2Ctx(over = {}) {
  return {
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: false, trust: 'untrusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'idle', steady: false },
    risk: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    ...over,
  };
}

/**
 * The **derived** risk-class ids of the two op-driven blocked terminals (V5-2 review R1
 * BLOCK-03). They are the panel's derivation of「key-store 为空」and「`OPTIONAL_CAPABILITIES`
 * 授权态缺项」folded into the existing `risk` source — the id strings are declared in
 * `src/ui/sidepanel/next-registry/providers.ts` (`LLM_BLOCKED_RISK` / `PERM_BLOCKED_RISK`)
 * and repeated here only as the sample's literal drive values (the fixture imports nothing).
 */
export const S2_BLOCKED_RISK = Object.freeze({ 'llm.unconfigured': 'llmBlocked', 'perm.missing': 'permBlocked' });

/**
 * The context of each of the 5 blocked states (the chain's ④ drive table).
 *
 * ── V5-2 review R1 BLOCK-03：不再同构 ────────────────────────────────────────
 *
 * Every case now drives the **fact** its blocked terminal is derived from, so no blocked
 * state can be isomorphic to `recoveredCtx()` (the earlier `perm.missing` case reused the
 * recovered context verbatim, which made its「可达 next」reading vacuous):
 *   · `llm.unconfigured` → `risk ∋ llmBlocked`（key-store 为空）∧ site authorized;
 *   · `perm.missing`     → `risk ∋ permBlocked`（可选能力授权态缺项）∧ site authorized.
 */
export function blockedStateCtx(blocked) {
  switch (blocked) {
    case 'site.unauthorized':
      return s2Ctx({ site: { authorized: false, trust: 'untrusted' } });
    case 'binding.stale':
      return s2Ctx({ risk: ['hardFloor'], site: { authorized: true, trust: 'trusted' } });
    case 'ref.all-invalid':
      return s2Ctx({ ref: { validCount: 0, staleCount: 1 }, site: { authorized: true, trust: 'trusted' } });
    case 'llm.unconfigured':
      // 站点已授权 ∧ 探测稳态 ∧ key-store 为空 ⇒ 恰好命中 op-driven 的 llm 修复 provider
      // （site / probe 两个先注册的触发不成立，避免把恢复卡抢走）。
      return s2Ctx({
        risk: [S2_BLOCKED_RISK['llm.unconfigured']],
        site: { authorized: true, trust: 'trusted' },
        probe: { phase: 'ready', steady: true },
      });
    case 'perm.missing':
      return s2Ctx({ risk: [S2_BLOCKED_RISK['perm.missing']], site: { authorized: true, trust: 'trusted' }, probe: { phase: 'ready', steady: true } });
    default:
      throw new Error(`s2-chain: unknown blocked state ${blocked}`);
  }
}

/** The state after the authorization chain completed (the ⑨/⑩ beats). */
export function recoveredCtx() {
  return s2Ctx({ site: { authorized: true, trust: 'trusted' }, probe: { phase: 'ready', steady: true } });
}

/**
 * Judge one state: the chips the producers yield, and whether each chip is **reachable**
 * (its `act` maps to a registered op — that is what produces `[data-act][data-op]`).
 *
 * Returns `{ chips, unreachable, nextChipCount }`; `unreachable > 0` or `chips == 0` is a
 * dead end (a blocked state with no actionable next is exactly 法七's forbidden shape).
 */
/** The chip's authoritative opId: the act→opId table, or the act itself when op-direct. */
export function chipOpId(deps, act) {
  if (deps.opIds.includes(act)) return act; // op-direct（`op.llm-config` / `op.perm.request`）
  return deps.actToOp[act] ?? null;
}

export function judgeState(deps, ctx) {
  const cards = deps.candidates(ctx);
  const card = cards[0];
  const chips = card ? card.chips : [];
  const rows = chips.map((c) => ({ text: c.text, act: c.act, opId: chipOpId(deps, c.act) }));
  const unreachable = rows.filter((c) => !c.opId);
  return {
    rule: card ? card.rule : null,
    chips: rows,
    unreachable: unreachable.map((c) => c.text),
    // An **actionable** chip: a turn (`act === 'next'`) or an op-direct repair chip
    // (its act IS a registered op) — the two shapes that render `[data-op]` and dispatch.
    nextChipCount: rows.filter((c) => c.act === 'next' || c.act === c.opId).length,
    deadEnd: chips.length === 0 || unreachable.length > 0,
  };
}

/**
 * The **death-end count** over a set of states: 0 means every blocked beat reached an
 * actionable next. Used by the node judge and (from v5-3) by the guard gate.
 */
export function judgeStates(deps, states) {
  const readings = states.map(({ id, ctx }) => {
    const verdict = judgeState(deps, ctx);
    return { id, ...verdict };
  });
  return { readings, deadEnds: readings.filter((r) => r.deadEnd).length };
}

/** The 5 states the chain's ④/⑤ beats must cover, plus the recovered ⑩ beat. */
export function s2JudgedStates() {
  return [...S2_BLOCKED_STATES.map((b) => ({ id: b, ctx: blockedStateCtx(b) })), { id: 'recovered', ctx: recoveredCtx() }];
}

/** The `next`-act chip predicate a renderer needs to mint `[data-act="next"][data-op]`. */
export function nextChipsOf(readings) {
  const out = [];
  for (const r of readings) for (const c of r.chips) if (c.act === 'next' && c.opId) out.push({ id: r.id, opId: c.opId });
  return out;
}

/**
 * Every chip with a **resolved opId** (the act→opId table, or the act itself when
 * op-direct) — the per-class「该阻塞态给出的是哪个可执行 op」读数的取材面。
 */
export function repairChipsOf(readings) {
  const out = [];
  for (const r of readings) for (const c of r.chips) if (c.opId) out.push({ id: r.id, act: c.act, opId: c.opId });
  return out;
}
