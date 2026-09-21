/**
 * V3-2 TASK-205 / TASK-206 (ADR-V3-020~023 / FR-V3-030~040) — the L1 layer.
 *
 * ── V4.5-1 W3 (TASK-V45-108 / 109) — where the L1 faces live now ────────────
 *
 * The four fixed-position hosts are gone, so「L1」is no longer a panel group next to the
 * conversation. Each former face has exactly one home:
 *
 *   · the **option pool + consequence preview** (`l1-more` / `l1-consequences`) are
 *     minted **inside the newest open `askuser` / `auth` card** — this module no longer
 *     writes them (the card owns its own render, and the single-writer rule keeps the
 *     count honest);
 *   · the **reference evidence + the two recovery paths + the conditional re-anchor**
 *     (`l1-ref*`) are minted **inside the newest `ref` card**. This module still owns the
 *     live judgement, so it writes the **rescue affordance** (visibility + `data-rescue`)
 *     into that card — the「唯一文本匹配时可见」predicate is byte-for-byte the v3 one
 *     (EC-V45-005);
 *   · the **local-tree attribution** moved into the L2 tree view (`#l2-tree-attribution`);
 *     the **receipt evidence** into the L2 audit view (`#l2-audit-evidence`); the
 *     **decided-steps count** into the audit view's title (`#l2-audit-count`, the ONE
 *     declaration in the repo); the **six-gesture table** into the settings「帮助」section;
 *   · the **decided history** is retired: history = the stream itself (`rounds[]` is
 *     derived by `project()`), so only its count survives.
 *
 * ── The four hard rules kept structural here ────────────────────────────────
 *
 *   - **The risk rail is never written from here.** Invalidation rows go through
 *     `l0/risk-rail.ts#renderRiskRail` (its `staleRef` row carries the readable
 *     dimension reason); this module never touches `#risk-rail`.
 *   - **Blocking is not a branch discipline**: `dispatchRefAction()` calls
 *     `isRefUsable()` first and returns before any command is dispatched.
 *   - **No second panel-level scroller**: the L2 blocks live inside `#view-host`, which is
 *     the view's own scroll area.
 *   - **Zero write controls in the evidence layer**: `#l1-ref-rows` is a pure text
 *     projection; the only controls are the recovery paths FR-V3-038 requires.
 *
 * @module l1/panels
 */
import type { DisclosureController } from '../disclosure.js';
import { decisionHistoryLabel, L1_GESTURE_COUNT } from '../view-model.js';
import type { DecisionRound } from '../view-model.js';
import { buildLocalTree } from './local-tree.js';
import type { LocalTreeView } from './local-tree.js';
import { buildL1Receipt, receiptPiecesPresent } from './receipt.js';
import type { L1Receipt } from './receipt.js';
import { createRefStore } from './ref-store.js';
import type { RawRefFacts, RefRecord, RefStore } from './ref-store.js';
import { isRefUsable } from './ref-validity.js';
import type { RefEnv, RefRescue, RefResolution, RefVerdict } from './ref-validity.js';
import type { OwnershipTree } from '../../../insight/ownership-tree.js';
import type { TreeReceipt } from '../../tree/tree-receipt.js';

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
  /**
   * V4.5-1 W3 (TASK-V45-108): the card-internal「一键重锚」入口. The card knows its own
   * business id, not the live rescue target, so the panel answers "re-anchor whatever the
   * judge is currently offering" — the same target the (retired) L1 button used.
   * Returns `false` when no unique-candidate rescue is current (fail-closed).
   */
  reanchorCurrent(): boolean;
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

/** Mount the L1 layer. Single owner of the ref judgement + the migrated L2 blocks. */
export function mountL1(deps: L1Deps): L1Handle {
  const { doc } = deps;
  const el = <T extends HTMLElement>(id: string): T => {
    const node = doc.getElementById(id);
    if (!node) throw new Error(`l1/panels: 缺少 DOM 契约 #${id}`);
    return node as T;
  };
  /** V4.5-1 W3: a card-minted face is resolved **per use** (it exists only with its card). */
  const q = <T extends HTMLElement>(id: string): T | null => (doc.getElementById(id) as T | null);
  const treeRows = el('l1-local-tree-rows');
  const treeHint = el('l1-local-tree-hint');
  /** The static empty-state copy (markup) — restored whenever there is no snapshot. */
  const treeEmpty = treeHint.textContent ?? '';
  const receiptRows = el('l1-receipt-rows');
  const receiptAudit = el('l1-receipt-audit-summary');
  /** V4.5-1 W3 (TASK-V45-109 ②): the ONLY「已决策 N 步」declaration in the repo. */
  const auditCount = el('l2-audit-count');

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
   * stream-derived list** — this layer keeps no second, inference-based copy.
   */
  let rounds: readonly DecisionRound[] = [];
  let last: L1Input = { ask: null, foldedOptions: [], lastUserText: null, decisions: [] };

  /** The env the judge sees. Missing facts stay missing → `unknown` → blocked. */
  const envNow = (): RefEnv => ({
    ...(resolution ? { resolution } : {}),
    ...(rescue ? { rescue } : {}),
    ...env,
  });

  /**
   * V4.5-1 W3 (TASK-V45-108): the **newest `ref` card** owns the legacy `#l1-ref*` id
   * family (the card builder strips it from every earlier card before minting it), so the
   * live judgement writes into the current carrier — never into a superseded reference.
   */
  const newestRefCard = (): HTMLElement | null => {
    const cards = doc.querySelectorAll('#stream > [data-msg-type="ref"]');
    return (cards[cards.length - 1] as HTMLElement | undefined) ?? null;
  };

  /**
   * FR-V3-037 + EC-V45-005: the **live** half of the reference card — the rescue
   * affordance. The「唯一文本匹配 ∧ 路径未变」predicate is byte-for-byte the v3 one
   * (`canReanchor`); the evidence rows / chip / badge are rendered by the card itself from
   * its own frozen payload — so the evidence layer has exactly one writer per node.
   */
  const paintRefs = (): void => {
    const stale = store.stale();
    const bad = stale.length > 0;
    const card = newestRefCard();
    const actions = card?.querySelector<HTMLElement>('#l1-ref-actions') ?? null;
    const reason = card?.querySelector<HTMLElement>('#l1-ref-reason') ?? null;
    const rescueBtn = card?.querySelector<HTMLButtonElement>('#l1-ref-rescue') ?? null;
    if (actions) actions.hidden = !bad;
    if (reason) reason.textContent = bad ? (stale[0].readableReason ?? '引用不可用（按失效处理）') : '';
    // R3 (fail-closed): the one-click re-anchor is offered **only** for a unique text
    // match on an unchanged page path. Multiple candidates (ambiguous) or a moved path
    // (uncertain) keep the two manual recovery paths and never auto-anchor.
    const rescueOf = stale[0]?.rescue;
    const target = stale[0];
    const canAnchor = canReanchor(rescueOf);
    rescueTargetId = target && canAnchor ? target.facts.refId : null;
    if (rescueBtn) {
      rescueBtn.hidden = !canAnchor;
      rescueBtn.setAttribute(
        'data-rescue',
        canAnchor ? 'unique' : rescueOf ? (rescueOf.candidates > 1 ? 'multiple' : 'path-changed') : 'none',
      );
    }
  };

  /**
   * V4.5-1 W3 (TASK-V45-108 ④) — the receipt summary's new home: the **固化区 of the
   * newest terminal card** (the retired `#l0-decision` shell owned the static node). The
   * node is created on demand and **moved** when a newer card becomes the carrier, so the
   * id never duplicates (the single-writer rule survives the relocation).
   *
   * review R1 BLOCK-01 — this id is a **迁移容器** (`MIGRATED_CONTAINER_IDS` in
   * `host-registry.ts`), NOT a retirement: the id survives, the writer moves. It must
   * stay out of `RETIRED_CONTAINER_IDS` — the node is (re)minted here once a real
   * receipt exists, so a retirement-list entry would make `hosts().problems` report a
   * false positive only *after* the first receipt (a time-dependent judgement).
   */
  const paintReceiptSummary = (): void => {
    const pieces = receiptPiecesPresent(receipt);
    const existing = q<HTMLElement>('l0-receipt-summary');
    if (!pieces.summary) {
      if (existing) {
        existing.textContent = '';
        existing.hidden = true;
      }
      return;
    }
    // Prefer the newest TERMINAL card (its固化区 is revealed); when the newest card is
    // still open, its固化区 is the carrier all the same (the receipt is a state row, not a
    // second card) — the node is moved rather than duplicated, so the id stays unique.
    const stream = doc.getElementById('stream');
    const children = stream ? Array.from(stream.children) : [];
    const withFixed = children.filter((el) => el.querySelector?.('.card-fixed'));
    const frozen = withFixed.filter((el) => el.getAttribute('data-frozen') === 'true');
    const carrier = (frozen[frozen.length - 1] ?? withFixed[withFixed.length - 1] ?? null) as HTMLElement | null;
    const fixed = carrier?.querySelector<HTMLElement>('.card-fixed') ?? null;
    if (!fixed) return;
    let node = existing;
    if (!node) {
      node = doc.createElement('div');
      node.id = 'l0-receipt-summary';
      node.className = 'card-receipt-summary';
    }
    if (node.parentElement !== fixed) fixed.appendChild(node);
    node.textContent = receipt?.summary ?? '';
    node.hidden = false;
  };

  const paint = (): void => {
    // ① the decided-steps count → the audit view's title (the ONE declaration).
    auditCount.textContent = decisionHistoryLabel(rounds.length);
    // ④ local tree: ≤3 labels + cross-reference badges (L2 read-only block).
    fill(doc, treeRows, localTree.labels.map((label, i) => [`L${i + 1}${i === localTree.labels.length - 1 ? '（当前）' : ''}`, label] as [string, string]));
    treeHint.textContent = localTree.empty
      ? treeEmpty
      : `${localTree.truncated ? '父链已截断到最近 2 个祖先 · ' : ''}${localTree.crossRefs.length > 0 ? `交叉引用：${localTree.crossRefs.join(' / ')} · ` : ''}查看全局树 = 在连接树视图内就地可见`;
    // ⑥ the receipt: rows + audit summary line (L2 read-only evidence block).
    fill(doc, receiptRows, (receipt?.rows ?? []).map((r) => [r.label, r.value] as [string, string]));
    receiptAudit.textContent = receipt
      ? `${receipt.audit.summary} · ${receipt.audit.entryPoint}`
      : '尚未产生回执：动作完成后这里给出完整证据与审计出口。';
    paintReceiptSummary();
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
    reanchorCurrent() {
      if (!rescueTargetId) return false;
      deps.reanchor(rescueTargetId);
      return true;
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
