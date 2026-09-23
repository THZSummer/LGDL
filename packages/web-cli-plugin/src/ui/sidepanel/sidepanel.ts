/**
 * Side panel UI (FR-017 / FR-024 / FR-025).
 *
 * Extension-origin page (never injected into the host page). Renders the chat,
 * per-origin authorization, second-confirmation prompt and audit view. All state
 * transitions go through the pure reducer in `chat-state.ts`.
 */
import {
  REF_ROUND_PREFIX,
  createInitialState,
  reduce,
  resolveAsk,
  resolveConfirm,
  supersededAsk,
  type ChatRole,
  type SidepanelState,
} from './chat-state.js';
import { createScrollFollow, isNearBottom, type ScrollMetrics } from './scroll-policy.js';
// V4-2 (TASK-604 / TASK-605 / TASK-607): the append-only stream — the model +
// projection, the keyed incremental renderer and the zero-plaintext digest.
import { appendEvent, boundStreamEvents, createStreamState, DEFAULT_STREAM_CAP, hasSegment, liveCardIds, openAskEntries, project } from './stream-model.js';
import type { StreamEventKind } from './stream-model.js';
import { createStreamRender, type StreamRenderHandle } from './stream-render.js';
import {
  DIGEST_DEGRADED_BODY,
  createChromeDigestStore,
  digestForViews,
  digestToEvents,
  evictDigests,
  readDigest,
  upsertDigest,
  type DigestStore,
} from './stream-digest.js';
import type { CardDeps } from './cards/index.js';
import { syncNextstepPending } from './cards/nextstep.js';
import { refActionDigest, refActionTextKey, recommendCtx, recommendNextStep } from './recommend.js';
import { bindPanelOps, dispatchOp, PARAMS_REJECTED } from './next-registry/pipeline.js';
import { OP_PARAM_SEQUENCE } from './next-registry/ops.js';
import type { NextCtx, NextOp, OpCtx, OpOutcome } from './next-registry/definition.js';
// V5.5-1 TASK-V55-103 (ADR-V55-002 §1)：「时机源闭集」的唯一声明源已移到
// `next-registry/drivers.ts`。本文件**只** re-export 类型（零第二声明）——`import type`
// 会被擦除，因此本行对 `sidepanel.js` 体积贡献为 0；时机值的扩缩只发生在单源处。
import type { RecommendTrigger } from './next-registry/drivers.js';
import { dedupeKey, drivableSuspension, listSuspensions, registerSuspension, resetSuspensions, timingOfSettle, type SettleSource } from './next-registry/drivers.js';
// V5.5-2 TASK-V55-205/210/211（ADR-V55-006 §4 · ADR-V55-007 §1~§3）——主题① 的引导流声明
// 单源（4 步）+ 配置悬置任务（单源登记 / 有效期重校验 / 续接决策）。本文件只**消费**它们，
// 不写第二份步骤表 / 不写第二个登记点。
import {
  ONBOARD_CHIP_OP,
  ONBOARD_DETECT_TEXT,
  ONBOARD_INVALIDATED_TEXT,
  ONBOARD_RESUME_TEXT,
  ONBOARD_SUSPENSION_RETAINED_TEXT,
  llmBlockedFactApplies,
  onboardCauseKey,
  recordsDeclinedCause,
  suppressOnboardCause,
} from './next-registry/onboarding-flow.js';
import { registerConfigSuspension, resumeSuspension } from './next-registry/suspension.js';
// V5.5-3 TASK-V55-306（ADR-V55-009 §3 · FR-SELF-060/063/065）——「AI 自动成回合」的**唯一**
// 按下入口（`op.turn` 槽；`requestTurn(` 调用点计数不变）。本文件只**接线**，判据在单源模块里。
import { pressCandidate, driverSuppressedLine } from './next-registry/ai-drive.js';
// V5.5-3 TASK-V55-312/313/314（ADR-V55-009 §1/§2/§4 · FR-SELF-090~094 · AC-SELF-006）——
// 护栏六常量单源 + 越限抑制 + 关断偏好。本文件只**接线**（阈值全在单源模块里）。
import { loadProactivePref, proactivity } from './next-registry/guard.js';
export type { RecommendTrigger } from './next-registry/drivers.js';
import { providerById } from '../../llm/providers.js';
import { dispatchChipAction } from './next-registry/dispatch.js';
import { createSystemChannelState, droppedSystemText, SYSTEM_COPY } from './system-events.js';
import {
  REGISTERED_STRUCTURAL_HOSTS,
  RETIRED_CONTAINER_IDS,
  RETIRED_HOST_ATTRS,
  RETIRED_HOST_IDS,
  STRIP_CHANNEL_KINDS,
  STRIP_CHANNEL_LEGACY_IDS,
  evaluateHostRegistry,
  evaluateStripChannels,
} from './host-registry.js';
import {
  CONSENT_DEFAULT_OPEN,
  CONSENT_SUMMARY_TEXT,
  LOG_EMPTY_TEXT,
  activeSiteNotice,
  askFlowView,
  autoAuthCheckboxState,
  autoAuthMarker,
  buildOnboarding,
  buttonStates,
  currentSessionLabel,
  discoveryNotice,
  firstRunCard,
  historyEntries,
  llmStatusView,
  refCounts,
  sendDisabledReason,
  sortSessions,
  stateActionFromPayload,
  type DecisionRound,
  type SessionGroupView,
  type SessionSummaryView,
  type SessionsMessageView,
  type StateMessageView,
} from './view-model.js';
import { createSettingsOps, transportFromRuntime, type SettingsOps } from '../settings/ops.js';
import { createOpBodies, type OpBodies } from '../settings/op-bodies.js';
import { blockedRecovery, LLM_BLOCKED_RISK, PERM_BLOCKED_RISK } from './next-registry/providers.js';
import { mountSettingsPanel, type SettingsPanelHandle } from '../settings/panel.js';
import { createViewSwitch } from '../settings/view-switch.js';
import { AUTO_AUTH_HARD_LINES, type AutoAuthSettings } from '../../security/auto-authorize.js';
import type { LlmStatusSummary } from '../../llm/status.js';
import type { ActiveTabView } from '../../background/state-message.js';
import type { TestConnectionResult } from '../../llm/test-connection.js';
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { cancelReasonText } from './stream-plaintext.js';
import { refReanchoredText, refStaleText } from './system-events.js';
import { displaySelector, refOrdinal as parseRefOrdinal } from './l1/ref-store.js';
import { requestOriginPermissionDetailed, createChromeAsyncKv } from '../../platform/extension-env.js';
import {
  OPTIONAL_CAPABILITIES,
  OPTIONAL_CAPABILITY_FORM_OPTIONS,
  capabilityPermissionsApi,
  hasCapabilityPermission,
  isRegisteredCapability,
  permissionsOf,
  removeCapabilityPermission,
  requestCapabilityPermissionOnGesture,
  unregisteredCapabilityIds,
  type OptionalCapability,
} from '../../platform/capability-permissions.js';
import { collectThreeTableSnapshot, restoreThreeTableSnapshot, type TableAdapter } from './next-registry/snapshot.js';
import { handleClipboardOpMessage } from '../../platform/clipboard-page.js';
import { detectExtensionEnv, type ChromeEnvLike, type EnvGuardResult } from '../../platform/env-guard.js';
import { createKeyStore } from '../../llm/key-store.js';
import { shortBuildStamp } from '../../build-info.js';
// V2-2 (ADR-V2-004/005): floating connection tree (lazy overlay — additive).
import { mountTreeDrawer, type TreeDrawerHandle } from '../tree/tree-drawer.js';
// V2-3 (ADR-V2-008/009/013): closed 7-action revoke orchestrator (existing ops only).
import { createTreeOps } from '../tree/tree-ops.js';
import type { ConnectTreeSnapshot } from '../../insight/tree-model.js';
// V3-1 (ADR-V3-013 / ADR-V3-016): the L0 skeleton + the single disclosure
// controller. Both are additive: no existing render branch or handler is removed.
import { installDisclosure } from './disclosure.js';
import { mountL0, type L0Handle } from './l0/shell.js';
import { probingSteadyView, type L0Input, type L0View } from './view-model.js';
// V3-2 (ADR-V3-020~023): the L1 layer — eight in-place content classes, the
// fail-closed reference judge and the receipt triple. Additive: the L0 skeleton
// keeps its ownership and no existing handler is rewritten.
import { mountL1, type L1Handle, type L1Input } from './l1/panels.js';
// V4.5-1 W3 (TASK-V45-112 / ADR-V45-008): the「帮助」section's id comes from the section
// module (ONE literal in the repo), so the chip's local act and the rendered section
// cannot drift apart.
import { HELP_SECTION_ID } from '../settings/help.js';
import type { OwnershipTree } from '../../insight/ownership-tree.js';
import type { DeclarationStatus, RefRescue, RefResolution } from './l1/ref-validity.js';
// V3-4 (ADR-V3-030 / AC-CONV-1): the panel side of「页面即输入」— the two injection
// triggers, the document identity the page reports, and the drop target.
import { mountPickInput, type PickInputHandle } from './pick-input.js';
// V3-3 (ADR-V3-025~029): the L2 on-demand views. Additive: the views REUSE the
// existing read-only projections (`archive-catalog` / the audit channel / the v2
// tree drawer); no existing handler is rewritten.
import { deriveCounts, type L2Counts, type L2ViewKey } from './l2/counts.js';
import { mountViewHost, type ViewHostHandle } from './l2/view-host.js';
import { mountTheme, type ThemeHandle } from './theme.js';
import { assertChromeNotInStream, assertStreamPureCardOrder, readStreamShape } from './density-scope.js';
import { buildCatalogView, renderCommandCatalog } from './l2/command-catalog.js';
import { buildAuditRows, renderAudit } from './l2/audit.js';
import { buildArchiveModel } from '../../insight/archive-catalog.js';
// The parity baseline is a **pure runtime constant** (the same single source the
// SW injects as `snapshot.catalogMeta`) — importing it is what keeps the second
// count honest instead of hard-coded.
import { CATALOG_BASELINE_META } from '../../insight/catalog-meta.js';
import { SETTINGS_SECTION_IDS } from '../settings/sections.js';
import type { SnapshotCounts } from '../../insight/tree-model.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

/** TASK-022: human-readable role label (kept for tests/legacy selectors). */
const ROLE_LABEL: Record<ChatRole, string> = {
  user: '你',
  assistant: '助手',
  tool: '工具',
  system: '系统',
};

// V4-2 (TASK-604 / TASK-607): the chat stream is drawn by the keyed incremental
// renderer from `project(state.stream)`. The v1 per-entry rendering helpers
// (`renderEntry` / `renderToolCard` / `renderCommand` / `renderThinking`) are
// replaced by `cards/*`; the legacy class names they produced live on in the card
// shell so the existing gates/selectors keep matching.
//
// The folding memory key changed from the legacy entry id to the **cardId**
// (ADR-V4-025 decision 6) — semantically equivalent, and stable across re-renders
// because the card's event stream owns its identity.
const toolOpenState = new Map<string, boolean>();

/**
 * Injected into every card: the `<details>` memory + the v4-3/v4-4 action seam.
 * Built lazily — the module must stay importable in node tests, where `document`
 * does not exist (the v1 module documented the same constraint).
 */
let cardDepsHandle: CardDeps | null = null;
function cardDeps(): CardDeps {
  if (!cardDepsHandle) {
    cardDepsHandle = {
      doc: document,
      toolOpen: {
        get: (cardId) => toolOpenState.get(cardId),
        set: (cardId, open) => toolOpenState.set(cardId, open),
      },
      onCardAction: (cardId, action, value) => handleCardAction(cardId, action, value),
      // V4.5-1 W3 (TASK-V45-108): the card-internalized decision region folds through
      // the SAME controller as every other panel collapse.
      disclosure: installDisclosure(),
      onRevealFallback: () => revealAskFallback(),
    };
  }
  return cardDepsHandle;
}

/**
 * V4-3 / V5-1 TASK-V5-113: the stream card actions — the **两集模型** (ADR-V5-001).
 *
 *   · 集 A = 卡族协议（`askuser` / `auth` / `ref`）: `answer` / `choose` / `cancel` /
 *     `approve` / `reject` / `audit` / `hover` / `reanchor` — 保留原行为（从不携带
 *     `data-op`）。
 *   · 集 B = next-chip 动作（`next` / `repick` / `describe` / `describe-submit` /
 *     `rebind` / `help` / `authorize`）: **全部删除**，合并为 `dispatchChipAction`
 *     的**一次查表**（`ACT_TO_OP[action] ?? OPS_BY_ID[action]` → `runOp`），per-op 分支 = 0。
 */
function handleCardAction(cardId: string, action: string, value?: string): void {
  const requestId = requestIdForCard(cardId);
  if (action === 'answer') {
    submitAskFor(requestId, value, false);
    return;
  }
  if (action === 'choose' && value !== undefined) {
    submitAskFor(requestId, value, false);
    return;
  }
  if (action === 'cancel') {
    submitAskFor(requestId, undefined, true);
    return;
  }
  if (action === 'approve' || action === 'reject') {
    const allow = action === 'approve';
    if (requestId) void send(makeMessage('confirm-response', { requestId, allow }));
    dispatch({ type: 'confirm-resolved', allow, ...(requestId ? { requestId } : {}) });
    // V5-2 (ADR-V5-002 §1 ③): an op consent card settles the pipeline's await.
    const settleConsent = requestId ? opConsentResolvers.get(requestId) : undefined;
    if (settleConsent && requestId) {
      opConsentResolvers.delete(requestId);
      settleConsent(allow ? 'allow' : 'reject');
    }
    return;
  }
  if (action === 'audit') {
    // ADR-V4-033 §2: the审计视图 is the complete ledger; the card is the session
    // clue. The exit opens the existing L2 audit view (zero new channel).
    openL2View('audit');
    return;
  }
  if (action === 'hover') {
    // V4.5-1 W3 (FR-V3-066)：ref 卡 chip 的 hover 触发页面侧闪动 —— 与页面侧角标 hover
    // 走同一通道（`pickInput.highlight`），卡片只上报意图。
    const lastRef = l1?.store().all().slice(-1)[0];
    if (lastRef) void pickInput?.highlight(lastRef.facts.refId, lastRef.facts.selector, 'flash');
    return;
  }
  if (action === 'reanchor') {
    // V4.5-1 W3 (TASK-V45-108): the `ref` card's「一键重锚」. The card knows its own
    // business id, the LIVE rescue target lives in the L1 judge — the panel asks the
    // judge for the current one (fail-closed when there is none).
    l1?.reanchorCurrent();
    return;
  }
  // ── 集 B（数据驱动）：1 次查表 + 1 个调用点；不识别 ⇒ 由 `runOp` 的 loud
  //    `unknown-op` 语义承担（旧 v4-3/v4-4 兜底告知已退役，字面零残留）。
  dispatchChipAction(action, value);
  void cardId;
}

/**
 * V4-4 TASK-805 (ADR-V4-037 §5) — the **ONE turn-issuing production entry**.
 *
 * The composer submit and every `next`-act recommendation chip call this. Returns
 * `false` when the turn was refused by the existing gating (empty text / send
 * disabled), so the composer can keep the user's draft without a second check.
 */
/**
 * V4.5-1 W3 (TASK-V45-108): the retired `#l0-ref-toggle` chip's page-side channel
 * (`data-ref-hover` / `data-turn`) now rides the **newest `ref` card's own chip** — the
 * card is the single reference carrier, so the flash channel follows it.
 */
function newestRefChip(): HTMLElement | null {
  const chips = document.querySelectorAll('#stream [data-msg-type="ref"] .ref-chip');
  return (chips[chips.length - 1] as HTMLElement | undefined) ?? null;
}

function requestTurn(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // ★ R6（2026-09-23）—— 用户输入路径与 AI 路径**同一仲裁**（真机 21:29:19 硬拒缺陷）：
  // 在飞回合时**不再**在本地面板提前拒绝（旧 `buttonStates(...).sendDisabled` 把
  // 「上一条仍在处理中」当成硬禁用），而是照常下发 —— SW 的 `runChat` 是有界队列的唯一
  // 裁决者（硬上限 1：在飞且有余量 ⇒ `queued`；在飞且已满 ⇒ `busy-rejected` + 草稿回填）。
  // 本地面板只保留**异常态**硬拒：没有活跃站点时消息到不了任何工具（真发不出去）。
  // 防双发由 SW 的 `chatBusy` 单飞 + 同一 `chat` 消息体保证（零第二份仲裁）。
  if (!state.activeOrigin) return false;
  // Explicit user intent: the next render must pin to the newest message even if the
  // user had scrolled up before sending.
  scrollFollow.userSent();
  // ★ R6：若这句话就是一条引用动作推荐（`用引用 <n> 做…`），记下去重键 —— 回合完成时提交。
  const refKey = refActionTextKey(trimmed);
  if (refKey) pendingCompletedRefAction = refKey;
  dispatch({ type: 'user', text: trimmed });
  // V3-4 P5 (FR-V3-060 / design baseline P5):「回合进行中」与页面侧的执行可视化是同一个
  // 信号 —— 回合开始时把最后一个引用目标闪动一下并标记 chip 状态。
  const active = l1?.store().all().slice(-1)[0];
  const chip = newestRefChip();
  if (active) {
    void pickInput?.highlight(active.facts.refId, active.facts.selector, 'flash');
    chip?.setAttribute('data-turn', 'running');
  }
  void send(makeMessage('chat', { user: trimmed }));
  return true;
}

/**
 * F 还原度快修轮 (2026-09-20) — the **ONE panel-side authorize production entry**.
 *
 * Until this round the flow lived only inside the `#authorize` click listener. The
 * onboarding recommendation chip now carries `act:'authorize'` (the recommendation
 * vocabulary gained the act because authorization is a browser-permission flow, not
 * a chat message), so the flow had to become a named single entry: the settings-view
 * button and the chip call THIS function, and nothing else reaches
 * `requestOriginPermissionDetailed`.
 *
 * Semantics are byte-for-byte the previous button handler: the optional host
 * permission is requested **inside the user gesture** (IMP-4 / FR-006), best-effort —
 * OriginStore authorization is the authoritative gate; the readable reason (D-064)
 * states the activeTab fallback explicitly. No new permission is introduced (the
 * manifest / permission set is untouched — this is the existing flow, re-exposed).
 */
async function authorizeCurrentSite(): Promise<OpOutcome> {
  const origin = state.activeOrigin;
  if (!origin) return { ok: false, reason: 'no-origin' };
  const consentToken = `op.authorize:${origin}`;
  // ① probe — the SW 裁决 owner validates the consent token, snapshots the
  // authorization table and hands back the gesture instruction. Read-only: this
  // phase cannot change state (R-V5-101), so an abort here leaves the table intact.
  const probe = await send<{ needsGesture?: boolean; pattern?: string | null }>(
    makeMessage('op-exec', { opId: 'op.authorize', phase: 'probe', origin, consentToken }),
  );
  if (!probe.ok) {
    dispatch({ type: 'notice', text: `✖ 授权未生效：${probe.error ?? '后台无响应'}` });
    return { ok: false, reason: probe.error ?? 'probe-failed' };
  }
  // ② the gesture — the ONE existing request entry, inside the user-gesture path
  // (IMP-4 / FR-006, best-effort; OriginStore stays the authoritative gate, D-064).
  const req = await requestOriginPermissionDetailed(origin);
  // ③ commit — the ONLY commit point (the SW writes the OriginStore record + audit).
  const commit = await send(makeMessage('op-exec', {
    opId: 'op.authorize',
    phase: 'commit',
    origin,
    consentToken,
    gestureResult: { granted: req.granted, pattern: req.pattern, reason: req.reason },
  }));
  if (!commit.ok) {
    dispatch({ type: 'notice', text: `✖ 授权未生效：${commit.error ?? '后台无响应'}` });
    return { ok: false, reason: commit.error ?? 'commit-failed' };
  }
  dispatch({ type: 'state', authorized: true });
  const permissionText = req.granted
    ? `已获得站点访问权限（${req.pattern}）`
    : `未获得持久站点权限（${req.reason ?? '未知原因'}），回退到 activeTab 临时授权——仅在点击插件图标的手势内有效`;
  dispatch({ type: 'notice', text: `已授权 ${origin}；${permissionText}。${consentSummary()}` });
  return { ok: true };
}

/** The business key of an ask/auth stream card (never a DOM guess). */
function requestIdForCard(cardId: string): string | undefined {
  for (let i = state.stream.events.length - 1; i >= 0; i -= 1) {
    const e = state.stream.events[i];
    if (e.cardId === cardId && (e.kind === 'askuser' || e.kind === 'auth')) return e.payload.requestId;
  }
  return undefined;
}

/** The keyed incremental renderer (created once, after the DOM is present). */
let streamRender: StreamRenderHandle | null = null;

function streamRenderer(): StreamRenderHandle {
  if (!streamRender) {
    streamRender = createStreamRender({ container: $('stream'), doc: document, deps: cardDeps(), emptyText: LOG_EMPTY_TEXT });
  }
  return streamRender;
}

/* ── V4-2 (TASK-605 / TASK-606): the panel-side zero-plaintext digest ──────── */

/** The store is created lazily so node imports of this module need no `chrome`. */
let digestStoreHandle: DigestStore | null = null;
function streamDigestStore(): DigestStore {
  if (!digestStoreHandle) digestStoreHandle = createChromeDigestStore();
  return digestStoreHandle;
}

/**
 * Persist a session segment as a whitelist digest (LRU 20). Best-effort: the
 * zero-plaintext guard THROWS on a leak, and a throw must never be swallowed into
 * a persisted value — it is reported readably and nothing is written.
 */
async function persistStreamDigest(sid: string | null): Promise<void> {
  if (!sid) return;
  try {
    const views = project(state.stream, { sessionId: sid });
    // Never re-persist a degraded fact: the placeholder body means the card was
    // itself rebuilt from a digest, and persisting it again would double the
    // entry on every reopen (a restore → persist → restore growth loop).
    const entries = digestForViews(views.filter((v) => v.payload.text !== DIGEST_DEGRADED_BODY));
    if (entries.length === 0) return;
    await upsertDigest(streamDigestStore(), sid, entries, Date.now());
    await evictDigests(streamDigestStore());
  } catch (err) {
    console.warn('[v4-2] 摘要落库被拒（零明文白名单 / LRU）：', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Panel reopen: read the digest back and rebuild the fact timeline in DEGRADED
 * form（正文 =「（历史摘要）」, `seq`/`ts`/`terminal`/`tool`/`ok`/`ms` preserved）.
 * Only fires when the panel really has no live history for the session — a normal
 * open never degrades anything.
 */
async function restoreStreamDigest(sid: string | null): Promise<void> {
  if (!sid) return;
  if (state.entries.length > 0) return;
  // N-02 (v4-2 closeout, validate R1): `hasSegment()` used to be an orphan export
  // with this exact predicate inlined here. It is now the single consumer — the
  // helper is the model's own "does this segment already hold rows?" judgement.
  if (hasSegment(state.stream, sid)) return;
  try {
    const entries = await readDigest(streamDigestStore(), sid);
    // Narrowed restore surface (registered): the digest keeps every whitelisted
    // fact, but the AUTOMATIC reopen rebuild only replays the **decision cards**
    // (`askuser`/`auth`) — the「授权记录可回看」rationale of ADR-V4-028 §5. Replaying
    // every tool/system row on boot would change the fresh-panel reading and
    // collide with the frozen empty-log / 320-resident-set gates.
    // Only SETTLED decisions are replayed — an open ask is stale by definition on
    // a fresh panel and must not be re-offered as if it were still pending.
    const decisions = entries.filter((e) => (e.kind === 'askuser' || e.kind === 'auth') && e.terminal !== undefined);
    if (decisions.length === 0) return;
    dispatch({ type: 'stream-session', sessionId: sid, label: sid });
    dispatch({ type: 'stream-merge', events: digestToEvents(decisions, sid) });
  } catch (err) {
    console.warn('[v4-2] 摘要读回失败（按无摘要处理）：', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Informed consent (FR-031 / NFR-008): the risks of operating a site on the
 * user's behalf, plus what the plugin can and cannot do. Kept as plain-language
 * strings so they are readable (and testable) without a browser.
 */
export const CONSENT_RISKS: readonly string[] = [
  '账号风控：自动化高频操作可能触发目标站点的验证码、限流或临时封禁。',
  '条款冲突：部分站点条款明确禁止自动化操作；请在使用前确认目标站点的使用条款。',
  '数据外泄面：站点返回内容按外部内容处理，不进日志/审计明文，但授权即表示你接受该站点的数据访问范围。',
];

export const CAPABILITY_BOUNDARY: readonly string[] = [
  '仅能操作你显式授权的来源，且该站点需声明 web-cli 协议。',
  '写/外部/状态/UI 等危险档位必须经二次确认；不可分类的调用一律拒绝（fail-closed）。',
  '站点自报的风险提示不作为放行依据；本插件不提供绕过门禁的直执行入口。',
  '不自动迁移内置助手配置；密钥仅保存在扩展本地存储，不回显明文。',
];

/** One-line consent summary used before the first authorization (FR-031). */
export function consentSummary(): string {
  return `知情同意：${CONSENT_RISKS.join(' ')}`;
}

let state: SidepanelState = createInitialState();
/** TASK-032: retained panel-presence port (auto-disconnects when the panel closes). */
let panelPort: ReturnType<typeof chrome.runtime.connect> | null = null;
/** Last background `llm-status` summary; null until the round-trip completes. */
let llmSummary: LlmStatusSummary | null = null;
let llmLoaded = false;
/** Last non-sensitive active-tab projection (TASK-020 任务 B). */
let activeTab: ActiveTabView | null = null;
/** decision ② / FR-048: current session id + switcher data. */
let sessionId: string | null = null;
let sessions: SessionSummaryView[] = [];
let groups: SessionGroupView[] = [];
/**
 * Scroll-follow policy (regression fix). The user's own send is unconditional;
 * appended assistant/tool/thinking content follows only while the live viewport
 * is anchored near the bottom (generous 48px threshold). The anchor is refreshed
 * from real `scroll` events and post-layout re-measurements — never from a stale
 * pre-append read (`scroll-policy.ts` documents the full rationale).
 */
const scrollFollow = createScrollFollow();

// ── V2-2 (ADR-V2-005): floating connection tree — lazy, additive ────────────
/** Connection-tree drawer handle; mounted in `wire()`, nothing pulled until the FAB opens. */
let treeDrawer: TreeDrawerHandle | null = null;

// ── TASK-033: in-panel settings view (no navigation away from the panel) ────
/** Settings controller, mounted lazily on first open (keeps panel load light). */
let settingsHandle: SettingsPanelHandle | null = null;

/** V3-1: the L0 skeleton handle (mounted once in `wire()`, repainted by `render()`). */
let l0: L0Handle | null = null;
/** V4-1: the three-state theme controller (mounted once in ). */
let themeToggle: ThemeHandle | null = null;

/** V3-2: the L1 layer handle (mounted once in `wire()`, repainted by `render()`). */
let l1: L1Handle | null = null;

/** V3-3: the L2 view host (view replacement; mounted once in `wire()`). */
let viewHost: ViewHostHandle | null = null;

/**
 * V3-3 (FR-V3-046) — the L2 count truth inputs. Both come from **existing**
 * channels and are never invented here:
 *   - `insightCounts` = `state.insight.counts` (the SW-pushed snapshot counts; the
 *     same projection the tree / catalogue render from). When the state reply does
 *     not carry it, the lazily pulled `insight-tree` snapshot's `meta.counts` is
 *     used instead — still the same truth, never a literal.
 *   - `auditEntries` = the length of the existing `audit-export` reply.
 * `l2Counts` is the ONE derived value the entry panel, the status bar and the view
 * headers all read.
 */
const l2Truth: { insightCounts: SnapshotCounts | null; auditEntries: number | null } = {
  insightCounts: null,
  auditEntries: null,
};
let l2Counts = deriveCounts({
  insightCounts: null,
  catalogMeta: CATALOG_BASELINE_META,
  auditEntries: null,
  settingsSections: SETTINGS_SECTION_IDS,
});
const currentL2Counts = (): L2Counts => l2Counts;
function refreshL2Counts(): void {
  l2Counts = deriveCounts({
    insightCounts: l2Truth.insightCounts,
    catalogMeta: CATALOG_BASELINE_META,
    auditEntries: l2Truth.auditEntries,
    settingsSections: SETTINGS_SECTION_IDS,
  });
}

/** The lazily pulled full snapshot — used ONLY for the catalogue's per-card data. */
let l2Snapshot: ConnectTreeSnapshot | null = null;
/** Raw audit channel reply (zero-plaintext projection happens in `l2/audit.ts`). */
let l2AuditEvents: readonly unknown[] = [];

/**
 * V3-1 test seams for the two risk projections that have no sidepanel-side
 * receipt path yet:
 *   - `hardlineCount` is normally derived from REAL blocked-receipt entries
 *     (`state.entries` with `kind === 'error'` mentioning `evaluate`); the seam
 *     lets the density gate force the state deterministically.
 *   - `staleRefCount` / `refCount` are injected because the引用失效 judge itself
 *     is v3-2's deliverable (the plan explicitly allows a test-only namespace:
 *     `window.__v3.testing`). They are read-only projections — no security
 *     decision reads them.
 */
/** `force` = show a class whose real transition lands in a later leaf; `off` =
 *  hide a class so the gate can measure the pure risk increment. */
const v3TestState = {
  refCount: 0,
  lastStaleRef: '',
  riskMode: {} as Record<string, 'force' | 'off'>,
  /**
   * V3-4: set when the L1 gate injects an env through the test seam. The production
   * env sync (`syncRefEnv`, AC-CONV-1) must then step aside — otherwise every
   * `render()` would overwrite the dimension the gate just injected and the five
   * validity dimensions could no longer be observed one by one. Production never sets
   * it; a real capture clears it (real facts supersede a fixture).
   */
  envOverride: false,
};

/**
 * V3-4: the page-side availability + declaration facts the reference judge needs.
 *
 * `pageUnavailable` is the **readable** reason the page side is missing (injection
 * refused, a restricted page, an unauthorized origin, a torn-down layer). `null` means
 * "available" — it is never used as a synonym for "unknown", because the L0 risk zone
 * must be able to tell「没有问题」from「没有页面」，and the pick entry's disabled state
 * comes from the same field.
 */
const pickFacts = {
  pageUnavailable: null as string | null,
  /**
   * R1: the declaration **state** travels too (`valid` / `invalid` / `absent`), so a
   * site that never declares web-cli can still produce usable references — the state
   * (not a digest) is the fact D4 compares. Single source: the SW's `declarationEnv`.
   */
  declaration: null as { status: DeclarationStatus; hash: string; version?: string } | null,
};
/** The reference the pending decision round was minted from (AC-CONV-2's binding). */
let pendingRefId: string | null = null;
/** V3-4: the page-side input adapter (injection triggers / identity / drop target). */
let pickInput: PickInputHandle | null = null;

/** Derive the pure L0 view-model input straight from the panel state. */
function l0Input(): L0Input {
  const refs = l1?.store().all() ?? [];
  const staleRefs = l1?.store().stale() ?? [];
  const llm = llmStatusView(llmLoaded ? llmSummary : null);
  const receiptHardLines = state.entries.filter(
    (entry) => entry.kind === 'error' && /evaluate|硬底线/.test(entry.text),
  ).length;
  return {
    activeOrigin: state.activeOrigin,
    authorized: state.authorized,
    trust: state.trust,
    llmBadge: llm.label,
    llmConfigured: llm.configured,
    sessionLabel: currentSessionLabel(sessions.find((s) => s.sessionId === sessionId) ?? null),
    // A background probe *refresh* on an already-discovered site must not flip the
    // band to「探测中」: that would make the L0 status flicker on a 15s timer while
    // the site is working. The transient state is still surfaced as a RISK row
    // (`probing`) whenever the site is not (yet) discovered.
    // R2 (2026-09-17): the same rule now covers the whole retry cycle — during the
    // terminal backoff the risk row shows the steady copy (`probeSteady`) instead of
    // blinking away, and only a real in-flight fetch reads「探测中」.
    probing: state.probe?.phase === 'probing' && state.discoveryState !== 'supported',
    ...(state.probe?.steady === true && state.discoveryState !== 'supported'
      ? { probeSteady: probingSteadyView(state.probe) }
      : {}),
    discoveryState: state.discoveryState ?? (state.probe?.phase === 'probing' ? '探测中' : '未知'),
    hardlineCount: receiptHardLines,
    // V3-2: the real judge's verdict replaces v3-1's zero projection — the chip's
    // stale mark and the risk rail's dimension reason both come from ONE store.
    staleRefCount: staleRefs.length,
    ...(staleRefs[0]?.readableReason ? { staleRefReason: staleRefs[0].readableReason } : {}),
    ...(staleRefs[0] ? { staleRefId: staleRefs[0].facts.refId } : {}),
    confirmPending: confirmActive(),
    riskForced: Object.entries(v3TestState.riskMode)
      .filter(([, mode]) => mode === 'force')
      .map(([cls]) => cls) as L0Input['riskForced'],
    riskSuppressed: Object.entries(v3TestState.riskMode)
      .filter(([, mode]) => mode === 'off')
      .map(([cls]) => cls) as L0Input['riskSuppressed'],
    ask: state.ask
      ? { prompt: state.ask.prompt, options: state.ask.options ?? [], recommendedCount: 2 }
      : null,
    refCount: refs.length || v3TestState.refCount,
    refStale: staleRefs.length > 0,
    // V3-4 (FR-V3-068): the readable page-side availability reason (null = available).
    // Forcing it through the testing seam lets the gate drive both directions.
    pickUnavailable: v3TestState.riskMode.pageUnavailable === 'off' ? null : pickFacts.pageUnavailable,
    // V3-3 (FR-V3-046): the four counts come from the ONE derivation, fed by real
    // truth reads (`state.insight.counts` + the existing audit channel). No literal.
    l2Counts: currentL2Counts(),
  };
}

/** True when a destructive confirmation is pending (real state, or the forced
 *  projection the L0 gate uses to make the state deterministic). */
function confirmActive(): boolean {
  return state.confirm !== null || v3TestState.riskMode.confirm === 'force';
}

/**
 * V3-2: the L1 layer's input. Class ① (status & connection details) is the
 * `#topbar` panel itself, so nothing is duplicated between the band and L1.
 */
function l1Input(l0View: L0View | null): L1Input {
  const lastUser = [...state.entries].reverse().find((entry) => entry.role === 'user');
  return {
    ask: state.ask ? { prompt: state.ask.prompt, options: state.ask.options ?? [] } : null,
    foldedOptions: l0View?.decision.foldedOptions ?? [],
    lastUserText: lastUser?.text ?? null,
    // BLOCK-03 (v4-3 review): the「已决策历史」is derived from the stream's terminal
    // ask cards — the ONLY place a real answer exists now.
    decisions: decisionRounds(),
  };
}

/**
 * BLOCK-03 (v4-3 review) — the「已决策历史」rows, derived from the event log.
 *
 * The v3 implementation inferred rounds by diffing `input.ask` and read the answer
 * from a `data-key="ask-option:*"` delegation inside `#l0-decision`. v4-3 removed
 * **both** producers (`decision-card.ts` was retired; the `#ask-submit` delegation
 * moved into the stream card), so every round answered through a stream card was
 * recorded as the *previous user message* or「（无回答）」+ `canceled:true` — a
 * mis-recorded process fact, exactly what NFR-CHAT-001 forbids.
 *
 * The answer source is now the terminal `askuser` card itself (`answered` ⇒
 * `payload.answer`; `cancelled` ⇒ the readable reason). No inference, no fallback to
 * unrelated text.
 */
function decisionRounds(): DecisionRound[] {
  const rounds: DecisionRound[] = [];
  for (const view of project(state.stream)) {
    if (view.kind !== 'askuser' || !view.frozen) continue;
    if (view.terminal !== 'answered' && view.terminal !== 'cancelled') continue;
    const prompt = view.payload.prompt ?? '（无问题文本）';
    const answered = view.terminal === 'answered';
    const chosen = answered ? (view.payload.answer ?? '（无回答）') : cancelReasonText(view.payload.cancelReason);
    rounds.push({
      n: rounds.length + 1,
      prompt,
      chosen,
      canceled: !answered,
      changed: rounds.some((r) => r.prompt === prompt),
    });
  }
  return rounds;
}

/** Install the `window.__v3.testing` namespace used by the density/l0 gates. */
function installV3TestHooks(): void {
  const win = window as unknown as { __v3?: { testing?: Record<string, unknown> } };
  win.__v3 = {
    ...(win.__v3 ?? {}),
    testing: {
      /**
       * V4-1 (FR-CHAT-075 / RP-V4-06): the product's own S1 assertion. The density
       * gate injects a violation and expects this to **throw**; a silent `false`
       * would be exactly the failure mode the exemption rule exists to prevent.
       */
      assertChromeNotInStream(): true {
        assertChromeNotInStream(document);
        return true;
      },
      /**
       * V4.5-1 W3 (TASK-V45-107 / ADR-V45-002 §2): the「pure chronological card list」
       * assertion, shipped in the product and driven by the gate exactly like
       * `assertChromeNotInStream()` (the RP-V4-06 pattern).
       */
      assertStreamPureCardOrder(): true {
        assertStreamPureCardOrder(document);
        return true;
      },
      /** The read-only shape reading behind it (gate-readable, one implementation). */
      streamShape() {
        return readStreamShape(document);
      },
      /** V4-1: the current theme state (diagnostics only — never a security input). */
      themeState(): string {
        return themeToggle?.state ?? 'auto';
      },
      setRisk(cls: string, mode: 'force' | 'off' | 'natural' = 'force') {
        if (!['unauthorized', 'probing', 'hardline', 'confirm', 'staleRef'].includes(cls)) {
          throw new Error(`未知风险类：${cls}`);
        }
        // V3-2: `staleRef` is no longer a projection — it drives the REAL judge.
        // `force` injects one reference whose capture facts are complete but whose
        // page-side resolution says the element is gone (dimension D1), so the rail
        // renders the dimension-specific readable reason the product really shows.
        if (cls === 'staleRef') {
          if (mode === 'off' || mode === 'natural') l1?.store().reset();
          else {
            l1?.store().reset();
            l1?.injectRef(staleRefFacts());
            l1?.setResolution({ status: 'missing' });
            l1?.setEnv({
              currentOrigin: state.activeOrigin ?? '',
              authorized: true,
              documentId: 'doc-1',
              navSeq: 1,
              declarationHash: 'decl-1',
            });
            l1?.judge();
          }
          render();
          return;
        }
        // V4-3: `confirm` stays a **projection-only** risk fixture (like the other risk
        // classes). It must NOT synthesize a stream card: the density gate measures the
        // risk increment on a fixed fixture, and injecting a card would add a non-risk
        // clickable (`#scroll-bottom`) into that budget. The real confirm → auth card
        // path is covered by `test/ui/ask-auth-inflow.mjs`.
        if (mode === 'natural') delete v3TestState.riskMode[cls];
        else v3TestState.riskMode[cls] = mode;
        render();
      },
      /**
       * Re-pull the authoritative state from the service worker — the same call the
       * panel makes on load and after every action. The gates use it after driving
       * a background message directly (there is no generic state push to listen to).
       *
       * V5-3 review R1 **I-03**: returns the underlying promise so a gate can **await**
       * the applied reply (`await window.__v3.testing.refresh()` inside an async driver)
       * instead of polling. Existing callers use the `…; true` form and ignore the value,
       * so their behaviour is unchanged.
       */
      refresh(): Promise<void> {
        return refreshState();
      },
      /** Reveal the fallback input + the full-text composer (ADR-V3-014 §5). */
      revealFallback() {
        revealAskFallback();
      },
      hideFallback() {
        l0?.hideFallback();
        fallbackOpen = false;
        syncComposerVisibility();
      },
      /** Open the L1 status panel (`#topbar`) — the v1 toolbar lives there now. */
      openStatusDetails() {
        // V4-1（法则六 / ADR-V4-017）：v3 的 `#topbar` 折叠层（授权 / 撤销 / 会话 /
        // 分组 / LLM 测试）整体迁入 `#settings-view` 的「站点与授权」分区。等价改写 =
        // 「进入设置视图」，仍是**1 次交互**可达；不再存在可折叠的 `topbar` 目标
        // （`disclosure.ts#COLLAPSIBLE_TARGETS` 已移除，`assertFoldable` 会拒绝）。
        openL2View('settings');
      },
      /** Fold every disclosure layer (used by the density/risk fixtures). */
      collapseAll() {
        installDisclosure().collapseAll();
      },
      /**
       * Open the L2 entry panel + ENTER the global-tree view.
       *
       * V3-3: deliberately stops at the view (the tree body is NOT opened) so the
       * existing gates keep driving the v2 `#tree-fab` control themselves — the
       * product path (`#l2-entry-tree` click) opens the body immediately, which is
       * how the ≤2-interaction reachability requirement is met.
       */
      openTreeView() {
        
        openL2View('tree', { openTreeBody: false });
      },
      /** V3-3: enter any L2 view (the product path, incl. the tree body). */
      openL2View(key: string) {
        
        openL2View(key as L2ViewKey);
      },
      /** V3-3: return to the transcript through the product's own back button. */
      closeL2View() {
        const back = document.getElementById('l2-back');
        if (back) back.click();
      },
      /** V3-3 (FR-V3-046): the derived counts the panel is showing right now. */
      l2Counts() {
        return currentL2Counts();
      },
      /** V3-3: re-read the existing audit channel (count + view share this truth). */
      async refreshAudit() {
        return refreshAuditView();
      },
      setRefCount(count: number) {
        v3TestState.refCount = Math.max(0, count);
        render();
      },
      /**
       * V3-1 test seam: drives the ONE decision card through the same reducer
       * action the real `ask-user-request` push uses — only the transport
       * (background → panel message) is bypassed.
       */
      ask(prompt: string, options: string[]) {
        dispatch({ type: 'ask', requestId: 'v3-test-ask', kind: 'choice', prompt, options });
      },
      /**
       * V4-2 (TASK-610) test seam — seed stream events through the REAL model +
       * renderer (no shadow implementation). Used by `test/ui/stream.mjs` to drive
       * every one of the 12 card types and the open→terminal固化 transition, which
       * the live product only reaches through v4-3 / v4-4 business flows.
       */
      streamSeed(spec: Array<{ kind: StreamEventKind; cardId?: string; payload?: Record<string, unknown>; terminal?: string; ts?: number }>) {
        for (const e of spec) {
          state = {
            ...state,
            stream: appendEvent(state.stream, {
              kind: e.kind,
              ts: e.ts ?? Date.now(),
              ...(e.cardId !== undefined ? { cardId: e.cardId } : {}),
              payload: (e.payload ?? {}) as never,
              ...(e.terminal !== undefined ? { terminal: e.terminal as never } : {}),
            }),
          };
        }
        render();
        return state.stream.events.length;
      },
      /** V4-2: rendered vs projected card count (the `children === project()` proof). */
      streamStats() {        return {
          rendered: streamRender?.cardCount() ?? 0,
          projected: project(state.stream).length,
          dropped: state.stream.dropped,
          seq: state.stream.seq,
        };
      },
      // V5-3 TASK-V5-159/161: mint a blocked `error` card through the REAL reducer with
      // the recovery face derived from the ONE blocked-terminal enum.
      blockedError(blocked: string, text: string) {
        const recovery = blockedRecovery(blocked);
        dispatch({ type: 'error', text, recovery });
        return recovery.length;
      },
      // V5-3 TASK-V5-155 (law8 face 1): the folded payloads, so the zero-plaintext gate
      // scans the in-memory payload face too. Read-only.
      payloads: () => project(state.stream).map((v) => v.payload),
      /**
       * V4-3 (ADR-V4-032): the ONE turn-semantics projection. `pending` gates new
       * turns / recommendation chips only; open ask/auth cards stay submittable.
       */
      askFlow() {
        return askFlowView({ pending: state.pending, openAsks: state.stream.openAsks.length });
      },
      /** V4-3: the open ask/auth card ids (the arbitration invariant read-out). */
      openAsks() {
        return [...state.stream.openAsks];
      },
      /** V4-3: dispatch the 60 s timeout projection the turn-end signal drives. */
      timeoutOpenAsks() {
        dispatch({ type: 'pending', value: false });
        return state.stream.openAsks.length;
      },
      /** V4-2: a fresh event log + renderer (the fixture reset for the stream gate). */
      streamReset() {
        state = { ...state, stream: createStreamState(state.stream.sessionId) };
        streamRender?.reset();
        render();
        return true;
      },
      /**
       * V4-3 (I-07③, v4-3 review): settle **every** open decision card — each with the
       * action its own kind requires. `ask-resolved` alone can never settle an `auth`
       * card (its terminal comes from `confirm-resolved`), so the older loop left an
       * open auth card alive and the `MAX_OPEN_ASKS + 1` guard exited silently.
       */
      clearAsk() {
        for (const entry of [...openAskEntries(state.stream)]) {
          if (entry.kind === 'auth') {
            dispatch({ type: 'confirm-resolved', allow: false, ...(entry.requestId ? { requestId: entry.requestId } : {}) });
          } else {
            dispatch({ type: 'ask-resolved', canceled: true, reason: 'user', ...(entry.requestId ? { requestId: entry.requestId } : {}) });
          }
        }
      },
      /**
       * Injects a stale-reference event. v3-1 has no page-side reference judge
       * (that is v3-4's deliverable), so this seam only drives the *projection*;
       * v3-2 will replace it with the real five-dimension judgement
       * (FR-V3-036) without changing the risk-rail contract.
       */
      staleRef(refId = 'ref-1') {
        v3TestState.lastStaleRef = String(refId);
        v3TestState.riskMode.staleRef = 'force';
        render();
      },
      reset() {
        v3TestState.refCount = 0;
        v3TestState.riskMode = {};
        v3TestState.envOverride = false;
        // V3-2: the L1 layer's real state (references / receipt / history) is
        // cleared too, so every fixture cell starts from the same default state.
        l1?.store().reset();
        // N-05（2026-09-16 收口轮）：`replace=true` 才真的**清空** env；旧的
        // `setEnv({})` 是合并语义、什么也不清 → 上一场景的 env 残留会掩盖
        // 「env 缺失 ⇒ unknown」类夹具（validate R1 实测）。
        l1?.setEnv({}, true);
        l1?.setResolution(undefined);
        // R3: the rescue observation + the「already re-anchored」记忆 are per-fixture too.
        l1?.setRescue(undefined);
        rescueProbedId = null;
        anchoredRefIds.clear();
        l1?.setSnapshot(null, null);
        // V4-2: the append-only stream is per-fixture state too. A gate fixture calls
        // `reset()` to return to a known state; without clearing the event log the
        // cards of the previous cell would legitimately accumulate (append-only!) and
        // silently shift the next cell's measurement. This is the TEST seam only —
        // the product never clears the stream.
        // V4-4: the system channel's dedupe / rate accounting is per-fixture state too.
        state = { ...state, stream: createStreamState(state.stream.sessionId), systemChannel: createSystemChannelState() };
        // I-04 (v4-4 review): the module-level「same fact is not re-projected」memory is
        // fixture state as well — without clearing it, a later cell that projects the
        // SAME `refId`+state is silently skipped (the fixture-order sensitivity
        // registered in build.md §7.4 / the density knownLimitations).
        projectedRefState.clear();
        // BLOCK-02: the channel memory (last observed value per channel) and the
        // pending queue are per-fixture too — the next cell re-baselines silently.
        channelMemory.clear();
        pendingChannelRows.length = 0;
        // BLOCK-01: the recommendation anti-flicker clock is per-fixture state.
        lastNextstepProducedAt = undefined;
        lastRecommendOutcome = null;
        // V5.5-1: 悬置任务登记同样是 per-fixture 状态。
        resetSuspensions();
        // R6：已完成引用动作台账同样是 per-fixture 状态。
        resetCompletedRefActions();
        // V5.5-2 TASK-V55-215: 「取消引导」的同因去重键同样是 per-fixture 状态。
        onboardGuideCause = undefined;
        declinedOnboardCauses.length = 0;
        // I-09: `firstRunEntryHandled` is deliberately **NOT** cleared here —— it is a
        // panel-LIFETIME fact (「首装」happens once per panel), not fixture state. A
        // fixture that reloads the page (which is what the panel fixtures do) gets a
        // fresh module and therefore a fresh entry anyway; clearing it here would let a
        // late `probe-changed` → `refreshState()` re-mint a first-run card *after*
        // `reset()`, which would silently move a registered density cell.
        // (`stateReplyApplied` likewise stays — it is a「已经拿到过 state」fact.)
        streamRender?.reset();
        render();
      },
      /**
       * V4-4 TASK-809 test seam — drive the **single system channel** through the
       * REAL reducer action (the same one every merged source uses). Returns the
       * channel's dropped count so the gate can prove a rate-capped row is counted.
       */
      systemRow(kind: string, text: string, at?: number) {
        dispatch({ type: 'system', kind: kind as never, text, ...(at !== undefined ? { at } : {}) });
        return state.systemChannel.dropped;
      },
      /** BLOCK-01 diagnostics: the last producer run (`trigger` / `rule` / `suppression`). */
      lastRecommend() {
        return lastRecommendOutcome;
      },
      /** V5.5-1 TASK-V55-122: 悬置任务读数（只读）——S0 面「答案不被丢弃」的证据面。 */
      suspensions() {
        return listSuspensions().map((s) => ({ source: s.source, kind: s.kind, late: s.late, instruction: s.instruction }));
      },
      /** V4-4: the channel's dedupe / rate read-out (total / dropped / rendered rows). */
      systemStats() {
        return {
          total: state.systemChannel.total,
          dropped: state.systemChannel.dropped,
          rows: project(state.stream).filter((v) => v.kind === 'system').length,
        };
      },
      /**
       * BLOCK-02 (v4-4 review) — the **structural** transitional-host read-out.
       *
       * The gate must be able to tell「过渡态已闭合」from「标记被删掉」, so the product
       * hands out the live DOM reading AND the registered registry in one call; the
       * shared pure judge (`host-registry.ts#evaluateHostRegistry`) is what decides.
       */
      hosts() {
        const presentHosts = [...document.querySelectorAll('#stream > li[data-host]')].map(
          (el) => el.getAttribute('data-host') ?? '',
        );
        // V4.5-1 W3: the two halves are read by their own selector — container ids by
        // `getElementById`, retired host VALUES by `[data-host]` (`composer` is a retired
        // host value while `#composer` itself is a preserved compatibility surface).
        // V4.5-1 review R1 BLOCK-01: the **migrated** containers keep their ids (they are
        // re-minted inside the newest card / the L2 read-only blocks) and are therefore
        // deliberately absent from `RETIRED_CONTAINER_IDS` — e.g. `#l0-receipt-summary`,
        // which `paintReceiptSummary()` re-creates in `.card-fixed` once a real receipt
        // exists (a retirement-list entry would make this reading time-dependent).
        const retiredPresent = [
          ...RETIRED_CONTAINER_IDS.filter((id) => document.getElementById(id) !== null),
          ...RETIRED_HOST_ATTRS.filter((host) => document.querySelector(`[data-host="${host}"]`) !== null),
        ];
        const reading = {
          presentHosts,
          transitionalCount: document.querySelectorAll('[data-transitional-host]').length,
          retiredPresent,
        };
        return Object.freeze({
          ...reading,
          registered: REGISTERED_STRUCTURAL_HOSTS.map((h) => h.host),
          stripChannels: STRIP_CHANNEL_KINDS.map((c) => ({
            channel: c.channel,
            kind: c.kind,
            emitterSite: c.emitterSite,
            carrierCount: c.carrierCount,
          })),
          problems: evaluateHostRegistry(reading),
        });
      },
      /**
       * V4.5-1 review R1 BLOCK-03 — the **live single-write reading** the judgement needs
       * (`host-registry.ts#evaluateStripChannels` ②). Before this, the carrier half was
       * only ever fed a hard-coded `[]` (⇒ skipped), so a second projection was invisible.
       */
      stripChannelReading() {
        return stripChannelReading();
      },
      /** The declared bindings, so the node gate can count the emitter sites it reads. */
      stripChannelBindings() {
        return STRIP_CHANNEL_KINDS.map((b) => ({
          channel: b.channel,
          kind: b.kind,
          emitterSite: b.emitterSite,
          carrierCount: b.carrierCount,
        }));
      },
      /**
       * The **full** single-write judgement over the live reading + the gate-supplied
       * emitter counts (one implementation, shared with the node gate).
       */
      stripChannelProblems(emitterCounts: { channel: string; count: number }[]) {
        return evaluateStripChannels({ emitterCounts, ...stripChannelReading() });
      },
      /** The live carrier-node **counts** per channel (the per-fact「恰 1」input). */
      stripCarrierCounts() {
        return Object.fromEntries(STRIP_CHANNEL_KINDS.map((b) => [b.channel, stripCarrierReading(b.channel, b.kind).rows]));
      },
      /** V4-4: project a reference through the REAL reducer action (new card each time). */
      refCard(refNum: number, refState: 'valid' | 'stale', opts?: { why?: string; systemText?: string }) {
        dispatch({
          type: 'ref',
          refNum,
          refState,
          refLabel: `#${refNum} （引用）`,
          evidence: ['选择器：#app', '语义路径：main > div', '文本摘要：示例', '捕获时间：2026-09-19T00:00:00.000Z'],
          ...(opts?.why !== undefined ? { why: opts.why } : {}),
          ...(opts?.systemText !== undefined ? { systemText: opts.systemText } : {}),
        });
        return project(state.stream).filter((v) => v.kind === 'ref').length;
      },
      /**
       * V4-4: run the REAL producer against the live state and mint the card through
       * the reducer. `mode` selects the fixture (the gate drives each truth source).
       */
      recommend(mode: 'ref' | 'stale' | 'firstRun' | 'idle' | 'empty' | 'llm' | 'perm' | 'hard' = 'ref', at?: number) {
        const views = project(state.stream);
        const counts = refCounts(views);
        // V5-3 TASK-V5-159: the two op-driven blocked terminals (and `hardFloor`) are
        // driven through the SAME derived risk ids the live panel folds into `risk`
        // (`observedBlocked`) — no second truth source, no new ctx field.
        const siteOk = mode === 'llm' || mode === 'perm' || mode === 'hard';
        const steady = mode === 'idle' || siteOk;
        const risks = mode === 'stale' ? ['refInvalid'] : mode === 'llm' ? [LLM_BLOCKED_RISK] : mode === 'perm' ? [PERM_BLOCKED_RISK] : mode === 'hard' ? ['hardFloor'] : [];
        const input: Parameters<typeof recommendNextStep>[0] = {
          ref: {
            validCount: mode === 'ref' || mode === 'idle' ? Math.max(1, counts.validCount) : 0,
            staleCount: mode === 'stale' ? Math.max(1, counts.staleCount) : 0,
            ...(counts.latestRefNum !== undefined ? { latestRefNum: counts.latestRefNum } : { latestRefNum: 1 }),
          },
          session: { openAsks: state.stream.openAsks.length, busy: state.pending },
          site: { authorized: siteOk || state.authorized, trust: state.trust === 'trusted' ? 'trusted' : 'untrusted' },
          catalog: { toolCount: CATALOG_BASELINE_META.toolCount, subcommandCount: CATALOG_BASELINE_META.subcommandCount },
          probe: { phase: steady ? 'ready' : state.probe?.phase, steady: steady || state.probe?.steady === true },
          risks,
          onboarding: { firstRun: mode === 'firstRun', pendingSteps: mode === 'firstRun' ? ['授权当前站点'] : [] },
          ...(at !== undefined ? { now: at } : { now: Date.now() }),
        };
        const result = recommendNextStep(input);
        const card = result.cards[0];
        if (card) {
          dispatch({
            type: 'nextstep',
            chips: card.chips.map((c) => c.text),
            acts: card.chips.map((c) => c.act),
            rule: card.rule,
          });
        }
        return JSON.stringify({ produced: result.cards.length, rule: card?.rule ?? null, suppression: result.suppression ?? null });
      },
      /** V4-4: the live `pending` gate (drives the chip availability sync). */
      setPending(value: boolean) {
        dispatch({ type: 'pending', value });
        return state.pending;
      },
      snapshot() {
        return {
          risks: l0?.view()?.risks ?? [],
          foldedCount: l0?.view()?.decision.foldedCount ?? 0,
          l1: l1?.report() ?? null,
        };
      },
      /**
       * V3-2 test seam for the L1 layer + the reference judge. One dispatcher
       * (`op`) rather than a wide method surface: everything below drives the SAME
       * code path the product uses (no shadow implementation), and the compact
       * shape keeps the tested surface from costing bundle size for nothing.
       */
      l1(op: string, ...args: unknown[]) {
        const handle = l1;
        if (!handle) return null;
        // The reference state feeds the L0 chip AND the risk rail, so the whole
        // panel is repainted after every step (the rail is L0's writer, not L1's).
        const out = ((): unknown => {
          switch (op) {
          case 'ref':
            return handle.injectRef(args[0] as Parameters<typeof handle.injectRef>[0]);
          case 'env':
            v3TestState.envOverride = true;
            handle.setEnv(args[0] as never, Boolean(args[1]));
            return handle.judge();
          case 'res':
            handle.setResolution(args[0] as RefResolution | undefined);
            return handle.judge();
          case 'rescue':
            // R3: inject a rescue observation (same shape the background probe returns) and
            // re-judge — the gate drives the REAL judge, not a shadow projection.
            handle.setRescue(args[0] as Parameters<typeof handle.setRescue>[0]);
            return handle.judge();
          case 'judge':
            return handle.judge();
          case 'act':
            // AC-CONV-2: the seam calls the production entry point itself (`applyRefAction`)
            // instead of `dispatchRefAction` directly — a second call site here would be
            // exactly the bypass the wiring gate forbids.
            return applyRefAction(String(args[0]), String(args[1] ?? 'ref-action'));
          case 'repick':
            // N-04: fresh facts + the caller's page-side observation (both from the
            // caller — the panel no longer fabricates `resolved`).
            return handle.repick(args[0] as never, args[1] as never);
          case 'receipt':
            return handle.pullReceipt(args[0] as never);
          case 'tree':
            return handle.setSnapshot(args[0] as OwnershipTree | null, args[1] as string | null);
            case 'history':
              return handle.history();
            default:
              return handle.report();
          }
        })();
        render();
        return out;
      },
    },
  };
}

/** Canonical stale-reference facts used by the `staleRef` risk projection. */
function staleRefFacts() {
  return {
    selector: '#ref-target',
    semanticPath: '连接树 › 能力面 › 引用目标',
    textDigest: '引用目标文本摘要',
    origin: state.activeOrigin ?? '',
    documentId: 'doc-1',
    navSeq: 1,
    declarationHash: 'decl-1',
    capturedAt: Date.now(),
  };
}
/** Chat ⇄ settings view switch; captures/restores scroll position + draft. */
const settingsViewSwitch = createViewSwitch({
  open: () => {
    document.body.classList.add('settings-open');
    const view = document.getElementById('settings-view');
    view?.classList.add('show');
    // V3-1: the `hidden` attribute is the real disclosure (the class stays for the
    // existing gates, but the density caliber only exempts `hidden`).
    if (view) view.hidden = false;
  },
  close: () => {
    document.body.classList.remove('settings-open');
    const view = document.getElementById('settings-view');
    view?.classList.remove('show');
    if (view) view.hidden = true;
    // V4-1 (ADR-V4-022 第 3 条): `#settings-back` closes the view without going
    // through the toolbar, so the shell must re-sync `#l2-entry-settings`'s
    // `aria-expanded` pair here — otherwise it stays `"true"` on a hidden view.
    l0?.syncEntryAria();
    // Re-measure the list after it becomes visible again and keep the anchor
    // honest, so the next appended message follows correctly.
    syncScrollAnchor(document.getElementById('stream'));
  },
  getScrollTop: () => document.getElementById('stream')?.scrollTop ?? 0,
  setScrollTop: (value) => {
    const log = document.getElementById('stream');
    if (log) log.scrollTop = value;
  },
  getDraft: () => (document.getElementById('input') as HTMLInputElement | null)?.value ?? '',
  setDraft: (value) => {
    const input = document.getElementById('input') as HTMLInputElement | null;
    if (input) input.value = value;
  },
});

/** Mount the shared settings controller once, then refresh it on every open. */
async function openSettingsView(): Promise<void> {
  const root = document.getElementById('settings-root');
  if (!root) return;
  if (!settingsHandle) {
    settingsHandle = mountSettingsPanel({
      root,
      doc: document,
      env: detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined),
      ops: buildSettingsOps(),
      getActiveOrigin: () => state.activeOrigin,
      onNotice: (text) => dispatch({ type: 'notice', text }),
      // V4.5-1 W2/TASK-V45-105：站点分区详情与流内 `site` 行的 `title` **同源**
      // （同一 `activeSiteNotice` 派生；流内那侧另过 `plaintextTitle` 净化）。
      getSiteDetail: () => activeSiteNotice({ hasOrigin: Boolean(state.activeOrigin), tab: activeTab }).detail,
      onLlmChanged: () => void refreshLlmStatus(),
    });
  }
  settingsHandle.setActiveOrigin(state.activeOrigin);
  settingsViewSwitch.showSettings();
  await settingsHandle.refresh();
}

/**
 * V4.5-1 W3 (TASK-V45-112 / ADR-V45-007 §4) — the **ONE**「open a settings section」
 * production entry. The onboarding chip's `act:'help'` and any future deep link call
 * THIS function: it opens the settings view (the existing switch) and moves focus onto
 * the target section, so the navigation is a single, testable path (no `requestTurn`,
 * no second view mechanism).
 */
function openSettingsSection(sectionId: string): void {
  void openSettingsView().then(() => {
    const section = document.getElementById(sectionId);
    if (section && typeof (section as HTMLElement).focus === 'function') {
      section.setAttribute('tabindex', '-1');
      (section as HTMLElement).focus();
    }
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5-2 TASK-V5-134~137 (ADR-V5-002 §1/§2 · ADR-V5-010 §1) — the masked credential
 * card's ONE value sink, the op `params` / `consent` collectors and `op.llm-config`.
 *
 * 法八入口侧: `submitSecret` is the ONLY place a value reaches storage. The value is
 * never a stream payload field, never a `digest` entry and never an element
 * attribute (`test/ui/law8-plaintext.mjs` scans all four faces in v5-3).
 * ──────────────────────────────────────────────────────────────────────────── */

/** The ONE key store: the settings view, `op.llm-config` and `submitSecret` share it. */
const keyStore = createKeyStore(createChromeAsyncKv('web-cli'));

/** Pending op `params` asks (`requestId → resolve`) and the masked ones among them. */
const opAskResolvers = new Map<string, (v: string | undefined) => void>();
const SECRET_ASKS = new Set<string>();
/** Pending op `consent` cards (`requestId → resolve`). */
const opConsentResolvers = new Map<string, (v: 'allow' | 'reject') => void>();
/** The values the running op collected, in `OP_PARAM_SEQUENCE` order. */
const opParams: string[] = [];
/** 执行前凭据表快照 — the rollback source for `op.llm-config` (R-ALLN-904 上游). */
let llmSnapshot: Awaited<ReturnType<typeof keyStore.load>> | null = null;

/**
 * V5-2 review R1 **BLOCK-03** (ADR-V5-009 §3 · FR-ALLN-013 双射 5↔5) — the two
 * **op-driven blocked terminals** the panel *observes*.
 *
 * `llm.unconfigured` / `perm.missing` are blocked states, so their fact is an
 * **observed block event** (the repairing op failed / was refused), not a static
 * preference. It is folded into the existing `risk` source (`maybeRecommend`), so the
 * recommendation keeps exactly its 7 truth sources — no new source, no new ctx field —
 * and the two P0 providers (`op.llm-config` / `op.perm.request`) really repair it.
 */
const observedBlocked = new Set<string>();

/**
 * V5.5-2 **TASK-V55-215** (FR-SELF-046 · AC-SELF-007) —— 「取消引导 ⇒ **同因不重复**」
 * （同会话内的**事件**，不是重试循环；继承 `maybeRecommendFirstRunEntry` 的三纪律）。
 *
 * `onboardGuideCause` = 当前这条引导的**因**（用户原话 = 悬置任务里那句话）；取消 / 拒绝 /
 * 失败收口时把该因记入 `declinedOnboardCauses`（至多一次）。`maybeRecommend` 据此**只**压掉
 * **同因**的那条引导 —— 新的一句话是新的因，照旧可被引导。取消**不是死端**：取消收口照走
 * `nextAfterSettle(force)`（固化一行 + 立刻求值 ⇒ 既有驱动者给出可达 next），悬置任务保留。
 */
let onboardGuideCause: string | undefined;
const declinedOnboardCauses: string[] = [];

/**
 * `llm.unconfigured` — derived from the live LLM status (the key-store is empty).
 *
 * `ruled`（review R1 **I-04**）= **SW 的 `isLlmConfigured` 裁定投影**：主动识别分支只在 SW
 * 已判「未配置」时收到 `llm-unconfigured` 变体 ⇒ 这条事实**不读**面板的 `llmLoaded` 被动
 * 快照门（冷启动竞态窗口下该门为假，双源会因此退化为单源：detect 行已出而 guide chip 不出现）。
 * 两个来源的 ∨ 口径是**同一份纯判据**（`llmBlockedFactApplies`，生产与门禁共用，零第二实现）；
 * 仍落**同一** `observedBlocked` Set / 同一 `llmBlocked` 终态词汇 ⇒ 幂等不破（C38 / OD-7）。
 */
function noteLlmBlockedFact(ok: boolean, ruled = false): void {
  if (ok) observedBlocked.delete(LLM_BLOCKED_RISK);
  else if (llmBlockedFactApplies(ruled, llmLoaded && !llmSummary?.configured)) observedBlocked.add(LLM_BLOCKED_RISK);
}

/**
 * `perm.missing` — derived from the **measured authorization state of
 * `OPTIONAL_CAPABILITIES`** (`chrome.permissions.contains`, the same single truth the
 * capability rows use): the blocked terminal exists only when a capability is provably
 * not granted. `op.perm.request` failing is what *reveals* it; the grant state is what
 * *decides* it (an op failure with every capability granted is not this terminal).
 */
async function noteMissingCapabilityFact(): Promise<void> {
  const api = capabilityPermissionsApi();
  for (const cap of OPTIONAL_CAPABILITIES) {
    if (!(await hasCapabilityPermission(api, cap))) {
      observedBlocked.add(PERM_BLOCKED_RISK);
      return;
    }
  }
  observedBlocked.delete(PERM_BLOCKED_RISK);
}

/**
 * V5-2 (TASK-V5-136/142) — the **ONE** credential write site (法八 key-sink caliber).
 *
 * Every credential write in the panel goes through here: the masked card's submit
 * (`submitSecret`) and the snapshot rollback (`restoreCredentials`) / revoke
 * (`op.revoke` target `credential`). `keyStore.save(` therefore appears exactly once,
 * and the value never travels through `dispatch` (only facts do).
 */
async function writeCredentials(cfg: Awaited<ReturnType<typeof keyStore.load>>): Promise<void> {
  await keyStore.save(cfg);
}

/**
 * `submitSecret(requestId, value)` — the masked card's submit (FR-ALLN-021 / N24).
 * The value goes **straight to the key store**; only the fact (`maskedLength`) is
 * dispatched, and a blank value is a no-op with zero side effects (EC-ALLN-009).
 */
async function submitSecret(requestId: string, value: string): Promise<void> {
  const secret = value.trim();
  const settle = opAskResolvers.get(requestId);
  opAskResolvers.delete(requestId);
  if (!secret) {
    dispatch({ type: 'notice', text: '✖ 未填写凭据，已取消（零副作用）' });
    settle?.(undefined);
    return;
  }
  llmSnapshot = await keyStore.load();
  const provider = providerById(opParams[0] ?? '');
  await writeCredentials({ providerId: provider.id, apiKey: secret, model: opParams[1] || provider.defaultModel });
  // V5-2 review R1 I-04 (ADR-V5-010 §2 缩窄侧信道): the固化区 carries the length
  // **category** (`8+` / `8-`), never the raw length — the number stays inside this
  // function, so the payload/state face cannot leak it either.
  const maskedLength = secret.length >= 8 ? '8+' : '8-';
  // V5-3（TASK-V5-174）：掩码写入的**事实**落审计面（只发长度类别，不发值）。
  void send(makeMessage('llm-config', { maskedLength })).catch(() => {});
  dispatch({ type: 'ask-resolved', requestId, answer: undefined, maskedLength });
  settle?.(secret);
}

/**
 * The pipeline's production `params` collector (ADR-V5-002 §1 ②): walk the op's ask
 * sequence through the ONE stream card mechanism. A value already carried by the
 * caller (a chip submit) skips the ask state, and a refusal maps to `PARAMS_REJECTED`.
 */
function collectOpParams(op: NextOp, ctx: OpCtx): Promise<unknown> {
  if (ctx.value !== undefined) return Promise.resolve(ctx.value);
  // V5-2 (FR-ALLN-046): `op.describe`'s `text` ask card is the **existing** in-panel
  // fallback card (`ensureTextAskCard` / `#ask-fallback`, the ONE owner of「用文字描述」),
  // so the pipeline's params phase resolves to it instead of minting a second card —
  // a second owner is exactly what `test:recommendation` ⑫ forbids.
  if (op.opId === 'op.describe') {
    revealAskFallback();
    return Promise.resolve(true);
  }
  const specs = OP_PARAM_SEQUENCE[op.opId] ?? (op.params ? [op.params] : []);
  return (async () => {
    const values: string[] = [];
    for (const spec of specs) {
      const rid = `op-param:${op.opId}:${values.length}`;
      if (spec.kind === 'secret') SECRET_ASKS.add(rid);
      dispatch({
        type: 'ask',
        requestId: rid,
        kind: spec.kind,
        prompt: spec.prompt,
        ...(spec.options ? { options: [...spec.options] } : {}),
        // V5-2 TASK-V5-138 (ADR-V5-004 §3): the `form` pool is the platform layer's
        // single source — the card renders exactly what the registry declares.
        ...(spec.kind === 'form' ? { formOptions: OPTIONAL_CAPABILITY_FORM_OPTIONS.map((o) => ({ ...o })) } : {}),
      });
      const v = await new Promise<string | undefined>((resolve) => opAskResolvers.set(rid, resolve));
      if (v === undefined) {
        SECRET_ASKS.delete(rid);
        return PARAMS_REJECTED;
      }
      // 法八: a secret value is NOT kept — only a masked marker enters the tuple.
      values.push(spec.kind === 'secret' ? '' : v);
    }
    opParams.splice(0, opParams.length, ...values);
    return values.length === 1 ? values[0] : values;
  })();
}

/**
 * The pipeline's production `consent` collector (ADR-V5-002 §1 ③): the stream auth
 * card. A rejection undoes an already-written credential (the params state precedes
 * consent in the one pipeline), so「拒绝 ⇒ 无状态变更」also holds for `op.llm-config`.
 */
async function collectOpConsent(op: NextOp): Promise<'allow' | 'reject'> {
  const rid = `op-consent:${op.opId}`;
  dispatch({ type: 'confirm', requestId: rid, summary: op.consent?.prompt ?? '' });
  const answer = await new Promise<'allow' | 'reject'>((resolve) => opConsentResolvers.set(rid, resolve));
  if (answer === 'reject' && op.opId === 'op.llm-config') await restoreCredentials();
  return answer;
}

/**
 * V5-2 (FR-ALLN-042 / R-ALLN-904 上游) — 执行前快照的**回滚**入口.
 *
 * The snapshot is restored through the SAME single settings execution body
 * (`SettingsOps#saveLlm` over the ONE `keyStore`), so `submitSecret` remains the
 * **only** `keyStore.save` site that carries a user value (ADR-V5-010 §1's key-sink
 * caliber: 1 value-carrying write, and the value never travels through `dispatch`).
 */
async function restoreCredentials(): Promise<void> {
  const snapshot = llmSnapshot;
  llmSnapshot = null;
  if (!snapshot) return;
  // 142（R-ALLN-904）: the rollback goes through the SAME single credential write site
  // (`writeCredentials`) — never a second path, and never a value through the stream.
  await writeCredentials(snapshot);
}

/**
 * V5-2 **TASK-V5-139/141** · review R1 **BLOCK-01** (ADR-V5-004 §3 / ADR-V5-005 §1/§3 ·
 * FR-ALLN-042/043/044) — the panel's **atoms** for the surface-agnostic op bodies.
 *
 * The panel owns only what is genuinely panel-local: the live bound origin (`site-auth`),
 * the stream row writer, and the **gesture** entry (`requestCapabilityPermissionOnGesture`
 * — the ONE call site; Chrome requires the request inside the extension page's gesture).
 * The body itself (the two-stage handshake, the「新增项在册」judge, the double固化, the
 * permission remove + `contains` re-read) is ONE function shared with the options page
 * (`settings/op-bodies.ts`), which is what makes「同执行体、不同 consent 载体」machine-true.
 */
function buildOpBodies(): OpBodies {
  return createOpBodies({
    saveCredentials: (cfg) => writeCredentials(cfg),
    loadProviderKey: async (id) => (await keyStore.loadProvider(providerById(id).id)).apiKey,
    loadCredentials: () => keyStore.load(),
    removePermission: (cap) => removeCapabilityPermission(capabilityPermissionsApi(), cap),
    requestOnGesture: (cap) => requestCapabilityPermissionOnGesture(cap),
    isGranted: (cap) => hasCapabilityPermission(capabilityPermissionsApi(), cap),
    reconcile: async (cap) => {
      await buildSettingsOps().notifyCapabilityPermissionChanged(cap);
    },
    send: (msg) => send(msg),
    revokeSiteAuth: (origin) => revokeSiteAuth(origin),
  });
}

/**
 * `op.perm.request`'s panel entry — a thin delegator to the shared body. The panel keeps
 * the named function (the op's single panel-side entry point, asserted by
 * `test/authorize-chip-wiring` ②c) while the semantics live in `settings/op-bodies.ts`.
 */
async function permRequest(ids: readonly string[]): Promise<OpOutcome> {
  const out = await buildOpBodies().permRequest(ids);
  if (out.ok) observedBlocked.delete(PERM_BLOCKED_RISK);
  else await noteMissingCapabilityFact();
  // 双固化：拒绝路径的**具体事实**（未授予哪些 / 回收须你在浏览器确认）由**管线结算**
  // （`pipeline.ts#defaultSettle('failed')` → `opReceiptText(op, out)`，取 `out.receipt.text`）
  // 承载 —— 本 hook 只负责 `observedBlocked` 事实源，**不再**自己 `dispatch` 一行
  // （validate R1 **N-01**：两条写者会让同一失败回执出现 2 行；settle 为唯一写者）。
  return out;
}

/** `op.revoke` target `site-auth` — state-aware, so it stays panel-local (ADR-V5-005 §1). */
async function revokeSiteAuth(arg?: string): Promise<OpOutcome> {
  const origin = arg || state.activeOrigin;
  if (!origin) return { ok: false, reason: 'revoke-no-origin' };
  const res = await send<{ hostPermissionRemoved?: boolean }>(makeMessage('revoke', { origin }));
  dispatch({ type: 'state', authorized: false });
  // 如实说明（不虚报）：host permission 的移除由后台按 Chrome 规则执行。
  if (res.data?.hostPermissionRemoved !== true) {
    dispatch({ type: 'notice', text: `已撤销 ${origin} 的授权；站点访问权限仍由浏览器持有，须你在浏览器确认回收。` });
  }
  return { ok: true };
}

/**
 * V5-2 **TASK-V5-142** (R-ALLN-904 · EC-ALLN-011) — the production **three-table**
 * adapters (authorization / permission / credential). The pipeline snapshots all three
 * before a mutating op and restores **all three** on failure.
 */
function threeTableAdapters(): readonly TableAdapter[] {
  return [
    {
      name: 'authorization',
      read: () => [{ origin: state.activeOrigin ?? null, authorized: state.authorized, autoAuth: state.autoAuth }],
      write: async (rows) => {
        const row = rows?.[0] as { origin?: string | null; authorized?: boolean } | undefined;
        const origin = row?.origin ?? state.activeOrigin ?? undefined;
        if (!origin) return;
        if (row?.authorized === false) {
          await send(makeMessage('revoke', { origin }));
          await refreshState();
        } else if (row?.authorized === true) {
          await send(makeMessage('authorize', { origin }));
        }
      },
    },
    {
      name: 'permission',
      read: async () => {
        const api = capabilityPermissionsApi();
        const out: Array<{ cap: OptionalCapability; granted: boolean }> = [];
        for (const cap of OPTIONAL_CAPABILITIES) {
          const ok = api?.contains ? await api.contains({ permissions: permissionsOf(cap) }).catch(() => false) : false;
          out.push({ cap, granted: ok === true });
        }
        return out;
      },
      // Chrome only grants a permission inside a **user gesture**, so the restore can
      // only reconcile; the honest caliber is registered in the consent copy
      // (「回收也须你在浏览器确认」) — never a silent re-grant.
      write: async () => {
        for (const cap of OPTIONAL_CAPABILITIES) await buildSettingsOps().notifyCapabilityPermissionChanged(cap);
      },
    },
    {
      name: 'credential',
      read: async () => [{ cfg: await keyStore.load() }],
      write: async (rows) => {
        const cfg = (rows?.[0] as { cfg?: Awaited<ReturnType<typeof keyStore.load>> } | undefined)?.cfg;
        if (!cfg) return;
        await writeCredentials(cfg);
      },
    },
  ];
}

/**
 * V2-3: the single `SettingsOps` factory shared by the in-panel settings view and
 * the connection-tree action runner (same existing ops, no new channels/deps).
 */
function buildSettingsOps(): SettingsOps {
  const env = detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined);
  return createSettingsOps({
    env,
    // V5-2 TASK-V5-145/146: the settings surface reaches the SAME op execute body
    // (`dispatchOp`) instead of its own implementation — one path, two consent carriers.
    surface: 'settings',
    dispatchOp: (opId, ctx, surface) => dispatchOp(opId, ctx, surface),
    transport: transportFromRuntime(chrome.runtime as unknown as { sendMessage(message: unknown): Promise<unknown> }),
    store: keyStore,
    buildStamp: shortBuildStamp(),
    manifestVersion: () => {
      try {
        return chrome.runtime.getManifest().version;
      } catch {
        return 'unknown';
      }
    },
    probeStorage: async () => {
      const kv = createChromeAsyncKv('web-cli-diag');
      const token = { at: Date.now() };
      await kv.set('probe', token);
      const back = await kv.get<{ at?: number }>('probe');
      await kv.remove('probe');
      return back && typeof back.at === 'number'
        ? { status: 'ok' as const, detail: '写入测试键 → 读回一致 → 已清理' }
        : { status: 'warn' as const, detail: '写入测试键后读回为空或结构不符（存储可能不可用）' };
    },
  });
}

/** Live scroll metrics of the message list (measured from the real DOM). */
function metricsOf(el: HTMLElement): ScrollMetrics {
  return { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop, clientHeight: el.clientHeight };
}

/** Re-read the message list and refresh the follow anchor from live layout. */
function syncScrollAnchor(el?: HTMLElement | null): void {
  const log = el ?? document.getElementById('stream');
  if (log) scrollFollow.observe(metricsOf(log));
}

/** True when the message list is scrolled to (near) the bottom. */
function isAtBottom(el: HTMLElement): boolean {
  return isNearBottom(metricsOf(el));
}

/** Show the "back to bottom" affordance only while scrolled away. */
function updateScrollHint(): void {
  const log = document.getElementById('stream');
  const btn = document.getElementById('scroll-bottom');
  if (!log || !btn) return;
  const show = !isAtBottom(log);
  btn.classList.toggle('show', show);
  // V3-1: `hidden` is what actually removes it from the density budget.
  btn.hidden = !show;
}

/**
 * Pin the list to its true bottom *after* layout. A single synchronous
 * `scrollTop = scrollHeight` can land short when the newly appended content
 * (markdown tables, fonts, a collapsed tool card) reflows one frame later, so we
 * pin again on the next frame — but only while the viewport is still anchored,
 * so a real user scroll-up between frames always wins (never fight the user).
 */
function followToBottom(log: HTMLElement): void {
  const pin = () => {
    log.scrollTop = log.scrollHeight;
  };
  if (typeof requestAnimationFrame !== 'function') {
    pin();
    syncScrollAnchor(log);
    updateScrollHint();
    return;
  }
  requestAnimationFrame(() => {
    pin();
    requestAnimationFrame(() => {
      if (isAtBottom(log)) pin();
      syncScrollAnchor(log);
      // BLOCK-01 (v4-4 review): a follow that happens OUTSIDE the render path (the
      // turn-end recommendation card) must also settle the「回到底部」affordance —
      // otherwise the hint stays visible after the pin and the「发送后无条件滚到底」
      // invariant reads as broken for one frame window.
      updateScrollHint();
    });
  });
}

function send<T>(message: PluginMessage): Promise<PluginResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<PluginResponse<T>>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * V4-4 review 修复轮 **BLOCK-02** — the five remaining transient channels are
 * EVENTIZED through the ONE system channel (ADR-V4-036 §5 merge matrix).
 *
 * Each channel keeps its readable DOM projection where a protection gate pins it
 * (`#notice` / `#site-hint` / `#discovery-notice` / `#env-guard` are read by
 * journey / binding / hardening / l0), but the FACT is now also append-recorded on
 * every real change. The「first observation」is the baseline (a panel that simply
 * loads must not flood the stream); only a CHANGE appends a row — exactly the
 * `send-reason` rule (「只在原因变化时追加」) generalized to all five.
 *
 * The rows are collected at the point the FACTS are applied — `eventizeChannels()`
 * (called at the tail of `refreshState()`) and the one-shot `applyEnvGuard()` — and
 * flushed immediately inside that same function (`flushChannelRows()`), NOT during
 * `render()`. That is what keeps a channel that merely changes *while painting* from
 * appending a row the fixture never asked for (see the `eventizeChannels` doc below).
 * ──────────────────────────────────────────────────────────────────────────── */
/** Last observed value per channel (module state — cleared by `testing.reset()`). */
const channelMemory = new Map<string, string>();
/**
 * V4.5-1 W2 (TASK-V45-105): a pending row carries the **single-line fact** (`text`) plus
 * the optional **long copy** (`title`). The long copy used to be the retired strip node's
 * body (`#site-hint-detail` / `#discovery-detail`); it now rides the row's `title`, which
 * goes through the SAME fail-closed plaintext projector as the row text (`systemRow` →
 * `plaintextTitle`), so a URL query / markup / secret in the detail throws at build time.
 */
const pendingChannelRows: Array<{ kind: 'env' | 'site' | 'firstRun' | 'probe' | 'send'; text: string; title?: string }> = [];

/**
 * V4.5-1 W2 (TASK-V45-105) — the channels whose **current state** must be carried by
 * their stream row on the **first observation** too.
 *
 * WHY: the retired DOM projections used to paint the current state (`#site-hint` /
 * `#discovery-notice`) on every render. With the nodes gone, the single-line system row
 * is the fact's ONLY visible carrier — so「首次观察 = 基线，不追加」would leave the首屏
 * 三事实（env / site / probe）**unreachable**. The existing `channelMemory` guard still
 * suppresses repeats (an unchanged fact never floods), and the 5 s dedupe window + the
 * 20-row/minute cap still bound the stream.
 *
 * The two channels NOT listed keep the change-only rule **because their carrier is not
 * the row**: `firstRun` is carried by `firstRunCard` (the row records step *transitions*)
 * and `send` is carried by the preserved `#send-reason` in `#region-statusbar`. This
 * keeps「载体数 == 1」true for every fact family.
 */
const CHANNEL_STATE_CARRIERS: ReadonlySet<'env' | 'site' | 'firstRun' | 'probe' | 'send'> = new Set([
  'site',
  'probe',
]);

/**
 * Record one channel observation; append only on a real change (never on load).
 *
 * V4.5-1 review R1 BLOCK-03 — the optional `suppressed` argument: when the fact family
 * already has its **single visible carrier** (the `firstRun` case: `firstRunCard` /
 * the onboarding recommendation card), the single-line system event row is **not
 * queued** (「卡在 ⇒ 行不在」, the orchestrator's firstRun caliber). The observation is
 * still remembered so a later card-less transition is not re-emitted as a duplicate.
 */
function observeChannel(
  kind: 'env' | 'site' | 'firstRun' | 'probe' | 'send',
  text: string,
  title?: string,
  suppressed = false,
): void {
  const prev = channelMemory.get(kind);
  if (prev === text) return;
  const firstObservation = prev === undefined;
  channelMemory.set(kind, text);
  if (text.length === 0) return; // the fact is not visible ⇒ nothing to append
  if (suppressed) return; // 已有唯一可见载体（卡）⇒ 事实不双见，行抑制
  // Change-only channels (firstRun / send) keep the v4-4 rule; the state carriers
  // (site / probe) also append their **first** observation — see CHANNEL_STATE_CARRIERS.
  if (firstObservation && !CHANNEL_STATE_CARRIERS.has(kind)) return;
  pendingChannelRows.push({ kind, text, ...(title !== undefined && title.length > 0 ? { title } : {}) });
}
/**
 * V4.5-1 review R1 BLOCK-03 — the **live carrier-surface reading** behind
 * `window.__v3.testing.stripChannelReading()`.
 *
 * A *surface* is a DOM region that displays the fact family's **current** state. It has
 * two possible halves and the reading counts both, so a re-projection is visible:
 *
 *   · the **retired legacy node** (by id, `STRIP_CHANNEL_LEGACY_IDS`) — 0 after the真退役,
 *     1 if some future change re-introduces it (the second carrier);
 *   · the **in-stream carrier** — a system row / the first-run card. Cumulative event rows
 *     are the SAME surface's history, so this half is a boolean (`> 0 ⇒ 1`).
 *
 * `firstRun` counts its **two** in-stream carriers separately (the onboarding card **and**
 * a `data-kind="firstRun"` row), so「卡在 ⇒ 行在」is a double carrier and FAILs; the product
 * suppresses the row while the card is the carrier (see `observeChannel`'s `suppressed`).
 * `rows` is the RAW carrier-node count, used by the gates' per-fact「恰 1」assertions.
 */
function stripCarrierReading(channel: string, kind: string): { count: number; rows: number } {
  const legacyId = STRIP_CHANNEL_LEGACY_IDS[channel];
  const legacy = legacyId !== undefined && document.getElementById(legacyId) !== null ? 1 : 0;
  if (channel === 'send-reason') {
    // The preserved carrier itself (NOT a retired id): the status bar element is the one
    // surface, and it always exists.
    return { count: legacy, rows: legacy };
  }
  if (channel === 'firstRun') {
    const card = document.querySelectorAll('#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]').length;
    const rows = document.querySelectorAll('#stream [data-msg-type="system"][data-kind="firstRun"]').length;
    return { count: legacy + (card > 0 ? 1 : 0) + (rows > 0 ? 1 : 0), rows: card + rows };
  }
  const rows = document.querySelectorAll(`#stream [data-msg-type="system"][data-kind="${kind}"]`).length;
  return { count: legacy + (rows > 0 ? 1 : 0), rows };
}
/** The live reading object `evaluateStripChannels` consumes (one implementation). */
function stripChannelReading(): {
  observedCarriers: readonly { channel: string; count: number; rows: number }[];
  sendReasonInStatusbar: boolean;
} {
  const observedCarriers = STRIP_CHANNEL_KINDS.map((b) => ({
    channel: b.channel,
    ...stripCarrierReading(b.channel, b.kind),
  }));
  const reason = document.getElementById('send-reason');
  const statusbar = document.getElementById('region-statusbar');
  return Object.freeze({
    observedCarriers: Object.freeze(observedCarriers),
    sendReasonInStatusbar: Boolean(reason && statusbar && statusbar.contains(reason)),
  });
}

/** Flush the channel rows collected during a render (one `dispatch` each). */
function flushChannelRows(): void {
  if (pendingChannelRows.length === 0) return;
  const rows = pendingChannelRows.splice(0, pendingChannelRows.length);
  for (const row of rows) {
    dispatch({ type: 'system', kind: row.kind, text: row.text, ...(row.title !== undefined ? { title: row.title } : {}) });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * V4-4 review 修复轮 **BLOCK-01** — the recommendation producer wiring.
 *
 * `recommendNextStep` used to be reachable only from the test seam, so the whole
 * recommendation surface was unreachable in the product (FR-CHAT-060~064 /
 * AC-CHAT-013). The producer is now called at the **four** real timings — pick /
 * stale / idle (= turn end with no open ask) here in the render path, and the
 * first-run entry through {@link maybeRecommendFirstRunEntry} at the `firstRun`
 * channel's eventization point (`eventizeChannels`); it reads ONLY panel-level facts
 * (the 7-item truth whitelist) and mints the card through the real reducer action
 * (whose `pending` / empty-card gates stay the last word).
 *
 * I-09（v4-4 快修轮）：the `'firstRun'` trigger used to have **no production call
 * site** at all（`R-ONBOARDING` 的卡只在测试 seam 里可达）—— the merge/eventization
 * round only read the onboarding view for the CHANNEL row. The entry is wired now
 * (see the dedicated block below), so「首装 ⇒ 下一步推荐卡」is reachable in-product.
 * ──────────────────────────────────────────────────────────────────────────── */
/** 时机源闭集（`RecommendTrigger`）已外移到 `next-registry/drivers.ts` 单源（TASK-V55-103）。 */
/** Anti-flicker memory: the producer's interval is measured against the last card. */
let lastNextstepProducedAt: number | undefined;
/**
 * Diagnostics for the last producer run (the gate reads it to tell「被门控」from
 * 「未接线」without going through the seam). Never a security input.
 */
let lastRecommendOutcome: { trigger: RecommendTrigger; rule: string | null; suppression: string | null } | null = null;
/** V5-2 (FR-ALLN-047): the last recommendation context `op.help` derives the op list from. */
let lastRecommendCtx: NextCtx | null = null;

/* ────────────────────────────────────────────────────────────────────────────
 * R6（2026-09-23）—— **完成后同动作去重**（真机 `ty.md` 21:32:26：一次「原地翻译」完成后
 * 下一步推荐又推了同一件事）。
 *
 * 机制：一次引用动作被驱动时记下它的去重键（`refId#意图摘要`，`recommend.ts` 单源）；
 * 该回合完成（`done`）时把键**提交**进 `completedRefActions` ⇒ 生产器压掉同 digest 的
 * `ref-action` 候选（见 `recommendNextStep` 的 `completedActions` 过滤）。其他规则照旧可达。
 * 有界：只保留最近 8 个键（一次会话的引用动作数远小于此）。
 * ──────────────────────────────────────────────────────────────────────────── */
let pendingCompletedRefAction: string | undefined;
const completedRefActions = new Set<string>();
const COMPLETED_REF_ACTIONS_MAX = 8;
/** 提交「刚完成的引用动作」键（回合完成点调用；无在途键 ⇒ no-op）。 */
function commitCompletedRefAction(): void {
  if (!pendingCompletedRefAction) return;
  completedRefActions.add(pendingCompletedRefAction);
  while (completedRefActions.size > COMPLETED_REF_ACTIONS_MAX) {
    const oldest = completedRefActions.values().next().value;
    if (oldest === undefined) break;
    completedRefActions.delete(oldest);
  }
  pendingCompletedRefAction = undefined;
}
/** 夹具 / 会话切换：清空「刚完成」台账（与悬置登记同寿命）。 */
function resetCompletedRefActions(): void {
  pendingCompletedRefAction = undefined;
  completedRefActions.clear();
}

/**
 * Run the REAL producer against the live panel facts and mint the card when a
 * candidate survives. Returns the produced rule (or `null` for a suppression), which
 * is what the diagnostics seam exposes.
 */
function maybeRecommend(trigger: RecommendTrigger, opts: { force?: boolean } = {}): string | null {
  const views = project(state.stream);
  const counts = refCounts(views);
  const staleRefs = l1?.store().stale() ?? [];
  const onboarding = buildOnboarding({
    configured: llmLoaded && Boolean(llmSummary?.configured),
    hasOrigin: Boolean(state.activeOrigin),
    discovered: state.discoveryState !== undefined,
    authorized: state.authorized,
    hasConversation: state.entries.length > 0,
  });
  const firstRun = firstRunCard(onboarding);
  const risks: string[] = [];
  if (staleRefs.length > 0) risks.push('refInvalid');
  if (state.invalidated) risks.push('declarationInvalid');
  // V5-2 review R1 BLOCK-03 (FR-ALLN-013 · ADR-V5-009 §3): the two **observed** blocked
  // terminals fold into the existing `risk` source — the ctx keeps its 7 truth sources,
  // and the P0 providers (`op.llm-config` / `op.perm.request`) really offer the repair.
  // V5.5-2 **TASK-V55-215** (FR-SELF-046): 「取消 ⇒ 同因不重复」—— 仅压掉**同因**
  // 的那条引导（新因照旧可引导），且取消路径的可达 next 由既有驱动者给出（非死端）。
  for (const id of observedBlocked) {
    if (id === LLM_BLOCKED_RISK && suppressOnboardCause(onboardGuideCause, declinedOnboardCauses)) continue;
    risks.push(id);
  }
  const input: Parameters<typeof recommendNextStep>[0] = {
    ref: { validCount: counts.validCount, staleCount: counts.staleCount, ...(counts.latestRefNum !== undefined ? { latestRefNum: counts.latestRefNum } : {}) },
    session: { openAsks: state.stream.openAsks.length, busy: state.pending },
    site: { authorized: state.authorized, trust: state.trust === 'trusted' ? 'trusted' : 'untrusted' },
    catalog: { toolCount: CATALOG_BASELINE_META.toolCount, subcommandCount: CATALOG_BASELINE_META.subcommandCount },
    probe: { ...(state.probe?.phase ? { phase: state.probe.phase } : {}), steady: state.probe?.steady === true },
    risks,
    onboarding:
      trigger === 'firstRun'
        ? { firstRun: firstRun.visible, pendingSteps: firstRun.lines }
        : { firstRun: false, pendingSteps: [] },
    // V5-2 TASK-V5-143: a refusal / failure must reach a next step **immediately** —
    // the anti-flicker interval is for idle repetition, never for a recovery row.
    ...(!opts.force && lastNextstepProducedAt !== undefined ? { lastProducedAt: lastNextstepProducedAt } : {}),
    // R6：完成后同动作去重（refId + 意图摘要）。
    ...(completedRefActions.size > 0 ? { completedActions: [...completedRefActions] } : {}),
    now: Date.now(),
  };
  lastRecommendCtx = recommendCtx(input);
  const result = recommendNextStep(input);
  const card = result.cards[0];
  lastRecommendOutcome = { trigger, rule: card?.rule ?? null, suppression: result.suppression ?? null };
  if (!card) return null;
  // BLOCK-01 (v4-4 review): the recommendation card is appended at a TURN BOUNDARY —
  // if the viewport was anchored at the bottom (the user just sent / the reply was
  // followed), the new card must not push the view away from the bottom. The render
  // path cannot do it (this append happens outside `render()`), so the follow is
  // explicit and only ever runs while the viewport was already anchored (`isAtBottom`)
  // — a real scroll-up is never fought.
  const log = document.getElementById('stream');
  const anchored = log ? isAtBottom(log) : false;
  lastNextstepProducedAt = Date.now();
  dispatch({
    type: 'nextstep',
    chips: card.chips.map((c) => c.text),
    acts: card.chips.map((c) => c.act),
    rule: card.rule,
  });
  if (log && anchored) followToBottom(log);
  return card.rule;
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-1 TASK-V55-113/114（ADR-V55-001 §5 · ADR-V55-002 §3 · FR-SELF-015/030/033）——
 * `nextAfterSettle`：**唯一**的「结算 → 下一个驱动者」入口。
 *
 * 为什么要有它：`'answered'` 时机的触发点在三处「用户已表达的话」的结算路径上
 * （`applyRefAction` / `submitDescribe` / 后台 ask 应答）。若每处就地写一行
 * `maybeRecommend('answered')`，`maybeRecommend(` 的调用点计数会从 7 涨到 10 —— 那
 * 正是 `test/op-wiring.test.ts` / `driver-timings` 钉死的「第 8 个散落调用点」（R-V55-101）。
 * 因此把「结算 → 时机」的映射收口到这一个函数：**加时机 = 改这一处**，调用点不增。
 * ──────────────────────────────────────────────────────────────────────────── */
/**
 * 结算 → 立刻求值一次驱动者。**定义恰 1**（调用点可多处，但都经此一处求值）。
 *
 * `force` 只对恢复行 / 失败行生效（防抖不得吞掉恢复面）；`'answered'` **恒不强制** ——
 * 它必须受去重 + 10 s 防抖约束（EC-SELF-004，不得弹第二条）。
 */
function nextAfterSettle(src: SettleSource = { kind: 'idle' }): void {
  // ★ V5.5-3 TASK-V55-313（ADR-V55-009 §1「连续自动链」）：一次「已答」= 用户交互 ⇒ 自动链
  // **断开**（重置链深），随后（若发生）的自动成回合从深度 1 重新计。用户手输回合另有
  // `proactivity.noteUserTurn()`（重置链深 **且** 进入静默期）。
  if (src.kind === 'answered') proactivity.noteUserInteraction();
  maybeRecommend(timingOfSettle(src), src.kind === 'answered' ? {} : { force: src.force === true });
  // V5.5-3 TASK-V55-306：「已答」结算同时也是**主题② 自动成回合**的时机（零按键）。
  if (src.kind === 'answered') driveAnsweredTurn();
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-306**（ADR-V55-009 §3 · ADR-V55-010 §2/§3 · FR-SELF-060/063/065/070 ·
 * AC-SELF-001/008）——「**已配置 ⇒ 答案后零按键自动成回合**」（S0 分支 A 的机制侧端到端）。
 *
 * 答案在哪：v55-1 的**唯一**悬置登记（`registerSuspension`）——「用户已表达的一句话」不是
 * 计数，而是**可被接手的输入**。本函数把那句话经**既有** `op.turn` 槽交出去：
 *
 *   `pressCandidate('op.turn', instruction, { by:'ai' })` → `dispatchChipAction` → `runOp`
 *   → `PANEL.turn` → `requestTurn`（**调用点计数不变，仍恰 2**）
 *
 * **有界性（事件作用域）**：同一条意图（`dedupeKey(driverId:source, instruction)` 单源）只自动
 * 发起**一次**；下一次尝试只可能来自新的结算事件（新的用户表达），因此不可能形成自触发环。
 * 拒绝**不消费**该意图（回合未真正建立 ⇒ 下个回合结束点再试），台账不丢答案。
 * 频次 / 冷却 / 链深度 / 预算的六常量护栏由 W4 的 `guard.ts` 经 `guardAllowed` 缝接入（零第二阈值）。
 * ──────────────────────────────────────────────────────────────────────────── */
/** 已经自动驱动过的意图键（单槽：只有**最新**那条悬置需要判重）。 */
let lastAutoDrivenKey: string | undefined;

function driveAnsweredTurn(): void {
  // 主题② 前提 = **已配置**（配置判据 = v55-2 的唯一分流依据；未配置 ⇒ 零 AI 主动发起）。
  const configured = llmLoaded && Boolean(llmSummary?.configured);
  if (!configured) return;
  // ★ R6（2026-09-23）—— **答案 once 语义**（`ty.md` 21:32:18/21:32:26 双回合缺陷）：
  // 被在飞回合经 `askBridge.settle` 消费过的后台答案（`askId ∈ consumedAskIds`）不再被
  // 自动接手 ⇒ 不再组合新回合。判据在 `drivers.ts#drivableSuspension`（纯函数，门禁可判）。
  const live = drivableSuspension(listSuspensions(), consumedAskIds);
  if (!live || !live.instruction) return;
  const key = dedupeKey(`${live.driverId}:${live.source}`, live.instruction);
  if (key === lastAutoDrivenKey) return;
  // ★ V5.5-3 TASK-V55-313（ADR-V55-009 §1 · FR-SELF-090~092/096）—— 护栏**前置判定**：
  // 越限（关断 / 预算 / 链深 / 静默 / 冷却 / 同因 / 频次）⇒ **抑制 + 留痕**（非静默）：
  // 写一行 `suppressed=<reason>`（词表单源在 `guard.ts`），可达 next 仍由既有推荐器产出。
  const verdict = proactivity.verdict('ai', key);
  if (!verdict.allowed) {
    dispatch({ type: 'notice', text: driverSuppressedLine(live.driverId, 'answered', live.evidence, verdict.reason) });
    return;
  }
  const out = pressCandidate(
    'op.turn',
    live.instruction,
    {
      actor: 'ai',
      driverId: live.driverId,
      driverClass: 'ai-driven',
      configured,
      armed: true,
      busy: state.pending,
      // W4 护栏缝（单源判定；本模块零第二阈值）—— 与上方前置判定同一函数，纵深防御。
      guardAllowed: () => proactivity.verdict('ai', key).allowed,
    },
    live.evidence,
  );
  // 只在**真正按下**时消费该意图（被拒时下个结算点仍可再试）；并记账（频次 / 冷却 / 链深 / 预算）。
  if (out.ok) {
    lastAutoDrivenKey = key;
    proactivity.noteProactive(key);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-2 **TASK-V55-210 / 211** (ADR-V55-007 §2/§3 · FR-SELF-045/050 · R-SELF-904) ——
 * 「配置完成 ⇒ 自动续接悬置任务」。
 *
 * **顺序（机核）**：`op.llm-config` 的成功**回执**由 `pipeline.ts#defaultSettle` 写出，
 * 本函数只在回执落地**之后**被调（`PanelOps.opSettled` 的 `completed` 分支）——「回执在前、
 * 续接在后」由该处源码序保证。续接经 **`op.turn` 槽**（op 查表执行体，非第二入口）
 * ⇒ `requestTurn(` 的调用点计数不变，且**全程留在流内**（零视图切换 / 零 `#open-settings`）。
 *
 * 失败 / 取消路径**不**经过 `completed` ⇒ 悬置任务**保留**（不丢），由既有失败收口
 * （回滚 + 错误卡 + 可达 next）告一段落。
 * ──────────────────────────────────────────────────────────────────────────── */
function resumeAfterConfig(): void {
  // 有效期重校验（EC-SELF-011）：站点已变 ∨ 会话已切换 ⇒ `invalidated`（**不制造假成功**）。
  const decided = resumeSuspension({
    ...(state.activeOrigin ? { origin: state.activeOrigin } : {}),
    ...(sessionId ? { sessionId } : {}),
  });
  if (decided.status === 'resumed' && decided.instruction) {
    dispatch({ type: 'notice', text: ONBOARD_RESUME_TEXT });
    // 悬置的那句话**原样**成为回合输入（不要求用户重说）：经 **`op.turn` 槽**（同一查表
    // 执行体 ⇒ `requestTurn(` 调用点计数不变、面板侧唯一 chip 入口仍恰 1 处）。
    void dispatchOp('op.turn', { value: decided.instruction });
    return;
  }
  // 空悬置 / 失效：**非死端** —— 固化事实 + 可达 next（EC-SELF-012）。
  if (decided.status === 'invalidated') dispatch({ type: 'notice', text: ONBOARD_INVALIDATED_TEXT });
  nextAfterSettle({ kind: 'answered' });
}

/** 后台 ask（由 SW 的 `ask-user-request` 投递）的 requestId 集 —— 迟到口径只对它成立。 */
const bgAskIds = new Set<string>();
/**
 * R6（2026-09-23）—— 已被**在飞回合**经 `askBridge.settle` 消费的后台答案 requestId 集。
 *
 * 「消费」的判据 = SW 回 `settled: true`（`settle` 真的接住了这次提问，答案已进入
 * 那个正在跑的回合）。这类答案**不得**在回合收口后被「答案后自动成回合」再消费一次
 * （`driveAnsweredTurn` 经 `drivers.ts#drivableSuspension` 读本集，requestId 级去重）。
 * 有界：只保留最近 32 个 requestId（一次会话的提问数远小于此）。
 */
const consumedAskIds = new Set<string>();
const CONSUMED_ASK_IDS_MAX = 32;
function markConsumedAsk(rid: string): void {
  if (!rid) return;
  consumedAskIds.add(rid);
  while (consumedAskIds.size > CONSUMED_ASK_IDS_MAX) {
    const oldest = consumedAskIds.values().next().value;
    if (oldest === undefined) break;
    consumedAskIds.delete(oldest);
  }
}
/** 迟到作答的**固化文案**（零明文：不含答案文本本身，法八不破）。 */
const LATE_ASK_TEXT = '回合已结束，未接住这条答案（它没有被丢弃：下方给出可走的一步）。';

/** 悬置登记的 evidence 面（⊆ `CTX_FIELD_SERVICE` 登记面，与驱动者声明同一面）。 */
const REF_SUSPENSION_EVIDENCE = Object.freeze(['ref.validCount', 'ref.latestRefNum']);

/* ────────────────────────────────────────────────────────────────────────────
 * I-09（v4-4 快修轮）— the **first-run entry** of the recommendation producer.
 *
 * Why a dedicated helper: the review found that `maybeRecommend('firstRun')` had
 * **zero production call sites**. The onboarding view was only READ (for the
 * `firstRun` channel row), so `R-ONBOARDING`'s card was reachable from the test seam
 * only — while the comment and `build.md` claimed the timing was connected.
 *
 * Where the timing really lives: a fresh install boots the panel **straight into**
 * the first-run onboarding (no model configured, no site bound, no conversation), so
 * the entry is「the first moment the SETTLED panel reads a live first-run step」— that
 * is the `firstRun` channel's eventization point, plus any later hidden→visible
 * transition (e.g. a configuration reset). A second `dispatch` would only pile up
 * duplicate cards, so the entry is consumed at most once per panel life. The entry is
 * an EVENT, not a retry loop: it is consumed whether or not the producer minted a card
 * here (a `pending` / interval suppression is a real answer, and `R-ONBOARDING` may
 * only fire while steps remain) — the other three timings keep carrying the surface.
 *
 * Both facts must be authoritative before「首装」can be judged: the LLM status
 * (`configured`) and one applied `state` reply (`authorized` / `activeOrigin`).
 * Judging on a half-loaded panel would recommend「完成首次设置」to an already-configured
 * user for the few frames before the two replies land.
 * ──────────────────────────────────────────────────────────────────────────── */
/** The「首装」entry is an event: consumed at most once per panel life. */
let firstRunEntryHandled = false;
/** One `state` reply has been applied (⇒ `authorized` / `activeOrigin` are live). */
let stateReplyApplied = false;

/** Produce the「首装」recommendation once, when the settled panel is in first-run. */
function maybeRecommendFirstRunEntry(): void {
  if (firstRunEntryHandled) return;
  if (!llmLoaded || !stateReplyApplied) return;
  const firstRun = firstRunCard(
    buildOnboarding({
      configured: llmLoaded && Boolean(llmSummary?.configured),
      hasOrigin: Boolean(state.activeOrigin),
      discovered: state.discoveryState !== undefined,
      authorized: state.authorized,
      hasConversation: state.entries.length > 0,
    }),
  );
  if (!firstRun.visible) return;
  firstRunEntryHandled = true;
  maybeRecommend('firstRun');
}

function render(): void {
  const log = $('stream');
  // Regression fix: the follow decision comes from the live anchor maintained by
  // `scroll` events (post-layout), not from a `scrollTop`/`scrollHeight` read
  // taken before the append. The user's own send forces a follow one-shot.
  const follow = scrollFollow.shouldFollow();
  // V4-2 (ADR-V4-025): the message region is rendered by the keyed incremental
  // renderer. There is NO `textContent = ''` / `replaceChildren()` and NO
  // scrollTop 回写 — the容器 never loses its nodes, so the reading position is
  // preserved by the browser and only an actual append may pin to the bottom.
  // The `li[data-transitional-host]` hosts (决策卡 / composer / L1 内容层 / 提示带)
  // stay untouched: they are retired by v4-3 / v4-4, not by this leaf.
  const views = project(state.stream);
  const live = liveCardIds(state.stream);
  // V4.5-1 W3: the ONE derivation of `#composer`'s visibility (see `syncComposerVisibility`).
  syncComposerVisibility();
  const { appended } = streamRenderer().render(views, live);
  // I-07 (v4-2 review): the empty state has ONE source — the stream projection that
  // is actually drawn. The old `isLogEmpty(state.entries.length)` read the v1
  // derived view, so a digest restore (decision cards in `stream`, zero `entries`)
  // rendered the placeholder ON TOP of real cards. `views` is the same array just
  // handed to the renderer, so placeholder and cards can never disagree.
  const empty = views.length === 0 && !state.pending;
  streamRenderer().setEmpty(empty);
  // V4-4 TASK-805 (FR-CHAT-063): the `pending` gate is reflected on every rendered
  // recommendation chip (`disabled` + `aria-disabled`, NEVER hidden) — a live
  // availability update on already-rendered chips, not a card patch.
  syncNextstepPending($('stream'), state.pending);
  if (appended > 0 && follow) {
    followToBottom(log);
  }
  syncScrollAnchor(log);
  updateScrollHint();

  $('status').textContent = state.activeOrigin
    ? `站点 ${state.activeOrigin} · 发现=${state.discoveryState ?? '未知'} · 信任=${state.trust === 'trusted' ? 'trusted' : 'untrusted'}`
    : '无活跃站点';
  const buttons = buttonStates({ activeOrigin: state.activeOrigin, authorized: state.authorized, pending: state.pending });
  ($('authorize') as HTMLButtonElement).disabled = buttons.authorizeDisabled;
  ($('revoke') as HTMLButtonElement).disabled = buttons.revokeDisabled;
  ($('send') as HTMLButtonElement).disabled = buttons.sendDisabled;

  // V4-4 REVIEW-FIX (BLOCK-02) / V4.5-1 W2 (TASK-V45-105): the five transient channels
  // are **single-written** here — every render reports the channel's current readable
  // value and `flushChannelRows()` appends a system row only when it really changed. The
  // five strip NODES are gone (`index.html`), so there is no second projection left to
  // paint: `renderSendReason()` keeps painting `#send-reason` (the one preserved id).
  renderSendReason();

  // V4-3: the confirmation surface is the stream `auth` card now. Its `#confirm`
  // node exists only while a card is open, so the lookup is optional — a forced
  // test projection without a card must not throw.
  const confirmBox = document.getElementById('confirm');
  if (confirmBox) {
    if (confirmActive()) {
      confirmBox.hidden = false;
      const summary = document.getElementById('confirm-summary');
      if (summary && state.confirm) summary.textContent = state.confirm.summary;
    } else {
      confirmBox.hidden = true;
    }
  }

  renderLlmStatus();
  renderSession();
  renderAutoAuth();
  // V3-4 / AC-CONV-1: the ONE production env injection point. It runs on every render
  // (state change, navigation report, capture) with the facts the product really has;
  // a missing fact stays missing so the judge blocks instead of passing.
  syncRefEnv();
  // V3-1 (ADR-V3-013): the ONE decision card + the three-things skeleton.
  const l0View = l0?.update(l0Input()) ?? null;
  // V3-2 (ADR-V3-021~023): the L1 layer. Repainted AFTER the L0 skeleton because
  // the stale-reference mark on the chip / pick entry is the judge's verdict and
  // must win over the L0 skeleton's optimistic defaults.
  l1?.update(l1Input(l0View));
  // R3: the read-only rescue probe for a `dom-gone` reference (once per reference).
  maybeRescue();
  // V3-3: the open view's header count comes from the SAME derivation as the entry
  // panel / status bar, so the three can never disagree (FR-V3-046).
  viewHost?.syncCounts();
  // FR-V3-012: a free-text ask has no choices, so its fallback input opens at once.
  if (state.ask?.kind === 'text') l0?.revealFallback();
  $('audit-count').textContent = `审计 ${state.auditCount} 条`;
  // TASK-606 (ADR-V4-028 decision 4): the bound's drop count is READABLE in the
  // status bar (never silent). The suffix is only written when something was
  // actually dropped, so the default density reading is byte-identical.
  if (state.stream.dropped > 0) {
    const bar = document.getElementById('statusbar-text');
    if (bar) bar.textContent = `${bar.textContent} · 流已淘汰 ${state.stream.dropped} 条（截断规则见台账）`;
  }
  // V4-4 TASK-802/807 (FR-CHAT-053 / NFR-CHAT-011): the system channel's dropped
  // count is readable in the status bar — a rate-capped row is NEVER silent.
  // I-05 (v4-4 review): the copy is `SYSTEM_COPY.dropped` (single source), not a
  // second inline literal.
  const systemDropped = state.systemChannel.dropped;
  if (systemDropped > 0) {
    const bar = document.getElementById('statusbar-text');
    if (bar) bar.textContent = `${bar.textContent} · ${droppedSystemText(systemDropped)}`;
  }
  // BLOCK-02: the channel rows observed during THIS render are appended last, so a
  // channel change caused by the render cannot re-enter it (the queue is drained
  // before the dispatches happen).
  flushChannelRows();
}

/**
 * decision ② / FR-048: render the current session label and the switcher (list of
 * sessions + group controls). The list is built from the background `sessions`
 * reply, so it always reflects the authoritative origin→session mapping.
 */
function renderSession(): void {
  const label = document.getElementById('session-label');
  if (label) label.textContent = currentSessionLabel(sessions.find((s) => s.sessionId === sessionId) ?? null);

  const list = document.getElementById('session-list');
  if (list) {
    list.textContent = '';
    if (sessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = '暂无会话：打开并授权一个站点后，同域名的标签页会自动共用同一会话。';
      list.appendChild(empty);
    } else {
      for (const s of sortSessions(sessions, sessionId)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `session-item${s.sessionId === sessionId ? ' current' : ''}`;
        btn.dataset.sessionId = s.sessionId;
        btn.textContent = `${s.sessionId === sessionId ? '● ' : ''}${s.label} · ${(s.origins ?? []).join('，')}`;
        list.appendChild(btn);
      }
    }
  }

  const sel = document.getElementById('group-select') as HTMLSelectElement | null;
  if (sel) {
    const prev = sel.value;
    sel.textContent = '';
    for (const g of groups) {
      const opt = document.createElement('option');
      opt.value = g.groupId;
      opt.textContent = `${g.name}（${g.origins.length} 个域名）`;
      sel.appendChild(opt);
    }
    if (groups.some((g) => g.groupId === prev)) sel.value = prev;
  }
  const addBtn = document.getElementById('group-add') as HTMLButtonElement | null;
  if (addBtn) addBtn.disabled = !state.activeOrigin || groups.length === 0;
  const createBtn = document.getElementById('group-create') as HTMLButtonElement | null;
  if (createBtn) createBtn.disabled = false;
}

/** F-2 / TASK-033: render the LLM configuration status + in-panel settings entry. */
function renderLlmStatus(): void {
  const el = $('llm-status');
  const btn = $('open-settings') as HTMLButtonElement;
  const view = llmStatusView(llmLoaded ? llmSummary : null);
  el.textContent = view.label;
  el.className = view.warn ? 'warn' : 'muted';
  btn.textContent = view.settingsLabel;
  btn.classList.toggle('primary', view.warn);
}

/** TASK-020 任务 B: make the disable reason visible next to the composer. */
function renderSendReason(): void {
  const el = $('send-reason');
  // V4-3 (ADR-V4-032 §4 / I-02): the composer reads the ONE turn-semantics view —
  // `askFlowView` is now a real product consumer, not a test-only seam. The disabled
  // bit and the readable reason both come from it (a second rule can't drift).
  const flow = askFlowView({ pending: state.pending, openAsks: state.stream.openAsks.length });
  const reason = sendDisabledReason({ activeOrigin: state.activeOrigin, pending: state.pending, tab: activeTab, flow });
  el.textContent = reason;
  // V4-1 (FR-CHAT-082): the line is a single ellipsised row now — the full reason
  // must stay reachable, so it also rides the `title` tooltip (and textContent,
  // which is what the gates read).
  el.title = reason;
  el.hidden = !reason;
}

/**
 * BLOCK-02 (v4-4 review) — apply the **single system channel** to the five remaining
 * transient channels **at the point the facts are applied** (`refreshState` / the env
 * guard), not in every paint.
 *
 * Why here and not in `render()`: the density gate's fixtures drive the panel through
 * its own seams (`testing.reset()` / `setRisk()` / `ask()`), and a fact that merely
 * changes *while painting* is not a new business fact — eventizing those would append
 * rows the fixture never asked for and silently move the registered density cells.
 * Every channel below is an **inbound-fact application** (a state reply / an env
 * guard), so the row is a real event:
 *   · `site`      — the「无活跃站点」reason (change-only);
 *   · `probe`     — the discovery/probe phase (change-only; steady state never repeats);
 *   · `send`      — the composer's disabled reason (change-only);
 *   · `firstRun`  — the onboarding step (`firstRunCard` — now a live factory);
 *   · `env`       — the non-extension guard (`applyEnvGuard`).
 * `#notice` is already merged by R2.
 */
function eventizeChannels(): void {
  const site = activeSiteNotice({ hasOrigin: Boolean(state.activeOrigin), tab: activeTab });
  // ⚠️ V4.5-1 W2：行 `text` 仍是**无标记**的单行事实（系统行不是渲染面）；strip 节点退役
  // 后，长文案改由行 `title` 承载，并在 `systemRow` 里走 `plaintextTitle` 的 fail-closed
  // 净化（`<link rel="web-cli">` 这类产品自撰标记被剥掉、残留 URL query / secret 仍抛错）。
  observeChannel('site', site.visible ? `${site.title}｜${site.action}` : '', site.visible ? site.detail : undefined);
  const disc = discoveryNotice(state.activeOrigin ? state.discoveryState : undefined, state.discoveryReason, state.probe);
  observeChannel('probe', disc.visible ? `${SYSTEM_COPY.probePhase}｜${disc.title}` : '', disc.visible ? disc.detail : undefined);
  const flow = askFlowView({ pending: state.pending, openAsks: state.stream.openAsks.length });
  observeChannel('send', sendDisabledReason({ activeOrigin: state.activeOrigin, pending: state.pending, tab: activeTab, flow }));
  const firstRun = firstRunCard(
    buildOnboarding({
      configured: llmLoaded && Boolean(llmSummary?.configured),
      hasOrigin: Boolean(state.activeOrigin),
      discovered: state.discoveryState !== undefined,
      authorized: state.authorized,
      hasConversation: state.entries.length > 0,
    }),
  );
  // BLOCK-03 firstRun 口径（编排器裁决）：`firstRunCard`（onboarding 推荐卡）是唯一可见载体
  // —— 卡在场时**抑制**单行系统事件行（事实不双见）。`firstRun.visible` 与卡在同一事件化点
  // 派生（`maybeRecommendFirstRunEntry()` 紧随其后），故以「事实可见 ∨ 卡已在 DOM」为抑制条件：
  // 该事实族**不会**出现「行 + 卡」双载体（门禁断言「卡在 ⇒ 行不在」）。
  const firstRunCardPresent =
    document.querySelector('#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]') !== null;
  // 一行调用以保住 `emitterSite` 的可定位性（唯一 emitter 机核按源文本片段计数）。
  observeChannel('firstRun', firstRun.visible ? `${firstRun.title}｜${firstRun.lines.join('｜')}` : '', undefined, firstRun.visible || firstRunCardPresent);
  flushChannelRows();
  // I-09（v4-4 快修轮）：the first-run recommendation timing is produced at THIS
  // eventization point (the same place the `firstRun` channel row is derived), so the
  // 「首装 ⇒ 下一步推荐」card is reachable in-product and not only from the test seam.
  maybeRecommendFirstRunEntry();
}

/** F-2: fetch the non-sensitive LLM summary from the background (never the key). */
async function refreshLlmStatus(): Promise<void> {
  try {
    const res = await send<LlmStatusSummary>(makeMessage('llm-status'));
    llmSummary = res.ok && res.data ? res.data : null;
  } catch {
    llmSummary = null;
  }
  llmLoaded = true;
  // I-09: `configured` only becomes authoritative here, and the LLM reply can land
  // BEFORE the first `state` reply (and vice versa) — so the first-run entry is
  // re-evaluated on both arrivals, never on a half-loaded panel.
  maybeRecommendFirstRunEntry();
  render();
}

/* V3-1 (ADR-V3-014): the former `renderAsk()` moved into `l0/decision-card.ts`.
   The ask itself, its resolution path (`submitAsk`) and its reducer are unchanged;
   only the rendering location changed (the card is now L0, and everything past the
   first option plus the terminal 「其他…（我来描述）」 lives behind `#l0-more`). */

/**
 * V3-4 / **AC-CONV-2** — the ONE production entrance that turns a reference into an
 * action.
 *
 * Its first statement is `l1.dispatchRefAction`, whose own first statement is the
 * `isRefUsable` guard (v3-2's fail-closed judge). Nothing else in the product may
 * dispatch a reference-driven command: a second call site would be a bypass, and the
 * runtime gate (`test/ref-wiring.test.ts` + `test/ui/page-input.mjs`) asserts both
 * that this is the only `dispatchRefAction(` call site outside its definition and that
 * enumerating every visible control while a reference is unusable never advances the
 * command counter.
 */
function applyRefAction(refId: string, action: string): { allowed: boolean; reason: string; verdict: string; sent: boolean } {
  const outcome = l1?.dispatchRefAction(refId, action);
  if (!outcome) {
    return { allowed: false, reason: '引用层未就绪（按失效处理）', verdict: 'unknown', sent: false };
  }
  if (!outcome.allowed) {
    /* EC-SELF-006：无效引用不是驱动 —— 既有阻塞终态 + 可达 next；驱动分支严格在 allowed 之后。 */
    dispatch({ type: 'notice', text: `✖ ${outcome.reason}` });
    return outcome;
  }
  /* V5.5-1 TASK-V55-115（ADR-V55-004 §1 · FR-SELF-022/025 · X-SELF-5）：「裁决 + 计数」→
     「裁决 + 驱动」—— 有效 ⇒ 答案成为悬置任务输入（不再丢弃）并立刻交驱动者层（'answered' 时机）。
     `sends += 1` 仍存在，但它**不足以**满足「答案产生驱动」（门禁显式断言这一条）。 */
  registerSuspension({
    driverId: 'ref-action',
    source: 'ref',
    late: false,
    kind: 'answered',
    instruction: action,
    evidence: REF_SUSPENSION_EVIDENCE,
  });
  // ★ R6：记下这次引用动作的去重键（`refId#意图摘要`）—— 回合完成时提交，避免完成后复推同一件事。
  pendingCompletedRefAction = refActionDigest(refId, action);
  nextAfterSettle({ kind: 'answered' });
  return outcome;
}

/**
 * V3-4 / **AC-CONV-1** — the production env injection point for the reference judge.
 *
 * Called from `render()` (and therefore after every state read / navigation report /
 * capture). It is the *only* production `setEnv` call site: the test seam's `l1('env')`
 * op remains for the node gates, which is exactly why the wiring gate asserts the call
 * sites are **not limited** to `installV3TestHooks()`.
 */
function syncRefEnv(): void {
  if (v3TestState.envOverride) return;
  l1?.setEnv(pickInput ? pickInput.judgeEnv() : {});
}

/**
 * R3（2026-09-17）— the read-only rescue probe trigger.
 *
 * Whenever the judge reports a `dom-gone` reference (selector resolution failed), the
 * panel asks the background for a **read-only** text-candidate observation and stores it
 * as the judge's `rescue` payload. The probe runs **once per reference** (no polling
 * loop), never writes the page, and a missing observation keeps the reference exactly as
 * fail-closed as before. Only a unique match on an unchanged path turns on the
 * one-click re-anchor; the user must still confirm it.
 */
let rescueProbedId: string | null = null;
/** References the user already re-anchored — never re-offer the button for them. */
const anchoredRefIds = new Set<string>();

function maybeRescue(): void {
  if (!pickInput || !l1) return;
  const target = l1.store().stale()[0];
  if (!target || target.dimension !== 'dom-gone') {
    rescueProbedId = null;
    return;
  }
  const facts = target.facts;
  if (anchoredRefIds.has(facts.refId) || rescueProbedId === facts.refId) return;
  if (!facts.origin || !facts.textDigest) return;
  rescueProbedId = facts.refId;
  void pickInput
    .rescue({ refId: facts.refId, selector: facts.selector, textDigest: facts.textDigest, origin: facts.origin })
    .then((observation) => {
      if (!observation) return;
      l1?.setRescue({ refId: facts.refId, ...observation });
      // Re-judge so the payload actually lands on the record (`update()` alone paints the
      // previous verdict) — the judge remains the single writer of `readableReason`.
      l1?.judge();
      render();
      // V4-4 TASK-801 (shim E2): the failure is projected into the stream together
      // with its readable reason — the「解析即消失」path is gone for references.
      projectRef(facts.refId, refStaleText(parseRefOrdinal(facts.refId), target.readableReason ?? '目标元素已不存在'));
      // BLOCK-01 (v4-4 review):「引用失效后」is one of the three production timings
      // the recommendation producer is wired to.
      maybeRecommend('stale');
    });
}

/**
 * R6（2026-09-23）—— **引用被改写后重评**（`ty.md` 真机：AI 用 `dom set-text` 原地改文本）。
 *
 * 触发：一次**成功的** `dom set-text` 结果带回了目标选择器（`targetSelector`）。若该选择器
 * 命中一个**活引用**（选择器与捕获一致，或命中节点带 `data-wcli-ref` ⇒ `resolution.refMark`），
 * 就对该引用做一次**只读**重观测（`pickInput.observe` → SW `observeIdentity`，不写页面），
 * 把新鲜观测交给判定层重判：
 *   · 元素已不在（子节点被清空）⇒ `dom-gone` + 既有救援口径；
 *   · 元素仍在但文本摘要失配 ⇒ `text-changed`（R6 新维度）+ 既有失效口径；
 *   · 摘要一致 ⇒ 仍 `valid`（无副作用）。
 * 不命中活引用 / 页面不可达 ⇒ 不改判定（fail-closed 事实照旧）。
 */
function reobserveAfterWrite(selector: string): void {
  if (!selector || !pickInput || !l1) return;
  const refs = l1.store().all().filter((r) => !r.retired);
  if (refs.length === 0) return;
  void (async () => {
    const resolution = await pickInput?.observe(selector);
    if (!resolution || resolution.status === 'unreachable') return;
    const bySelector = refs.filter((r) => r.facts.selector === selector).slice(-1)[0];
    const byMark = resolution.refMark ? refs.find((r) => r.facts.refId === resolution.refMark) : undefined;
    const target = byMark ?? bySelector;
    if (!target) return;
    l1?.setResolution(resolution);
    l1?.judge();
    render();
    // 重判后若该引用不再可用 ⇒ 既有「引用失效」留痕（ref 卡 + 风险条 + 重新拾取 chip
    // = 既有失效口径的可达 next；不新增推荐器调用点，主流程 diff 恒 0）。
    const judged = l1?.store().get(target.facts.refId);
    if (judged && judged.verdict !== 'valid') {
      projectRef(target.facts.refId, refStaleText(parseRefOrdinal(target.facts.refId), judged.readableReason ?? '引用不可用'));
    }
  })();
}

/**
 * V4-4 TASK-801 (ADR-V4-035) — project one registry record into the stream.
 *
 * The `ref` card is a **projection + event record**: this helper reads
 * `l1/ref-store.ts#cardProjection()` (a pure, append-only read) and dispatches ONE
 * `ref` event. Because the reducer mints a fresh card per event, a re-pick /
 * re-anchor necessarily produces a NEW card with `refNum+1` while the old card's DOM
 * is untouched. `projectedRefState` only suppresses *repeats of the same fact* (the
 * append-only log must not grow on every render), never a real state change.
 *
 * ── F-01（validate R1 收口轮）— 投影唯一性的键是 `refNum + 状态` ────────────────
 *
 * 现场：`dom-gone` 引用的**救援观察**落地时，同一事实被投影两次 —— 捕获时一次
 * （`acceptCapture`，带失效行）与救援落地时一次（`maybeRescue().then`，也带失效行）。
 * 旧守卫 `if (!systemText && …) return` 让「本次要写一行可读系统行」**顺带**把
 * `ref` 卡的抑制绕开（`systemText` 只是行，不是新事实），于是流内出现两张同序号失效卡
 * （validate 探针实测 `data-ref-num=["1","1"]`）。
 *
 * 收口口径：**唯一性按 `refNum + 状态`** —— 同一 `(序号, 状态)` 只允许一张**活卡**。
 * 被抑制时**仍然照写可读系统行**（事实不静默丢弃，去重/限速仍由唯一通道负责），
 * 只是不再 mint 第二张卡。真正的状态迁移（`refNum:valid` → `refNum:stale`，即引用在
 * 原位失效）键不同，因此照旧投影新卡 —— 抑制只针对**完全相同的**（序号, 状态）事实。
 */
const projectedRefState = new Map<string, string>();
function projectRef(refId: string, systemText?: string): void {
  const projection = l1?.store().cardProjection(refId);
  if (!projection) return;
  const marker = `${projection.refNum}:${projection.refState}`;
  const liveCard = projectedRefState.get(refId) === marker;
  projectedRefState.set(refId, marker);
  if (liveCard) {
    // F-01: the same `(refNum, state)` fact is already on a live card. The readable
    // row still goes through the ONE system channel (never a silent drop); the card
    // is not minted twice.
    if (systemText !== undefined) dispatch({ type: 'system', kind: 'ref', text: systemText });
    return;
  }
  dispatch({
    type: 'ref',
    refNum: projection.refNum,
    refState: projection.refState,
    refLabel: projection.refLabel,
    evidence: projection.evidence,
    ...(projection.refWhy !== undefined ? { why: projection.refWhy } : {}),
    ...(systemText !== undefined ? { systemText } : {}),
  });
}

/**
 * R3 — the user-confirmed one-click re-anchor. The panel only forwards the reference's
 * captured facts; the real work (fresh read-only probe + identity mark + new reference)
 * lives in `pick-input.ts` so it shares the **manual pick ingestion pipeline**. The old
 * reference is untouched: only a new record is appended.
 */
function reanchorRef(refId: string): void {
  const record = l1?.store().get(refId);
  if (!record) return;
  if (!state.authorized) {
    dispatch({ type: 'notice', text: '✖ 未授权站点：救援不生效（页面侧零注入）。' });
    return;
  }
  void pickInput
    ?.reanchor({
      refId,
      selector: record.facts.selector,
      textDigest: record.facts.textDigest,
      origin: record.facts.origin,
    })
    .then((ok) => {
      if (!ok) return;
      anchoredRefIds.add(refId);
      rescueProbedId = null;
      l1?.setRescue(undefined);
      l1?.judge();
      render();
      // V4-4 TASK-801 (shim E5): the re-anchor is a NEW reference — project the new
      // card and write the readable system row (旧引用保留, ordinal increments). The
      // old card keeps its exact DOM (append-only).
      const records = l1?.store().all() ?? [];
      const fresh = records[records.length - 1];
      if (fresh && fresh.facts.refId !== refId) {
        projectRef(fresh.facts.refId, refReanchoredText(parseRefOrdinal(refId), parseRefOrdinal(fresh.facts.refId)));
      }
    });
}

/**
 * R4（2026-09-22）— **capture-time round-trip verification**（止血）。
 *
 * 现场：`content/ref-capture.ts#selectorFor` 曾把 >120 字的选择器截断成
 * `slice(0,120)+'…'` —— 非法 CSS；`resolveRef` 又把解析器抛错与 0 命中同吞为 `missing`
 * ⇒ 判定链读到 D1「目标元素已不存在」⇒ **引用出生即死**（真机选择器 121 字，目标仍在
 * 页面上）。根修把选择器改为永不截断（`SELECTOR_STORE_MAX` + compact 回退），本函数是
 * **同一轮的止血**：捕获观测回来是 `missing` / `invalid-selector` 时，先做一次**只读**
 * 文本候选探测（与摘要同源归一化）——
 *
 *   ① **唯一匹配** ⇒ 用 SW 现算的**完整**选择器替换后再走**同一条**摄取管线（`reanchor`
 *      的语义前移到捕获时）：得到的是**可用**引用，而不是一张出生即死的卡；
 *   ② **仍失败** ⇒ **不铸造**这条引用（不产生出生即死的卡），改为写一行可读系统事件 +
 *      走既有的「下一步」恢复入口（法七不破：拒绝也有出路，不是死端）。拒绝方向
 *      fail-closed **不变**：无法确认就不铸造。
 */
const REF_CAPTURE_UNRESOLVED_TEXT = '捕获的选择器无法解析，已放弃该引用，请重新拾取或改用描述';

function acceptCapture(facts: Record<string, unknown>, resolution: { status: string; refMark?: string; nodeCount?: number }): void {
  v3TestState.envOverride = false; // a real capture ⇒ production facts own the env again
  const status = String(resolution?.status ?? '');
  if (status === 'missing' || status === 'invalid-selector') {
    void repairCapture(facts);
    return;
  }
  ingestCapture(facts, resolution);
}

/**
 * R4 — the read-only repair probe (see {@link acceptCapture}). `pickInput.reanchor` is
 * reused deliberately: the repaired reference must be minted through the **same**
 * ingestion pipeline as a manual pick (id source, mark write, re-judge), never by a
 * second path. `silent` keeps one fact to exactly one readable row (the caller writes it).
 */
async function repairCapture(facts: Record<string, unknown>): Promise<void> {
  const repaired = await (pickInput
    ?.reanchor(
      {
        refId: '',
        selector: String(facts.selector ?? ''),
        textDigest: String(facts.textDigest ?? ''),
        origin: String(facts.origin ?? ''),
      },
      { silent: true },
    )
    .catch(() => false) ?? Promise.resolve(false));
  if (repaired) return;
  // No unique text witness ⇒ nothing to anchor to: refuse to mint (never a born-dead
  // reference) and give the user an exit (the ONE system channel + the recommendation
  // producer's `pick` timing, forced because a refusal is a recovery row — not idle
  // repetition, so the anti-flicker interval must not swallow it) instead of a silent drop.
  dispatch({ type: 'system', kind: 'ref', text: REF_CAPTURE_UNRESOLVED_TEXT });
  maybeRecommend('pick', { force: true });
  render();
}

/**
 * V3-4 (FR-V3-061 / FR-V3-065 / FR-V3-071) — one captured reference becomes
 * 「1 个引用 chip + 1 道选择题」and nothing else. The page never supplies a verdict and
 * never mints an id: `injectRef` is v3-2's single id source, the observation travels
 * with it (N-04: the panel never asserts `resolved` on its own), and the id is written
 * back onto the page element as the identity mark D1 compares against.
 */
function ingestCapture(facts: Record<string, unknown>, resolution: { status: string; refMark?: string; nodeCount?: number }): void {
  // R1 (2026-09-17): a reference round REPLACES `state.ask`, so a pending *background*
  // question would never be answered by the panel — its bridge would only expire on the
  // 60 s timeout, leaving the turn「处理中」(composer: 上一条指令仍在处理中). Settle it as
  // canceled so the background turn can finish; the user is told, not silently dropped.
  const superseded = supersededAsk(state);
  if (superseded) {
    void send(makeMessage('ask-user-response', { requestId: superseded.requestId, canceled: true }));
    // V4-3 (ADR-V4-031 §3): the R1 "settle without trace" is upgraded to
    // 「取消 + 留痕」— the reducer writes `cancelled(superseded)` on the card AND a
    // system row. The extra notice is the human-readable companion (kept).
    dispatch({ type: 'ask-resolved', requestId: superseded.requestId, canceled: true, reason: 'superseded' });
    dispatch({ type: 'notice', text: '已放弃上一条提问（你先在页面上拾取了引用），并已留痕。' });
  }
  const record = l1?.injectRef(facts as never);
  l1?.setResolution(resolution as RefResolution);
  const refId = record?.facts.refId ?? '';
  if (!refId) return;
  pendingRefId = refId;
  const paths = [
    facts.selector ? `选择器 ${displaySelector(String(facts.selector))}` : '',
    facts.semanticPath ? `语义路径 ${String(facts.semanticPath)}` : '',
  ].filter(Boolean);
  const ask = (verdict: string): void => {
    dispatch({
      type: 'ask',
      requestId: `${REF_ROUND_PREFIX}${refId}`,
      kind: 'choice',
      prompt: `已捕获引用 ${refId}${paths.length ? `（${paths.join(' · ')}）` : ''}：要用它做什么？（判定：${verdict}）`,
      options: ['纳入下一步（作为上下文）', '用这里作为操作目标', '先看引用证据（选择器 / 语义路径）'],
    });
  };
  // The identity mark + the ordinal badge: the page renders the id the panel minted, so
  // the chip, the badge, the evidence row and the risk row all carry one ordinal.
  //
  // R1 (2026-09-17): the mark is written by this round-trip, so the **capture-time**
  // observation structurally cannot carry it — D1 read「身份标记不匹配」and denied every
  // freshly picked reference. The mark write returns a fresh page observation; re-judging
  // with it is what makes the reference usable (and it stays fail-closed: no observation
  // ⇒ the older fact stands, which denies).
  void (async () => {
    const fresh = await pickInput?.highlight(refId, String(facts.selector ?? ''), 'mark');
    if (fresh) l1?.setResolution(fresh);
    const judged = l1?.judge() ?? [];
    render();
    // V4-4 TASK-801: the capture is projected into the stream (valid ⇒ a usable ref
    // card with the evidence layer; unusable ⇒ a stale card + its system row).
    const self = judged.find((r) => r.facts.refId === refId);
    if (self) {
      projectRef(
        refId,
        self.verdict === 'valid'
          ? undefined
          : refStaleText(parseRefOrdinal(refId), self.readableReason ?? '引用不可用（按失效处理）'),
      );
    }
    ask(self?.verdict ?? 'unknown');
    // BLOCK-01 (v4-4 review):「拾取后」is the second production timing (a capture
    // that produced an unusable reference yields the risk-recovery card at once).
    maybeRecommend('pick');
  })();
}

/** The still-open LOCAL text ask card (`ref-describe`), if any (BLOCK-03). */
function textAskCardId(): string | undefined {
  for (let i = state.stream.events.length - 1; i >= 0; i -= 1) {
    const e = state.stream.events[i];
    if (e.kind !== 'askuser' || e.payload.requestId !== 'ref-describe') continue;
    const hasTerminal = state.stream.events.some((x) => x.cardId === e.cardId && x.terminal !== undefined);
    if (!hasTerminal) return e.cardId;
  }
  return undefined;
}

/**
 * V4-3: ensure the free-text ask card exists (the ONE owner of「用文字描述…」).
 *
 * BLOCK-03 (v4-4 review): extracted so both the reveal path and the `ref` card's
 * fallback submit share one construction — a second card factory would be exactly the
 * 「两个并存的兜底输入」the review found. The presence test is on the **model**
 * (a still-open `ref-describe` card), not on the legacy `#ask-fallback` id: another
 * open ask card (a background question / reference round) also mints that id family,
 * and treating it as our owner would dispatch the description at a card that cannot
 * settle it.
 */
function ensureTextAskCard(): void {
  if (textAskCardId()) return;
  // Append a LOCAL text ask card directly (no reducer `ask` action): the single
  // `state.ask` slot must keep the background question it already holds, so the
  // L1 consequences panel keeps reading the real round's options.
  const cardId = `q${state.stream.seq}`;
  state = {
    ...state,
    stream: boundStreamEvents(
      appendEvent(state.stream, {
        kind: 'askuser',
        ts: Date.now(),
        cardId,
        payload: { askKind: 'text', prompt: '用文字描述你的目标（重建引用）', requestId: 'ref-describe' },
      }),
      DEFAULT_STREAM_CAP,
    ),
  };
  render();
}

/**
 * V4-3: open the free-text ask fallback. The stream card owns `#ask-fallback`; when
 * no card is open (e.g. V3-4's「改用描述」before any question) a **local text ask**
 * is created through the real reducer first, so the fallback always has an owner and
 * the reveal never silently no-ops.
 */
/**
 * V4.5-1 W3 (TASK-V45-110 / ADR-V45-003 §5 / R-V45-105) — the **layout guard**.
 *
 * `#composer` left `#stream`, so it no longer inherits the stream's `hidden` when an L2
 * view replaces the chat surface. The panel is therefore the ONE writer of its `hidden`
 * state, derived from「the fallback is open」∧「the chat surface is visible」— so the
 * secondary full-text channel can never float above a view (the fail-closed reading the
 * gates use only trusts `hidden`).
 */
let fallbackOpen = false;
function syncComposerVisibility(): void {
  const composer = document.getElementById('composer') as HTMLInputElement | null;
  if (!composer) return;
  const l2Open = document.getElementById('view-host')?.hidden !== true;
  const settingsOpen = document.getElementById('settings-view')?.hidden !== true;
  const chatVisible = document.getElementById('stream')?.hidden !== true && !l2Open && !settingsOpen;
  composer.hidden = !(fallbackOpen && chatVisible);
}

function revealAskFallback(): void {
  ensureTextAskCard();
  l0?.revealFallback();
  fallbackOpen = true;
  syncComposerVisibility();
}

/**
 * BLOCK-03 (v4-4 review) — the `ref` card's「改用描述」submission.
 *
 * It settles the ONE local text-ask card with the description as the answer: a real,
 * visible留痕 (the card固化 with「已答：…」), routed through the existing ask fallback
 * — no shadow command channel, no second input. The description is a *user text* that
 * is NOT sent to the background (there is no bridge for `ref-describe`), and it never
 * becomes a system-row body (the zero-plaintext caliber is not weakened).
 */
function submitDescribe(value: string): void {
  const text = value.trim();
  if (!text) return;
  ensureTextAskCard();
  dispatch({ type: 'ask-resolved', requestId: 'ref-describe', answer: text, canceled: false, reason: 'user' });
  /* V5.5-1 TASK-V55-116（ADR-V55-004 §2 · FR-SELF-027 · X-SELF-6）：「改用描述」过去只留痕不驱动
     （旁路死端 R6）。已交描述 ⇒ 悬置 + 'answered' 时机；空描述已在上面的 return 退出（零副作用 ∧ 不入终态）。 */
  registerSuspension({
    driverId: 'ref-action',
    source: 'describe',
    late: false,
    kind: 'answered',
    instruction: text,
    evidence: REF_SUSPENSION_EVIDENCE,
  });
  nextAfterSettle({ kind: 'answered' });
}

/**
 * V4-3 — answer/cancel one **specific** ask card (by its requestId). The legacy
 * single-slot path ({@link submitAsk}) delegates here so there is exactly one
 * resolution implementation.
 *
 * A reference round (`ref-round-<refId>`) is answered by *acting on the
 * reference* (V3-4 / AC-CONV-2); a background question is sent back as free text.
 * Cancel / empty answer is fail-closed (`canceled`, never a default value).
 */
function submitAskFor(requestId: string | undefined, value: string | undefined, canceled: boolean): void {
  const rid = requestId ?? state.ask?.requestId;
  const isRef = (rid ?? '').startsWith(REF_ROUND_PREFIX);
  const refId = isRef && rid ? rid.slice(REF_ROUND_PREFIX.length) : null;
  const trimmed = value?.trim();
  const isCanceled = canceled || !trimmed;
  // V5-2 (ADR-V5-002 §1 ②): an op `params` ask is PANEL-local — no background bridge —
  // and a masked ask routes its value to `submitSecret` (the ONE value sink), never
  // into the answer payload (法八: 值不入流).
  const settleOp = rid ? opAskResolvers.get(rid) : undefined;
  if (settleOp && rid) {
    // V5.5-2 **TASK-V55-214**（FR-SELF-131）：掩码 ask 的 resolver 由 `submitSecret`
    // **自己**消费（它需要 `opAskResolvers` 里的那一个才交付值）——先删会让参数 promise
    // 永挂 ⇒ `op.llm-config` 永远到不了 consent / complete（引导无法完成）。
    if (!isCanceled && SECRET_ASKS.delete(rid)) {
      void submitSecret(rid, value ?? '');
      return;
    }
    opAskResolvers.delete(rid);
    SECRET_ASKS.delete(rid);
    settleOp(isCanceled ? undefined : trimmed);
    /* V5.5-1 TASK-V55-114（FR-SELF-021/022 · ADR-V55-004）：面板 op 的 params ask 已答 ⇒
       记终态 + 驱动（驱动分支在 isCanceled 判定之后）；取消走稳态驱动集（仍有接管者）。 */
    if (!isCanceled && trimmed) {
      registerSuspension({ driverId: 'ref-action', source: 'op', late: false, kind: 'answered', instruction: trimmed, evidence: ['session.openAsks'] });
      nextAfterSettle({ kind: 'answered' });
    } else nextAfterSettle({ kind: 'settle', force: true });
    return;
  }
  if (rid && !isRef) {
    /* V5.5-1 TASK-V55-114/117（ADR-V55-004 §3 · FR-SELF-028 · EC-SELF-008）：后台 ask 的迟到口径
       只对 SW 真实投递过的 requestId 成立（bgAskIds，夹具造的卡不在内 ⇒ 既有闸门行为不变）。
       SW 回 late ⇒ 固化事实（零明文）+ 可达 next（稳态驱动集）；回合内接住 ⇒ 记终态 + 驱动。 */
    const bgAsk = bgAskIds.has(rid);
    void send<{ late?: boolean; settled?: boolean }>(makeMessage('ask-user-response', isCanceled ? { requestId: rid, canceled: true } : { requestId: rid, value: trimmed, canceled: false })).then(
      (res) => {
        if (!bgAsk) return;
        /* V5.5-1 review R1 **BLOCK-01**（FR-SELF-023 口径② / EC-SELF-005）：后台 ask 被**取消**
           （`data-act="cancel"` 或空值）⇒ **不记「已答」终态、不驱动 `'answered'`** —— 与 op 路
           （:2641-2644）**同口径**走稳态驱动集（仍有接管者，非死端）。少了这一守卫，本路径是全仓
           唯一「取消被记成 answered-bg 并驱动 answered」的漏口（ref / op 两路均已守卫）。 */
        if (isCanceled) {
          nextAfterSettle({ kind: 'settle', force: true });
          return;
        }
        const late = res?.data?.late === true;
        /* ★ R6（2026-09-23）—— **答案 once 语义**（`ty.md` 21:32:18/21:32:26 双回合）：
           `settled: true` ⇒ 这次提问真的被**在飞回合**经 `askBridge.settle` 接住，答案
           已经是那个回合的输入 ⇒ requestId 级标记；回合收口后的自动成回合不再消费它。 */
        if (res?.data?.settled === true) markConsumedAsk(rid);
        if (late) dispatch({ type: 'system', kind: 'turn', text: LATE_ASK_TEXT });
        registerSuspension({
          driverId: 'ref-action',
          source: late ? 'late' : 'bg',
          late,
          kind: late ? 'answered-late' : 'answered',
          instruction: trimmed ?? '',
          askId: rid,
          evidence: ['session.openAsks'],
        });
        nextAfterSettle({ kind: late ? 'answered-late' : 'answered', ...(late ? { force: true } : {}) });
      },
    );
  }
  dispatch({
    type: 'ask-resolved',
    ...(rid ? { requestId: rid } : {}),
    ...(!isCanceled && trimmed !== undefined ? { answer: trimmed } : {}),
    canceled: isCanceled,
    reason: 'user',
  });
  if (refId && !isCanceled && trimmed) applyRefAction(refId, trimmed);
  else if (isRef) nextAfterSettle({ kind: 'settle', force: true });
}

/** Send the user's answer back to the background and clear the prompt (R7). */
function submitAsk(value: string | undefined, canceled: boolean): void {
  // V3-4 / AC-CONV-2: a round minted from a reference is answered by *acting on the
  // reference*, so the answer goes through the ONE guarded entry instead of being sent
  // as free text. The card-targeted path (`submitAskFor`) is the v4-3 entry; this
  // wrapper keeps every legacy caller (the `#ask-*` listeners / `revealFallback`) working.
  const refId = pendingRefId;
  pendingRefId = null;
  const res = resolveAsk(state, value, canceled);
  submitAskFor(res?.requestId, res?.canceled ? undefined : res?.value, res ? res.canceled : canceled);
  void refId; // kept for the readable R1 rationale above; routing is requestId-driven now
}

function dispatch(action: Parameters<typeof reduce>[1]): void {
  // V4-2: the ONE clock the pure reducer may read — stamped at the dispatch
  // boundary so `reduce`/`project` stay deterministic and replay-equivalent.
  //
  // V4-4 (TASK-802/809): a caller that supplies `at` explicitly (the deterministic
  // test seam that drives the dedupe window / rate cap) keeps it; production callers
  // never pass one. Without this, every gate-driven row landed on the same real
  // millisecond and the de-noising rules could not be exercised at all.
  state = reduce(state, action.at !== undefined ? action : { ...action, at: Date.now() });
  render();
}

interface RiskStatusPayload {
  paused?: boolean;
  stopped?: boolean;
  reason?: string;
}

/**
 * FR-052 / ADR-017: render the bound origin's auto-authorization switches.
 *
 * The checkboxes and the always-visible marker reflect the authoritative
 * background store (carried on the `state` reply), so an immediate off is
 * reflected on the next state refresh. The hard-floor copy is always visible.
 */
function renderAutoAuth(): void {
  const box = document.getElementById('auto-auth');
  if (!box) return;
  const origin = state.activeOrigin;
  const s: AutoAuthSettings = autoAuthCheckboxState(state.autoAuth);
  const read = document.getElementById('auto-read') as HTMLInputElement | null;
  const write = document.getElementById('auto-write') as HTMLInputElement | null;
  if (read) {
    read.checked = s.read;
    read.disabled = !origin;
  }
  if (write) {
    write.checked = s.write;
    write.disabled = !origin;
  }
  const originEl = document.getElementById('auto-auth-origin');
  if (originEl) originEl.textContent = origin ?? '（无活跃站点）';
  const badge = document.getElementById('auto-auth-badge') as HTMLButtonElement | null;
  if (badge) {
    const text = autoAuthMarker(s);
    badge.textContent = text;
    badge.style.display = origin && text ? 'inline-block' : 'none';
    badge.disabled = !origin;
  }
  const note = document.getElementById('auto-auth-note');
  if (note) note.textContent = AUTO_AUTH_HARD_LINES.join('');
}

/** Ask the background to flip one auto-authorization tier for the bound origin. */
async function setAutoAuth(tier: 'read' | 'write', enabled: boolean): Promise<void> {
  const origin = state.activeOrigin;
  if (!origin) return;
  try {
    const res = await send<{ settings?: AutoAuthSettings }>(makeMessage('auto-auth', { action: 'set', origin, tier, enabled }));
    if (res.ok && res.data?.settings) {
      dispatch({ type: 'state', autoAuth: res.data.settings });
      const label = tier === 'read' ? '读操作自动' : '写操作自动';
      dispatch({ type: 'notice', text: `${enabled ? '已开启' : '已关闭'}「${label}」（${origin}）；${AUTO_AUTH_HARD_LINES.join('')}` });
    } else {
      dispatch({ type: 'notice', text: `✖ 保存自动授权失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 保存自动授权失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** One-click off: restore both tiers to defaults (read on / write off). */
async function clearAutoAuth(): Promise<void> {
  const origin = state.activeOrigin;
  if (!origin) return;
  try {
    const res = await send<{ settings?: AutoAuthSettings }>(makeMessage('auto-auth', { action: 'clear', origin }));
    if (res.ok && res.data?.settings) {
      dispatch({ type: 'state', autoAuth: res.data.settings });
      dispatch({ type: 'notice', text: `已一键关闭 ${origin} 的自动授权（读/写都关）。` });
    } else {
      dispatch({ type: 'notice', text: `✖ 关闭自动授权失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 关闭自动授权失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** Render the informed-consent block + risk controls (FR-031 / FR-029). */
function renderConsent(): void {
  const section = document.createElement('section');
  section.id = 'consent';

  // F-4: the long consent/boundary text is collapsed by default, but every
  // string is preserved verbatim (CONSENT_RISKS / CAPABILITY_BOUNDARY).
  const details = document.createElement('details');
  details.id = 'consent-details';
  details.open = CONSENT_DEFAULT_OPEN;
  const summary = document.createElement('summary');
  summary.textContent = CONSENT_SUMMARY_TEXT;
  details.appendChild(summary);

  const riskTitle = document.createElement('p');
  riskTitle.textContent = '风险提示';
  details.appendChild(riskTitle);
  const risks = document.createElement('ul');
  for (const r of CONSENT_RISKS) {
    const li = document.createElement('li');
    li.textContent = r;
    risks.appendChild(li);
  }
  details.appendChild(risks);

  const capTitle = document.createElement('p');
  capTitle.textContent = '能力边界';
  details.appendChild(capTitle);
  const caps = document.createElement('ul');
  for (const c of CAPABILITY_BOUNDARY) {
    const li = document.createElement('li');
    li.textContent = c;
    caps.appendChild(li);
  }
  details.appendChild(caps);
  section.appendChild(details);

  // F-4: the risk controls are actionable — keep them outside the disclosure.
  const controls = document.createElement('div');
  controls.className = 'row';
  const make = (id: string, label: string) => {
    const b = document.createElement('button');
    b.id = id;
    b.type = 'button';
    b.textContent = label;
    return b;
  };
  const pauseBtn = make('risk-pause', '暂停自动化');
  const resumeBtn = make('risk-resume', '恢复');
  const stopBtn = make('risk-stop', '中止');
  controls.append(pauseBtn, resumeBtn, stopBtn);
  section.appendChild(controls);

  const status = document.createElement('div');
  status.id = 'risk-status';
  status.className = 'muted';
  section.appendChild(status);

  // FR-052 / ADR-017: per-origin auto-authorization (read/write). The hard-floor
  // copy is always visible; the marker stays visible while anything is enabled.
  const aa = document.createElement('div');
  aa.id = 'auto-auth';
  aa.className = 'auto-auth';

  const aaTitle = document.createElement('div');
  aaTitle.className = 'aa-title';
  aaTitle.append('自动授权（作用于当前站点 ', Object.assign(document.createElement('span'), { id: 'auto-auth-origin', textContent: '（无活跃站点）' }), '）');
  aa.appendChild(aaTitle);

  const mkCheck = (id: string, label: string, onChange: (enabled: boolean) => void) => {
    const wrap = document.createElement('label');
    wrap.className = 'aa-check';
    wrap.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.disabled = true;
    input.addEventListener('change', () => onChange(input.checked));
    wrap.append(input, ` ${label}`);
    return wrap;
  };
  aa.appendChild(mkCheck('auto-read', '读操作自动（默认开）', (v) => void setAutoAuth('read', v)));
  aa.appendChild(mkCheck('auto-write', '写操作自动（默认关）', (v) => void setAutoAuth('write', v)));

  const badge = document.createElement('button');
  badge.id = 'auto-auth-badge';
  badge.type = 'button';
  badge.className = 'aa-badge';
  badge.style.display = 'none';
  badge.title = '点击关闭该站点的自动授权（读/写都关）';
  badge.addEventListener('click', () => void clearAutoAuth());
  aa.appendChild(badge);

  const aaNote = document.createElement('div');
  aaNote.id = 'auto-auth-note';
  aaNote.className = 'aa-note';
  aaNote.textContent = AUTO_AUTH_HARD_LINES.join('');
  aa.appendChild(aaNote);
  section.appendChild(aa);

  // TASK-023: the consent disclosure lives in the bottom zone *above* the
  // composer (the composer must be the last element so nothing pushes it off the
  // bottom of the panel). `#consent-slot` is reserved for exactly this.
  // V3-1: the consent/auto-auth block is "谁在管我" — it belongs to the L1 status
  // panel, not to the bottom zone. Keeping it resident would spend density budget
  // on the default screen (it renders two checkboxes + a marker button).
  const slot = document.getElementById('l1-status-extra') ?? document.getElementById('consent-slot');
  (slot ?? document.body).appendChild(section);

  const refresh = (d?: RiskStatusPayload) => {
    status.textContent = `风控状态：${d?.stopped ? '已中止' : d?.paused ? '已暂停' : '运行中'}${d?.reason ? `（${d.reason}）` : ''}`;
  };
  const control = (action: string, reason?: string) =>
    void send<RiskStatusPayload>(makeMessage('risk-control', { action, ...(reason ? { reason } : {}) })).then((res) => refresh(res.data));
  pauseBtn.addEventListener('click', () => control('pause', '用户在侧栏暂停'));
  resumeBtn.addEventListener('click', () => control('resume'));
  stopBtn.addEventListener('click', () => control('stop', '用户在侧栏中止'));
  void send<RiskStatusPayload>(makeMessage('risk-control', { action: 'status' })).then((res) => refresh(res.data));
}

async function refreshState(): Promise<void> {
  const res = await send<StateMessageView>(makeMessage('state'));
  if (!res.ok || !res.data) return;
  // TASK-020 任务 B: keep the last active-tab projection for the site hint.
  activeTab = res.data.tab ?? null;
  // decision ② / FR-048: when the background moved us to a different session
  // (tab switch / auto-bind), reload that session's history so the panel never
  // shows the previous session's conversation (no串台).
  const incoming = res.data.session?.sessionId ?? null;
  const changed = incoming !== null && incoming !== sessionId;
  if (incoming) sessionId = incoming;
  // W1: sync the persisted authorization too — otherwise a reload/reopen shows
  // a false "未授权" and the authorize button becomes clickable again.
  dispatch(stateActionFromPayload(res.data));
  // I-09: from here on `authorized` / `activeOrigin` are this panel's real facts, so
  // the「首装」judgement may read them (see `maybeRecommendFirstRunEntry`).
  stateReplyApplied = true;
  // V3-3 (FR-V3-046): the snapshot counts are the tree/command truth the L2 entry
  // panel must show. They arrive with the state reply (additive `insight`), so no
  // extra pull is needed; the derived value is refreshed before the repaint below.
  const insightCounts = res.data.insight?.counts ?? null;
  if (insightCounts) {
    l2Truth.insightCounts = insightCounts;
    refreshL2Counts();
  }
  // V3-4 (AC-CONV-1): the adopted declaration's digest/version. Without it the judge
  // reports「无法确认声明是否变化」for every reference — fail-closed but useless, so the
  // production env must carry it.
  // R1: the **state** is part of the fact (a non-declaring site must still be usable).
  const decl = res.data.declaration;
  pickFacts.declaration = decl
    ? {
        status:
          decl.declarationStatus === 'valid'
            ? 'valid'
            : decl.declarationStatus === 'absent'
              ? 'absent'
              : 'invalid',
        hash: typeof decl.declarationHash === 'string' ? decl.declarationHash : '',
        ...(decl.declarationVersion ? { version: decl.declarationVersion } : {}),
      }
    : null;
  // V3-4 trigger ①: the panel is present on an authorized origin ⇒ ensure the layer
  // exists (idempotent; a failure is reported readably through `onUnavailable`).
  void pickInput?.ensureInjected();
  // TASK-033: keep the settings view's origin-scoped auto-authorization in sync
  // (the chat view's own controls are rendered from the same state).
  settingsHandle?.setActiveOrigin(state.activeOrigin);
  await refreshSessions(changed);
  // D-064: surface the background's one-shot readable notice last (an icon-click
  // binding result / "switched tab" prompt must win over the generic navigation
  // notice the state reducer may have set).
  const notice = typeof res.data.panelNotice === 'string' ? res.data.panelNotice.trim() : '';
  if (notice) dispatch({ type: 'notice', text: notice });
  // BLOCK-02 (v4-4 review): the state reply is where the transient channel facts are
  // APPLIED — eventize them through the single channel (change-only).
  eventizeChannels();
}

/**
 * decision ② / FR-048: fetch the session switcher data. `applyHistory` replaces
 * the conversation when the active session changed (or on explicit switch).
 */
async function refreshSessions(applyHistory: boolean): Promise<void> {
  try {
    const res = await send<SessionsMessageView>(makeMessage('sessions'));
    if (!res.ok || !res.data) return;
    sessions = res.data.sessions ?? [];
    groups = res.data.groups ?? [];
    const incoming = res.data.currentSessionId ?? null;
    const changed = incoming !== null && incoming !== sessionId;
    if (changed) void persistStreamDigest(sessionId);
    if (incoming) sessionId = incoming;
    if (applyHistory || changed) {
      dispatch({ type: 'history', entries: historyEntries(res.data.history), ...sessionActionFields() });
    } else {
      render();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 读取会话列表失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** The active-segment fields every `history` dispatch carries (V4-2 / TASK-606). */
function sessionActionFields(): { sessionId?: string; sessionLabel?: string } {
  const id = sessionId ?? undefined;
  const label = sessions.find((s) => s.sessionId === sessionId)?.label ?? id;
  return { ...(id ? { sessionId: id } : {}), ...(label ? { sessionLabel: label } : {}) };
}

/** decision ② / FR-048: switch to a session chosen in the switcher. */
async function switchToSession(target: string): Promise<void> {
  if (!target || target === sessionId) return;
  try {
    const res = await send<{ sessionId?: string; history?: Array<{ role: string; text: string }> }>(
      makeMessage('session-switch', { sessionId: target }),
    );
    if (!res.ok || !res.data) {
      dispatch({ type: 'notice', text: `✖ 切换会话失败：${res.error ?? '后台无响应'}` });
      return;
    }
    // V4-2 (TASK-606 / ADR-V4-028): flush the OLD segment's digest before the
    // switch; the event log itself is never cleared.
    void persistStreamDigest(sessionId);
    sessionId = res.data.sessionId ?? target;
    dispatch({ type: 'history', entries: historyEntries(res.data.history), ...sessionActionFields() });
    dispatch({ type: 'notice', text: `已切换到会话：${sessions.find((s) => s.sessionId === sessionId)?.label ?? sessionId}` });
    await refreshSessions(false);
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 切换会话失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** decision ② / FR-048: group management from the panel (create / merge current origin). */
async function groupAction(payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await send<{ groups?: SessionGroupView[] }>(makeMessage('session-group', payload));
    if (!res.ok) {
      dispatch({ type: 'notice', text: `✖ 分组操作失败：${res.error ?? '后台无响应'}` });
      return;
    }
    await refreshState();
    dispatch({ type: 'notice', text: '✓ 分组配置已更新（分组只共享对话，不代表互相授权）。' });
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 分组操作失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/**
 * TASK-020 任务 D / TASK-028: run the connectivity test from the panel using the
 * stored config (reuses the `llm-test` message; the plaintext key never leaves
 * the background). The standalone「测试连接」button was removed — the panel now
 * auto-tests once on load (see {@link autoTestConnectionOnce}) and renders the
 * readable result into `#llm-test-result`.
 */
async function runPanelTest(options: { auto?: boolean } = {}): Promise<void> {
  const out = $('llm-test-result');
  out.className = 'muted';
  out.textContent = options.auto ? '正在自动测试当前模型配置…' : '正在发送最小 ping 请求…';
  try {
    const res = await send<TestConnectionResult>(
      makeMessage('llm-test', llmSummary?.providerId ? { providerId: llmSummary.providerId } : {}),
    );
    if (!res.ok || !res.data) {
      out.className = 'warn';
      out.textContent = `✖ 测试连接失败：${res.error ?? '后台无响应'}`;
      return;
    }
    out.className = res.data.ok ? 'ok' : 'warn';
    out.textContent = res.data.message;
  } catch (err) {
    out.className = 'warn';
    out.textContent = `✖ 测试连接失败：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * TASK-028: auto-test exactly ONCE per panel load. Deliberately NOT called from
 * `render()` / message handlers / status polling — only the bootstrap calls it,
 * and the module-level guard makes a duplicate bootstrap a no-op. The
 * background's 60s TTL cache is the second line of defence (repeat loads within
 * the TTL reuse the cached result without a real request).
 */
let autoTestStarted = false;
function autoTestConnectionOnce(): void {
  if (autoTestStarted) return;
  autoTestStarted = true;
  void runPanelTest({ auto: true });
}

/** TASK-020 任务 B: rebind the current tab from the panel (readable failure). */
async function rebindCurrentTab(): Promise<void> {
  const btn = $('rebind') as HTMLButtonElement;
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const res = await send<{ origin?: string }>(makeMessage('rebind'));
    if (res.ok && res.data?.origin) {
      dispatch({ type: 'notice', text: `✓ 已重新绑定当前标签页：${res.data.origin}` });
      await refreshState();
      void refreshLlmStatus();
    } else {
      dispatch({ type: 'notice', text: `✖ 重新绑定失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 重新绑定失败：${err instanceof Error ? err.message : String(err)}` });
  } finally {
    // `refreshState` triggers render() which resets the button disabled state.
    btn.disabled = false;
  }
}

// ══ V3-3 (ADR-V3-025~029): the L2 on-demand views ═══════════════════════════
//
// The four views are REUSED assets, never rewrites: `#tree-drawer` (v2 tree),
// `archive-catalog` (command catalogue), the v1 audit channel and the v1 settings
// panel. What this leaf adds is the *view replacement* (`l2/view-host.ts`), the
// *count derivation* (`l2/counts.ts`) and the two read-only projections.

/** Pull the full snapshot for the catalogue view (lazy: only when it is opened). */
async function pullInsightSnapshot(): Promise<ConnectTreeSnapshot | null> {
  try {
    const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
    if (!res.ok || !res.data) return null;
    l2Snapshot = res.data;
    // Fallback truth for the counts when the state reply did not carry `insight`.
    // Same projection, never a literal (FR-V3-046).
    if (!l2Truth.insightCounts && l2Snapshot.meta?.counts) {
      l2Truth.insightCounts = l2Snapshot.meta.counts;
      refreshL2Counts();
      render();
    }
    return l2Snapshot;
  } catch {
    return null;
  }
}

/** Render the command catalogue (read-only projection; zero form controls). */
async function refreshCatalogView(force = false): Promise<void> {
  const host = document.getElementById('l2-catalog-host');
  if (!host) return;
  // Always fresh when the view is opened by the user: the catalogue is a read-only
  // projection of the CURRENT truth (a stored override / a new authorisation must
  // show up immediately).
  const snapshot = force || !l2Snapshot ? await pullInsightSnapshot() : l2Snapshot;
  if (!snapshot) {
    host.textContent = '命令目录不可用：未能取得连接树快照（不显示陈旧状态）。';
    return;
  }
  renderCommandCatalog(document, host, buildCatalogView(buildArchiveModel(snapshot)));
}

/** Render the audit view from the **existing** audit read channel. */
function renderAuditView(): void {
  const host = document.getElementById('l2-audit-host');
  if (!host) return;
  renderAudit(document, host, buildAuditRows(l2AuditEvents));
}

/** Re-read the audit channel (also refreshes the entry's count — same truth). */
async function refreshAuditView(): Promise<number | null> {
  try {
    const res = await send<unknown[]>(makeMessage('audit-export'));
    const events = Array.isArray(res.data) ? res.data : [];
    l2AuditEvents = events;
    l2Truth.auditEntries = events.length;
    refreshL2Counts();
    // The v1 audit counter is derived from the same reply (still one channel).
    dispatch({ type: 'audit-count', count: events.length });
    renderAuditView();
    return events.length;
  } catch {
    return null;
  }
}

/**
 * Open an L2 view (the product path, reached in ≤2 interactions:
 * `#l0-statusbar` → one `#l2-entry-*`).
 *
 * `openTreeBody` is the ONLY difference between the product path and the test
 * hook: the product path opens the tree body immediately (so the view is complete
 * in ≤2 interactions, FR-V3-048), while `window.__v3.testing.openTreeView()`
 * deliberately stops at the view so the existing gates can drive the v2 FAB
 * control themselves.
 */
function openL2View(which: L2ViewKey, opts: { openTreeBody?: boolean } = {}): void {
  // FR-V3-047 round-trip determinism: the entry menu is always FOLDED before the view
  // opens, so the expansion snapshot the view host takes on entry is "everything the
  // user had open, minus the menu itself" — restoring it cannot re-open the menu.
  
  if (which === 'settings') {
    // One L2 view at a time (FR-V3-045/047): the settings view is a *replacement*
    // too, so the host view must be folded first — otherwise a previously opened
    // catalogue/audit view would stay "open" behind the settings switch.
    viewHost?.close();
    void openSettingsView();
    return;
  }
  const opened = viewHost?.open(which);
  syncComposerVisibility();
  if (!opened) return;
  if (which === 'tree') {
    // ADR-V3-028: the FAB keeps its id/semantics; it is revealed with the view
    // (never resident in the default tier — the 7-clickable budget is untouched).
    $('tree-fab').hidden = false;
    if (opts.openTreeBody !== false) void treeDrawer?.open();
  }
  if (which === 'commands') void refreshCatalogView(true);
  if (which === 'audit') void refreshAuditView();
}

function wire(): void {
  // V3-1 (ADR-V3-016): one disclosure controller owns every collapse; the risk
  // rail is deliberately NOT in its whitelist.
  const disclosure = installDisclosure();
  // V4-1 (TASK-504 / NFR-CHAT-008): the three-state theme controller. `load()` is
  // fire-and-forget: a storage failure degrades to「跟随系统」without blocking the
  // panel (EC-CHAT-014).
  themeToggle = mountTheme(document);
  void themeToggle.load();
  $('l2-back').addEventListener('click', () => viewHost?.close());
  l0 = mountL0({
    doc: document,
    disclosure,
    onAnswer: (label) => submitAsk(label, false),
    onOpenSettings: () => void openSettingsView(),
    onOpenL2: (which) => openL2View(which),
    getCounts: currentL2Counts,
  });
  l1 = mountL1({
    doc: document,
    disclosure,
    openL2: (which) => l0?.openL2(which),
    revealFallback: () => revealAskFallback(),
    // V4-4 TASK-806 (ADR-V4-038): the single page-side pick entry.
    requestPick: () => void pickInput?.requestPick(),
    // R3: the one-click re-anchor seam (the real work is in pick-input.ts).
    reanchor: (refId) => reanchorRef(refId),
    // A REAL re-pull of `insight-tree`: the receipt's tool-surface evidence must
    // describe this pull, never a remembered value (ADR-V2-009 semantics).
    refreshSnapshot: async () => {
      const res = await send<{ tools?: string[] }>(makeMessage('insight-tree'));
      return res.ok ? (res.data ?? null) : null;
    },
    now: () => Date.now(),
  });
  installV3TestHooks();
  pickInput = mountPickInput({
    doc: document,
    send: (message) => send(message as PluginMessage) as Promise<{ ok: boolean; error?: string; data?: unknown }>,
    envInput: () => ({
      activeOrigin: state.activeOrigin ?? '',
      authorized: state.authorized,
      declaration: pickFacts.declaration,
    }),
    onCapture: (facts, resolution) => acceptCapture(facts as unknown as Record<string, unknown>, resolution),
    onPageHover: (refId) => {
      // FR-V3-066: hovering the page badge lights the side-panel chip (the same ordinal).
      // The attribute IS the channel (one writer, no shadow state to drift).
      newestRefChip()?.setAttribute('data-ref-hover', refId);
      render();
    },
    onUnavailable: (reason) => {
      if (pickFacts.pageUnavailable === reason) return;
      pickFacts.pageUnavailable = reason;
      render();
    },
    notify: (text) => dispatch({ type: 'notice', text }),
  });

  // V4-4 TASK-806 (ADR-V4-038): the panel-side `#l0-pick` entry is RETIRED. The two
  // in-panel recovery paths (the `ref` card's「重新拾取」and the recommendation chip)
  // both go through `requestPick()` — the single production entry — and the primary
  // entry is the page-side layer itself (authorized sites only; zero injection).
  // The settings-view「站点与授权」guidance is wired below (text only, no injection).
  document.getElementById('pick-guidance')?.addEventListener('click', () => void pickInput?.requestPick());
  // The panel is present on an authorized origin ⇒ the layer exists, so the
  //    right-click menu is available without the user entering pick mode first.
  // FR-V3-066: hovering the side-panel chip flashes the page-side target.
  // V4.5-1 W3：chip hover 的监听已随卡片内化（`cards/ref.ts` 的卡内监听 → `handleCardAction('hover')`），
  // 面板侧不再有第二个全局监听面。
  // The layer lives only while the panel does (ADR-V3-030 §4). The port disconnect in
  // the background covers the hard close; this covers a panel unload/reload.
  window.addEventListener('pagehide', () => {
    pickInput?.teardown();
    // V4-2 (TASK-605): flush the active session's digest on close. `pagehide` is
    // the reliable teardown signal for an extension page (no `beforeunload`).
    void persistStreamDigest(sessionId);
  });

  // TASK-033: the settings entry opens an in-panel view in the SAME document.
  // It never opens the options page and never opens a new tab.
  $('open-settings').addEventListener('click', () => {
    void openSettingsView();
  });
  $('settings-back').addEventListener('click', () => {
    settingsViewSwitch.showChat();
  });

  // TASK-020 任务 B: explicit rebind escape hatch for「无活跃站点」— now an op trigger.
  $('rebind').addEventListener('click', () => void dispatchOp('op.rebind'));

  // decision ② / FR-048: session switcher (click a session to switch) + groups.
  $('session-list').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-session-id]') as HTMLButtonElement | null;
    const target = btn?.dataset.sessionId;
    if (target) void switchToSession(target);
  });
  $('group-create').addEventListener('click', () => {
    const input = $('group-name') as HTMLInputElement;
    const name = input.value.trim();
    if (!name) {
      dispatch({ type: 'notice', text: '✖ 请先填写分组名称。' });
      return;
    }
    input.value = '';
    void groupAction({ action: 'create', name });
  });
  $('group-add').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) {
      dispatch({ type: 'notice', text: '✖ 当前没有活跃站点，无法并入分组。' });
      return;
    }
    const groupId = ($('group-select') as HTMLSelectElement).value;
    if (!groupId) {
      dispatch({ type: 'notice', text: '✖ 请先新建并选择一个分组。' });
      return;
    }
    void groupAction({ action: 'add', groupId, origin });
  });

  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input') as HTMLInputElement;
    // V4-4 TASK-805: the composer and the recommendation chips share ONE entry.
    // V5.5-3 TASK-V55-314（ADR-V55-009 §1「静默期」）：用户**手输**回合 ⇒ AI 让位（重置
    // 自动链 + 进入静默期）。注意：这里**不是** `requestTurn` 内部 —— AI 经 `op.turn` 槽
    // 复用 `requestTurn`，若在槽内打静默期会把「答案后续流」自己也锁住。
    if (requestTurn(input.value)) {
      proactivity.noteUserTurn();
      input.value = '';
    }
  });

  // TASK-023: keep the「回到底部」affordance + follow anchor in sync with the
  // user's real scroll position (post-layout metrics, not stale pre-append reads).
  $('stream').addEventListener(
    'scroll',
    () => {
      syncScrollAnchor();
      updateScrollHint();
    },
    { passive: true },
  );
  $('scroll-bottom').addEventListener('click', () => {
    const log = $('stream');
    log.scrollTop = log.scrollHeight;
    scrollFollow.returnedToBottom();
    updateScrollHint();
  });

  // V5-1 TASK-V5-113：把既有**单一生产入口**注册进 op 管线 —— 集 B 的动作由
  // `dispatchChipAction → runOp → op.execute` 触达，面板侧仍只有这一组入口（零双路径）。
  bindPanelOps({
    turn: (text) => {
      requestTurn(text);
    },
    pick: () => void pickInput?.requestPick(),
    describe: (value) => {
      if (value) submitDescribe(value);
      else revealAskFallback();
    },
    authorize: () => authorizeCurrentSite(),
    rebind: () => void rebindCurrentTab(),
    help: () => openSettingsSection(HELP_SECTION_ID),
    notice: (text) => dispatch({ type: 'notice', text }),
    ctx: () => lastRecommendCtx,
    collectParams: (op, ctx) => collectOpParams(op, ctx),
    collectConsent: (op) => collectOpConsent(op),
    // V5-2 TASK-V5-139/141/142/143 — the four R2 seams (one per task, no side paths).
    // review R1 BLOCK-01: the bodies are the **shared** ones (`settings/op-bodies.ts`);
    // the panel only injects its atoms (gesture / key-store sink / live origin).
    permRequest: (ids) => permRequest(ids),
    revoke: async (target) => {
      const out = await buildOpBodies().revoke(target);
      // The auto-auth list is a live panel fact ⇒ refresh it after the revoke landed.
      if (out.ok && String(target ?? '').startsWith('auto-auth:')) await refreshState();
      return out;
    },
    /* V5.5-1 TASK-V55-113: 取消 / 拒绝 / 失败与「已答」走同一求值入口；恢复行必须立刻可达（force）。 */
    nextAfterSettle: (op, state) => {
      // V5.5-3 TASK-V55-314（ADR-V55-009 §4「一次性否决」）：用户对一张卡的 **reject /
      // 中断** 就是「否决」⇒ 打上**静默期**（本次不再发生）+ 重置自动链；否决**非死端** ——
      // 下方 force 求值仍给出可达 next。
      if (state === 'rejected' || state === 'cancelled') proactivity.noteVeto();
      // V5.5-2 TASK-V55-215 + review R1 I-03: **只有「用户主动放弃」（cancelled / rejected）**
      // 才是同因去重键的来源（`recordsDeclinedCause` 单源纯判据）。配置**失败**（failed）
      // **不是放弃** ⇒ 同因引导保持**可重试**（失败后最自然的 next 恰是重试配置这一步），
      // 悬置任务仍**保留**（取消不是死端：下方 force 求值仍给出可达 next）。
      if (op.opId === ONBOARD_CHIP_OP && onboardGuideCause && recordsDeclinedCause(state)) declinedOnboardCauses.push(onboardGuideCause);
      nextAfterSettle({ kind: `op-${state}`, force: true, opId: op.opId });
    },
    /* V5.5-2 TASK-V55-211（ADR-V55-007 §3）：回执写出**之后**的收口回调 —— 配置成功 ⇒ 续接。 */
    opSettled: (op, state) => {
      if (op.opId === ONBOARD_CHIP_OP && state === 'completed') resumeAfterConfig();
    },
    snapshotTables: () => collectThreeTableSnapshot(threeTableAdapters()),
    restoreTables: (snap) => restoreThreeTableSnapshot(threeTableAdapters(), snap),
    llmConfig: async (raw) => {
      // V5-2 TASK-V5-145 (ADR-V5-005 §3) / review R1 BLOCK-01: the settings form's payload
      // arrives via the op ctx value (never through `dispatch`) and is executed by the
      // **same** body the options page uses — the form's own submit IS the consent.
      if (raw && raw.trim().startsWith('{')) {
        const out = await buildOpBodies().llmConfigForm(raw);
        noteLlmBlockedFact(out.ok);
        if (out.ok) await refreshLlmStatus();
        return out;
      }
      const provider = providerById(opParams[0] ?? '');
      const test = await buildSettingsOps().testConnection({ providerId: provider.id, model: opParams[1] || provider.defaultModel });
      // 执行前快照、失败回滚（FR-ALLN-042 / R-ALLN-904 上游）: the old credentials stay
      // byte-identical when the connection test fails.
      if (!test.ok) {
        await restoreCredentials();
        dispatch({ type: 'notice', text: `✖ 测试连接失败，已回滚旧配置：${test.text}` });
        noteLlmBlockedFact(false);
        return { ok: false, reason: 'llm-test-failed' };
      }
      llmSnapshot = null;
      noteLlmBlockedFact(true);
      return { ok: true };
    },
  });

  // V5-2 TASK-V5-146 (ADR-V5-005 §2): the settings-view buttons are **op triggers** —
  // `dispatchOp` is the same entry the chat chips use, so no second execution path
  // (the `authorizeCurrentSite` / `rebindCurrentTab` bodies stay the ONE production
  // entries, reached through the op's panel slot below).
  // 本按钮是**设置面**的显式确认控件 ⇒ 它自己就是 consent 载体（ADR-V5-005 §3）：
  // 走 `settings` 面跳过流内 consent 卡（与 options.html 同一登记口径），执行体仍是同一个。
  $('authorize').addEventListener('click', () => void dispatchOp('op.authorize', {}, 'settings'));

  $('revoke').addEventListener('click', () => void dispatchOp('op.revoke', { value: 'site-auth' }));

  // V4-3: the ask/auth controls now live on the **stream cards** (their own
  // listeners call `handleCardAction`). The single delegated handler below covers
  // the Enter-to-submit gesture on any open ask's input; the v1 id listeners for
  // `#confirm-*` / `#ask-*` were removed with the retired decision slot.
  $('stream').addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.classList.contains('ask-input')) return;
    if ((e as KeyboardEvent).key !== 'Enter') return;
    e.preventDefault();
    const li = target.closest('[data-card-key]') as HTMLElement | null;
    if (li) submitAskFor(requestIdForCard(li.getAttribute('data-card-key') ?? ''), (target as HTMLInputElement).value, false);
  });

  $('audit').addEventListener('click', () => {
    void send<unknown[]>(makeMessage('audit-export')).then((res) => {
      const events = Array.isArray(res.data) ? res.data : [];
      dispatch({ type: 'audit-count', count: events.length });
      dispatch({ type: 'notice', text: `审计记录已导出（${events.length} 条，零明文）` });
    });
  });

  // V5-3 TASK-V5-166 (ADR-V5-006 §3, FR-ALLN-087/088, NG-ALLN-019): state -> action.
  // yellow => mint an `op.authorize` next card + a system row; green => expand the
  // on-demand management detail. Neither path navigates away (in-place, never settings).
  const authChip = $('auth-state');
  const authDetail = $('auth-detail');
  authChip.addEventListener('click', () => {
    if (authChip.dataset.auth === 'green') {
      authDetail.hidden = !authDetail.hidden;
      authChip.setAttribute('aria-expanded', String(!authDetail.hidden));
      return;
    }
    dispatch({ type: 'nextstep', chips: ['授权当前站点'], acts: ['authorize'] });
    dispatch({ type: 'notice', text: '未授权：下一步' });
  });
  // The detail entries are op triggers via the SAME `dispatchOp` entry the settings face
  // uses (one delegated listener); `op.revoke` keeps its consent carrier.
  authDetail.addEventListener('change', (e) => {
    const op = (e.target as HTMLSelectElement).value;
    if (op) void dispatchOp(op, op === 'op.revoke' ? { value: 'site-auth' } : {});
  });

  /* ────────────────────────────────────────────────────────────────────────────
   * V5.5-3 **TASK-V55-310** (ADR-V55-010 §2/§4 · FR-SELF-061/063 · AC-SELF-014 ·
   * R-V55-107) —— 面板侧的**可见留痕 + 草稿回填**。
   *
   * 仲裁本体在 SW（`turnQueue`，硬上限 1）；面板不做裁决，只把结果**可读化**：
   *   · `queued`        ⇒ 一行「已排队」（文案在内存里等待回合结束，**不是没反应**）；
   *   · `busy-rejected` ⇒ 「正在处理上一条，未发送」+ **把被拒原话放回 `#input`**
   *     （仅当输入框为空 —— 用户新输入**不被覆盖**；原话也仍在流内 `user` 行里，
   *      因此任何情况下都**没有**静默丢失）。
   * 载体 = 既有 `system`/notice 行（**零新增 kind**）。
   * ──────────────────────────────────────────────────────────────────────────── */
  const QUEUED_TURN_TEXT = '已排队：上一条回合结束后自动发送。';
  const BUSY_REJECTED_RESTORED_TEXT = '正在处理上一条，未发送；已把你这句放回输入框。';
  const BUSY_REJECTED_KEPT_TEXT = '正在处理上一条，未发送；输入框已有内容未覆盖。';

  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const msg = raw as PluginMessage;
    // V3-4 (ADR-V3-030): the page-side layer's facts. `accept` returns `false` for every
    // other kind, so the v1 routing below is byte-for-byte unchanged.
    if (pickInput?.accept(raw)) return undefined;
    if (msg.kind === 'clipboard-op') {
      // FR-055 (TASK-039): the service worker has no `navigator.clipboard`, so it
      // forwards the clipboard op to an extension page. Shared with options.ts.
      return handleClipboardOpMessage(raw, sendResponse);
    }
    if (msg.kind === 'chat-result') {
      const text = typeof msg.text === 'string' ? msg.text : '';
      const variant = typeof msg.variant === 'string' ? msg.variant : 'assistant';
      if (variant === 'error') {
        dispatch({ type: 'error', text });
        // BLOCK-01 (v4-4 review): a turn that ended on an error is「回合结束」too —
        // the idle recommendation timing runs after the error settled the turn.
        maybeRecommend('idle');
      }
      else if (variant === 'tool') {
        // TASK-023: carry the tool-card metadata when the background observed it.
        dispatch({
          type: 'tool',
          text,
          ...(typeof msg.tool === 'string' ? { tool: msg.tool } : {}),
          ...(typeof msg.ok === 'boolean' ? { ok: msg.ok } : {}),
          ...(typeof msg.ms === 'number' ? { ms: msg.ms } : {}),
        });
        // ★ R6（2026-09-23）—— 一次成功的 `dom set-text` 命中了活引用 ⇒ 只读重观测 + 重判
        // （`text-changed` / `dom-gone` ⇒ 既有失效/救援口径）。SW 已把「仅成功的 dom set-text」
        // 的选择器放进 `targetSelector`（其余工具不带）。
        if (msg.ok === true && typeof msg.targetSelector === 'string') reobserveAfterWrite(msg.targetSelector);
      } else if (variant === 'command') dispatch({ type: 'command', text });
      else if (variant === 'llm-unconfigured') {
        // ★ V5.5-2 **TASK-V55-205 / 210** (ADR-V55-006 §4/§5 · ADR-V55-007 §2) —
        // 主题① 的**主动识别**源：未配置 ⇒ 系统流（**零 token 已由 SW 保证**）。
        // ① `detect`：固化系统行事实（零明文）；
        // ② 悬置任务：记住「用户刚才那句话」（谁在等 / 等什么 / 依据什么），MAX=1；
        // ③ 折叠进**既有** `risk` 源（`noteLlmBlockedFact` 与被动观测同一终态词汇 ⇒ 幂等，
        //    不产生第二条阻塞事实 / 第二条引导）；
        // ④ `nextAfterSettle({kind:'answered'})`：立刻求值一次 ⇒ 既有 `llm.unconfigured`
        //    provider 产出 `op.llm-config` **op-direct chip**（`guide` 步，零视图切换）。
        const intent = [...state.entries].reverse().find((entry) => entry.role === 'user')?.text ?? '';
        // V5.5-2 TASK-V55-215: 这条引导的**因** = 用户原话（同因不重复的去重键）。
        onboardGuideCause = onboardCauseKey(intent);
        dispatch({ type: 'pending', value: false });
        dispatch({ type: 'notice', text: ONBOARD_DETECT_TEXT });
        // review R1 **I-02**：`over-capacity` 是**契约返回值**（`suspension.ts`），**不得静默丢弃**
        // —— `MAX=1` 下已有**不同**意图在等时，留痕「原任务优先保留、本条新意图未叠加」；
        // `registered`（本次登记）与 `deduped`（同因幂等，已有同一事实）都无需第二条事实行。
        const suspensionOutcome = registerConfigSuspension(intent, {
          ...(state.activeOrigin ? { origin: state.activeOrigin } : {}),
          ...(sessionId ? { sessionId } : {}),
        });
        if (suspensionOutcome === 'over-capacity') dispatch({ type: 'notice', text: ONBOARD_SUSPENSION_RETAINED_TEXT });
        // ③ 折叠进**既有** `risk` 源（与被动观测同一终态词汇 ⇒ 幂等，不产生第二条阻塞事实 /
        //    第二条引导）。`ruled = true`：事实来自 **SW 的 `isLlmConfigured` 裁定**，
        //    不依赖被动 `llm-status` 快照门（review R1 I-04：冷启动竞态窗口下双源仍各自成立）。
        noteLlmBlockedFact(false, true);
        nextAfterSettle({ kind: 'answered' });
      }
      else if (variant === 'queued') {
        // V5.5-3 TASK-V55-310：排队结果**可判**（不是静默吞掉）—— 一行系统留痕。
        dispatch({ type: 'notice', text: QUEUED_TURN_TEXT });
      }
      else if (variant === 'busy-rejected') {
        // V5.5-3 TASK-V55-310（R-V55-107）：拒绝后把**被拒原话**回填 `#input` —— 仅在输入框
        // 为空时（**不覆盖**用户新输入；非空时只留痕，原话仍在流内 `user` 行）。判据：
        // 「拒绝后 `#input.value === 被拒文本` 且存在可读行」；删掉回填 ⇒ FAIL。
        const draftInput = $('input') as HTMLInputElement;
        const rejected = text;
        const restored = rejected.length > 0 && draftInput.value.length === 0;
        if (restored) draftInput.value = rejected;
        dispatch({ type: 'notice', text: restored ? BUSY_REJECTED_RESTORED_TEXT : BUSY_REJECTED_KEPT_TEXT });
      }
      else if (variant === 'done') {
        dispatch({ type: 'pending', value: false });
        // P5: the page-side flash has finished being the「进行中」signal.
        newestRefChip()?.setAttribute('data-turn', 'done');
        // ★ R6（2026-09-23）—— 回合完成即**提交**「刚完成的引用动作」去重键：紧随其后的
        // 下一步推荐（`maybeRecommend('idle')`）因此不会再推同一件事（同 digest）。
        commitCompletedRefAction();
        // BLOCK-01 (v4-4 review):「空闲 = 回合结束且无 open ask」is the third
        // production timing. The producer itself refuses to mint while `pending`, so
        // this runs after the settle above.
        if (state.stream.openAsks.length === 0) maybeRecommend('idle');
        // V5.5-3 TASK-V55-306：回合结束（`pending` 已置假）是「在飞时被让位」的那次自动
        // 成回合的**续流点** —— 用户那句话仍在悬置里等，此时不再 busy ⇒ 交 `op.turn` 槽。
        driveAnsweredTurn();
      }
      else if (text) dispatch({ type: 'assistant', text });
      return undefined;
    }
    if (msg.kind === 'confirm-request') {
      const question = msg.question as { tool?: string; reason?: string; risk?: string } | undefined;
      dispatch({
        type: 'confirm',
        requestId: String(msg.requestId ?? ''),
        summary: `${question?.tool ?? '工具'}：${question?.reason ?? '敏感操作'}`,
        ...(question?.risk ? { risk: question.risk } : {}),
      });
      return undefined;
    }
    if (msg.kind === 'ask-user-request') {
      // FR-017 / R7: task-internal clarification question → Q&A UI.
      const question = msg.question as { kind?: string; prompt?: string; options?: string[]; default?: string } | undefined;
      const kind = question?.kind === 'choice' || question?.kind === 'confirm' ? question.kind : 'text';
      /* V5.5-1 TASK-V55-117: SW 真实投递过的后台 ask ⇒ 它的迟到口径成立（见 submitAskFor）。 */
      const rid = String(msg.requestId ?? '');
      bgAskIds.add(rid);
      dispatch({
        type: 'ask',
        requestId: rid,
        kind,
        prompt: question?.prompt ?? '（无问题文本）',
        ...(Array.isArray(question?.options) ? { options: question.options } : {}),
        ...(question?.default ? { default: question.default } : {}),
      });
      return undefined;
    }
    if (msg.kind === 'probe-changed') {
      // TASK-032: the background's automatic probe advanced (probing / retry N /
      // ready) → re-read state and re-render. This replaces the removed manual
      //「重新探测」button; it never triggers a probe itself.
      void refreshState();
      return undefined;
    }
    if (msg.kind === 'session-changed') {
      // decision ② / FR-048: the background moved to another session (tab switch /
      // auto-bind) → re-read state + replace the conversation with that session's.
      sessionId = null;
      // R6：会话切换 ⇒ 「刚完成」台账清空（与悬置登记同寿命）。
      resetCompletedRefActions();
      void refreshState();
      return undefined;
    }
    if (msg.kind === 'capability-changed') {
      // TASK-040: an optional-capability grant/revoke happened (a gesture request
      // settling, or an external change in chrome://extensions). Re-measure the
      // capability rows in place — the side panel is never reopened.
      void settingsHandle?.refreshCapabilities();
      return undefined;
    }
    return undefined;
  });

  // ── V2-2 (ADR-V2-004/005): mount the floating connection tree ─────────────
  // Additive: the v1 listener above is byte-identical. The drawer builds its DOM
  // and pulls `insight-tree` only on the first FAB open (lazy; closed = no cost).
  // A *second* listener carries the re-projection fan-out so the v1 handler is
  // never edited; `refresh()` is a no-op until the drawer has been opened.
  treeDrawer = mountTreeDrawer({
    root: $('tree-drawer'),
    fab: $('tree-fab'),
    doc: document,
    ops: {
      pull: async () => {
        const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
        if (!res.ok) throw new Error(res.error ?? 'insight-tree 拉取失败');
        return res.data ?? null;
      },
    },
    // V2-3: the closed 7-action whitelist runner — existing ops/messages only.
    actions: createTreeOps({
      ops: buildSettingsOps(),
      transport: transportFromRuntime(chrome.runtime as unknown as { sendMessage(message: unknown): Promise<unknown> }),
      env: detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined),
      refreshSnapshot: async () => {
        const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
        return res.ok ? (res.data ?? null) : null;
      },
    }),
    onAuditExport: () => {
      const audit = document.getElementById('audit') as HTMLButtonElement | null;
      if (audit) audit.click();
    },
    // V4.5-1 W2 (TASK-V45-105): the `#notice` overwrite node retired — the tree
    // drawer's one-off notice rides the SAME single system channel as every other
    // notice (ordered, timestamped, un-overwritable) instead of a DOM overwrite.
    onNotice: (text) => dispatch({ type: 'notice', text }),
  });
  // V3-3 (ADR-V3-025): the view host is mounted AFTER the tree drawer on purpose —
  // both listen for `Escape` on `document`, and the INNER component must win: the
  // drawer's handler calls `preventDefault()` when it closes itself, which is what
  // tells the host to stay open (see `l2/view-host.ts`).
  viewHost = mountViewHost({
    doc: document,
    disclosure,
    getCounts: currentL2Counts,
    onClosed: () => {
      // Leaving the view also folds the tree body: the next entry starts from a
      // clean, count-truthful state (the view opens, then the body follows).
      treeDrawer?.close();
      render();
    },
  });
  chrome.runtime.onMessage.addListener((raw) => {
    const msg = raw as PluginMessage;
    if (
      msg.kind === 'insight-changed' ||
      msg.kind === 'capability-changed' ||
      msg.kind === 'session-changed' ||
      msg.kind === 'probe-changed'
    ) {
      void treeDrawer?.refresh();
    }
    return undefined;
  });
  // Panel regained focus / became visible → re-project if the tree was opened.
  window.addEventListener('focus', () => void treeDrawer?.refresh());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void treeDrawer?.refresh();
  });
}

/** TASK-019 任务 A: blocking banner + disabled actions when not in an extension. */
function applyEnvGuard(env: EnvGuardResult): void {
  if (env.inExtension) return;
  // BLOCK-02 (v4-4 review) / V4.5-1 W2 (TASK-V45-105): the env guard is a one-shot
  // blocking fact — it is append-recorded through the single system channel (`env`
  // kind) and that stream row is now its **only** visible carrier (the `#env-guard`
  // node retired; the options page keeps its own `#env-guard`, which is a different
  // document and stays untouched).
  dispatch({ type: 'system', kind: 'env', text: env.banner });
  for (const id of ['authorize', 'revoke', 'send', 'audit', 'open-settings', 'rebind']) {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = true;
  }
  // V2-2 (ADR-V2-005): the floating tree entry obeys the same environment guard
  // as the other actions (non-extension context → disabled).
  for (const id of ['tree-fab']) {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = true;
  }
  ($('input') as HTMLInputElement).disabled = true;
}

// V5-3（FR-ALLN-090）：`data-narrow` = 面板**实际宽度** ≤360 的窄屏兜底（ResizeObserver，
// 非 matchMedia 视口；宽度只改样式、不改控件计数 —— 密度格与宽度解耦）。
function installNarrowObserver(): void {
  const panel = document.getElementById('panel');
  if (!panel) return;
  const apply = (width: number): void => {
    panel.dataset.narrow = width <= 360 ? 'true' : 'false';
  };
  apply(panel.clientWidth || window.innerWidth);
  if (typeof ResizeObserver === 'undefined') return;
  new ResizeObserver(() => apply(panel.clientWidth)).observe(panel);
}

// Only bootstrap in a real extension page; guarded so the module (and its
// consent/boundary text) stays importable in node tests. On a non-extension page
// (e.g. `file://.../sidepanel.html`) we still render the blocking banner instead
// of silently failing on the first `chrome.runtime` access.
if (typeof document !== 'undefined') {
  const env = detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined);
  applyEnvGuard(env);
  if (env.inExtension) {
    // TASK-032: keep a port open so the background knows a panel is attached and
    // only retries the automatic probe while it is (bounded; no background poll).
    // The port auto-disconnects on panel close → retries stop.
    panelPort = chrome.runtime.connect({ name: 'web-cli-panel' });
    installNarrowObserver();
    wire();
    renderConsent();
    render();
    // V3-3 (FR-V3-046): the audit count must be the real ring-buffer length from the
    // first paint, not a placeholder `0` — one read of the existing channel.
    void refreshAuditView();
    void refreshState().then(() => restoreStreamDigest(sessionId));
    void refreshLlmStatus();
    // V5.5-3 TASK-V55-314（ADR-V55-009 §4）：面板启动即读**持久关断偏好**（键名单源在
    // `guard.ts#AI_PROACTIVE_PREF_KEY`；读取失败降级到默认 ON）。设置面切换即时生效。
    void loadProactivePref().then((on) => proactivity.setEnabled(on));
    // TASK-028: auto-test the current model config once per panel load and render
    // the readable status (no standalone「测试连接」button anymore).
    autoTestConnectionOnce();
    // F-2: refresh the summary when the panel regains focus (e.g. after the
    // user saved settings on the options page). NB: this is a status refresh
    // only — it must NOT re-trigger the connectivity test (TASK-028).
    window.addEventListener('focus', () => void refreshLlmStatus());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refreshLlmStatus();
      // R2 (2026-09-17): deliberately **no** panel-visibility probe signal here.
      // The first version posted `{kind:'panel-visible'}` on the panel port; the
      // binding gate caught the consequence (real-product regression, not a test
      // relaxation): a panel-driven background refresh re-read `state`, and the
      // SW's `state` reply consumes the **one-shot** `panelNotice` — so becoming
      // visible could swallow the「已切换标签页…」notice before the user ever saw it.
      // Recovery on visibility change stays intact through the existing `kick`
      // signals: tab activation / navigation (`followActiveTab → kickDiscovery`) and
      // panel (re)open (`onConnect → kickBoundProbe`), both of which reset the
      // declaration backoff. See build.md §15.
    });
  }
}
