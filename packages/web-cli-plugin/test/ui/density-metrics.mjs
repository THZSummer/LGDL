/**
 * L0 density caliber — **the single implementation source** (ADR-V3-003 / ADR-V3-015).
 *
 * Everything about L0 density lives here, and *only* here:
 *   1. the in-page measurement expression (C1~C4),
 *   2. the three tier thresholds,
 *   3. the three viewports,
 *   4. the tier definitions (which product state each tier means),
 *   5. the five risk sub-scenarios,
 *   6. the risk-attribution predicate,
 *   7. the pure pass/fail judgement + the risk-increment attribution judgement.
 *
 * Any caliber change therefore has exactly one place to land — a second
 * implementation cannot silently drift (NFR-V3-002 / NFR-V3-013).
 *
 * ── Caliber definitions (spec §9.1, verbatim restatement) ────────────────────
 *
 * **Measurement root = `document.body`** (parent ADR-V3-001: no new `#panel`
 * wrapper is introduced in the real product). The design drafts measure
 * `#panel`; the two are semantically equivalent because in the drafts `#panel`
 * *is* the whole panel. This equivalence is asserted in
 * `test/density-thresholds.test.ts` and re-checked cell-by-cell by
 * `test/ui/density.mjs` stage A (same source string on both roots).
 *
 * **C1 — clickables.** Count of elements with
 *   ① no `hidden === true` ancestor (the only exemption), AND
 *   ② `tagName ∈ {BUTTON, A, INPUT, SELECT, TEXTAREA}` or a `tabindex`
 *      attribute whose value !== `-1`.
 * `display:none` / `visibility:hidden` / `opacity:0` / `pointer-events:none` /
 * out-of-viewport / `aria-hidden` are **never** exempt. This is deliberate:
 * hiding by CSS must not buy density budget (AC-V3-006③ / RP-V3-03), and it is
 * why the measurement source below contains zero occurrences of
 * `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden`.
 *
 * **C2 — visible body lines.** `⌈ Σ(own-text chars, whitespace stripped) ÷ 34 ⌉`.
 * **Own text** = the element's *direct* child text nodes only (descendant element
 * text is attributed to the descendant, so every character is counted exactly
 * once). `{{…}}` template placeholders are stripped. `34` is a pinned constant:
 * ≈ characters per line at 320px width / 13px font (conservative, E-draft
 * caliber).
 *
 * **C3 — visible text blocks.** Count of visible elements whose own text is
 * non-empty. Registered only, **no ceiling**.
 *
 * **C4 — resident zones.** Count of non-`hidden` direct children of the
 * measurement root. Registered only, **NO CEILING**, and explicitly **not** a
 * "smaller is better" metric.
 *
 * ── Two counter-intuitive facts that MUST be written down (spec §8.1) ────────
 *
 * 1. **C4 is not capped on purpose.** The L0 resident zone count is *higher*
 *    than the high-density reference draft D (E measures 6 vs D's 5) precisely
 *    because the **risk rail is an independent, permanently-resident zone**
 *    (D3 iron rule). Treating zone count as a density metric would produce the
 *    absurd conclusion "E is denser than D". C4 exists for *change registration*
 *    and *anti-cheat* only — never as evidence of density compliance, and never
 *    as a reason to loosen the clickable / line ceilings.
 * 2. **The real product's zone count may be higher than the D draft's.** The
 *    same reason: the risk rail is a zone of its own, and the real product adds
 *    `#l0-statusbar`. Any change is registered in
 *    `docs/v3-density-baseline.{md,json}` (前后值 + 日期 + 理由).
 *
 * ── Tier boundary (plan V31-O-3, adjudicated) ───────────────────────────────
 * Tiers are **mutually exclusive with priority `risk > firstRun > default`**.
 * When first-run onboarding and a risk condition coexist, the cell is judged
 * against the **risk** tier (the wider ceiling) so a real worst case can never
 * produce a false FAIL. No fourth tier is invented.
 *
 * Zero dependencies (NFR-V3-017): plain ESM, node builtins not even needed.
 */

/** `34` — E-draft caliber constant: ≈ chars per line at 320px / 13px font. */
export const CHARS_PER_LINE = 34;

/**
 * The risk-attribution predicate, as an in-page expression string.
 * An element belongs to the risk class when it is the risk rail itself or inside
 * it, when it carries the reference-invalidation mark (FR-V3-037: the stale chip
 * IS the risk information), or when it is a destructive confirmation control
 * living in the (never-collapsed) decision area.
 */
export const isRiskClassSource = `(el) => {
  const rail = document.getElementById('risk-rail');
  if (rail && (rail === el || rail.contains(el))) return true;
  if (el.closest && el.closest('[data-ref-stale="true"]')) return true;
  return Boolean(el.closest && el.closest('[data-destructive-option]'));
}`;

/**
 * The measurement expression, injected verbatim through
 * `Runtime.evaluate` (`DENSITY_MEASURE_SOURCE`). Returns
 * `{ clickables, chars, lines, blocks, regions, elementsWithKeys }`.
 *
 * `elementsWithKeys` powers the risk-increment attribution (AC-V3-003): every
 * visible interactive-or-textful element is reported with its **stable key**
 * (`#id` → `@data-key` → structural path) plus its per-element contribution and
 * its risk classification. An element that cannot be keyed at all reports
 * `key: null`, which `evaluateDelta()` rejects outright.
 */
export const DENSITY_MEASURE_TEMPLATE = `(() => {
  const root = __V3_ROOT__;
  const ownText = (el) => {
    let out = '';
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) out += node.textContent;
    }
    return out;
  };
  /* The ONLY visibility implementation (single point of truth). Deliberate: */
  /* no computed-style / layout-box / a11y-attr probes — see BANNED_MEASURE_APIS. */
  const visibleIn = (el) => {
    let node = el;
    while (node) {
      if (node.hidden === true) return false;
      node = node.parentElement;
    }
    return true;
  };
  const stripPlaceholders = (text) => text.replace(/\\{\\{[^}]*\\}\\}/g, '');
  const keyOf = (el) => {
    if (el.id) return '#' + el.id;
    if (el.hasAttribute('data-key')) return '@' + el.getAttribute('data-key');
    const parts = [];
    let node = el;
    while (node && node !== root) {
      const parent = node.parentElement;
      if (!parent) break;
      parts.unshift(node.tagName.toLowerCase() + '[' + Array.prototype.indexOf.call(parent.children, node) + ']');
      node = parent;
    }
    return parts.length ? '>' + parts.join('/') : null;
  };
  const isRisk = ${isRiskClassSource};
  const all = [root].concat(Array.from(root.querySelectorAll('*')));
  let clickables = 0;
  let chars = 0;
  let blocks = 0;
  const elementsWithKeys = [];
  for (const el of all) {
    if (!visibleIn(el)) continue;
    const tag = el.tagName || '';
    const interactive = /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag)
      || (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1');
    const own = stripPlaceholders(ownText(el)).replace(/\\s+/g, '');
    if (interactive) clickables += 1;
    if (own) { chars += own.length; blocks += 1; }
    if (interactive || own) {
      elementsWithKeys.push({
        key: keyOf(el),
        clickable: interactive,
        block: own.length > 0,
        chars: own.length,
        risk: isRisk(el),
      });
    }
  }
  const regions = Array.from(root.children).filter(visibleIn).length;
  return {
    clickables,
    chars,
    lines: Math.ceil(chars / ${CHARS_PER_LINE}),
    blocks,
    regions,
    elementsWithKeys,
  };
})()`;

/**
 * The real product's measurement expression: root = `document.body`
 * (parent ADR-V3-001 — the panel has no `#panel` wrapper).
 */
export const DENSITY_MEASURE_SOURCE = DENSITY_MEASURE_TEMPLATE.replace('__V3_ROOT__', 'document.body');

/**
 * The same algorithm against an explicit root — used ONLY by `test/ui/density.mjs`
 * stage A, which reconciles the caliber against the design drafts (their panel
 * root *is* `#panel`). Same string, same algorithm, different root: that is what
 * "同源" means here (NFR-V3-002 / AC-V3-005).
 */
export function measureSourceForRoot(rootExpression) {
  return DENSITY_MEASURE_TEMPLATE.replace('__V3_ROOT__', rootExpression);
}

/** Convenience: the same expression wrapped so it returns a JSON-ready object. */
export const measureExpression = () => DENSITY_MEASURE_SOURCE;

/**
 * The three tier ceilings (spec §9.2, verbatim).
 * `risk` = default + risk increment budget (clickables +10, lines +20).
 */
export const DENSITY_LIMITS = Object.freeze({
  default: Object.freeze({ clickables: 7, lines: 15 }),
  firstRun: Object.freeze({ clickables: 9, lines: 20 }),
  risk: Object.freeze({ clickables: 17, lines: 35 }),
});

/**
 * First-round measured floor for `#log`'s client height (px), replacing the v1
 * anchor (589px) that the v2 insight gate used to pin.
 *
 * v3-1 makes the L0 decision card **resident above the transcript**, which is a
 * deliberate design decision (the author's「下一步做什么」must be readable
 * without scrolling). The message zone is therefore smaller by construction, and
 * the plan (ADR-V3-019 / V31-S3) migrates the old 589px anchor to a
 * **first-round measured floor**:
 *
 *   measured on 2026-09-16 at 400×900 in the DEFAULT tier **with a pending
 *   decision card** (the worst case), on the FINAL build artifact:
 *     `#log` clientHeight = **495 px**
 *   registered floor = 495 − 7 = **488 px**
 *   (the 7px is the *remaining* registered allowance for sub-pixel / font-metric
 *   variance, not a loosened ceiling — the floor may only be RAISED. Review I7:
 *   the earlier version of this comment claimed a 498px measurement with a 10px
 *   allowance; 498 was a pre-final-round figure and 495 is what the shipped
 *   artifact actually renders, so the margin was really 7px. The registered
 *   floor number (488, authorised by ADR-V3-009/ADR-V3-019 V31-S3) is unchanged;
 *   only the *source* statement and the margin are now truthful.)
 *
 * `#log` must remain the ONLY panel-level scroller and must never be occluded;
 * both are asserted independently by `test/ui/l0.mjs`. The registered
 * source measurement lives in `docs/v3-density-baseline.json`
 * (`logClientHeightMeasuredWorst`) and is compared against a fresh measurement by
 * `test/ui/density.mjs` stage F (I8) — the statement above can no longer drift
 * silently.
 */
export const LOG_CLIENT_HEIGHT_FLOOR = 488;

/** The three L0 viewports (width × 900) — all three must pass (AC-V3-002). */
export const DENSITY_VIEWPORTS = Object.freeze([320, 400, 520]);

/** Viewport height used for every cell. */
export const DENSITY_VIEWPORT_HEIGHT = 900;

/** Tier order (also the matrix row order in the summary table). */
export const DENSITY_TIER_ORDER = Object.freeze(['default', 'firstRun', 'risk']);

/** Machine-checkable matrix size: 3 tiers × 3 viewports = 9 mandatory cells. */
export const DENSITY_MATRIX_SIZE = DENSITY_TIER_ORDER.length * DENSITY_VIEWPORTS.length;

/**
 * Tier definitions — product state + hermetic fixture steps.
 * `fixture` names a step driver in `test/ui/density.mjs` (which mutates the
 * real product through its own hooks); `limits` points at the ceiling used.
 */
export const DENSITY_TIERS = Object.freeze({
  default: Object.freeze({
    key: 'default',
    label: 'L0 默认态',
    definition: '已绑定 + 已授权 + 探测完成 + 无待确认 + onboarding 与 discovery-notice 已终结',
    limits: DENSITY_LIMITS.default,
    fixture: 'applyDefault',
    mandatory: true,
  }),
  firstRun: Object.freeze({
    key: 'firstRun',
    label: 'L0 首装态',
    definition: 'onboarding 或 discovery-notice 生效中',
    limits: DENSITY_LIMITS.firstRun,
    fixture: 'applyFirstRun',
    mandatory: true,
    note: 'spec 新建档（设计稿未覆盖）；首轮实测登记为基线，校准只允许下调',
  }),
  risk: Object.freeze({
    key: 'risk',
    label: 'L0 风险态',
    definition: '五类风险信息任一生效（未授权 / 探测中 / 硬底线被拦 / 破坏性待确认 / 引用失效）',
    limits: DENSITY_LIMITS.risk,
    fixture: 'applyRiskSubscenario',
    mandatory: true,
    note: '风险增量预算只能被风险类元素占用（AC-V3-003）',
  }),
});

/**
 * The five risk sub-scenarios. Each is one column of the 5 × 3 = 15 registered
 * cells; the worst value across sub-scenarios takes part in the mandatory
 * judgement for the `risk` tier.
 */
export const RISK_SUBSCENARIOS = Object.freeze([
  Object.freeze({
    key: 'unauthorized',
    label: '未授权',
    dataRiskClass: 'unauthorized',
    productPath: 'authorization store cleared → S1 fail-closed deny projection',
  }),
  Object.freeze({
    key: 'probing',
    label: '探测中',
    dataRiskClass: 'probing',
    productPath: 'site declaration read in flight (no command dispatched)',
  }),
  Object.freeze({
    key: 'hardline',
    label: '硬底线被拦',
    dataRiskClass: 'hardline',
    productPath: 'a blocked `evaluate` receipt arrives through the existing audit/receipt channel',
  }),
  Object.freeze({
    key: 'confirm',
    label: '破坏性待确认',
    dataRiskClass: 'confirm',
    productPath: 'existing `#confirm` card path (destructive sub-command)',
  }),
  Object.freeze({
    key: 'staleRef',
    label: '引用失效',
    dataRiskClass: 'staleRef',
    productPath: 'injected stale-reference event (`window.__v3.testing.staleRef`)',
  }),
]);

/** The four caliber names, for report headers and cross-checks. */
export const DENSITY_CALIBERS = Object.freeze(['C1 可点元素', 'C2 可见正文行', 'C3 可见文本块', 'C4 常驻分区']);

/**
 * Pure judgement. `limitsOverride` (e.g. `{ clickables: 6, lines: 15 }`) is the
 * RP-V3-02 seam that proves the threshold is really consulted rather than being
 * an ignored constant.
 */
export function evaluateDensity(measured, tier = 'default', limitsOverride) {
  const limits = limitsOverride ?? DENSITY_LIMITS[tier];
  if (!limits) throw new Error(`evaluateDensity: unknown tier "${tier}"`);
  const clickables = Number(measured?.clickables ?? 0);
  const lines = Number(measured?.lines ?? 0);
  const exceeds = [];
  if (clickables > limits.clickables) exceeds.push(`C1 可点元素 ${clickables} > ${limits.clickables}`);
  if (lines > limits.lines) exceeds.push(`C2 可见正文行 ${lines} > ${limits.lines}`);
  const ok = exceeds.length === 0;
  const message =
    `${tier}: C1 实测 ${clickables} / 上限 ${limits.clickables}（口径 C1 = 仅 hidden 祖先豁免，` +
    `display:none / visibility / opacity / pointer-events / 视口位置一律不豁免）· ` +
    `C2 实测 ${lines} / 上限 ${limits.lines}（口径 C2 = ⌈Σ自身直接文本去空白 ÷ ${CHARS_PER_LINE}⌉）` +
    ` → ${ok ? 'PASS' : `FAIL [${exceeds.join(' · ')}]`}`;
  return {
    ok,
    tier,
    viewport: measured?.viewport ?? null,
    measured: {
      clickables,
      lines,
      chars: Number(measured?.chars ?? 0),
      blocks: Number(measured?.blocks ?? 0),
      regions: Number(measured?.regions ?? 0),
    },
    limits: { clickables: limits.clickables, lines: limits.lines },
    exceeds,
    message,
  };
}

/**
 * Risk-increment attribution (AC-V3-003). The risk tier is *wider* than the
 * default tier, so the increment must be consumed **only** by risk-class
 * elements. Any new non-risk clickable / text block — or any visible element
 * without a stable key — is a violation.
 */
export function evaluateDelta(defaultMeasured, riskMeasured) {
  const violations = [];
  if (!defaultMeasured || !riskMeasured) return { violations: ['缺少默认态或风险态测量输入'] };
  const base = new Map();
  for (const el of defaultMeasured.elementsWithKeys ?? []) if (el.key) base.set(el.key, el);
  for (const el of riskMeasured.elementsWithKeys ?? []) {
    if (!el.key) {
      violations.push(`可见元素缺少稳定键（id / data-key / 结构路径）→ 无法归属增量：${el.tag ?? '?'}`);
      continue;
    }
    // Risk-class elements are exactly what the wider risk ceiling is FOR: they may
    // appear, grow and be re-keyed. Only non-risk contributions are violations.
    if (el.risk) continue;
    const prev = base.get(el.key);
    if (prev) {
      if (el.clickable && !prev.clickable) violations.push(`既有元素被改为可点（非风险类增量）：${el.key}`);
      if (el.chars > prev.chars) violations.push(`既有元素文本增长（非风险类增量）：${el.key} ${prev.chars}→${el.chars}`);
      continue;
    }
    if (el.risk) continue;
    const what = [el.clickable ? '可点' : '', el.block ? '文本块' : ''].filter(Boolean).join('+');
    if (what) violations.push(`非风险类新增${what}占用风险增量预算：${el.key}`);
  }
  return { violations };
}

/**
 * Registry comparison (ADR-V3-018 decision 2, review I8).
 *
 * `docs/v3-density-baseline.json` is the machine registry of the first real
 * measurement. Until I8 the Chromium gate only *printed* that the file existed —
 * nothing compared the fresh measurement against it, so a product/registry drift
 * (which is exactly how the stale `498px` and `291,523 B` figures survived) was
 * invisible. This pure comparison makes the drift a FAIL with a readable diff.
 *
 * @param measured  a `DENSITY_MEASURE_SOURCE` result (or a `worst` aggregate)
 * @param registered the matching registry cell
 * @param labelOf   a thunk producing the human label (lazy, for cheap big loops)
 * @returns one readable string per diverging caliber (empty ⇒ identical)
 */
export const BASELINE_COMPARE_KEYS = Object.freeze(['clickables', 'lines', 'blocks', 'regions', 'chars']);

export function compareBaselineCells(measured, registered, labelOf = () => 'cell') {
  const diffs = [];
  if (!registered) {
    diffs.push(`${labelOf()}: 基线缺少该登记格（新测量未登记 → 必须显式登记，不得静默通过）`);
    return diffs;
  }
  for (const key of BASELINE_COMPARE_KEYS) {
    if (registered[key] === undefined || measured?.[key] === undefined) continue;
    if (measured[key] !== registered[key]) {
      const direction =
        measured[key] > registered[key]
          ? '高于已登记基线 → 必须收紧或显式重登记（不得静默通过）'
          : '低于已登记基线 → 应重登记收紧（direction=tighten-only）';
      diffs.push(`${labelOf()}.${key}: 实测 ${measured[key]} ≠ 登记 ${registered[key]}（${direction}）`);
    }
  }
  return diffs;
}

/** `true` when the measurement source is free of the banned visibility APIs. */
export const BANNED_MEASURE_APIS = Object.freeze([
  'getComputedStyle',
  'offsetParent',
  'getBoundingClientRect',
  'aria-hidden',
]);

/** Anti-cheat scan (also asserted statically in `density-thresholds.test.ts`). */
export function bannedApisInMeasureSource() {
  return BANNED_MEASURE_APIS.filter((needle) => DENSITY_MEASURE_SOURCE.includes(needle));
}
