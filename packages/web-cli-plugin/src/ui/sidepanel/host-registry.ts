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
 *      a re-introduced `#l0-pick` / `#l0-status-band` / `li[data-host="strips"]` fails;
 *   ④ no `[data-transitional-host]` marker may exist anywhere (the transition is
 *      closed, not renamed);
 *   ⑤ every merged strip channel is bound to its `SystemEventKind`
 *      ({@link STRIP_CHANNEL_KINDS}); a node gate asserts each kind really has a
 *      production emitter, so「归并」cannot be satisfied by keeping the DOM alone.
 *
 * ── V4.5-1 W2 (TASK-V45-104 / ADR-V45-001 §7) — the **single-write** contract ──
 *
 * The v4-4 registry described each merged strip as a readable status projection whose
 * every fact was **additionally** written to the system channel — i.e. a sanctioned
 * **double write** (the v4.5-1 ticket's core finding). v4.5-1 retires the DOM projection
 * (the five strip nodes are gone from `index.html`), so the registry is restated as a
 * **single-write** table:
 *
 *   `{channel, kind, emitterSite, carrierCount: 1, reason}`
 *
 *   · `channel`      — the fact family (the retired strip's role, not an element id);
 *   · `kind`         — the `SystemEventKind` the fact is append-recorded under;
 *   · `emitterSite`  — the **ONE** production call site, locatable in the source text
 *                      (machine-checked by `test/density-thresholds.test.ts`);
 *   · `carrierCount` — the visible carrier count in the stream; an explicit constant
 *                      (always `1`) rather than something derived from a DOM lookup;
 *   · `reason`       — why this channel is the right carrier for the fact.
 *
 * The former「legacy id **still in the DOM**」criterion is **removed** — it contradicted
 * the retirement head-on (the v4.5 ticket's core finding). `#send-reason` is explicitly
 * **not** part of the retired面 (it lives in `#region-statusbar`); it keeps its channel
 * binding so the「只在原因变化时追加」rule stays machine-checked.
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
 * The `li[data-host]` hosts that remain **after W2**. W2 retired the `strips` host
 * (its five channels are now single-written system rows), so three hosts are left;
 * W3/TASK-V45-111 empties this table entirely (zero hosts = the terminal reading,
 * where any `li[data-host]` at all is a regression).
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
  // V4.5-1 W2/TASK-V45-105: the five merged strips' **host** is gone (`#stream` lost
  // its `strips` li together with the five nodes inside it). W3/TASK-V45-111 splits this
  // list into `RETIRED_HOST_ATTRS` + `RETIRED_CONTAINER_IDS` and empties the registry.
  'strips',
]);

/**
 * The **single-write** table (ADR-V45-001 §7 / TASK-V45-104). One entry per fact family
 * that used to have a visible strip projection:
 *
 *   · `env`        — the non-extension guard (`applyEnvGuard`);
 *   · `site`       — 「无活跃站点」的 reason + next action (`eventizeChannels`);
 *   · `firstRun`   — the first-run guidance (`firstRunCard` / onboarding);
 *   · `probe`      — the discovery/probe phase + reason (`eventizeChannels`);
 *   · `notice`     — the v1 overwrite slot (`chat-state.ts#systemRow`);
 *   · `send-reason`— the composer's disabled reason (`eventizeChannels`) — **NOT
 *                    retired**: it lives in `#region-statusbar` and keeps its element.
 *
 * `emitterSite` is a **locatable source fragment** (not prose): the node gate
 * `test/density-thresholds.test.ts` counts it in the production source and requires
 * **exactly one** occurrence per channel — a second write path is a gate failure, not a
 * review finding. `carrierCount` is an explicit `1`: the visible carrier is the single
 * stream row (the DOM projection no longer exists, so nothing can be counted twice).
 */
export interface StripChannelBinding {
  /** The fact family (the retired strip's role — NOT an element id). */
  readonly channel: string;
  /** The single-channel kind its facts are append-recorded under. */
  readonly kind: string;
  /** The ONE production emitter call site (a locatable source fragment). */
  readonly emitterSite: string;
  /** The visible carrier count in the stream (explicit constant, always `1`). */
  readonly carrierCount: 1;
  readonly reason: string;
}

export const STRIP_CHANNEL_KINDS: readonly StripChannelBinding[] = Object.freeze([
  Object.freeze({
    channel: 'env',
    kind: 'env',
    emitterSite: "dispatch({ type: 'system', kind: 'env', text: env.banner })",
    carrierCount: 1,
    reason: '环境守卫（非扩展上下文）：一次性阻塞告警 ⇒ 唯一载体 = 流内 `env` 系统行（节点已退役，不再有第二投影）。',
  }),
  Object.freeze({
    channel: 'site',
    kind: 'site',
    emitterSite: "observeChannel('site',",
    carrierCount: 1,
    reason: '无活跃站点的可解释原因 + 下一步动作：只在文案变化时追加（长文案走行 `title`，同过净化）。',
  }),
  Object.freeze({
    channel: 'firstRun',
    kind: 'firstRun',
    emitterSite: "observeChannel('firstRun',",
    carrierCount: 1,
    reason: '首装步骤：由 `firstRunCard` 归并承载（`terminable` / `!open` 谓词不变），步骤变化时追加。',
  }),
  Object.freeze({
    channel: 'probe',
    kind: 'probe',
    emitterSite: "observeChannel('probe',",
    carrierCount: 1,
    reason: '探测状态 / 原因：只在相位或文案变化时追加（稳态不重复）；长文案走行 `title`。',
  }),
  Object.freeze({
    channel: 'notice',
    kind: 'notice',
    emitterSite: "systemRow(state, at, action.text, 'notice', undefined, action.title)",
    carrierCount: 1,
    reason: 'R2 已归并的覆盖槽：`{type:notice}` 走唯一通道；v4.5-1 起**只在流内**可见（`#notice` 节点已退役）。',
  }),
  Object.freeze({
    channel: 'send-reason',
    kind: 'send',
    emitterSite: "observeChannel('send',",
    carrierCount: 1,
    reason: '发送禁用原因：**保留**要素 —— 状态栏 `#send-reason` 仍是同一事实的可读面（法三：状态栏只放常驻状态与风险）。',
  }),
]);

/**
 * The channel → kind map derived from the ONE table (the merge matrix reads this, never
 * a hand-written second list).
 */
export const STRIP_CHANNEL_KIND_MAP: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(STRIP_CHANNEL_KINDS.map((b) => [b.channel, b.kind])),
);

/** The retired strip channels (no visible carrier other than the stream row). */
export const RETIRED_STRIP_CHANNELS: readonly string[] = Object.freeze(
  STRIP_CHANNEL_KINDS.filter((b) => b.channel !== 'send-reason').map((b) => b.channel),
);

export interface StripChannelReading {
  /** Per channel: how many times its `emitterSite` occurs in the production sources. */
  readonly emitterCounts: readonly { readonly channel: string; readonly count: number }[];
  /** Per channel: the **observed** visible carrier count in `#stream` (W3 live reading). */
  readonly observedCarriers: readonly { readonly channel: string; readonly count: number }[];
  /** `#send-reason` is still a descendant of `#region-statusbar`. */
  readonly sendReasonInStatusbar: boolean;
}

/**
 * The single-write judgement (three classes, all machine-checkable):
 *   ① every channel has **exactly one** emitter call site in the production sources;
 *   ② every channel's **visible carrier count** equals its declared `carrierCount` (1);
 *   ③ `#send-reason` is still inside `#region-statusbar` (the one preserved strip id).
 *
 * Pure: the same implementation is driven by the node gate (source-text counts) and, in
 * W4, by the Chromium reading (live `#stream` counts).
 */
export function evaluateStripChannels(reading: StripChannelReading): string[] {
  const problems: string[] = [];
  for (const binding of STRIP_CHANNEL_KINDS) {
    const site = reading.emitterCounts.find((e) => e.channel === binding.channel);
    if (!site) {
      problems.push(`单写判据：通道 ${binding.channel} 未提供 emitter 读数（判据不得空转）`);
    } else if (site.count !== 1) {
      problems.push(`单写判据：通道 ${binding.channel} 的 emitter 调用点 = ${site.count}，必须恰好 1（唯一生产入口）`);
    }
    const carrier = reading.observedCarriers.find((c) => c.channel === binding.channel);
    if (!carrier) continue; // W2: 流内 live 读数在 W4 接入；未提供时只判 emitter 唯一性。
    if (carrier.count !== binding.carrierCount) {
      problems.push(`单写判据：通道 ${binding.channel} 的可见载体数 = ${carrier.count}，登记为 ${binding.carrierCount}（事实面必须唯一）`);
    }
  }
  if (!reading.sendReasonInStatusbar) {
    problems.push('单写判据：`#send-reason` 必须仍在 `#region-statusbar` 内（保留要素，不随 strips 退役）');
  }
  return problems;
}

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
