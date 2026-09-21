/**
 * V5-2 **TASK-V5-123~128 / 133 / 137** (ADR-V5-002 §1 · ADR-V5-003 §2/§3 ·
 * FR-ALLN-040~048 / 055 / 059 · AC-ALLN-007 / 010) — the **nine op executors**.
 *
 * ── One table, one pipeline, zero side paths ─────────────────────────────────
 *
 * Every op is a {@link NextOp} row of {@link OPS_BY_ID}. The rows are **derived from
 * `shared/op-table.ts`** (single source: the `layer` comes from the descriptor, never
 * from a second literal), and the body of a **panel-local** op is a thin call into the
 * *existing* single production entry, bound by `sidepanel.ts` through
 * {@link bindPanelOps} — no op ever grows a second path to its behaviour
 * (FR-ALLN-059 / R-ALLN-012).
 *
 * ── The seams the panel owns ────────────────────────────────────────────────
 *
 *   ① {@link bindPanelOps} — the op-slot → single entry table (`turn` ⇒ `requestTurn`,
 *      `rebind` ⇒ `rebindCurrentTab`, `help` ⇒ `openSettingsSection`, …) plus the
 *      stream row writer (`notice`) and the live recommendation context (`ctx`).
 *   ② the `params` / `consent` collectors — the pipeline asks them to insert the
 *      stream card and to wait for the user; the panel owns the card mechanism.
 *
 * ── The privileged two (FR-ALLN-066) ────────────────────────────────────────
 *
 * `op.authorize` / `op.perm.request` are `layer: 'sw'`: the pipeline never calls
 * their `execute` — it routes them through {@link bindSwExecutor} (the two-stage
 * handshake with the service worker, ADR-V5-003 §3), which is also where the Chrome
 * gesture boundary is respected (the request itself stays in the **page**).
 *
 * ── `op.turn` is the ONLY `requestTurn` caller (N22 / N25) ──────────────────
 *
 * This file contains exactly one `requestTurn(` — in the `turn` op slot. Every other
 * op is a local, zero-turn action; `test/op-wiring.test.ts` recomputes that count from
 * the source (and the reverse proof flips it).
 *
 * ── Why the rows are tuples (byte budget) ───────────────────────────────────
 *
 * The nine rows are encoded as positional tuples and expanded by {@link buildOp}: a
 * named-property object literal costs ~10 B of formatting per field in the unminified
 * bundle, and `sidepanel.js` carries a hard leaf budget (ADR-V5-011 §1 #4). The tuple
 * shape is documented once (below) and every row is commented.
 *
 * @module ui/sidepanel/next-registry/ops
 */
import { PROVIDERS } from '../../../llm/providers.js';
import { OP_DESCRIPTORS, type OpDescriptor } from '../../../shared/op-table.js';
import type { AskSpec, ConsentSpec, NextCtx, NextOp, OpCtx, OpOutcome, ReceiptSpec } from './definition.js';
import type { OpSnapshot } from './pipeline.js';
import { resolveOrder } from './registry.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. The panel seam (the op-slot → single production entry table)
 * ──────────────────────────────────────────────────────────────────────────── */

/** The panel's op hooks. A missing hook is a *loud* pipeline failure (never silent). */
export interface PanelOps {
  /** `op.turn` — the ONE turn-issuing entry (composer submit shares it). */
  turn?(text: string): void;
  /** `op.pick` — the existing pick entry (`pickInput.requestPick`). */
  pick?(): void;
  /** `op.describe` — the existing `submitDescribe` (value) / ask-fallback (no value). */
  describe?(value?: string): void;
  /**
   * `op.authorize` — the existing `authorizeCurrentSite` gesture entry. It performs
   * the **two-stage handshake** (probe → page gesture → commit) and reports the typed
   * outcome, so the one gesture entry is also the privileged op's panel half.
   */
  authorize?(): void | Promise<OpOutcome>;
  /** `op.rebind` — the existing `rebindCurrentTab` entry. */
  rebind?(): void;
  /** `op.help` — the existing settings「帮助」section navigation. */
  help?(): void;
  /** `op.llm-config` — the existing LLM test-connection + masked save entry (`raw` = a
   * settings-surface JSON payload when the settings form drives the same op). */
  llmConfig?(raw?: string): void | Promise<OpOutcome>;
  /**
   * `op.revoke` — the existing revoke entry (v5-2 R2 fills the three-table form).
   * Returns the typed outcome so the pipeline can report a reachable next on failure.
   */
  revoke?(target?: string): void | Promise<OpOutcome>;
  /**
   * V5-2 TASK-V5-139 — `op.perm.request`'s panel half: validate the selected ids against
   * the registry, run the two-stage handshake and record **both** outcomes (grant / deny).
   * `swExec` delegates here (the gesture must stay in the page).
   */
  permRequest?(ids: readonly string[]): void | Promise<OpOutcome>;
  /**
   * V5-2 TASK-V5-142 — the **three-table** snapshot / whole rollback seam
   * (authorization / permission / credential). `undefined` ⇒ the empty snapshot (a
   * read-only op needs none), never a silent single-table rollback.
   */
  snapshotTables?(op: NextOp): Promise<OpSnapshot> | OpSnapshot;
  restoreTables?(snap: OpSnapshot): Promise<void> | void;
  /** The ONE stream row writer (the receipt / notice channel). */
  notice?(text: string): void;
  /** The live recommendation context (the 7 truth sources `op.help` derives from). */
  ctx?(): NextCtx | null;
  /** The op `params` collector (stream ask card → answer); `REJECTED` ⇒ cancelled. */
  collectParams?(op: NextOp, ctx: OpCtx): Promise<unknown>;
  /** The op `consent` collector (stream auth card → allow/reject). */
  collectConsent?(op: NextOp, ctx: OpCtx): Promise<'allow' | 'reject'>;
  /**
   * V5-2 TASK-V5-143 (FR-ALLN-014 · EC-ALLN-005/006) — the **reachable next** seam:
   * after a consent refusal / a denied permission / a cancelled ask the panel mints its
   * recovery card (the live recommendation), so「拒绝」固化事实之后仍有可走的一步
   * (法七不破: the refusal is a trace, not a dead end).
   */
  reachableNext?(op: NextOp, state: 'cancelled' | 'rejected' | 'failed'): void;
}

let PANEL: PanelOps = {};
export function bindPanelOps(ops: PanelOps): void {
  PANEL = ops;
}
/** Write one stream row through the ONE system channel (used by the pipeline settle). */
export function panelNotice(text: string): void {
  PANEL.notice?.(text);
}

/** V5-2 TASK-V5-143 — mint the reachable recovery card after a refusal / failure. */
export function panelReachableNext(op: NextOp, state: 'cancelled' | 'rejected' | 'failed'): void {
  PANEL.reachableNext?.(op, state);
}

/** V5-2 TASK-V5-142 — the panel's **three-table** snapshot (absent ⇒ empty snapshot). */
export async function panelSnapshot(op: NextOp): Promise<OpSnapshot> {
  return PANEL.snapshotTables ? await PANEL.snapshotTables(op) : { tables: [] };
}
/** V5-2 TASK-V5-142 — the whole-snapshot rollback (never a per-table one). */
export async function panelRestore(snap: OpSnapshot): Promise<void> {
  if (PANEL.restoreTables) await PANEL.restoreTables(snap);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. The privileged-op seam (the two-stage handshake with the SW)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The privileged-op executor (ADR-V5-003 §3 · FR-ALLN-065/066).
 *
 * Chrome requires the permission request to happen inside a **page gesture**, so the
 * panel half of the handshake is the bound gesture entry itself — the SW is the
 * 裁决 / 快照 / 审计 owner and the page only supplies the gesture. The executor
 * therefore delegates to {@link PanelOps.authorize} and returns ITS typed outcome,
 * which is what makes「commit 未成功 ⇒ 无状态变更」observable to the pipeline.
 *
 * `op.perm.request`'s body lands with v5-2 R2 (TASK-V5-139); until then it is refused
 * **loudly** — never a silent success.
 */
export async function swExec(op: NextOp, ctx: OpCtx): Promise<OpOutcome> {
  if (op.opId === 'op.authorize' && PANEL.authorize) {
    return (await PANEL.authorize()) ?? { ok: true };
  }
  // V5-2 TASK-V5-139: the privileged permission request — the selected capability ids
  // arrive as the ONE comma-joined params value (the card's own submit shape).
  if (op.opId === 'op.perm.request' && PANEL.permRequest) {
    const ids = String(ctx.value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ids.length === 0) return { ok: false, reason: 'perm-empty-selection' };
    return (await PANEL.permRequest(ids)) ?? { ok: true };
  }
  return { ok: false, reason: `sw-exec-pending:${op.opId}` };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. The op implementations (five elements each)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * V5-2 TASK-V5-141 (FR-ALLN-044 · AC-ALLN-007/011) — the revoke **targets**.
 *
 * `REVOKE_CARD_TARGETS` is the user-facing three the confirmation card offers (站点授权 /
 * 浏览器权限 / LLM 凭据); {@link REVOKE_TARGETS} additionally carries `auto-auth`, the
 * internal delegation value `settings/ops.ts#clearAutoAuth` passes (ADR-V5-005 §1) — one
 * execute body, two callers, **no second execution path**.
 */
export const REVOKE_CARD_TARGETS: readonly string[] = Object.freeze(['site-auth', 'permission', 'credential']);
export const REVOKE_TARGETS: readonly string[] = Object.freeze([...REVOKE_CARD_TARGETS, 'auto-auth']);
/** Whether a revoke target is one the ONE execute body understands. */
export function isRevokeTarget(target: string | undefined): boolean {
  return target !== undefined && REVOKE_TARGETS.includes(target);
}

/** One ask of a multi-parameter op (the `NextOp.params` field stays the *first* one). */
export interface OpParamSpec {
  readonly kind: 'choice' | 'text' | 'secret' | 'form';
  readonly prompt: string;
  /** `choice` / `form` option pool (a `choice` provider list is derived from PROVIDERS). */
  readonly options?: readonly string[];
}

/**
 * The ordered parameter sequence per op (ADR-V5-002 §1 四态 · FR-ALLN-042/043).
 *
 * `NextOp.params` can only name ONE ask, so the *sequence* lives here (an additive,
 * side-local declaration — the v5-1 interface is NOT extended, per the leaf
 * independence rule). The collector walks it in order, which is what makes
 * 「choice → text → secret 顺序可判」a machine-checkable fact.
 */
const PARAM_ROWS: readonly (readonly [string, readonly OpParamSpec[]])[] = [
  [
    'op.llm-config',
    [
      { kind: 'choice', prompt: '选择 LLM 厂商', options: PROVIDERS.map((p) => p.id) },
      { kind: 'text', prompt: '模型名（选填）' },
      { kind: 'secret', prompt: 'API Key（仅写入本机 · 零明文）' },
    ],
  ],
  ['op.perm.request', [{ kind: 'form', prompt: '选择要申请的浏览器权限' }]],
  [
    'op.revoke',
    [
      {
        kind: 'choice',
        prompt: '撤销目标（高风险 · 不可逆）',
        options: [...REVOKE_CARD_TARGETS],
      },
    ],
  ],
];
export const OP_PARAM_SEQUENCE: Readonly<Record<string, readonly OpParamSpec[]>> = Object.freeze(
  Object.fromEntries(PARAM_ROWS),
);

/**
 * V5-2 **TASK-V5-145** (ADR-V5-005 §4 · R-V5-109) — the receipt text of one outcome, from
 * the **one** op table. The pipeline's settle and the settings delegation both call it, so
 * the two entries can never disagree on the copy (同源构造：same opId / same caliber).
 */
export function opReceiptText(opId: string, out: OpOutcome): string {
  if (out.ok) return OPS_BY_ID[opId]?.receipt?.text ?? `✓ ${opId} 已完成`;
  // 失败文案必须可读且**不假成功**（如实说明未生效 / 可重试）—— 两个入口共用本构造。
  return `✖ ${opId} 失败（未生效：${out.reason ?? '未知原因'}）；可重试`;
}

/** `[risk, params, consent, receiptText, run]` — see the module note. */
type ImplRow = readonly [
  NextOp['risk'],
  AskSpec | null,
  ConsentSpec | null,
  string | null,
  ((ctx: OpCtx) => void) | null,
];

/** The nine implementations, keyed by opId (per-row contract notes above). */
/**
 * Row-by-row contract notes (kept above the literal: a comment INSIDE an object
 * literal survives into the bundle, and `sidepanel.js` carries a hard leaf budget):
 *
 *   op.turn      FR-ALLN-048 — the chip's own text IS the instruction (the ONE requestTurn).
 *   op.pick      FR-ALLN-045 — the chip opens the pick state; a page click is the input.
 *   op.describe  FR-ALLN-046 — the description is a `text` ask (collected by the panel).
 *   op.rebind    FR-ALLN-041 — idempotent re-read of the bound tab; never `pending`-gated.
 *   op.help      FR-ALLN-047 — the list is DERIVED from `when(ctx)` via `reachableOpIds`.
 *   op.authorize FR-ALLN-040 — consent mandatory; SW = 裁决 / 快照 / 审计 owner (handshake).
 *   op.llm-config FR-ALLN-042 — mid risk; consent + the masked `secret` step.
 *   op.perm.request FR-ALLN-043 — the browser-permission `form` (pool = OPTIONAL_CAPABILITIES).
 *   op.revoke    FR-ALLN-044 — high risk / irreversible; a confirmation card is mandatory.
 *
 * A declared `params` would make the pipeline insert a stream ask card, so every op whose
 * input comes from the chip itself (`op.turn` / `op.pick` / `op.rebind` / `op.help`) keeps
 * `params: null` — turning a one-click local action into a two-step one is exactly the
 * regression FR-ALLN-059 forbids.
 */
const IMPL: Readonly<Record<string, ImplRow>> = Object.freeze({
  'op.turn': ['low', null, null, null, (c) => PANEL.turn?.(String(c.value ?? ''))],
  'op.pick': ['low', null, null, null, () => PANEL.pick?.()],
  'op.describe': ['low', null, null, null, (c) => PANEL.describe?.(c.value)],
  'op.rebind': ['low', null, null, null, () => PANEL.rebind?.()],
  'op.help': [
    'low',
    null,
    null,
    null,
    () => {
      const ctx = PANEL.ctx?.() ?? null;
      const ids = ctx ? reachableOpIds(ctx) : [];
      if (ids.length > 0) PANEL.notice?.(`可用操作（${ids.length}）：${ids.join('、')}`);
      PANEL.help?.();
    },
  ],
  'op.authorize': ['low', null, { prompt: '授权当前站点（可随时撤销）' }, '✓ 授权已生效', null],
  'op.llm-config': [
    'mid',
    { prompt: '选择 LLM 厂商', kind: 'choice' },
    { prompt: '写入本机凭据（掩码 · 零明文）' },
    '✓ 已配置 LLM（掩码 · 零明文）',
    () => PANEL.llmConfig?.(),
  ],
  'op.perm.request': [
    'mid',
    { prompt: '选择要申请的浏览器权限', kind: 'form' },
    // FR-ALLN-043: the consent copy must state the honest removal caliber — the revoke
    // of a granted browser permission always needs the user's own confirmation in Chrome.
    { prompt: '申请浏览器权限（浏览器会弹出确认；回收也须你在浏览器确认，插件不做静默回收）' },
    '✓ 已处理浏览器权限申请（浏览器侧确认后生效）',
    null,
  ],
  'op.revoke': [
    'high',
    // V5-2 TASK-V5-141: the three user-facing targets (the settings delegation may also
    // pass `auto-auth` internally — see REVOKE_TARGETS).
    { prompt: '选择撤销目标（不可逆）', kind: 'choice' },
    // FR-ALLN-044: the confirmation card must carry the irreversibility itself.
    { prompt: '撤销不可逆：站点授权 / 浏览器权限 / LLM 凭据一旦撤销不能自动恢复（浏览器权限的回收须你在浏览器确认）' },
    '✓ 已撤销（不可逆）· 审计入口：审计视图',
    (c) => PANEL.revoke?.(c.value),
  ],
});

const OK: OpOutcome = Object.freeze({ ok: true });
const SW_LAYER_REFUSAL = (id: string): OpOutcome => ({ ok: false, reason: `sw-layer:${id}` });

/** Expand one tuple row into a frozen {@link NextOp} (the layer is the descriptor's). */
function buildOp(d: OpDescriptor, row: ImplRow): NextOp {
  const [risk, params, consent, receipt, run] = row;
  return Object.freeze({
    opId: d.id,
    risk,
    layer: d.layer,
    ...(params ? { params } : {}),
    ...(consent ? { consent } : {}),
    ...(receipt ? { receipt: { text: receipt } } : {}),
    execute: async (ctx: OpCtx) => (d.layer === 'sw' ? SW_LAYER_REFUSAL(d.id) : (run?.(ctx), OK)),
  });
}

/**
 * The **one** op table: nine rows derived from `OP_DESCRIPTORS` (a descriptor without
 * an implementation is a loud module-load failure — never a silently missing op).
 */
export const OPS_BY_ID: Readonly<Record<string, NextOp>> = Object.freeze(
  Object.fromEntries(
    OP_DESCRIPTORS.map((d) => {
      const row = IMPL[d.id];
      if (!row) throw new Error(`op-impl-missing:${d.id}`);
      return [d.id, buildOp(d, row)];
    }),
  ),
);

/* ────────────────────────────────────────────────────────────────────────────
 * 4. `op.help`'s derivation (FR-ALLN-047: 由 `when(ctx)` 派生, 禁硬编码)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The reachable op ids for a context = the **union of the chips** of every registered
 * provider whose `when(ctx)` holds. Derived on every call (never a literal list), so
 * 「候选列表硬编码」(R-V5-104) cannot happen without the gate failing.
 */
export function reachableOpIds(ctx: NextCtx): readonly string[] {
  const ids = new Set<string>();
  for (const p of resolveOrder()) {
    if (!p.when(ctx)) continue;
    for (const chip of p.chips) ids.add(chip);
  }
  return Object.freeze([...ids]);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. The collector seam the pipeline calls (production defaults)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Production `params` collector: delegates to the panel (no panel ⇒ skip the state). */
export async function collectOpParams(op: NextOp, ctx: OpCtx): Promise<unknown> {
  return PANEL.collectParams ? PANEL.collectParams(op, ctx) : undefined;
}
/** Production `consent` collector: delegates to the panel (no panel ⇒ fail-closed allow). */
export async function collectOpConsent(op: NextOp, ctx: OpCtx): Promise<'allow' | 'reject'> {
  return PANEL.collectConsent ? PANEL.collectConsent(op, ctx) : 'allow';
}

/** Re-exported so `pipeline.ts` keeps one import site for the op layer (v5-1 shape). */
export type { ReceiptSpec };
