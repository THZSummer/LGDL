/**
 * V3-2 TASK-202 / TASK-206 (ADR-V3-023 / FR-V3-071 / FR-V3-033) — the reference
 * state single source.
 *
 * ── Why a single source ─────────────────────────────────────────────────────
 *
 * FR-V3-071 requires **the same reference id** in four places: the page badge
 * (rendered by v3-4), the side-panel chip, the evidence row and the risk-rail
 * invalidation row. If each place minted its own ordinal, the four would drift
 * and the bidirectional highlight would point at the wrong element. There is
 * therefore exactly one generator ({@link createRefStore}); the page side never
 * generates an id — it reports facts and renders the ordinal it is told.
 *
 * Ids are **monotonic and never reused**: `ref_2` that went stale does not become
 * the id of a later, healthy reference. Reuse would make "the stale ②" and "the
 * live ②" indistinguishable in the risk rail and in the audit trail.
 *
 * ── Truncation caliber (V32-O-2, ADR-V3-023 decision 4) ──────────────────────
 *
 * `textDigest` is whitespace-stripped and truncated to **80** characters (plus a
 * trailing `…` when cut); `semanticPath` to **120**. There is deliberately **no
 * "show full text" control**: the evidence layer is a read-only projection, and
 * full text would re-open the zero-plaintext question for no decision value.
 *
 * Pure data: no DOM, no `chrome.*`, no clock (the caller injects `capturedAt`).
 *
 * @module l1/ref-store
 */
import { evaluateRefValidity } from './ref-validity.js';
import type { RefEnv, RefFacts, RefVerdict, RefVerdictView } from './ref-validity.js';

/** `textDigest` truncation length (V32-O-2, pinned). */
export const TEXT_DIGEST_MAX = 80;
/** `semanticPath` truncation length (V32-O-2, pinned). */
export const SEMANTIC_PATH_MAX = 120;

/** Whitespace-stripped truncation with a real ellipsis when it was cut. */
export function truncate(text: string, max: number): string {
  const flat = (text ?? '').replace(/\s+/g, '');
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** `ref_3` → `③` (the shared ordinal glyph; falls back to `#3` past `⑩`). */
export const GLYPHS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
export function ordinalGlyph(refId: string): string {
  const n = Number(/^ref_(\d+)$/.exec(refId)?.[1]);
  return Number.isFinite(n) && n >= 1 ? (GLYPHS[n - 1] ?? `#${n}`) : `#${refId}`;
}

/** One tracked reference: the raw facts plus the latest (re-judged) verdict. */
export interface RefRecord {
  facts: RefFacts;
  verdict: RefVerdict;
  dimension?: string;
  readableReason?: string;
  unknownCause?: string;
  /** `true` whenever the verdict is not `'valid'` — the chip's `aria-disabled`. */
  ariaDisabled: boolean;
  /** `true` once an explicit re-pick superseded it (kept on record, not active). */
  retired?: boolean;
  glyph: string;
}

/** Facts as reported by the caller (the id and the digests are minted here). */
export type RawRefFacts = Omit<RefFacts, 'refId' | 'textDigest' | 'semanticPath'> & {
  refId?: string;
  textDigest?: string;
  semanticPath?: string;
};

export interface RefStore {
  create(raw: RawRefFacts): RefRecord;
  all(): RefRecord[];
  get(refId: string): RefRecord | undefined;
  /** Re-judge every reference against `env` (never an incremental "still valid"). */
  judge(env: RefEnv): RefRecord[];
  /** References that are NOT usable right now — the risk rail's source. */
  stale(): RefRecord[];
  /**
   * Mark the currently unusable references as superseded by an explicit re-pick.
   * They stay in `all()` (ids are never reused, and the evidence rows keep showing
   * them with their readable reason) but they no longer raise the risk row — an
   * explicit recovery must be able to clear the warning, and removing the record
   * outright would be a silent drop (FR-V3-037).
   */
  retireUnusable(): void;
  /** Guarded action entry point: the ONLY way a reference drives a command. */
  dispatch(refId: string, env: RefEnv): { allowed: boolean; verdict: RefVerdict; reason: string };
  /** Monotonic counter of commands actually dispatched through a reference. */
  commandSends(): number;
  reset(): void;
}

function decorate(facts: RefFacts, view: RefVerdictView, retired: boolean): RefRecord {
  return {
    facts,
    verdict: view.verdict,
    ariaDisabled: view.verdict !== 'valid',
    ...(retired ? { retired: true } : {}),
    glyph: ordinalGlyph(facts.refId),
    ...(view.dimension ? { dimension: view.dimension } : {}),
    ...(view.readableReason ? { readableReason: view.readableReason } : {}),
    ...(view.unknownCause ? { unknownCause: view.unknownCause } : {}),
  };
}

/**
 * Build the store. `seq` only ever grows for the lifetime of the instance, so a
 * stale id is never handed out twice (even across `reset()` — a session switch
 * must not resurrect an invalidated ordinal).
 */
export function createRefStore(): RefStore {
  const records: RefRecord[] = [];
  const retired = new Set<string>();
  let seq = 0;
  let sends = 0;
  const find = (refId: string): RefRecord | undefined => records.find((r) => r.facts.refId === refId);
  return {
    create(raw) {
      seq += 1;
      const facts: RefFacts = {
        refId: `ref_${seq}`,
        selector: raw.selector ?? '',
        semanticPath: truncate(raw.semanticPath ?? '', SEMANTIC_PATH_MAX),
        textDigest: truncate(raw.textDigest ?? '', TEXT_DIGEST_MAX),
        origin: raw.origin ?? '',
        documentId: raw.documentId ?? '',
        navSeq: Number(raw.navSeq ?? Number.NaN),
        declarationHash: raw.declarationHash ?? '',
        ...(raw.declarationVersion !== undefined ? { declarationVersion: raw.declarationVersion } : {}),
        capturedAt: Number(raw.capturedAt ?? 0),
      };
      // A brand-new reference has not been judged against a real environment yet, so
      // it starts as `unknown` (fail-closed) and becomes usable only after a
      // `judge(env)` that can confirm every fact.
      const record = decorate(facts, evaluateRefValidity(facts, {}), false);
      records.push(record);
      return record;
    },
    all: () => [...records],
    get: find,
    judge(env) {
      for (let i = 0; i < records.length; i += 1) {
        records[i] = decorate(records[i].facts, evaluateRefValidity(records[i].facts, env), retired.has(records[i].facts.refId));
      }
      return [...records];
    },
    stale: () => records.filter((r) => r.verdict !== 'valid' && !r.retired),
    retireUnusable() {
      for (const r of records) if (r.verdict !== 'valid') retired.add(r.facts.refId);
    },
    dispatch(refId, env) {
      const index = records.findIndex((r) => r.facts.refId === refId);
      if (index < 0) return { allowed: false, verdict: 'unknown', reason: `引用 ${refId} 不存在（按失效处理）` };
      // The guard is the FIRST statement: nothing is sent before it (FR-V3-037).
      const view = evaluateRefValidity(records[index].facts, env);
      records[index] = decorate(records[index].facts, view, retired.has(records[index].facts.refId));
      if (view.verdict !== 'valid') {
        return { allowed: false, verdict: view.verdict, reason: view.readableReason ?? '引用不可用（按失效处理）' };
      }
      sends += 1;
      return { allowed: true, verdict: 'valid', reason: '' };
    },
    commandSends: () => sends,
    reset() {
      records.length = 0;
      retired.clear();
      sends = 0;
    },
  };
}
