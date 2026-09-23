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
 *   D1b `invalid-selector`     the CSS parser **rejected** the stored selector
 *                              (defect fix R4: a truncated / illegal selector).
 *                              Same deny direction as D1, different fact and
 *                              different readable reason —「选择器语法非法（捕获缺陷）」
 *                              must never be shown as「目标元素已不存在」.
 *   D2 `origin-changed`        current bound origin ≠ `ref.origin` (EC-V3-014)
 *   D3 `navigated`             `documentId` / `navSeq` changed (incl. SPA routes:
 *                              the document was replaced)
 *   D4 `declaration-changed`   the site's declaration **state** changed since capture.
 *                              `valid` ⇒ the digest (and the version, when both are
 *                              known) must still match; `invalid` / `absent` ⇒ the
 *                              state must still be the same one. **Any** movement
 *                              (declaration appears / disappears / becomes broken ⇒
 *                              a re-pick is required) is invalid; a current state the
 *                              panel cannot read is unknown.
 *                              *Defect fix R1 (2026-09-17)*: the caliber used to be
 *                              "a `declarationHash` must exist", which made every
 *                              reference picked on a site **without a usable
 *                              declaration** (i.e. almost every real site — the
 *                              declaration is a *site tool surface*, not a
 *                              precondition for picking) still-born. The state, not
 *                              the digest, is the fact; a status is a *complete*
 *                              fact even when there is no hash.
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
  | 'invalid-selector'
  | 'origin-changed'
  | 'navigated'
  | 'declaration-changed'
  | 'authorization-revoked'
  // R6（2026-09-23）：同身份元素仍在（`data-wcli-ref` 匹配），但其**文本摘要**已被改写
  // （AI `dom set-text` 等原地写文本）⇒ 捕获时那条证据已失真，按失效/救援口径处理。
  | 'text-changed';

/** Why a verdict is `'unknown'` — machine-readable companion of the readable text. */
export type RefUnknownCause = 'missing-fact' | 'env-unavailable' | 'page-unreachable' | 'ambiguous' | 'replaced';

/**
 * The declaration state machine's three states — the **same** triple is used for the
 * captured fact and for "now", so D4 can compare two values of one vocabulary
 * (`valid` = the SW has adopted a declaration; `invalid` = a declaration exists but
 * does not validate; `absent` = the site declares nothing). The single producer is the
 * service worker's `declarationEnv()`; the panel never mints one.
 */
export type DeclarationStatus = 'valid' | 'invalid' | 'absent';

/**
 * The declaration as **captured** (defect fix R1, 2026-09-17).
 *
 * Added because `declarationHash: ''` could not distinguish "this site has no
 * declaration" (normal, must stay usable) from "the capture fact was lost" (abnormal,
 * must be denied) — the old completeness check collapsed both into `missing-fact`, so
 * a reference picked on an undeclared site was born dead. The `status` is a complete
 * fact on its own; `hash` is present only while the status is `valid`.
 */
export interface RefDeclaration {
  status: DeclarationStatus;
  hash?: string;
  version?: string;
}

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
  /** Defect fix R1: the capture-time declaration state (absent on pre-fix records). */
  declaration?: RefDeclaration;
  capturedAt: number;
}

/** Page-side resolution report — a raw observation, never a judgement. */
export interface RefResolution {
  /**
   * R4（2026-09-22）：`invalid-selector` 与 `missing` **分开**。旧口径把 CSS 解析器抛错
   * 与「0 命中」同吞为 `missing` ⇒ 捕获缺陷（被截断的选择器）被读成「目标元素已不存在」，
   * 引用出生即死。两者都是 fail-closed（都判 `invalid`），但事实与文案不同。
   */
  status: 'resolved' | 'missing' | 'ambiguous' | 'unreachable' | 'invalid-selector';
  /** `data-wcli-ref` mark found on the resolved node (D1's identity check). */
  refMark?: string;
  /** How many nodes the selector matched (`!== 1` ⇒ ambiguous ⇒ unknown). */
  nodeCount?: number;
  /**
   * R6（2026-09-23）—— 解析到的**当前文本摘要**（与捕获口径同源：flatten + 80 字截断）。
   * 只有 SW 的只读重观测（`observeIdentity`）会带它；缺省 ⇒ 不比较（既有行为逐字不变）。
   */
  textDigest?: string;
}

/**
 * Defect fix round **R3**（2026-09-17）— the **read-only rescue observation** attached
 * to a `dom-gone` verdict. Facts only, produced by the background's text-candidate
 * probe (`background/ref-rescue.ts`); the panel never mints one.
 *
 * It is **payload metadata**, not a fourth verdict: `RefVerdict` still has exactly
 * `valid | invalid | unknown`, and a rescue can never turn an `invalid` reference into
 * a usable one. Acting on the rescued target always mints a **new** reference through a
 * user click; the old one keeps its facts and its verdict (append-only).
 */
export interface RefRescue {
  /** The reference this observation belongs to (a rescue is per-reference). */
  refId: string;
  /** Inner-most elements whose flattened text equals the captured digest. */
  candidates: number;
  /** `candidates === 1` — the only case a one-click re-anchor is offered. */
  unique: boolean;
  /** The current page path differs from the capture-time path (`document.URL` moved). */
  urlChanged: boolean;
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
  /** The declaration state **now** (single source: the SW's `declarationEnv()`). */
  declarationStatus?: DeclarationStatus;
  resolution?: RefResolution;
  /** R3: the read-only text-candidate observation for one reference (facts only). */
  rescue?: RefRescue;
}

/** The judge's answer. */
export interface RefVerdictView {
  verdict: RefVerdict;
  dimension?: RefDimension;
  readableReason?: string;
  unknownCause?: RefUnknownCause;
  /**
   * R3: rescue payload metadata for a `dom-gone` verdict (present only when the
   * background actually observed text candidates). It never changes `verdict`.
   */
  rescue?: RefRescue;
}

/**
 * Readable-reason templates — pinned verbatim (plan §2.3(4)). `{n}` = the
 * reference's ordinal. The unit test and the runtime gate compare the rendered
 * strings character for character, so a copy change is a visible, deliberate edit.
 *
 * R4（2026-09-22）追加 `invalid-selector` 一条：维度词表**只增**（既有五条逐字未动），
 * 新增的是「捕获缺陷」这个此前被折叠进 `dom-gone` 的事实。
 */
export const REASON_TEMPLATES: Readonly<Record<RefDimension | 'unknown', string>> = Object.freeze({
  'dom-gone': '引用 {n} 的目标元素已不存在（选择器解析失败或元素被替换）',
  // R4（2026-09-22）：捕获缺陷的**独立**文案。选择器语法非法 = 我们给出的选择器是坏的
  // （被截断 / 非法），这与「元素不在了」是两件事 —— 前者可自动修复（捕获回环校验）或
  // 重新拾取即可复原，后者只能重拾。
  'invalid-selector': '引用 {n} 的选择器语法非法（捕获缺陷，已自动修复/请重新拾取）',
  'origin-changed': '引用 {n} 属于 {origin}，当前站点已是 {now} —— 跨站引用不可用',
  navigated: '引用 {n} 捕获后页面已导航（含单页路由切换），目标可能已重建',
  // N-07（2026-09-16 收口轮）：D4 有两个子判据（hash / version）。此前模板只填 hash，
  // 于是「仅 version 变化」会渲染成 `（decl-1 → decl-1）` —— 用户看不出到底哪一项变了。
  // `{what}` 由 {@link reasonFor} 按**真正变化的那一项**渲染（hash 优先，其次 version）。
  'declaration-changed': '引用 {n} 捕获后站点声明已变化（{what}），目标语义可能已改变',
  'authorization-revoked': '引用 {n} 所在站点已被撤销授权',
  // R6（2026-09-23）：元素身份仍在（标记匹配），但文本已被原地改写 —— 捕获的证据失真。
  'text-changed': '引用 {n} 的目标文本在捕获后被改写（元素仍在，但内容已变）',
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

/** Readable status name for the D4 reason (a state change names both ends). */
export const DECLARATION_STATUS_TEXT: Readonly<Record<DeclarationStatus, string>> = Object.freeze({
  valid: '有效',
  invalid: '无效',
  absent: '未声明',
});

/**
 * R3 — the readable rescue fragments appended to a `dom-gone` reason. Pinned verbatim
 * (the unit test and the runtime gate compare the rendered strings character for
 * character). `{n}` = the number of matching elements.
 *
 * R4（2026-09-22）：可挂载面扩到 **D1 的两个面**（`dom-gone` 与 `invalid-selector`）——
 * 一条被截断的旧选择器同样「目标疑似仍在」，救援观察对两者都成立，恢复力只增不减。
 */
export const RESCUE_REASON = Object.freeze({
  unique: '（目标疑似仍在：文本唯一匹配 —— 可一键重锚）',
  multiple: '（目标疑似仍在：文本多处匹配 {n} 处 —— 请手动重新拾取）',
  urlChanged: '；页面路径已变化',
});

/** The rescue observation that belongs to **this** reference (per-reference env fact). */
export function refRescueFor(ref: RefFacts, env: RefEnv): RefRescue | undefined {
  const rescue = env.rescue;
  return rescue && rescue.refId === ref.refId ? rescue : undefined;
}

/**
 * The declaration state "now", as the judge reads it. `Valid` is *implied* by a known
 * digest so that an env produced by an older wiring (hash only) keeps the historical
 * caliber instead of silently becoming unknown. Anything unreadable ⇒ `undefined`
 * (⇒ unknown ⇒ blocked).
 */
export function currentDeclarationStatus(env: RefEnv): DeclarationStatus | undefined {
  if (env.declarationStatus !== undefined) return env.declarationStatus;
  return has(env.declarationHash) ? 'valid' : undefined;
}

/**
 * Required capture facts for a *decidable* reference (anything else ⇒ unknown).
 * `declarationHash` is deliberately **not** here any more (defect fix R1): its absence
 * is normal on an undeclared site, and D4 below is what tells "nothing to compare"
 * (legacy record ⇒ fail-closed) from "state compared" (R1 record).
 */
export const REQUIRED_REF_FACTS: readonly (keyof RefFacts)[] = Object.freeze([
  'refId',
  'selector',
  'origin',
  'documentId',
  'navSeq',
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
  const cap = ref.declaration;
  const now = currentDeclarationStatus(env);
  const statusChanged = cap !== undefined && now !== undefined && now !== cap.status;
  const hashChanged = has(env.declarationHash) && env.declarationHash !== ref.declarationHash;
  const base = fill(REASON_TEMPLATES[dimension], {
    n: refOrdinal(ref.refId),
    origin: ref.origin,
    now: env.currentOrigin ?? '（未知站点）',
    old: shortHash(ref.declarationHash),
    new: shortHash(env.declarationHash ?? ref.declarationHash),
    // N-07: name the field that actually changed, so「仅 version 变化」不再渲染成
    // `decl-1 → decl-1`（旧模板只填 hash，用户看不出是哪一项变了）。
    // R1: a **state** change is named as such（capture status → current status）; the
    // digest/version wording stays for legacy records and for a changed digest.
    what: statusChanged
      ? `声明状态 ${DECLARATION_STATUS_TEXT[cap.status]} → ${DECLARATION_STATUS_TEXT[now]}`
      : hashChanged
        ? `hash ${shortHash(ref.declarationHash)} → ${shortHash(env.declarationHash)}`
        : `version ${shortHash(ref.declarationVersion)} → ${shortHash(env.declarationVersion)}`,
  });
  // A changed state is not a silent invalidation: the objective semantics may have been
  // re-anchored, so the only honest recovery is a fresh pick (FR-V3-038's second path).
  if (statusChanged && dimension === 'declaration-changed') {
    return `${base}（请在页面上重新拾取）`;
  }
  // R3（2026-09-17）：selector 断链、但文本摘要仍在页面上有候选 ⇒ 失效原因带只读救援
  // 元数据（0 候选维持原文案 —— 「真没了」）。判定结论不受影响（仍是 invalid/dom-gone）。
  // R4：挂载面 = D1 的两个面（`dom-gone` / `invalid-selector`）。
  const rescue = dimension === 'dom-gone' || dimension === 'invalid-selector' || dimension === 'text-changed' ? refRescueFor(ref, env) : undefined;
  if (rescue && rescue.candidates > 0) {
    const suffix =
      (rescue.unique ? RESCUE_REASON.unique : fill(RESCUE_REASON.multiple, { n: String(rescue.candidates) })) +
      (rescue.urlChanged ? RESCUE_REASON.urlChanged : '');
    return `${base}${suffix}`;
  }
  return base;
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
 *   7b. D1b invalid-selector       → `invalid`（捕获缺陷；与「元素不存在」分开报）
 *   7c. R6 text-changed            → `invalid`（身份匹配但文本摘要已被改写）
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
  // ── D4 站点声明一致性（defect fix R1：状态一致，而不是「必须有 hash」）─────────
  // 捕获时记录了声明状态 ⇒ 比状态：valid 还须摘要（及双方已知的 version）相等；
  // invalid / absent 只比状态本身。任何一种「变化」（出现 / 消失 / 变更）⇒ invalid，
  // 并提示重新拾取 —— 这是 fail-closed 的完整保留，不是放松。
  const cap = ref.declaration;
  if (cap) {
    const now = currentDeclarationStatus(env);
    if (now === undefined) return unknown(ref, 'env-unavailable', { f: '站点声明状态' });
    if (now !== cap.status) return invalid(ref, 'declaration-changed', env);
    if (cap.status === 'valid') {
      if (!has(env.declarationHash)) return unknown(ref, 'env-unavailable', { f: '站点声明 hash' });
      if (env.declarationHash !== cap.hash) return invalid(ref, 'declaration-changed', env);
      if (has(env.declarationVersion) && has(cap.version) && env.declarationVersion !== cap.version) {
        return invalid(ref, 'declaration-changed', env);
      }
    }
  } else {
    // 修复前捕获的旧记录（既无 status 也无 hash）**逐分支维持原判**：ref 自身没有摘要
    // ⇒ 无法比较（unknown，与修复前的 REQUIRED 检查同结果）；有摘要则照旧比摘要 / 版本。
    if (!has(ref.declarationHash)) return unknown(ref, 'missing-fact', { f: 'declarationHash' });
    const hashKnown = has(env.declarationHash);
    const versionKnown = has(env.declarationVersion) && has(ref.declarationVersion);
    if (!hashKnown && !versionKnown) return unknown(ref, 'missing-fact', { f: '站点声明 hash / version' });
    if (hashKnown && env.declarationHash !== ref.declarationHash) return invalid(ref, 'declaration-changed', env);
    if (versionKnown && env.declarationVersion !== ref.declarationVersion) return invalid(ref, 'declaration-changed', env);
  }
  const res = env.resolution;
  if (!res || res.status === 'unreachable') return unknown(ref, 'page-unreachable');
  if (res.status === 'ambiguous') return unknown(ref, 'ambiguous', { n: String(res.nodeCount ?? 2) });
  if (res.status === 'invalid-selector') {
    // R4: the CSS parser rejected the stored selector — a **capture defect**, reported on
    // its own dimension so the user reads「选择器语法非法（捕获缺陷）」instead of the false
    // 「目标元素已不存在」. Fail-closed direction is untouched (still `invalid`), and the
    // read-only rescue observation may still be attached (the target is likely still there).
    const view = invalid(ref, 'invalid-selector', env);
    const rescue = refRescueFor(ref, env);
    return rescue ? { ...view, rescue } : view;
  }
  if (res.status === 'missing') {
    // R3: the rescue is **payload metadata on the dom-gone verdict** — the conclusion
    // itself is untouched (`invalid`), and no other dimension can carry one.
    const view = invalid(ref, 'dom-gone', env);
    const rescue = refRescueFor(ref, env);
    return rescue ? { ...view, rescue } : view;
  }
  // N-09（2026-09-16 收口轮，把口径明写进实现）：`resolved` 的**身份判据 = `refMark` 相等**
  // （`data-wcli-ref` 是捕获时写下的唯一标记）；`nodeCount` 是**辅判据** —— 只在**给出且
  // ≠ 1** 时判歧义，缺省不构成歧义。v3-4 若把 `nodeCount` 当作唯一/必需判据，会产生
  // 语义漂移（会把「标记匹配但未报计数」误判为不可用）。
  if (res.nodeCount !== undefined && res.nodeCount !== 1) return unknown(ref, 'ambiguous', { n: String(res.nodeCount) });
  if (res.refMark !== ref.refId) return unknown(ref, 'replaced');
  // ★ R6（2026-09-23）—— **被改写后重评**：身份标记仍匹配（元素是同一枚），但只读重观测带回了
  // 当前文本摘要；若与捕获摘要不同 ⇒ 捕获的证据已失真，按失效处理（并挂既有救援元数据）。
  // `textDigest` 缺省（老 wiring / 普通 mark 观测未带）⇒ 不比较，既有判据逐字不变。
  if (res.textDigest !== undefined && has(ref.textDigest) && res.textDigest !== ref.textDigest) {
    const view = invalid(ref, 'text-changed', env);
    const rescue = refRescueFor(ref, env);
    return rescue ? { ...view, rescue } : view;
  }
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
