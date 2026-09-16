/**
 * V3-2 TASK-201 (ADR-V3-020 / FR-V3-036 / FR-V3-037 / EC-V3-001) — the **only**
 * reference-validity judge in the product.
 *
 * ── Why a pure function instead of "ask the page" ────────────────────────────
 *
 * A reference that silently survives an invalidation makes the user command a
 * target that no longer exists (R-UI-011). The requirement is therefore
 * **fail-closed**: "cannot confirm" must be treated exactly like "confirmed
 * gone". The one implementation that makes that structural rather than a matter
 * of discipline is the three-verdict judge below:
 *
 *   ┌ evaluateRefValidity(ref, env) → { verdict: 'valid' | 'invalid' | 'unknown',
 *   │                                  dimension?, readableReason?, unknownCause? }
 *   └ isRefUsable(ref, env) ≜ evaluateRefValidity(ref, env).verdict === 'valid'
 *
 * `isRefUsable()` accepts **only** the explicit `'valid'`. A future branch that
 * returns anything else is blocked automatically — a new dimension cannot
 * "forget" to deny, because denying is what the single call site does by default.
 *
 * ── The five dimensions (parent FR-V3-036, each independently injectable) ────
 *
 *   D1 `dom-gone`              selector resolution failed, **or** the resolved
 *                              node is not the captured node (identity = the
 *                              `data-wcli-ref` mark written at capture)
 *   D2 `origin-changed`        current bound origin ≠ `ref.origin` (EC-V3-014)
 *   D3 `navigated`             `documentId` / `navSeq` changed (incl. SPA routes:
 *                              the document was replaced)
 *   D4 `declaration-changed`   site declaration `hash` **or** `version` differs
 *                              (V32-O-1: either one ⇒ invalid; both unavailable
 *                              ⇒ unknown)
 *   D5 `authorization-revoked` the origin left the authorized set
 *
 * ── "Uncertain" is a first-class verdict, not a missing feature ──────────────
 *
 * Each of these becomes `'unknown'` (⇒ blocked, with a readable reason): a
 * required capture fact is absent, the side panel cannot read the current origin
 * or authorization, the page side is unreachable (not authorized / still probing
 * / content script silent), the selector matched several nodes, the node was
 * replaced by a same-tag sibling, and the extension was reloaded before the
 * reference state was restored (EC-V3-007).
 *
 * ── Where the judgement happens ─────────────────────────────────────────────
 *
 * **Side-panel side only.** The page side (v3-4) reports *raw facts* and never
 * decides. That is what lets this module be unit-tested in plain Node with an
 * injected `env` — no `chrome.*`, no `document`, no clock.
 *
 * @module l1/ref-validity
 */

/** The three verdicts. `'valid'` is the ONLY value that ever passes. */
export type RefVerdict = 'valid' | 'invalid' | 'unknown';

/** The five invalidation dimensions (parent FR-V3-036). */
export type RefDimension =
  | 'dom-gone'
  | 'origin-changed'
  | 'navigated'
  | 'declaration-changed'
  | 'authorization-revoked';

/** Why a verdict is `'unknown'` — machine-readable companion of the readable text. */
export type RefUnknownCause = 'missing-fact' | 'env-unavailable' | 'page-unreachable' | 'ambiguous' | 'replaced';

/**
 * The capture facts (ADR-V3-023 decision 3): **raw facts only** — the set carries
 * no verdict field, so a page-side message can never ship a conclusion. `refId`
 * is assigned by `l1/ref-store.ts` (the single id source).
 */
export interface RefFacts {
  refId: string;
  selector: string;
  semanticPath: string;
  textDigest: string;
  origin: string;
  documentId: string;
  navSeq: number;
  declarationHash: string;
  declarationVersion?: string;
  capturedAt: number;
}

/** Page-side resolution report — a raw observation, never a judgement. */
export interface RefResolution {
  status: 'resolved' | 'missing' | 'ambiguous' | 'unreachable';
  /** `data-wcli-ref` mark found on the resolved node (D1's identity check). */
  refMark?: string;
  /** How many nodes the selector matched (`!== 1` ⇒ ambiguous ⇒ unknown). */
  nodeCount?: number;
}

/**
 * Everything the judge needs about "now". **Every field is optional on purpose**:
 * a missing field is not a default value, it is an unknown — and unknown blocks.
 */
export interface RefEnv {
  currentOrigin?: string;
  authorized?: boolean;
  documentId?: string;
  navSeq?: number;
  declarationHash?: string;
  declarationVersion?: string;
  resolution?: RefResolution;
}

/** The judge's answer. */
export interface RefVerdictView {
  verdict: RefVerdict;
  dimension?: RefDimension;
  readableReason?: string;
  unknownCause?: RefUnknownCause;
}

/**
 * Readable-reason templates — pinned verbatim (plan §2.3(4)). `{n}` = the
 * reference's ordinal. The unit test and the runtime gate compare the rendered
 * strings character for character, so a copy change is a visible, deliberate edit.
 */
export const REASON_TEMPLATES: Readonly<Record<RefDimension | 'unknown', string>> = Object.freeze({
  'dom-gone': '引用 {n} 的目标元素已不存在（选择器解析失败或元素被替换）',
  'origin-changed': '引用 {n} 属于 {origin}，当前站点已是 {now} —— 跨站引用不可用',
  navigated: '引用 {n} 捕获后页面已导航（含单页路由切换），目标可能已重建',
  // N-07（2026-09-16 收口轮）：D4 有两个子判据（hash / version）。此前模板只填 hash，
  // 于是「仅 version 变化」会渲染成 `（decl-1 → decl-1）` —— 用户看不出到底哪一项变了。
  // `{what}` 由 {@link reasonFor} 按**真正变化的那一项**渲染（hash 优先，其次 version）。
  'declaration-changed': '引用 {n} 捕获后站点声明已变化（{what}），目标语义可能已改变',
  'authorization-revoked': '引用 {n} 所在站点已被撤销授权',
  unknown: '无法确认引用 {n} 的目标是否仍然有效（{reason}）—— 按失效处理',
});

/** Readable fragment per unknown cause (embedded into the `unknown` template). */
export const UNKNOWN_CAUSE_TEXT: Readonly<Record<RefUnknownCause, string>> = Object.freeze({
  'missing-fact': '引用捕获事实不完整：缺失 {f}',
  'env-unavailable': '侧栏无法读取当前站点事实（{f}）',
  'page-unreachable': '页面侧不可达（未授权 / 探测中 / 内容脚本未响应）',
  ambiguous: '选择器命中 {n} 个元素，无法确定唯一目标',
  replaced: '目标元素已被同类新元素替换（身份标记不匹配）',
});

/** Required capture facts for a *decidable* reference (anything else ⇒ unknown). */
export const REQUIRED_REF_FACTS: readonly (keyof RefFacts)[] = Object.freeze([
  'refId',
  'selector',
  'origin',
  'documentId',
  'navSeq',
  'declarationHash',
]);

/** `ref_<n>` → `n` (the ordinal the page badge / chip / risk row share). */
export function refOrdinal(refId: string): string {
  const m = /^ref_(\d+)$/.exec(refId);
  return m ? m[1] : refId;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => vars[key] ?? whole);
}

/** Present and non-empty (`0` counts as present — a real navigation counter). */
function has(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

/** First 8 characters of a hash (readable, never a secret). */
function shortHash(hash: string | undefined): string {
  return hash ? (hash.length > 8 ? `${hash.slice(0, 8)}…` : hash) : '（无）';
}

/** The readable reason for one `'invalid'` dimension. */
export function reasonFor(ref: RefFacts, dimension: RefDimension, env: RefEnv): string {
  const hashChanged = has(env.declarationHash) && env.declarationHash !== ref.declarationHash;
  return fill(REASON_TEMPLATES[dimension], {
    n: refOrdinal(ref.refId),
    origin: ref.origin,
    now: env.currentOrigin ?? '（未知站点）',
    old: shortHash(ref.declarationHash),
    new: shortHash(env.declarationHash ?? ref.declarationHash),
    // N-07: name the field that actually changed, so「仅 version 变化」不再渲染成
    // `decl-1 → decl-1`（旧模板只填 hash，用户看不出是哪一项变了）。
    what: hashChanged
      ? `hash ${shortHash(ref.declarationHash)} → ${shortHash(env.declarationHash)}`
      : `version ${shortHash(ref.declarationVersion)} → ${shortHash(env.declarationVersion)}`,
  });
}

/** The readable reason for an `'unknown'` verdict. */
export function reasonUnknown(ref: RefFacts, cause: RefUnknownCause, detail: Record<string, string> = {}): string {
  return fill(REASON_TEMPLATES.unknown, {
    n: refOrdinal(ref.refId),
    reason: fill(UNKNOWN_CAUSE_TEXT[cause], detail),
  });
}

function unknown(ref: RefFacts, cause: RefUnknownCause, detail?: Record<string, string>): RefVerdictView {
  return { verdict: 'unknown', unknownCause: cause, readableReason: reasonUnknown(ref, cause, detail ?? {}) };
}

function invalid(ref: RefFacts, dimension: RefDimension, env: RefEnv): RefVerdictView {
  return { verdict: 'invalid', dimension, readableReason: reasonFor(ref, dimension, env) };
}

/**
 * The judge. Deterministic, side-effect free, clock-free.
 *
 * The order decides *which* dimension is reported when several hold at once; the
 * verdict itself is unaffected (any one dimension already means `'invalid'`).
 * Fixed and documented so the gate can assert the exact dimension:
 *
 *   1. capture-fact completeness   → `unknown` (missing-fact)
 *   2. env availability            → `unknown` (env-unavailable)
 *   3. D2 origin changed           → `invalid`
 *   4. D5 authorization revoked    → `invalid`
 *   5. D3 navigated                → `invalid`
 *   6. D4 declaration changed      → `invalid` / `unknown`
 *   7. D1 dom-gone / resolution    → `invalid` / `unknown`
 *   8. otherwise                   → `valid`
 */
export function evaluateRefValidity(ref: RefFacts, env: RefEnv): RefVerdictView {
  const missing = REQUIRED_REF_FACTS.filter((field) => !has(ref[field]));
  if (missing.length > 0) return unknown(ref, 'missing-fact', { f: missing.join(' / ') });
  if (!has(env.currentOrigin)) return unknown(ref, 'env-unavailable', { f: '当前站点 origin' });
  // D2 first: a cross-site reference must be reported as such (EC-V3-014).
  if (env.currentOrigin !== ref.origin) return invalid(ref, 'origin-changed', env);
  if (env.authorized === undefined) return unknown(ref, 'env-unavailable', { f: '授权状态' });
  if (env.authorized !== true) return invalid(ref, 'authorization-revoked', env);
  if (!has(env.documentId) || !has(env.navSeq)) return unknown(ref, 'page-unreachable');
  if (env.documentId !== ref.documentId || env.navSeq !== ref.navSeq) return invalid(ref, 'navigated', env);
  const hashKnown = has(env.declarationHash);
  const versionKnown = has(env.declarationVersion) && has(ref.declarationVersion);
  if (!hashKnown && !versionKnown) return unknown(ref, 'missing-fact', { f: '站点声明 hash / version' });
  if (hashKnown && env.declarationHash !== ref.declarationHash) return invalid(ref, 'declaration-changed', env);
  if (versionKnown && env.declarationVersion !== ref.declarationVersion) return invalid(ref, 'declaration-changed', env);
  const res = env.resolution;
  if (!res || res.status === 'unreachable') return unknown(ref, 'page-unreachable');
  if (res.status === 'ambiguous') return unknown(ref, 'ambiguous', { n: String(res.nodeCount ?? 2) });
  if (res.status === 'missing') return invalid(ref, 'dom-gone', env);
  // N-09（2026-09-16 收口轮，把口径明写进实现）：`resolved` 的**身份判据 = `refMark` 相等**
  // （`data-wcli-ref` 是捕获时写下的唯一标记）；`nodeCount` 是**辅判据** —— 只在**给出且
  // ≠ 1** 时判歧义，缺省不构成歧义。v3-4 若把 `nodeCount` 当作唯一/必需判据，会产生
  // 语义漂移（会把「标记匹配但未报计数」误判为不可用）。
  if (res.nodeCount !== undefined && res.nodeCount !== 1) return unknown(ref, 'ambiguous', { n: String(res.nodeCount) });
  if (res.refMark !== ref.refId) return unknown(ref, 'replaced');
  return { verdict: 'valid' };
}

/**
 * The **single** gate for "may this reference be used to act?".
 *
 * Structural fail-closed: only an explicit `'valid'` passes. `'invalid'` **and**
 * `'unknown'` are both denied — a dimension added to the judge without a
 * matching branch at the call site is denied too, because it cannot produce
 * `'valid'`.
 */
export function isRefUsable(ref: RefFacts, env: RefEnv): boolean {
  return evaluateRefValidity(ref, env).verdict === 'valid';
}
