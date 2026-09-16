/**
 * V3-4 (ADR-V3-030) — the on-demand pick layer's message face.
 *
 * ── Why this is NOT part of `background/messaging.ts` ────────────────────────
 *
 * `messaging.ts` is imported by `src/content/content-script.ts`, and everything
 * reachable from there is bundled into `dist/content.js`, whose ceiling is
 * `CONTENT_MAX_BYTES = 177,076 B` **with no tolerance and zero headroom**. Adding
 * the six kind strings to `KIND_SET` measured **+307 B** on `content.js` — a red-line
 * breach. The pick layer is a separate artifact precisely so that it cannot grow the
 * frozen one, so its protocol lives here and is imported only by
 * `background/service-worker.ts` (and the tests). `content.js` never sees it.
 *
 * The precedent is the v2-3 `command-policy` family, which is deliberately kept out
 * of `KIND_SET` for the same reason and validated by `insight-protocol.ts`.
 *
 * ── The six kinds ────────────────────────────────────────────────────────────
 *
 *   panel → SW → layer : `pick-layer-inject` · `pick-layer-teardown` · `ref-highlight`
 *   layer → panel/SW   : `pick-layer-state` · `ref-captured`
 *   SW → layer         : `pick-layer-env`   (the declaration hash/version facts)
 *
 * I-06 (review R1): `pick-layer-env` reaches the layer from **two** triggers that must
 * not drift —
 *   ① the service worker right after an `executeScript` load (`pick-layer-inject`),
 *      which is where the layer normally learns its four fields (`origin` /
 *      `declarationHash` / `declarationVersion` / `authorized`);
 *   ② the panel's「拾取入口」re-push. That one used to have **no SW route** (it fell
 *      through to「未知消息类型」and its reply was discarded) and a *different* field
 *      vocabulary (`activeOrigin` / `declaration` vs the layer's). It is now routed
 *      (`service-worker.ts#pick-layer-env`) and the facts are re-derived there with
 *      `declarationEnv()` — so the declaration facts still have exactly **one**
 *      source, and the only shape travelling down is the one the layer's `accept()`
 *      reads (a missing declaration stays `declarationHash: ''`, fail-closed).
 *
 * @module content/pick-protocol
 */

/** Every kind the pick layer's face uses (frozen order — the gate asserts the set). */
export const PICK_LAYER_KINDS = Object.freeze([
  'pick-layer-inject',
  'pick-layer-teardown',
  'pick-layer-env',
  'pick-layer-state',
  'ref-captured',
  'ref-highlight',
] as const);

export type PickLayerKind = (typeof PICK_LAYER_KINDS)[number];

const PICK_LAYER_KIND_SET: ReadonlySet<string> = new Set<string>(PICK_LAYER_KINDS);

/**
 * Validate one raw message against the pick-layer face. Used by the service worker's
 * routing gate next to `isPluginMessage` / `isInsightMessage`; a message that is not
 * ours is ignored (never answered), exactly like the v1 gate.
 */
export function isPickLayerMessage(v: unknown): v is { kind: PickLayerKind; [k: string]: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const kind = (v as { kind?: unknown }).kind;
  return typeof kind === 'string' && PICK_LAYER_KIND_SET.has(kind);
}
