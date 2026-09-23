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
import type { RefEnv, RefFacts, RefRescue, RefVerdict, RefVerdictView } from './ref-validity.js';

/** `textDigest` truncation length (V32-O-2, pinned). */
export const TEXT_DIGEST_MAX = 80;
/** `semanticPath` truncation length (V32-O-2, pinned). */
export const SEMANTIC_PATH_MAX = 120;

/**
 * R4（2026-09-22）— **display-only** selector bound, mirroring
 * `content/ref-capture.ts#SELECTOR_MAX` (the two bundles cannot import each other, and
 * `ref-capture.test.ts` pins the equality of the two numbers).
 *
 * The stored selector is **never** truncated (it is what gets queried); this bound is
 * applied only where a selector is *shown* — the evidence row and the card label.
 * Whitespace is preserved here on purpose (a selector is a code-ish string; the
 * whitespace-stripping {@link truncate} caliber is for prose digests).
 */
export const SELECTOR_DISPLAY_MAX = 120;

/** The display form of a stored selector: cut at {@link SELECTOR_DISPLAY_MAX} only. */
export function displaySelector(selector: string, max = SELECTOR_DISPLAY_MAX): string {
  return selector.length > max ? `${selector.slice(0, max)}…` : selector;
}

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

/**
 * V4-4 TASK-801 (ADR-V4-035) — the **read-only projection** of one registry record
 * into the stream `ref` card.
 *
 * This is an **append-only interface**: it reads the record and returns a frozen
 * value; it never writes the registry, never re-judges, never mints an id. The
 * judgement / ordinal / retirement semantics of the store are therefore provably
 * unchanged by it (the v4-3 `l1-ref-validity.test.ts` + `ref-wiring.test.ts`
 * assertions keep passing verbatim).
 */
export interface RefCardProjection {
  /** The stable business number (`ref_7` → `7`), never reused. */
  readonly refNum: number;
  readonly refState: 'valid' | 'stale';
  readonly refLabel: string;
  /** The judge's readable reason — present exactly when the reference is unusable. */
  readonly refWhy?: string;
  /** 选择器 / 语义路径 / 文本摘要 / 捕获时间 — the four read-only evidence rows. */
  readonly evidence: readonly string[];
}

/** `ref_7` → `7` (`NaN`-safe: a non-conforming id projects as `0`). */
export function refOrdinal(refId: string): number {
  const n = Number(/^ref_(\d+)$/.exec(refId)?.[1]);
  return Number.isFinite(n) && n >= 1 ? n : 0;
}

/**
 * One evidence row (`标签：值`). R4: the **selector** value is cut here (display),
 * never at ingestion — the stored fact keeps the full legal selector (see
 * {@link displaySelector}).
 */
function evidenceRow(tag: string, value: string): string {
  return `${tag}：${value}`;
}

/**
 * I-03 (v4-4 review) — the **ONE evidence construction** for a record.
 *
 * Before this, `projectRefCard` (the stream card) and `l1/panels.ts#paintRefs` (the
 * L1 panel) each built their own evidence rows — two implementations with a real
 * drift surface. Both now read this single function (the card joins the pair, the
 * panel renders `glyph + label`), so the evidence layer has exactly one source.
 */
export function refEvidenceRows(record: RefRecord): readonly (readonly [string, string])[] {
  const f = record.facts;
  const rows: Array<readonly [string, string]> = [
    ['稳定选择器', displaySelector(f.selector) || '（无）'],
    ['语义路径', f.semanticPath || '（无）'],
    ['文本摘要', f.textDigest || '（无）'],
    ['捕获时间', f.capturedAt ? new Date(f.capturedAt).toISOString() : '（未知）'],
  ];
  return Object.freeze(rows.map((r) => Object.freeze(r)));
}

/**
 * ADR-V4-035 decision 1 — **exactly three projection points** (the number must not
 * grow). The L0 chip / badge and the L1 evidence panel are **read-only views of the
 * same single projection** (`refEvidenceRows` / `projectRefCard`), not a fourth
 * construction point; this constant is the machine-readable form of that claim and
 * is asserted by `test/ref-pick-wiring.test.ts`.
 */
export const REF_PROJECTION_POINTS = Object.freeze([
  'page-badge', // pick-layer.js — byte-pinned, zero change
  'stream-ref-card', // cards/ref.ts — carries the ordinal, the evidence layer and both recovery paths
  'statusbar-risk-chip', // the「引用失效」risk chip (同一 store 的 stale() 派生)
] as const);

/** The pure projection of a record (see {@link RefCardProjection}). */
export function projectRefCard(record: RefRecord): RefCardProjection {
  const f = record.facts;
  const valid = record.verdict === 'valid';
  return Object.freeze({
    refNum: refOrdinal(f.refId),
    refState: valid ? 'valid' : 'stale',
    refLabel: `${ordinalGlyph(f.refId)} ${displaySelector(f.selector) || f.semanticPath || '（引用）'}`,
    ...(valid ? {} : { refWhy: record.readableReason ?? '引用不可用（按失效处理）' }),
    evidence: Object.freeze(refEvidenceRows(record).map(([tag, value]) => evidenceRow(tag, value))),
  });
}

/** One tracked reference: the raw facts plus the latest (re-judged) verdict. */
export interface RefRecord {
  facts: RefFacts;
  verdict: RefVerdict;
  dimension?: string;
  readableReason?: string;
  unknownCause?: string;
  /** R3: the read-only rescue observation attached to a `dom-gone` verdict (if any). */
  rescue?: RefRescue;
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

/**
 * V5.5F-1 **TASK-V55F-104** (ADR-SGO-002 §1 · FR-SGO-011/019 · R-SGO-901) — the
 * **active-reference predicate**（活跃有效引用 = `verdict === 'valid'` ∧ 未退役）。
 *
 * **单源**：引用快照投影（`l1/ref-scope.ts#turnRefsOf`）与范围读数都从这里取，
 * 不再各写一份过滤。它**只读**该记录已有的 `verdict`（判定者的输出）—— **不重判**
 * `valid / invalid / unknown`（3 结果 + 6 维度的 deny 方向在 `ref-validity.ts`，零触碰）。
 */
export function isActiveRef(record: RefRecord): boolean {
  return record.verdict === 'valid' && !record.retired;
}

export interface RefStore {
  create(raw: RawRefFacts): RefRecord;
  all(): RefRecord[];
  get(refId: string): RefRecord | undefined;
  /**
   * V5.5F-1 TASK-V55F-104 — the **read-only** active-reference accessor
   * (`verdict === 'valid'` ∧ 未退役). Pure read: it never re-judges and never mutates
   * the registry (判定语义零改).
   */
  activeValid(): RefRecord[];
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
  /**
   * V4-4 TASK-801 (ADR-V4-035): the **append-only** stream projection of one
   * record. Pure read — judgement / ordinal / retirement semantics untouched.
   */
  cardProjection(refId: string): RefCardProjection | undefined;
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
    // R3: the rescue payload travels with the record so the L1 layer / gate can read
    // the observation the judge attached (metadata only — never a verdict).
    ...(view.rescue ? { rescue: view.rescue } : {}),
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
  /**
   * N-08（2026-09-16 收口轮）：退役记录的**最后一次失效原因被冻结**。
   * 退役只表示「已被显式重拾取代」，但后续 `judge()` 仍会重算这条记录 —— 旧实现会把
   * `readableReason` 一起改写，于是事后审计看到的原因**不是退役当时那一个**
   * （实测：`ref_22` 由「目标元素已不存在」变成「已被同类新元素替换」）。
   * 记录本身不丢弃（FR-V3-037「不得静默丢弃」），原因也保持退役时的快照。
   */
  const frozenReason = new Map<string, string>();
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
        // Defect fix R1: the capture-time declaration **state** is carried verbatim (the
        // panel's ingestion stamps it from the SW's single declaration source).
        ...(raw.declaration !== undefined ? { declaration: raw.declaration } : {}),
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
    activeValid: () => records.filter(isActiveRef),
    judge(env) {
      for (let i = 0; i < records.length; i += 1) {
        const id = records[i].facts.refId;
        const next = decorate(records[i].facts, evaluateRefValidity(records[i].facts, env), retired.has(id));
        // N-08: a retired record keeps the reason it was retired with (the verdict
        // itself is still re-judged), so the audit trail shows the original cause.
        const frozen = frozenReason.get(id);
        records[i] = frozen && next.verdict !== 'valid' ? { ...next, readableReason: frozen } : next;
      }
      return [...records];
    },
    stale: () => records.filter((r) => r.verdict !== 'valid' && !r.retired),
    retireUnusable() {
      for (const r of records) {
        if (r.verdict === 'valid') continue;
        retired.add(r.facts.refId);
        if (r.readableReason) frozenReason.set(r.facts.refId, r.readableReason);
      }
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
    cardProjection(refId) {
      const record = find(refId);
      return record ? projectRefCard(record) : undefined;
    },
    reset() {
      records.length = 0;
      retired.clear();
      frozenReason.clear();
      sends = 0;
    },
  };
}
