/**
 * V5-1 TASK-V5-101 (ADR-V5-001) — the NextProvider / NextOp **Definition**
 * (Seam 三件套之一). Pure TS: zero DOM, zero chrome, zero side effects — the
 * registry (Provider) and the dispatcher (Consumer) both build on this shape.
 *
 * @module ui/sidepanel/next-registry/definition
 */

/** R2 — the services a provider may declare a dependency on (`deps ⊆ NEXT_SERVICES`). */
export const NEXT_SERVICES = Object.freeze(['session', 'snapshot', 'credentials', 'permissions', 'siteRegistry', 'pageSide'] as const);
export type NextService = (typeof NEXT_SERVICES)[number];

/** R4 — the dispatch modes. */
export const NEXT_MODES = Object.freeze(['waterfall', 'emit'] as const);
export type NextMode = (typeof NEXT_MODES)[number];

/** R4 — the mount points of the one pipeline. */
export const NEXT_MOUNT_POINTS = Object.freeze(['next', 'params', 'consent', 'execute', 'receipt'] as const);
export type NextMountPoint = (typeof NEXT_MOUNT_POINTS)[number];

/** R4 — the mount-point × mode table (唯一权威): 4 waterfall + `receipt` emit. */
export const MOUNT_MODE: Readonly<Record<NextMountPoint, NextMode>> = Object.freeze({
  next: 'waterfall',
  params: 'waterfall',
  consent: 'waterfall',
  execute: 'waterfall',
  receipt: 'emit',
});

/**
 * FR-ALLN-010 / ADR-V5-009 — the blocked terminals (**恰 5 项**). This is the
 * **only** place the five literals may be written; every other site must derive.
 */
export const BLOCKED_TERMINALS = Object.freeze([
  'site.unauthorized',
  'llm.unconfigured',
  'perm.missing',
  'binding.stale',
  'ref.all-invalid',
] as const);
export type BlockedTerminal = (typeof BLOCKED_TERMINALS)[number];

/**
 * V5-3 review R1 **I-05** — each blocked terminal ↔ its **recovery trigger**, declared as an
 * **object keyed by the terminal itself** (never a positional array).
 *
 * The born recovery chips (`providers.ts#blockedRecovery`) used to read a magic array
 * (`['site','','','hardFloor','refInvalid'][BLOCKED_TERMINALS.indexOf(...)]`): any reorder
 * of `BLOCKED_TERMINALS` silently mis-paired the chips. Keying by the terminal removes the
 * positional coupling and makes the map **exhaustive at compile time** — the `satisfies`
 * check below fails if a terminal is added, removed or renamed (a missing / extra key is a
 * type error), so the pairing can no longer shift silently.
 *
 * `null` marks the two **op-driven** terminals (`llm.unconfigured` / `perm.missing`) whose
 * chips are the repairing op itself (`OPS_RECOVERY_ROWS`), not a trigger's act list.
 * The literals live here (the declaration site) so the single-source scan BT-1 stays green.
 */
export const BLOCKED_RECOVERY_TRIGGER = Object.freeze({
  'site.unauthorized': 'site',
  'llm.unconfigured': null,
  'perm.missing': null,
  'binding.stale': 'hardFloor',
  'ref.all-invalid': 'refInvalid',
} as const satisfies Readonly<Record<BlockedTerminal, string | null>>);

/**
 * The idle-state anti-flicker interval — a **re-export** of the ONE declaration in
 * `recommend.ts` (V5-1 validate R1 finding I-04: this module used to carry a second,
 * product-unreferenced copy of the literal `10_000`; two independent declarations of
 * one value is a drift seam this module must not own). Nothing in the bundle reads it
 * through this path, so the re-export tree-shakes to zero bytes.
 */
export { NEXTSTEP_MIN_INTERVAL_MS } from '../recommend.js';

/** The 7 allowed truth sources — the field set of {@link NextCtx} (逐字). */
export const NEXT_SOURCE_NAMES = Object.freeze(['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding'] as const);
export type NextSourceName = (typeof NEXT_SOURCE_NAMES)[number];

/* ────────────────────────────────────────────────────────────────────────────
 * F-36 / ADN-1 **TASK-ADN-102**（ADR-ADN-001 §② · ADR-ADN-002 §① · FR-ADN-011/012/015）
 * —— AI next 候选的**类型词汇**（**恰一处**声明；与 `NextCtx` 同居 ⇒ `recommend.ts`
 * 零新导入 ⇒ `recommendation-sources` 模块白名单恒 5）。
 *
 * 三条纪律：
 *   ① **type-only 词汇，∉ `KIND_SET`**：`AiNextCandidate` / `AiNextPayload` 是载荷字段的
 *      类型，不是消息 / 卡 kind ⇒ 不进 `KIND_SET`（40 逐字）、不做第 13 kind、不设宿主；
 *   ② **拒绝码闭集由 `PressBlocked` 派生**（`unknown-op` / `tier` 同字面）+ 2 新码
 *      （`ref` / `param`）+ 1 附加码（`label`，fail-closed 加法）⇒ 零第二词表；
 *   ③ **缺席 ⇒ 现状逐字**（N-ADN-029）：`aiNext` 不在场时面板 / 生产器行为一字不变。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 拒绝码闭集（**恰 5 枚**；`unknown-op` / `tier` 与 `PressBlocked` 同字面，见 ADR-ADN-002 §①）。 */
export const AI_NEXT_BLOCKED_CODES = Object.freeze(['unknown-op', 'tier', 'ref', 'param', 'label'] as const);
export type AiNextBlockedCode = (typeof AI_NEXT_BLOCKED_CODES)[number];

/**
 * 一条 AI next 候选（已过 5 道校验链）。`opId` 恒 ∈ `OP_IDS`（9 枚）；`label` 已净化 / 截断；
 * `ref` 是**本回合快照**里的 `refId`（或规范形 `ref_<n>`）；`params` 是**元数据**（本轮不派发）。
 */
export interface AiNextCandidate {
  readonly opId: string;
  readonly label: string;
  readonly ref?: string;
  readonly params?: string;
}

/** `chat-result` 的加法载荷字段（type-only；缺席 ⇒ 面板行为与现状逐字一致）。 */
export interface AiNextPayload {
  /** 已过 5 道校验链的候选（面板只消费它 ⇒ 面板侧零第二校验器）。 */
  readonly accepted: readonly AiNextCandidate[];
  /** 被拦原因码（闭集，零值 / 零明文）。 */
  readonly blocked: readonly AiNextBlockedCode[];
}

/** The pure input a `when(ctx)` predicate may read (exactly the 7 sources). */
export interface NextCtx {
  readonly ref: { readonly validCount: number; readonly staleCount: number; readonly latestRefNum?: number };
  readonly session: {
    readonly openAsks: number;
    readonly busy: boolean;
    /**
     * V5.5-1 **TASK-V55-106** (ADR-V55-001 §2.3 · FR-SELF-011/019) — the **加法字段组**.
     * 既有 7 键零改名 / 零删除；本字段组的来源 = **持久偏好 + 护栏状态**，属**既有
     * `session`** 服务面（登记于 `drivers.ts#CTX_FIELD_SERVICE`；未登记字段由注册校验
     * loud 拦截，EC-SELF-003）。可选：保持既有 ctx 构造点（面板 / 门禁 / 场景脚本）
     * 无需改动，填充留给主题② 的护栏落地。
     */
    readonly proactive?: { readonly enabled: boolean; readonly allowed: boolean };
    /**
     * F-36 / ADN-1 **TASK-ADN-102**（ADR-ADN-004 §① · FR-ADN-014/018）：**注入槽**（加法
     * 字段，**嵌套在既有 `session`** 之下 ⇒ 顶层仍恰 7 源；NR-0 保持绿）。由面板在
     * `chat-result{done}` 时喂入本回合候选；`ai-next` provider 的 `when` 读它 ⇒ 证据面同源
     * （`evidence=['session.aiNext']`）。缺席 ⇒ 现状逐字。
     */
    readonly aiNext?: readonly AiNextCandidate[];
  };
  readonly site: { readonly authorized: boolean; readonly trust?: 'trusted' | 'untrusted' };
  readonly catalog: { readonly toolCount: number; readonly subcommandCount: number };
  readonly probe: { readonly phase?: string; readonly steady: boolean };
  readonly risk: readonly string[];
  readonly onboarding: { readonly firstRun: boolean; readonly pendingSteps: readonly string[] };
}

export interface AskSpec {
  readonly prompt: string;
  readonly kind?: 'choice' | 'confirm' | 'text' | 'secret' | 'form';
}
export interface ConsentSpec {
  readonly prompt: string;
}
export interface ReceiptSpec {
  readonly text: string;
}

/** R1/R2/R3/R4/R5 — one registry row. */
export interface NextProvider {
  readonly id: string;
  readonly deps: readonly NextService[];
  readonly priority: 0 | 1 | 2 | 3;
  readonly prepend?: boolean;
  readonly mode: NextMode;
  readonly fail: 'card-boundary' | 'snapshot-rollback';
  when(ctx: NextCtx): boolean;
  /** The chips as **opId** list (the pipeline owns rendering / clicking). */
  readonly chips: readonly string[];
  /** Optional static/dynamic chip copy, positionally aligned with {@link NextProvider.chips}. */
  readonly textOf?: (ctx: NextCtx) => readonly string[];
  /**
   * F-36 / ADN-1 **TASK-ADN-102**（ADR-ADN-004 §② · FR-ADN-014/015）—— **动态 chip 的权威
   * 产出**（纯加法；在场 ⇒ 覆盖 `chips`；本轮仅 `ai-next` 使用）。既有 11 行 provider 无此
   * 字段 ⇒ 逐字同前；`chips` 仍**必填非空**（`validateNextProvider` 的 `empty-chips` 判据不删）。
   */
  readonly chipsFor?: (ctx: NextCtx) => readonly string[];
  /** F-36 / ADN-1 **TASK-ADN-102**——卡片标题覆盖（加法；缺席 ⇒ 逐字沿用 `NEXTSTEP_LABELS[rule]`）。 */
  readonly label?: string;
  /** The migrated rule id this provider belongs to (one candidate per rule). */
  readonly rule?: string;
  dispose?(): void;
}

/** The context handed to `op.execute()` by the pipeline (the caller's value slot). */
export interface OpCtx {
  readonly value?: string;
}
export interface OpOutcome {
  readonly ok: boolean;
  readonly reason?: string;
  /**
   * V5-2 review R1 **BLOCK-01** (ADR-V5-005 §1/§3) — the execute body's **own receipt
   * copy**. The body knows what it did (which provider / which capability / which
   * target), so the settings surfaces render THIS instead of a generic per-op sentence:
   * one body, one copy, both surfaces (settings panel + `options.html`) and the stream
   * settle all read the same string. Absent (a body that only reports `ok`) falls back to
   * the op table's declared receipt text.
   */
  readonly receipt?: { readonly kind?: string; readonly text: string };
}
/** FR-ALLN-055 — one op, mounted on the one pipeline. */
export interface NextOp {
  readonly opId: string;
  readonly risk: 'low' | 'mid' | 'high';
  readonly layer: 'panel' | 'sw';
  readonly params?: AskSpec;
  readonly consent?: ConsentSpec;
  execute(ctx: OpCtx): Promise<OpOutcome>;
  readonly receipt?: ReceiptSpec;
}
