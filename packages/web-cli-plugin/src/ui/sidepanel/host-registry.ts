/**
 * V4-4 review 修复轮 **BLOCK-02** — the **structural** transitional-host criterion.
 *
 * ── Why this module exists ───────────────────────────────────────────────────
 *
 * v4-1 put every displaced container into a `li[data-transitional-host]` inside
 * `#stream` with the obligation「只建不销 → v4 收口清零」(ADR-V4-005 §6 / R4-18).
 * The R2 closeout satisfied the *count* judgement by **removing the attribute** from
 * the four live hosts, which made「计数 = 0」vacuously true while the containers
 * stayed: the review (BLOCK-02 ②) correctly called this「自我裁决自我验收」. The
 * criterion must be able to tell「the transitional state is closed」from「the marker
 * was deleted」.
 *
 * ── The criterion (structural, falsifiable, non-vacuous) ─────────────────────
 *
 *   ① every host that REMAINS must be **registered** here with an explicit
 *      disposition (`transitional: false`) and a reason — an unregistered
 *      `li[data-host]` fails (a new permanent home needs a ruling, not an attribute);
 *   ② every REGISTERED host must be present (a silently deleted host fails too);
 *   ③ the **retired** containers (their content was superseded by in-flow facts) are
 *      enumerated in {@link RETIRED_HOST_IDS} and must have **zero** DOM presence —
 *      a re-introduced `#l0-pick` / `#l0-status-band` fails;
 *   ④ no `[data-transitional-host]` marker may exist anywhere (the transition is
 *      closed, not renamed);
 *   ⑤ every merged strip channel is bound to its `SystemEventKind`
 *      ({@link STRIP_CHANNEL_KINDS}); a node gate asserts each kind really has a
 *      production emitter, so「归并」cannot be satisfied by keeping the DOM alone.
 *
 * Pure data + one pure evaluator: importable from node tests and from the panel)
 * (the panel feeds it the live DOM reads via `window.__v3.testing.hosts()`).
 *
 * @module ui/sidepanel/host-registry
 */

/** The `data-host` values that must exist inside `#stream` (registered, permanent). */
export interface StructuralHostDisposition {
  /** The `data-host` attribute value. */
  readonly host: string;
  /** Always `false` — a `true` entry would be a transitional host and must be registered in `RETIRED_HOST_IDS` instead. */
  readonly transitional: false;
  /** The single system-channel kinds this host carries (`[]` = not a system channel). */
  readonly channelKinds: readonly string[];
  readonly reason: string;
}

/**
 * The four `li[data-host]` hosts that remain. Each is a **permanent structural
 * home** now: its content is pinned by protection gates (journey / binding /
 * hardening / l0), so the v4-1「过渡」reading no longer applies and the marker was
 * removed as part of the CLOSED state — not as a way to silence the count.
 */
export const REGISTERED_STRUCTURAL_HOSTS: readonly StructuralHostDisposition[] = Object.freeze([
  Object.freeze({
    host: 'decision',
    transitional: false,
    channelKinds: Object.freeze(['decision', 'turn']) as unknown as readonly string[],
    reason: 'L0 decision/receipt slot (`#l0-decision`): ask/auth/reference decisions render as in-flow cards; the slot keeps the drop target + receipt summary (protection gates read it).',
  }),
  Object.freeze({
    host: 'composer',
    transitional: false,
    channelKinds: Object.freeze(['turn']) as unknown as readonly string[],
    reason: 'Composer host: the turn entry is the single `requestTurn()` path; `#composer` stays `hidden` (law four) and `#input`/`#send` are read by journey/binding.',
  }),
  Object.freeze({
    host: 'l1-panels',
    transitional: false,
    channelKinds: Object.freeze([]) as unknown as readonly string[],
    reason: 'L1 disclosure group (7 classes): read-only projections of existing facts; no system-event channel of its own.',
  }),
  Object.freeze({
    host: 'strips',
    transitional: false,
    channelKinds: Object.freeze(['env', 'site', 'firstRun', 'probe', 'notice']) as unknown as readonly string[],
    reason: 'The five merged strips keep their readable status projection (protection gates pin `#notice` / `#discovery-notice` / `#site-hint` / `#env-guard`), but every fact is ALSO append-recorded through the one system channel (eventized).',
  }),
]);

/** The `data-host` values that must exist (derived from the registry — never hand-listed). */
export const REGISTERED_HOST_ATTRS: readonly string[] = Object.freeze(
  REGISTERED_STRUCTURAL_HOSTS.map((h) => h.host).sort(),
);

/**
 * The **retired** containers: the v4-1 obligation said their content is displaced,
 * so their DOM must be GONE (not merely unmarked). Enumerated explicitly so the
 * criterion stays falsifiable — re-adding one is a structural regression.
 */
export const RETIRED_HOST_IDS: readonly string[] = Object.freeze([
  'l0-pick', // V4-4 TASK-806: the panel-side pick entry (a one-shot act does not belong in a toolbar)
  'l0-status-band', // V4-1: the v3 one-click status band (the summary became read-only)
]);

/**
 * The five merged transient channels (plus the already-merged `#notice`) and the
 * `SystemEventKind` each one is eventized through. A node gate asserts every kind
 * here has a real production emitter call site.
 */
export interface StripChannelBinding {
  /** The legacy strip DOM id (kept as the readable status projection). */
  readonly id: string;
  /** The single-channel kind its facts are append-recorded under. */
  readonly kind: string;
  readonly reason: string;
}

export const STRIP_CHANNEL_KINDS: readonly StripChannelBinding[] = Object.freeze([
  Object.freeze({ id: 'env-guard', kind: 'env', reason: '环境守卫（非扩展上下文）：一次性告警 ⇒ 系统行（同上仍在 DOM 里作为可读告警）。' }),
  Object.freeze({ id: 'site-hint', kind: 'site', reason: '无活跃站点的可解释原因：只在文案变化时追加（常驻状态事件化，不刷屏）。' }),
  Object.freeze({ id: 'onboarding', kind: 'firstRun', reason: '首装步骤：首装卡（firstRun 档推荐 + 系统行）承载，步骤变化时追加。' }),
  Object.freeze({ id: 'discovery-notice', kind: 'probe', reason: '探测状态/原因：只在相位或文案变化时追加（稳态不重复）。' }),
  Object.freeze({ id: 'send-reason', kind: 'send', reason: '发送禁用原因：只在原因变化时追加（状态栏职责不变）。' }),
  Object.freeze({ id: 'notice', kind: 'notice', reason: 'R2 已归并的覆盖槽：`{type:notice}` 已走唯一通道（DOM 保留供保护门禁读取）。' }),
]);

export interface HostRegistryReading {
  /** The `data-host` values really present inside `#stream` (order-insensitive). */
  readonly presentHosts: readonly string[];
  /** `document.querySelectorAll('[data-transitional-host]').length`. */
  readonly transitionalCount: number;
  /** The subset of {@link RETIRED_HOST_IDS} that is still present in the DOM. */
  readonly retiredPresent: readonly string[];
}

/**
 * The ONE judgement. Returns the readable problems (empty = structurally clean).
 *
 * Deliberately a pure function of the reading: the panel, the Chromium gate and the
 * node gate all call the same implementation, so a second, drifting caliber cannot
 * appear.
 */
export function evaluateHostRegistry(reading: HostRegistryReading): string[] {
  const problems: string[] = [];
  const present = [...reading.presentHosts].sort();
  const registered = [...REGISTERED_HOST_ATTRS];
  for (const host of registered) {
    if (!present.includes(host)) problems.push(`登记的结构宿主 ${host} 缺失（不得静默删除：注册表是结构契约）`);
  }
  for (const host of present) {
    if (!registered.includes(host)) problems.push(`未登记的 li[data-host="${host}"] —— 新增宿主必须走注册表 + 裁决，不得只加属性`);
  }
  for (const entry of REGISTERED_STRUCTURAL_HOSTS) {
    if (entry.transitional !== false) problems.push(`宿主 ${entry.host} 的 transitional 必须为 false（过渡宿主只能出现在 RETIRED_HOST_IDS）`);
  }
  if (reading.transitionalCount !== 0) {
    problems.push(`[data-transitional-host] 计数 = ${reading.transitionalCount}，必须为 0（过渡态不得重开）`);
  }
  for (const id of reading.retiredPresent) {
    problems.push(`已退役容器 #${id} 仍在 DOM —— 结构性清零判据被绕过（删属性不改 DOM 不算退役）`);
  }
  return problems;
}
