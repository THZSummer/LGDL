/**
 * V5-2 **TASK-V5-130** (ADR-V5-003 §1 · FR-ALLN-067 / 111 · **X2** · N8 · R-ALLN-002) —
 * the `op-*` message family's **runtime validator**.
 *
 * ── Why this module exists (and why the kinds are NOT in `KIND_SET`) ─────────
 *
 * `background/messaging.ts#KIND_SET` is imported by `src/content/content-script.ts`,
 * so every string in it is bundled into `dist/content.js` — whose ceiling is
 * **177,076 B with zero headroom** (adding six strings measured **+307 B**, a red-line
 * breach). The `op-*` family therefore follows the three existing precedents
 * (`command-policy` / `pick-layer-*` / `ref-rescue`): the kinds appear **only in the
 * `PluginMessageKind` union as TS type members** (zero runtime bytes), and the runtime
 * validation lives here — a background-only module that `content.js` never imports.
 *
 * ── The family (ADR-V5-003 §1 / §3) ─────────────────────────────────────────
 *
 *   `op-exec`         panel → SW : one handshake phase (`probe` / `commit`)
 *   `op-exec-result`  the reply envelope's kind (a push uses the same shape)
 *   `op-audit`        SW → audit face: the executor's裁决 record notice
 *
 * `isOpMessage` is the **only** runtime check of this family (a second one would be
 * the drift seam the gate scans for); the payload fields are validated by
 * {@link opExecRequestProblems}, which is loud about a malformed handshake rather than
 * silently defaulting (the consent / gesture facts decide whether a permission is
 * granted, so a defaulted field is a security bug, not a convenience).
 *
 * @module background/op-protocol
 */
import type { PluginMessage, PluginMessageKind } from './messaging.js';

/**
 * The `op-*` kinds. **Type-only membership**: they are deliberately absent from
 * `KIND_SET` (`messaging.ts`) — see the module note.
 */
export const OP_MESSAGE_KINDS: readonly PluginMessageKind[] = Object.freeze([
  'op-exec',
  'op-exec-result',
  'op-audit',
]);

const OP_KIND_SET: ReadonlySet<string> = new Set<string>(OP_MESSAGE_KINDS);

/** Whether a raw message belongs to the `op-*` family (the SW routing gate's half). */
export function isOpMessage(v: unknown): v is PluginMessage {
  if (typeof v !== 'object' || v === null) return false;
  const kind = (v as { kind?: unknown }).kind;
  return typeof kind === 'string' && OP_KIND_SET.has(kind);
}

/** The two handshake phases (ADR-V5-003 §3 ② / ④). */
export const OP_EXEC_PHASES = Object.freeze(['probe', 'commit'] as const);
export type OpExecPhase = (typeof OP_EXEC_PHASES)[number];

/** The gesture outcome the panel reports back after the **page-side** request. */
export interface OpGestureResult {
  readonly granted: boolean;
  readonly pattern?: string;
  readonly reason?: string;
}

/** One `op-exec` request (panel → SW). */
export interface OpExecRequest {
  readonly kind: 'op-exec';
  readonly opId: string;
  readonly phase: OpExecPhase;
  /** The origin the op targets; omitted ⇒ the SW uses the bound tab's origin. */
  readonly origin?: string;
  /** The consent card's id — the SW refuses a handshake without one (no consent ⇒ no op). */
  readonly consentToken?: string;
  /** Present on the `commit` phase only. */
  readonly gestureResult?: OpGestureResult;
  /**
   * V5-2 TASK-V5-139 (`op.perm.request` only) — the ONE capability the gesture
   * targets. Its value must be a **registered** capability id (the SW refuses an
   * unregistered one: 「新增项必须在册」, ADR-V5-004 §2). Zero runtime bytes for the
   * content bundle (type-only membership, like the `op-*` kinds themselves).
   */
  readonly permission?: string;
}

/**
 * The payload judge. Returns the readable problems (empty ⇒ acceptable); the SW
 * answers a non-empty verdict with a refusal response and **no** state change.
 */
export function opExecRequestProblems(value: unknown): string[] {
  if (!isOpMessage(value)) return ['op-exec: 不是 op-* 消息'];
  const m = value as Record<string, unknown>;
  if (m.kind !== 'op-exec') return [`op-exec: kind 必须是 op-exec（收到 ${String(m.kind)}）`];
  const problems: string[] = [];
  if (typeof m.opId !== 'string' || m.opId.length === 0) problems.push('op-exec: opId 必须是非空字符串');
  if (!(OP_EXEC_PHASES as readonly string[]).includes(String(m.phase))) {
    problems.push(`op-exec: phase 必须是 probe / commit（收到 ${String(m.phase)}）`);
  }
  if (typeof m.consentToken !== 'string' || m.consentToken.length === 0) {
    problems.push('op-exec: consentToken 必须存在（无 consent 不得执行特权 op）');
  }
  if (m.origin !== undefined && (typeof m.origin !== 'string' || m.origin.length === 0)) {
    problems.push('op-exec: origin 若给必须是非空字符串');
  }
  if (m.permission !== undefined && (typeof m.permission !== 'string' || m.permission.length === 0)) {
    problems.push('op-exec: permission 若给必须是非空字符串（在册能力 id）');
  }
  if (m.phase === 'commit') {
    const g = m.gestureResult as OpGestureResult | undefined;
    if (!g || typeof g !== 'object' || typeof g.granted !== 'boolean') {
      problems.push('op-exec: commit 阶段必须携带 gestureResult.granted 布尔事实');
    }
  }
  return problems;
}

/** The `op-exec-result` reply shape (the same envelope for both phases). */
export interface OpExecResult {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

/** A non-throwing `PluginMessage` view of a validated `op-exec` request. */
export function asOpExecRequest(value: unknown): (OpExecRequest & PluginMessage) | null {
  return opExecRequestProblems(value).length === 0 ? (value as OpExecRequest & PluginMessage) : null;
}
