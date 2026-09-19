/**
 * V3-2 TASK-205 / TASK-206 (ADR-V3-020~023 / FR-V3-030~040) — the L1 layer.
 *
 * ── Why one click reveals a whole group ─────────────────────────────────────
 *
 * The L0 default tier's clickable budget is **exactly full** (7/7: the status
 * band, the pick entry, two recommended options, 「更多选项」, the reference chip
 * and the status bar — see the registered density baseline). Adding one entry per
 * L1 class would push the measured default tier over its ceiling, which is a hard
 * red line. So the three *existing* L0 disclosures are the entries, and one click
 * on each reveals the classes that belong to it:
 *
 *   `#l0-status-band`  → ① l1-status + ④ local tree + ⑤ history + ⑥ receipt + ⑦ gestures
 *   `#l0-ref-toggle`   → ③ l1-ref-evidence
 *   `#l0-more`         → ⑧ l1-more + ② l1-consequences
 *
 * Every class still owns its `[data-l1-panel]` container (default `hidden`, folded
 * only through `window.__v3.disclosure`) and its own labelled trigger for
 * individual (re)collapse, so the eight classes are enumerable and each one is
 * ≤1 interaction from the default state — measured by `test/ui/l1.mjs`.
 *
 * ── The four hard rules kept structural here ────────────────────────────────
 *
 *   - **The risk rail is never written from here.** Invalidation rows go through
 *     `l0/risk-rail.ts#renderRiskRail` (its `staleRef` row carries the readable
 *     dimension reason); this module never touches `#risk-rail`.
 *   - **Blocking is not a branch discipline**: `dispatchRefAction()` calls
 *     `isRefUsable()` first and returns before any command is dispatched; the
 *     stale state rewrites `#l0-pick` into 「重新拾取」 instead of acting.
 *   - **No second panel-level scroller**: the L1 group's bounded scroll block
 *     lives in `#panel-top` (outside `#panel-main`), so `#log` stays the only
 *     panel-level scroller.
 *   - **Zero write controls in the evidence layer**: `#l1-ref-rows` is a pure text
 *     projection; the panel's only controls are the two recovery paths
 *     FR-V3-038 requires.
 *
 * All static copy is markup (`index.html`); this module fills values only.
 *
 * @module l1/panels
 */
import type { DisclosureController } from '../disclosure.js';
import { L1_GESTURE_COUNT, L1_GESTURE_LABELS, decisionHistoryLabel, isDestructiveOption } from '../view-model.js';
import type { DecisionRound } from '../view-model.js';
import { buildLocalTree } from './local-tree.js';
import type { LocalTreeView } from './local-tree.js';
import { buildL1Receipt, receiptPiecesPresent } from './receipt.js';
import type { L1Receipt } from './receipt.js';
import { createRefStore, refEvidenceRows } from './ref-store.js';
import type { RawRefFacts, RefRecord, RefStore } from './ref-store.js';
import { isRefUsable } from './ref-validity.js';
import type { RefEnv, RefRescue, RefResolution, RefVerdict } from './ref-validity.js';
import type { OwnershipTree } from '../../../insight/ownership-tree.js';
import type { TreeReceipt } from '../../tree/tree-receipt.js';

/** The five classes one click on `#l0-status-band` reveals. */
export const L1_STATUS_GROUP = ['l1-status', 'l1-local-tree', 'l1-history', 'l1-receipt', 'l1-gestures'];
/** `#l0-more` reveals these two together (options pool + consequences). */
export const L1_MORE_GROUP = ['l1-more', 'l1-consequences'];
/** `data-l1-panel` value → the element id carrying it. */
export const L1_ELEMENT_IDS: Readonly<Record<string, string>> = {
  'l1-status': 'topbar',
  'l1-consequences': 'l1-consequences',
  'l1-ref-evidence': 'l1-ref',
  'l1-local-tree': 'l1-local-tree',
  'l1-history': 'l1-history',
  'l1-receipt': 'l1-receipt',
  'l1-gestures': 'l1-gestures',
  'l1-more': 'l1-more',
};
/** Class → the labelled trigger that owns it (`aria-expanded`/`aria-controls`). */
export const L1_TRIGGERS: Readonly<Record<string, string>> = {
  'l1-status': 'l0-status-band',
  'l1-consequences': 'l1-consequences-toggle',
  'l1-ref-evidence': 'l0-ref-toggle',
  'l1-local-tree': 'l1-local-tree-toggle',
  'l1-history': 'l1-history-toggle',
  'l1-receipt': 'l1-receipt-toggle',
  'l1-gestures': 'l1-gestures-toggle',
  'l1-more': 'l0-more',
};
/** The readable effect per gesture (same keys as `L1_GESTURE_LABELS`). */
const GESTURE_EFFECTS: Readonly<Record<string, string>> = Object.freeze({
  'Alt + 悬停': '唯一描边 + 语义路径/选择器/摘要；Esc 或松开 Alt 即撤销（零命令）',
  'Alt + 拖动': '跟随胶囊；拖到侧栏生成引用，未落到侧栏 ⇒ 已取消（零副作用）',
  右键: '自绘菜单：纳入引用 / 作为操作目标 / 引用选中文本 / 在此处拾取 / 交给页面原生菜单',
  拖选文本: '选区右下气泡「引用选中内容（N 字）」→ 点击生成引用（输入框内禁用）',
  '双击（G1）': '双击元素直接生成引用（同一捕获路径）',
  '悬停 600ms ⊕（G2）': '目标出现 ⊕ 角标 → 点击生成引用（同一捕获路径）',
});

/** The original pick label — restored as soon as nothing is stale. */
export const PICK_LABEL = '从页面拾取';
/** The rewritten pick label while references are unusable (FR-V3-037). */
export function repickLabel(staleCount: number): string {
  return staleCount > 1 ? `重新拾取（引用 ${staleCount} 条失效）` : '重新拾取（引用 1 已失效）';
}

/**
 * R3 (fail-closed) — may the one-click re-anchor be offered for this rescue?
 *
 * Only a **unique** text match on an **unchanged page path** qualifies: multiple matches
 * are ambiguous and a moved path is uncertain, and both are exactly the cases where an
 * automatic re-anchor could silently land on the wrong element. Those keep the two
 * manual recovery paths. Pure, so the boundary is unit-testable without a DOM.
 */
export function canReanchor(rescue: RefRescue | undefined): boolean {
  return Boolean(rescue && rescue.unique && !rescue.urlChanged && rescue.candidates === 1);
}

export interface L1Input {
  ask: { prompt: string; options: string[] } | null;
  foldedOptions: readonly string[];
  lastUserText: string | null;
  /**
   * BLOCK-03 (v4-3 review): the「已决策历史」rows, **derived from the stream's
   * terminal ask cards** by the caller (`sidepanel.ts#decisionRounds`). The v3
   * implementation inferred them here by diffing `input.ask` and read the answer from
   * a `data-key="ask-option:*"` delegation that v4-3 deleted — every stream-card
   * answer was therefore recorded as the previous user message. The derivation is now
   * upstream (it needs `project(state.stream)`, which this layer must not import) and
   * this layer only renders it.
   */
  decisions: readonly DecisionRound[];
}

export interface L1Deps {
  doc: Document;
  disclosure: DisclosureController;
  /** The existing L2 entry (`l0/shell.ts#openL2`). */
  openL2(which: 'tree' | 'commands' | 'audit' | 'settings'): void;
  /** The existing terminal fallback path (`l0/shell.ts#revealFallback`). */
  revealFallback(): void;
  /** Real `insight-tree` re-pull (never a cache) — the receipt evidence path. */
  refreshSnapshot(): Promise<{ tools?: string[] } | null | undefined>;
  /**
   * R3: one-click re-anchor of the currently unusable reference onto its unique text
   * candidate. The real work (read-only probe + the single ingestion pipeline) belongs
   * to the panel's pick-input owner — this is only the wiring seam.
   */
  reanchor(refId: string): void;
  /**
   * V4-4 TASK-806 (ADR-V4-038): the **single production entry** to a page-side pick.
   * The v3-4 seam went through the retired `#l0-pick` DOM button (`pick.click()`);
   * it now calls `pick-input.ts#requestPick()` directly, so the recovery path cannot
   * break when the panel-side entry is retired.
   */
  requestPick(): void;
  now(): number;
}

export interface L1Handle {
  update(input: L1Input): void;
  store(): RefStore;
  env(): RefEnv;
  /** `replace=true` **replaces** the env instead of merging (N-05: clearing). */
  setEnv(patch: Partial<RefEnv>, replace?: boolean): void;
  injectRef(raw: Parameters<RefStore['create']>[0]): RefRecord;
  judge(): RefRecord[];
  setResolution(resolution: RefResolution | undefined): void;
  /** R3: the read-only rescue observation for one reference (`undefined` clears it). */
  setRescue(rescue: RefRescue | undefined): void;
  dispatchRefAction(refId: string, action: string): { allowed: boolean; reason: string; verdict: RefVerdict; sent: boolean };
  /**
   * Mint a NEW reference from the facts the caller **observed** (real re-pick —
   * v3-4 owns the page-side capture). The page-side `resolution` observation is
   * supplied by the caller; this method never asserts it itself (N-04).
   */
  repick(facts: RawRefFacts, resolution?: RefResolution): RefRecord | undefined;
  pullReceipt(input: {
    ok: boolean;
    text: string;
    actionId: string;
    command?: string;
    ms?: number;
    auditId?: string;
    target?: string;
    tool?: string;
  }): Promise<L1Receipt>;
  setSnapshot(tree: OwnershipTree | null, nodeId: string | null): LocalTreeView;
  localTree(): LocalTreeView;
  history(): DecisionRound[];
  /** Diagnostics for the gate — one flat, JSON-serialisable object. */
  report(): Record<string, unknown>;
}

function row(doc: Document, label: string, value: string): HTMLElement {
  const el = doc.createElement('div');
  el.className = 'l1-row';
  el.textContent = `${label}：${value}`;
  return el;
}

function fill(doc: Document, host: HTMLElement, rows: readonly [string, string][]): void {
  host.textContent = '';
  if (rows.length === 0) {
    const empty = doc.createElement('div');
    empty.className = 'l1-hint';
    empty.textContent = '（暂无内容：本轮还没有产生这一类的数据）';
    host.appendChild(empty);
    return;
  }
  for (const [label, value] of rows) host.appendChild(row(doc, label, value));
}

/** Mount the L1 layer. Single owner of the group, `#l1-ref` and `#l1-more`'s L1 parts. */
export function mountL1(deps: L1Deps): L1Handle {
  const { doc, disclosure } = deps;
  const el = <T extends HTMLElement>(id: string): T => {
    const node = doc.getElementById(id);
    if (!node) throw new Error(`l1/panels: 缺少 DOM 契约 #${id}`);
    return node as T;
  };
  const treeRows = el('l1-local-tree-rows');
  const treeHint = el('l1-local-tree-hint');
  /** The static empty-state copy (markup) — restored whenever there is no snapshot. */
  const treeEmpty = treeHint.textContent ?? '';
  const historyRows = el('l1-history-rows');
  const receiptRows = el('l1-receipt-rows');
  const receiptAudit = el('l1-receipt-audit-summary');
  const refRows = el('l1-ref-rows');
  const refActions = el('l1-ref-actions');
  const refReason = el('l1-ref-reason');
  const refRescue = el<HTMLButtonElement>('l1-ref-rescue');
  const consHost = el('l1-consequences');
  const consTpl = doc.getElementById('l1-consequence-tpl') as HTMLTemplateElement | null;
  const receiptSummary = el('l0-receipt-summary');
  const refToggle = el('l0-ref-toggle');
  const refBadge = el('l0-ref-badge');
  const topbar = el('topbar');
  const gestureRows = el('l1-gestures-rows');

  const store = createRefStore();
  let env: RefEnv = {};
  let resolution: RefResolution | undefined;
  /** R3: the read-only rescue observation the judge attaches to a `dom-gone` verdict. */
  let rescue: RefRescue | undefined;
  /** The reference the rescue button currently targets (`null` = no one-click anchor). */
  let rescueTargetId: string | null = null;
  let tree: OwnershipTree | null = null;
  let localTree = buildLocalTree(null, null);
  let receipt: L1Receipt | null = null;
  let refreshSeq = 0;
  /**
   * BLOCK-03 (v4-3 review): the decided rounds are **rendered from the caller's
   * stream-derived list** — this layer keeps no second, inference-based copy. The v3
   * `pendingAnswer` memory and the `#l0-decision` `ask-option:`/`ask-submit`
   * delegation that fed it were deleted together with their producers
   * (`l0/decision-card.ts` retired in v4-3; the fallback input moved into the stream
   * card), so they could never fire again.
   */
  let rounds: readonly DecisionRound[] = [];
  let last: L1Input = { ask: null, foldedOptions: [], lastUserText: null, decisions: [] };

  /** The env the judge sees. Missing facts stay missing → `unknown` → blocked. */
  const envNow = (): RefEnv => ({
    ...(resolution ? { resolution } : {}),
    ...(rescue ? { rescue } : {}),
    ...env,
  });

  // ── one click on an L0 disclosure reveals its whole class group ────────────
  const mirror = (panelId: string, classes: readonly string[]): void => {
    const openIt = disclosure.isOpen(panelId);
    for (const id of classes) {
      const target = L1_ELEMENT_IDS[id];
      if (target !== panelId) (openIt ? disclosure.open(target) : disclosure.close(target));
    }
  };
  doc.getElementById('l0-status-band')?.addEventListener('click', () => mirror('topbar', L1_STATUS_GROUP));
  doc.getElementById('l0-more')?.addEventListener('click', () => mirror('l1-more', L1_MORE_GROUP));

  // ── the two recovery paths (FR-V3-038): reuse the existing entries ─────────
  el('l1-ref-repick').addEventListener('click', () => deps.requestPick());
  el('l1-ref-describe').addEventListener('click', () => deps.revealFallback());
  // R3: the third, conditional path — a one-click re-anchor onto the unique text
  // candidate. It is only ever reachable while the rescue says「文本唯一匹配 ∧ 路径未变」;
  // the probe itself is read-only and the action mints a NEW reference (old card kept).
  refRescue.addEventListener('click', () => {
    if (rescueTargetId) deps.reanchor(rescueTargetId);
  });
  el('l1-local-tree-global').addEventListener('click', () => deps.openL2('tree'));
  el('l1-receipt-audit').addEventListener('click', () => deps.openL2('audit'));

  /** FR-V3-037: the chip's failure mark, the readable reason and the rename. */
  const paintRefs = (): void => {
    const all = store.all();
    const stale = store.stale();
    const rows: [string, string][] = [];
    for (const r of all) {
      // I-03 (v4-4 review): the L1 evidence panel is a **read-only view of the ONE
      // evidence construction** (`ref-store.ts#refEvidenceRows`) — the same source
      // `projectRefCard` (the in-flow `ref` card) reads. The panel only adds the
      // ordinal glyph to the label; it never re-derives a row.
      for (const [label, value] of refEvidenceRows(r)) rows.push([`${r.glyph} ${label}`, value]);
      if (r.verdict !== 'valid') rows.push([`${r.glyph} 失效原因`, r.readableReason ?? '（无原因）']);
    }
    fill(doc, refRows, rows);
    const bad = stale.length > 0;
    refActions.hidden = !bad;
    refReason.textContent = bad ? (stale[0].readableReason ?? '引用不可用（按失效处理）') : '';
    // R3 (fail-closed): the one-click re-anchor is offered **only** for a unique text
    // match on an unchanged page path. Multiple candidates (ambiguous) or a moved path
    // (uncertain) keep the two manual recovery paths and never auto-anchor.
    const rescueOf = stale[0]?.rescue;
    const target = stale[0];
    const canAnchor = canReanchor(rescueOf);
    rescueTargetId = target && canAnchor ? target.facts.refId : null;
    refRescue.hidden = !canAnchor;
    refRescue.setAttribute(
      'data-rescue',
      canAnchor ? 'unique' : rescueOf ? (rescueOf.candidates > 1 ? 'multiple' : 'path-changed') : 'none',
    );
    refBadge.hidden = !bad;
    refToggle.setAttribute('aria-disabled', String(bad));
    // The chip, its badge and the rewritten pick entry are all part of the SAME
    // risk class (reference invalidation), so the density caliber attributes their
    // text to the risk increment instead of reading it as unrelated growth
    // (AC-V3-003 / `density-metrics.mjs#isRiskClassSource`).
    // V4-4 TASK-806: the retired `#l0-pick` is no longer a projection target; the
    // stale mark now rides the chip + its badge only (the in-flow `ref` card and the
    // status-bar risk chip are the other two projection points, ADR-V4-035).
    for (const node of [refToggle, refBadge]) node.setAttribute('data-ref-stale', String(bad));
  };

  const paint = (): void => {
    // FR-V3-040: every class's trigger carries a REAL count (the readable label is
    // static markup; only the number is derived here).
    const counts: Record<string, number> = {
      'l1-status': topbar.children.length,
      'l1-consequences': last.ask?.options.length ?? 0,
      'l1-ref-evidence': store.all().length,
      'l1-local-tree': localTree.count,
      'l1-history': rounds.length,
      'l1-receipt': receipt?.rows.length ?? 0,
      'l1-gestures': L1_GESTURE_COUNT,
      'l1-more': last.foldedOptions.length + 1,
    };
    for (const id of Object.keys(counts)) {
      // `l1-more` is deliberately EXCLUDED: the decision card is its single writer
      // (label + `data-count` + `hidden`), and a second writer resurrected the
      // v3-1 review-I1「无卡却还有 1 个」bug. Its count already serves FR-V3-040.
      if (id === 'l1-more') continue;
      doc.getElementById(L1_TRIGGERS[id])?.setAttribute('data-count', String(counts[id]));
    }
    doc.getElementById('l1-history-toggle')!.textContent = decisionHistoryLabel(rounds.length);
    el('l1-gestures-toggle').textContent = `页面交互说明（${L1_GESTURE_COUNT} 个手势）`;
    doc.getElementById('l1-consequences-toggle')!.textContent = `选项后果与影响预演（${counts['l1-consequences']} 个选项）`;
    // V3-4 (FR-V3-070): the table is BUILT from the single list, so「条目数 = 实测数」can
    // no longer drift — plus the row's readable effect. Written once (idempotent), never
    // re-created per render, so the density footprint of the table stays fixed.
    if (gestureRows.childElementCount !== L1_GESTURE_LABELS.length) {
      gestureRows.textContent = '';
      for (const label of L1_GESTURE_LABELS) {
        const tr = doc.createElement('tr');
        const th = doc.createElement('td');
        th.textContent = label;
        const td = doc.createElement('td');
        td.textContent = GESTURE_EFFECTS[label] ?? '生成 1 个引用 + 1 道选择题';
        tr.append(th, td);
        gestureRows.appendChild(tr);
      }
    }
    doc.getElementById('l1-local-tree-toggle')!.textContent = `归属（局部树）· ${counts['l1-local-tree']} 个节点`;
    doc.getElementById('l1-receipt-toggle')!.textContent = `回执证据（${counts['l1-receipt']} 行）`;
    // ④ local tree: ≤3 labels + cross-reference badges + the static L2 entry.
    fill(doc, treeRows, localTree.labels.map((label, i) => [`L${i + 1}${i === localTree.labels.length - 1 ? '（当前）' : ''}`, label] as [string, string]));
    treeHint.textContent = localTree.empty
      ? treeEmpty
      : `${localTree.truncated ? '父链已截断到最近 2 个祖先 · ' : ''}${localTree.crossRefs.length > 0 ? `交叉引用：${localTree.crossRefs.join(' / ')} · ` : ''}查看全局树 = 2 次交互到达`;
    // ⑤ decided rounds (read-only; the count is the array length). BLOCK-03: the text
    // comes from the stream card's own terminal state (`chosen` already carries the
    // readable「已取消（原因）」for a cancelled round), never from an answer guess.
    fill(doc, historyRows, rounds.map((r) => [`第 ${r.n} 步${r.changed ? '（改选）' : ''}`, `${r.prompt} → ${r.chosen}`] as [string, string]));
    // ② the two mandatory paragraphs per option, cloned from the static template.
    consHost.textContent = '';
    for (const label of last.ask?.options ?? []) {
      const fragment = consTpl?.content.cloneNode(true) as DocumentFragment | undefined;
      const block = doc.createElement('div');
      block.setAttribute('data-consequence', label);
      block.setAttribute('data-destructive', String(isDestructiveOption(label)));
      if (fragment) block.appendChild(fragment);
      for (const node of Array.from(block.querySelectorAll('[data-tpl]'))) {
        node.textContent = (node.textContent ?? '').replace(/\{\{label\}\}/g, label);
      }
      const irreversible = block.querySelector('[data-irreversible]') as HTMLElement | null;
      if (irreversible) irreversible.hidden = !isDestructiveOption(label);
      consHost.appendChild(block);
    }
    // ⑥ the receipt: rows + audit exit + the resident L0 summary line.
    fill(doc, receiptRows, (receipt?.rows ?? []).map((r) => [r.label, r.value] as [string, string]));
    receiptAudit.textContent = receipt
      ? `${receipt.audit.summary} · ${receipt.audit.entryPoint}`
      : '尚未产生回执：动作完成后这里给出完整证据与审计出口。';
    const pieces = receiptPiecesPresent(receipt);
    receiptSummary.textContent = receipt?.summary ?? '';
    receiptSummary.hidden = !pieces.summary;
  };

  const observe = (input: L1Input): void => {
    // BLOCK-03: no inference — the caller derives the rounds from the event log, so a
    // round can only ever be rendered from the fact the card actually recorded.
    rounds = input.decisions;
    last = input;
  };

  return {
    update(input) {
      observe(input);
      paintRefs();
      paint();
    },
    store: () => store,
    env: envNow,
    setEnv(patch, replace) {
      // N-05（2026-09-16 收口轮）：`replace` 变体让调用方能**清空** env。合并语义下
      // `setEnv({})` 什么也不清，于是测试夹具的 env 会跨场景残留，掩盖「env 缺失 ⇒
      // unknown」这一类用例（validate R1 实测：省略 currentOrigin 仍被判 valid 放行）。
      env = replace ? { ...patch } : { ...env, ...patch };
    },
    injectRef(raw) {
      const record = store.create(raw);
      store.judge(envNow());
      return store.get(record.facts.refId) ?? record;
    },
    judge() {
      const records = store.judge(envNow());
      paintRefs();
      paint();
      return records;
    },
    setResolution(next) {
      resolution = next;
    },
    setRescue(next) {
      rescue = next;
    },
    dispatchRefAction(refId, action) {
      void action;
      const envCurrent = envNow();
      const record = store.get(refId);
      // First statement = the ONLY release point (fail-closed, FR-V3-037).
      if (!record || !isRefUsable(record.facts, envCurrent)) {
        const judged = store.judge(envCurrent).find((r) => r.facts.refId === refId);
        paintRefs();
        paint();
        return {
          allowed: false,
          verdict: judged?.verdict ?? 'unknown',
          reason: judged?.readableReason ?? `引用 ${refId} 不存在（按失效处理）`,
          sent: false,
        };
      }
      const outcome = store.dispatch(refId, envCurrent);
      paintRefs();
      paint();
      return { ...outcome, sent: outcome.allowed };
    },
    repick(facts, observed) {
      // Page-side re-pick (v3-4 owns the real capture): a NEW reference is minted
      // from the facts the caller observed, so the invalidated id is never reused
      // (ADR-V3-023 §1).
      const previous = store.all().slice(-1)[0];
      if (!previous || !facts) return undefined;
      // The superseded (unusable) references are RETIRED, not deleted: the explicit
      // recovery clears the warning, while the record keeps its readable reason and
      // its id is never reused (ADR-V3-023 §1 / FR-V3-037「不得静默丢弃」).
      //
      // N-04（2026-09-16 收口轮）：这里**不再**自己写
      // `resolution = { status:'resolved', refMark: fresh.facts.refId, nodeCount: 1 }`。
      // 那是**断言**「重拾成功」而不是**观测**它 —— v3-4 若在真实捕获失败时调用它，
      // 会把失败伪造成 `valid`（fail-open 面）。观测只由调用方传入（`observed`），
      // 面板只负责判定；未传入时新引用保持 `unknown`（fail-closed）。
      store.retireUnusable();
      const fresh = store.create(facts);
      // 观测由调用方传入；未传入时**清空**（而不是沿用上一次观测）⇒ 新引用保持
      // `unknown`（fail-closed）。沿用旧观测会把「上一个目标的观测」当成新目标的
      // 观测来源 —— 那同样是自证的一种形态。
      resolution = observed;
      store.judge(envNow());
      paintRefs();
      paint();
      return store.get(fresh.facts.refId) ?? fresh;
    },
    async pullReceipt(input) {
      // A REAL re-pull: the evidence describes this pull, not a remembered one.
      refreshSeq += 1;
      const snapshot = await deps.refreshSnapshot().catch(() => null);
      const tool = input.tool ?? '';
      const present = tool.length > 0 ? (snapshot?.tools ?? []).includes(tool) : true;
      receipt = buildL1Receipt({
        ok: input.ok,
        text: input.text,
        actionId: input.actionId,
        evidence: {
          tool: tool || '（无绑定工具）',
          present,
          checkedAt: deps.now(),
          evidence: tool
            ? `重拉实测（第 ${refreshSeq} 次）：${tool} ${present ? '仍在' : '已不在'}工具面（deriveTools）`
            : `重拉实测（第 ${refreshSeq} 次）：本次动作不改变工具面集合`,
        },
        refreshSeq,
        now: deps.now(),
        ...(input.command ? { command: input.command } : {}),
        ...(input.ms !== undefined ? { ms: input.ms } : {}),
        ...(input.auditId ? { auditId: input.auditId } : {}),
        ...(input.target ? { target: input.target } : {}),
      });
      paint();
      return receipt;
    },
    setSnapshot(nextTree, nodeId) {
      tree = nextTree;
      localTree = buildLocalTree(tree, nodeId);
      paint();
      return localTree;
    },
    localTree: () => localTree,
    history: () => [...rounds],
    report() {
      const all = store.all();
      return {
        refs: all.map((r) => ({ refId: r.facts.refId, glyph: r.glyph, verdict: r.verdict, reason: r.readableReason ?? '', ...(r.rescue ? { rescue: r.rescue } : {}) })),
        verdicts: store.judge(envNow()).map((r) => r.verdict),
        counts: all.length,
        stale: store.stale().length,
        commandSends: store.commandSends(),
        refreshSeq,
        pieces: receiptPiecesPresent(receipt),
        historyCount: rounds.length,
        rounds: [...rounds],
        localTree: localTree.count,
        gestures: L1_GESTURE_COUNT,
        /** R3: the rescue payload the L1 layer currently holds (gate-readable). */
        rescue: rescue ?? null,
        canAnchor: rescueTargetId !== null,
      };
    },
  };
}
