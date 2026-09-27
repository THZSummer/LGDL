/**
 * NDA-1 **TASK-NDA-102**（ADR-NDA-001 §①~④ · FR-NDA-010/011/012/013/014 ·
 * AC-NDA-002）—— the **`next` tool** (pure-protocol, function-calling channel).
 *
 * ── What this module is (and is NOT) ─────────────────────────────────────────
 *
 * This is the ONE place the `next` tool is declared: its name, its candidate
 * ceiling and its function-calling schema. The schema is a **soft constraint**
 * for the model — the authoritative gate is the runtime 5-step validation chain
 * (`background/ai-next.ts#admitCandidate`, unchanged), which runs over the raw
 * arguments captured by `hooks.intercept` (ADR-NDA-002). A schema-legal call
 * with an out-of-range `params` is still refused at runtime (`FR-NDA-012`).
 *
 * ── Pure protocol tool (FR-NDA-014 / NG-NDA-012 / R-NDA-905) ─────────────────
 *
 * The tool has **no execution body** on the normal path: `hooks.intercept`
 * captures the call and returns a synthetic `ToolResult`, short-circuiting the
 * real `dispatch` (`runner.ts`). The `executor` below is therefore a
 * **fail-closed defence** for the "bypass the seam" path only — it returns a
 * readable refusal and never touches a page / network / clock.
 *
 * ── Zero new carrier / single source (NFR-NDA-007 / NFR-NDA-013) ─────────────
 *
 * · `enum` is **derived** from `OP_IDS` (minus the `gesture` tier) — never a
 *   second hand-written list (the gate recomputes it item by item);
 * · `maxItems === NEXT_TOOL_MAX_CANDIDATES` is asserted equal to
 *   `MAX_CHIPS_PER_CARD` by the gate — the two layers are NOT cross-imported
 *   (`recommend.ts` is a panel module; a SW-side tool definition must not depend
 *   on it — the `sw-op-mirror` "agree via gate" precedent);
 * · `params: {type:'string'}` matches the runtime `AiNextCandidate.params: string`
 *   (`definition.ts`), correcting the spec's `{type:'object'}` literal
 *   (`COR-NDA-7` / `PD-NDA-012`).
 *
 * ── Module purity ────────────────────────────────────────────────────────────
 *
 * Zero `chrome` / DOM / IO / clock: the module is a plain data + factory module.
 *
 * @module tools/next-tool
 */
import type { ToolEntry, ToolFunctionDef, ToolResult } from '@lgdl/web-cli-base';

import { OP_IDS, opDescriptor, tierOf } from '../shared/op-table.js';

/** Flat, dot-free LLM function name (`^[a-zA-Z0-9_-]+$`). */
export const NEXT_TOOL_NAME = 'next';

/** Candidate ceiling (`maxItems`) — gate-asserted equal to `MAX_CHIPS_PER_CARD`. */
export const NEXT_TOOL_MAX_CANDIDATES = 3;

/** Help-group key (plugin-level protocol tool — not a site/business tool). */
export const NEXT_TOOL_GROUP = 'plugin';

/**
 * The synthetic `ToolResult.output` for a captured call (ADR-NDA-002 §①) —
 * a **constant** string: zero echo of any candidate value (law 8 / zero-plaintext).
 */
export const NEXT_TOOL_ACK = '✓ next 候选已记录';

/** Readable fail-closed copy for a direct dispatch (the seam was bypassed). */
export const NEXT_TOOL_NOT_DISPATCHABLE_TEXT =
  '✖ next 只能由回合内 intercept 捕获（纯协议工具，无执行体），不走真实 dispatch。';

/**
 * The **derived** allowed `opId` set: `OP_IDS` minus the `gesture` tier.
 *
 * `gesture` ops (`op.authorize` / `op.perm.request`) are deliberately NOT in the
 * enum: the model must not be invited to propose a privileged op (a strictly
 * stronger fail-closed than the spec literal; the runtime tier check still
 * refuses them, so AC-NDA-004 is unaffected). Derived — never a second list.
 */
export const NEXT_TOOL_ALLOWED_OP_IDS: readonly string[] = Object.freeze(
  OP_IDS.filter((id) => {
    const d = opDescriptor(id);
    return d !== undefined && tierOf(d) !== 'gesture';
  }),
);

/**
 * `description` (FR-NDA-013): three constraint sentences, each on its own, plus
 * the empty-array fallback. **No markup** (`<` `>` backtick) / no CLI flag body /
 * no URL query — law 8 (zero-plaintext) is machine-checked via `assertNoPlaintext`.
 */
export const NEXT_TOOL_DESCRIPTION = [
  'Propose the next best step for the user.',
  'Call this tool EXACTLY ONCE at the very end of your final answer, after the answer is complete.',
  'The opId field MUST be one of the registered system actions listed in the enum; never invent an action.',
  'This tool performs NO page action, touches no network and returns nothing the user can see — it only records candidates.',
  'If you have no suggestion, still call it once with an empty candidates array.',
].join(' ');

/** The single-source `next` tool function-calling schema (see module header). */
export const NEXT_TOOL_SCHEMA: ToolFunctionDef = Object.freeze({
  name: NEXT_TOOL_NAME,
  description: NEXT_TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['candidates'],
    properties: {
      candidates: {
        type: 'array',
        minItems: 0,
        maxItems: NEXT_TOOL_MAX_CANDIDATES,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['opId', 'label'],
          properties: {
            opId: { type: 'string', enum: [...NEXT_TOOL_ALLOWED_OP_IDS] },
            label: { type: 'string' },
            ref: { type: 'string' },
            params: { type: 'string' },
          },
        },
      },
    },
  },
});

/**
 * Build the registry entry: `listed:false` (in `deriveTools()`, never in the
 * `web-cli-help` listing — it has no command line) + a fail-closed `executor`
 * that is never reached on the normal (seam-captured) path.
 */
export function createNextToolEntry(): ToolEntry {
  return {
    name: NEXT_TOOL_NAME,
    group: NEXT_TOOL_GROUP,
    listed: false,
    schema: NEXT_TOOL_SCHEMA,
    executor: (): ToolResult => ({
      ok: false,
      output: NEXT_TOOL_NOT_DISPATCHABLE_TEXT,
      error: 'next-not-dispatchable',
    }),
  };
}
