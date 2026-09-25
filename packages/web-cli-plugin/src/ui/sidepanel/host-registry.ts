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
 *   · `carrierCount` — the **upper bound** on the number of visible carrier *surfaces*
 *                      (always `1`). It is judged against a **live** reading supplied by
 *                      the panel (`window.__v3.testing.stripChannelReading()`), not merely
 *                      declared: a second surface fails (review R1 BLOCK-03);
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

/** A retired item's counter-proof registration (TASK-V45-111 ⑤ / R-REG-906). */
export interface RetiredHostDisposition {
  /** The `data-host` value (for {@link RETIRED_HOST_ATTRS}) or container id (for {@link RETIRED_CONTAINER_IDS}). */
  readonly item: string;
  /** Where the fact it carried lives now (a stream card / an L2 read-only block / a settings section …). */
  readonly movedTo: string;
  /**
   * The **counter-proof** that must be able to FAIL: re-introducing the item has to
   * turn the judgement red. A retired item without one is「只删标记」, not a retirement.
   */
  readonly counterProof: string;
}

/**
 * V4.5-1 W3 (TASK-V45-111 / ADR-V45-010 §1) — **the registry is emptied**.
 *
 * Before W3 this table registered four `li[data-host]` hosts as「permanent structural
/**
 * The disposition of a host that *would* be registered while the transition was open.
 * W3 empties the table, so this shape now only documents the retired contract (kept so
 * the historical readers / gates can still name the shape).
 */
export interface StructuralHostDisposition {
  /** The `data-host` attribute value. */
  readonly host: string;
  /** Always `false` — a `true` entry would be a transitional host and must be in {@link RETIRED_HOST_ATTRS}. */
  readonly transitional: false;
  /** The single system-channel kinds this host carried (`[]` = not a system channel). */
  readonly channelKinds: readonly string[];
  readonly reason: string;
}

/**
 * V4.5-1 W3 (TASK-V45-111 / ADR-V45-010 §1) — **the registry is emptied**.
 *
 * Before W3 this table registered four `li[data-host]` hosts as「permanent structural
 * home now」*because*「its content is pinned by protection gates」 — i.e. the permanence
 * was **inferred from the gates instead of from the form** (the v4.5 ticket's core
 * finding). W3 makes the implementation obey the F form first (four hosts gone, the
 * stream is a pure card list) and then restates the gates.
 *
 * The table therefore becomes a **reverse criterion**: `[]` means *any* `li[data-host]`
 * at all is a regression, with no prior registration needed to detect it
 * (`evaluateHostRegistry()` ①).
 */
export const REGISTERED_STRUCTURAL_HOSTS: readonly StructuralHostDisposition[] = Object.freeze([]);

/** The `data-host` values that must exist inside `#stream` — derived, always `[]` now. */
export const REGISTERED_HOST_ATTRS: readonly string[] = Object.freeze(
  REGISTERED_STRUCTURAL_HOSTS.map((h) => h.host).sort(),
);

/**
 * The **retired** `data-host` values (V4.5-1 W3 / TASK-V45-111 / ADR-V45-010 §2):
 * `decision` / `composer` / `l1-panels` joined `strips` when the four fixed-position
 * hosts were removed from `index.html`. A re-introduced host FAILS the judgement.
 */
export const RETIRED_HOST_ATTRS: readonly string[] = Object.freeze([
  'decision',
  'composer',
  'l1-panels',
  'strips',
]);

/**
 * ── The discrimination RULE（review R1 I-06 / BLOCK-01）────────────────────────
 *
 * The list below is **not**「every id the v4.5-1 round touched」— it is the set of
 * **真退役容器** (true retirements), and the rule that decides membership is:
 *
 *   · **真退役** = the id's **role** disappears with the host (a trigger / a host /
 *     a decision shell) and the product has **no write point** that re-mints that id
 *     anywhere. Zero DOM presence is required (`getElementById(id) === null`), so
 *     「退役」cannot be satisfied by deleting the attribute while keeping the node
 *     (the v4-4 BLOCK-02 lesson).
 *   · **迁移容器** = the **content id is moved with its carrier** (the id survives,
 *     the writer moves) — e.g. `#l1-ref` / `#l1-more` are re-minted *inside* the
 *     newest card, `#l0-receipt-summary` is re-minted inside the newest card's
 *     `.card-fixed`, `#l1-gestures` moves to the settings「帮助」section. These keep
 *     their ids **on purpose**, are registered in {@link MIGRATED_CONTAINER_IDS},
 *     and must **never** enter this list — a migrated id in the retirement list is
 *     the BLOCK-01 self-contradiction (the product re-mints it after the first real
 *     receipt ⇒ a false「retired container still in the DOM」).
 *
 * Also deliberately absent (PRESERVED): `#send-reason` (status bar), `#rebind` (settings view),
 * and the L2 read-only content containers that merely moved (`#l1-local-tree` /
 * `#l1-local-tree-rows` / `#l1-receipt` / `#l1-receipt-rows`).
 *
 * ★ IAN-2（ADR-IAN-004 §①步4 / ADR-IAN-005 §⑥ / X-IAN-2·3）：`#composer` / `#input` / `#send`
 * 三 id 原为**保留（兼容读取面，NFR-V45-006）**，本轮 **DOM 真退役** ⇒ 移出 PRESERVED 并
 * **逐 id 入册**（13 → **16**）。`RETIRED_HOST_ATTRS` 的宿主值 `'composer'` **逐字保留**
 * （`data-host` 值 ≠ 容器 id）。
 *
 * ── The 16真退役容器 ─────────────────────────────────────────────────────────
 */
export const RETIRED_CONTAINER_IDS: readonly string[] = Object.freeze([
  'composer',
  'input',
  'l0-decision',
  'l0-pick',
  'l0-status-band',
  'l0-kicker',
  'l0-more',
  'l0-ref-toggle',
  'l1-group',
  'l1-history-toggle',
  'l1-history',
  'l1-history-rows',
  'l1-local-tree-toggle',
  'l1-receipt-toggle',
  'l1-gestures-toggle',
  'send',
].sort());

/**
 * The **migrated containers** (review R1 BLOCK-01 / I-06): ids that survive the
 * v4.5-1 relocation because their **content id moves with its carrier**. They are
 * registered here explicitly so the「迁移 vs 真退役」rule is machine-visible and the
 * two lists can never drift back into the BLOCK-01 contradiction:
 *
 *   · `l0-receipt-summary` — the receipt summary: the writer (`l1/panels.ts#paintReceiptSummary`)
 *     **moves** the node into the newest card's `.card-fixed` (never duplicates it);
 *   · `l1-more` / `l1-consequences` — the option pool / consequence preview, re-minted
 *     inside the newest ask / auth card (`cards/decision-region.ts`);
 *   · `l1-ref` — the reference evidence block, re-minted inside the newest `ref` card
 *     (`cards/ref.ts`);
 *   · `l1-gestures` — the gesture table, moved into the settings「帮助」section
 *     (`settings/help.ts`).
 *
 * A node gate asserts the two lists are **disjoint** and that every migrated id is
 * still re-minted by a production write point (a migrated id that no longer has a
 * writer has silently become a retirement and must be moved to the retired list).
 */
export const MIGRATED_CONTAINER_IDS: readonly string[] = Object.freeze([
  'l0-receipt-summary',
  'l1-more',
  'l1-consequences',
  'l1-ref',
  'l1-gestures',
]);

/**
 * The union alias kept for the existing readers (`hosts()` / gates read one list).
 * The v4.5-1 split is `RETIRED_HOST_ATTRS` (host values) + `RETIRED_CONTAINER_IDS`
 * (container ids); this alias is the **derived** union, never a hand-written second list.
 */
export const RETIRED_HOST_IDS: readonly string[] = Object.freeze([
  ...RETIRED_HOST_ATTRS,
  ...RETIRED_CONTAINER_IDS,
]);

/**
 * The retirement truth-table: every retired host value / container id, where its fact
 * lives now, and the counter-proof that keeps「退役」falsifiable (judgement ⑤).
 */
export const RETIRED_HOST_DISPOSITIONS: readonly RetiredHostDisposition[] = Object.freeze([
  ...RETIRED_HOST_ATTRS.map((item) =>
    Object.freeze({
      item,
      movedTo: '流内卡（`askuser` / `auth` / `ref`）+ `#view-host` 只读承载块 + 设置「帮助」分区',
      counterProof: `向 #stream 注入 1 个 li[data-host="${item}"] ⇒ 零宿主判据红（移除后逐字节还原 ⇒ 绿）`,
    }),
  ),
  ...RETIRED_CONTAINER_IDS.map((item) =>
    Object.freeze({
      item,
      movedTo: '卡内作用域（`[data-card-key]`）+ 卡固化区 / L2 只读承载块 / 设置「帮助」分区',
      counterProof: `把 #${item} 重新插入文档 ⇒ 退役容器判据红（移除后 ⇒ 绿）`,
    }),
  ),
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
 *   · `send-reason`— the send-disabled reason (`eventizeChannels`) — **NOT
 *                    retired**: it lives in `#region-statusbar` and keeps its element.
 *
 * `emitterSite` is a **locatable source fragment** (not prose): the node gate
 * `test/density-thresholds.test.ts` counts it in the production source and requires
 * **exactly one** occurrence per channel — a second write path is a gate failure, not a
 * review finding. `carrierCount` is an explicit `1`: the fact family may be projected onto
 * **one** visible surface; the retired strip node must be gone and the in-stream carrier
 * (system row / first-run card) is the only one left. The judgement consumes a **live**
 * reading of that surface count (see {@link StripChannelReading.observedCarriers}).
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
    reason: '首装步骤：`firstRunCard` 是**唯一可见载体**（`terminable` / `!open` 谓词不变）；卡在场时**单行系统事件行被抑制**（事实不双见 —— 见 sidepanel.ts `observeChannel(..., suppressed)` 裁决），故载体面数恒 ≤ 1。',
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
 * V4.5-1 review R1 BLOCK-03 — the **legacy projection surfaces** per channel.
 *
 * Each merged fact family used to have a visible strip node. Those nodes are retired
 * (`getElementById(id) === null`), so the live carrier reading must count **both**
 * surfaces: a reintroduced legacy node (a second carrier ⇒ double write) and the
 * in-stream carrier. Without this half the reading could not see a re-projection
 * (`firstRun` was the concrete case: a row *plus* the card).
 *
 * `send-reason` is the exception: it is **not** a retired id but the preserved
 * carrier itself (`#send-reason` in `#region-statusbar`), so it maps to its own id.
 */
export const STRIP_CHANNEL_LEGACY_IDS: Readonly<Record<string, string>> = Object.freeze({
  env: 'env-guard',
  site: 'site-hint',
  firstRun: 'onboarding',
  probe: 'discovery-notice',
  notice: 'notice',
  'send-reason': 'send-reason',
});

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
  /**
   * Per channel: the **observed** number of visible carrier **surfaces** (W4 live reading,
   * supplied by `window.__v3.testing.stripChannelReading()`).
   *
   * A *surface* is a DOM region that displays the fact family's **current** state — the
   * (now retired) strip node and/or the in-stream carrier (a system row / the first-run
   * card). Cumulative **event rows** are the same surface's history, not a second surface,
   * and are therefore normalised to `1` (see `stripCarrierCount()` in `sidepanel.ts`).
   * `0` means「该事实当前不可见」and is legitimate — the judgement only FAILs on **more
   * than one** surface (双写) or on a **missing** reading (判据不得空转).
   */
  readonly observedCarriers: readonly { readonly channel: string; readonly count: number }[];
  /** `#send-reason` is still a descendant of `#region-statusbar`. */
  readonly sendReasonInStatusbar: boolean;
}

/**
 * The single-write judgement (three classes, all machine-checkable):
 *   ① every channel has **exactly one** emitter call site in the production sources;
 *   ② every channel's **live carrier-surface reading** is present and **≤ `carrierCount`**
 *      (1) — a second surface (a reintroduced strip node, an injected duplicate row) is a
 *      double write and FAILs. The reading is **mandatory**: an absent channel is「判据空转」
 *      and FAILs too (review R1 BLOCK-03: the load-bearing half used to be skipped);
 *   ③ `#send-reason` is still inside `#region-statusbar` (the one preserved strip id).
 *
 * Pure: the same implementation is driven by the node gate (source-text emitter counts +
 * a live-shaped carrier reading) and by the Chromium gates (the panel's live
 * `window.__v3.testing.stripChannelReading()`), so a second, drifting caliber cannot appear.
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
    if (!carrier) {
      problems.push(`单写判据：通道 ${binding.channel} 未提供 live 载体读数（判据不得空转）`);
    } else if (carrier.count > binding.carrierCount) {
      problems.push(`单写判据：通道 ${binding.channel} 的可见载体面数 = ${carrier.count}，上限 ${binding.carrierCount}（事实面必须唯一，禁止双写）`);
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
  /**
   * V4.5-1 W3 (TASK-V45-111 ⑥ / FR-V45-011): the production source texts the
   * 「双写理由已移除」judgement scans. Optional so the live panel reading stays cheap;
   * when provided, a source containing the double-write rationale FAILS.
   */
  readonly sources?: readonly { readonly path: string; readonly text: string }[];
}

/**
 * The double-write rationale literals that must have **zero** hits anymore
 * (FR-V45-011: the「also append-recorded」justification is what made the DOM
 * projection look sanctioned).
 */
export const DOUBLE_WRITE_REASON_LITERALS: readonly string[] = Object.freeze([
  'ALSO append-recorded',
  'additionally written to the system channel',
  'permanent structural home now',
]);

/**
 * The ONE judgement — **six problem classes** (TASK-V45-111 / ADR-V45-010 §3):
 *
 *   ① any depth `li[data-host]` exists ⇒ red (the registry is a *reverse* criterion:
 *      a new host needs a ruling, not an attribute);
 *   ② any `RETIRED_HOST_ATTRS` value exists ⇒ red;
 *   ③ any `RETIRED_CONTAINER_IDS` id exists in the DOM ⇒ red;
 *   ④ `[data-transitional-host]` count ≠ 0 ⇒ red (the transition is closed, not renamed);
 *   ⑤ every retired item carries a counter-proof registration (no silent retirements);
 *   ⑥ the production sources carry none of {@link DOUBLE_WRITE_REASON_LITERALS}.
 *
 * Deliberately a pure function of the reading: the panel, the Chromium gate and the
 * node gate all call the same implementation, so a second, drifting caliber cannot
 * appear.
 */
export function evaluateHostRegistry(
  reading: HostRegistryReading,
  /**
   * Injection seam (RP-V3-05 pattern): the retired truth-table may be **forged** so the
   * reverse proof can show judgement ⑤ really FAILs when the counter-proof metadata is
   * removed. Defaults to the product table — the gate never has to pass it.
   */
  dispositions: readonly RetiredHostDisposition[] = RETIRED_HOST_DISPOSITIONS,
): string[] {
  const problems: string[] = [];
  // ① zero hosts — ANY depth, including a renamed / nested host.
  const present = [...reading.presentHosts].sort();
  if (present.length > 0) {
    problems.push(`零宿主判据：实存 li[data-host] = [${present.join(', ')}]，必须为 ∅（任何宿主都必须先走裁决）`);
  }
  // ② retired host attribute values must be absent.
  for (const host of RETIRED_HOST_ATTRS) {
    if (present.includes(host)) {
      problems.push(`零宿主判据：已退役宿主 data-host="${host}" 仍在 DOM —— 宿主退役不得回退`);
    }
  }
  // ③ retired container ids must be absent.
  for (const id of reading.retiredPresent) {
    problems.push(`零宿主判据：已退役容器 #${id} 仍在 DOM —— 结构性清零判据被绕过（删属性不改 DOM 不算退役）`);
  }
  // ④ the transitional marker may not come back.
  if (reading.transitionalCount !== 0) {
    problems.push(`零宿主判据：[data-transitional-host] 计数 = ${reading.transitionalCount}，必须为 0（过渡态不得重开）`);
  }
  // ⑤ every retired item needs a counter-proof registration.
  const registered = new Set(dispositions.map((d) => d.item));
  for (const item of RETIRED_HOST_IDS) {
    if (!registered.has(item)) {
      problems.push(`零宿主判据：退役项 ${item} 缺少「重新引入即红」的反证登记（退役不得只删标记）`);
    }
  }
  const proofMissing = dispositions.filter((d) => !d.counterProof.trim() || !d.movedTo.trim());
  if (proofMissing.length > 0) {
    problems.push(`零宿主判据：${proofMissing.length} 条退役登记缺少 movedTo / counterProof（反证不得空转）`);
  }
  // ⑥ the double-write rationale must be gone from the sources.
  for (const source of reading.sources ?? []) {
    for (const literal of DOUBLE_WRITE_REASON_LITERALS) {
      if (source.text.includes(literal)) {
        problems.push(`零宿主判据：${source.path} 仍含双写理由字面「${literal}」（FR-V45-011：理由已随形态收口失效）`);
      }
    }
  }
  return problems;
}
