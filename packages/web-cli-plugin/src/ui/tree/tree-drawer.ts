/**
 * V2-2 连接树 DOM 挂载（FR-V2-020/021/022/024；ADR-V2-004 / ADR-V2-005）。
 *
 * 惰性 + 零注入：抽屉是 `#panel-main` 的覆盖层；**首次点开 FAB 才**拉取
 * `insight-tree` 并建 DOM；关闭态 `[hidden]` → 无渲染、无轮询（NFR-V22-005）。
 * 渲染只用 `createElement` / `textContent`（**零标记字符串注入**，防 XSS，与 v1
 * 消息渲染一致）。
 *
 * R2（ADR-V2-028/029/030；FR-V2-070/072/073/074/077/078）：
 *   - **真层级树**：`<ul role="tree">` / `<li role="treeitem">` 自建（**否** `<details>`），
 *     逐层 `aria-expanded` / `aria-level` / `aria-selected`；根 + 一级默认展开，深层默认
 *     收起；`expanded` / `collapsed` 会话内保持并在重投影后回放（EC-V2-006）；
 *   - **键盘可达**：单一代理 `keydown`（方向键 / Enter / Space / Home / End）+ roving
 *     tabindex + 焦点可见；`ArrowRight` 进子 / `ArrowLeft` 回父；
 *   - **面包屑**：`#tree-breadcrumb` 显示当前焦点节点的层级路径（FR-V2-073）；
 *   - **惰性渲染**（不虚拟化）：仅渲染展开路径；
 *   - **deny 控件分层**：硬底线行零 `button[data-action-id]` + `.tree-clamp-reason` 可读；
 *     可覆盖行渲染 3 个 `button[data-action-id="set-command-policy"][data-policy=allow|ask|deny]`
 *     （+ 有覆盖时的「恢复默认」）；写入仍走**唯一** `tree-ops` 写路径（无第二写入口）；
 *   - **放宽类二次确认**：`commandPolicyNeedsConfirmation(desired, default)` → `#tree-confirm`。
 *
 * 本模块不新增判定：服务端 SW 的 clamp 仍强制（伪造消息/绕过 UI 也不能突破）。
 */
import type { PolicyAction } from '@lgdl/web-cli-base';
import {
  TREE_MODEL_NOTE,
  TREE_NO_ESCALATION_NOTE,
  buildTreeRows,
  commandPolicyNeedsConfirmation,
  confirmationSummary,
  collectTreeRows,
  needsConfirmation,
  type TreeActionTarget,
  type TreeFilter,
  type TreeRenderModel,
  type TreeRow,
} from './tree-view.js';
import type { TreeActionOutcome, TreeActionRequest } from './tree-ops.js';
import type { ConnectTreeSnapshot, ControlDescriptor } from '../../insight/tree-model.js';
import {
  buildArchiveModel,
  type ArchiveCard,
  type ArchiveFilter,
  type ArchiveGroupBy,
} from '../../insight/archive-catalog.js';

export interface TreeDrawerOps {
  /** 拉取完整快照（sidepanel 侧 = `insight-tree` pull）。 */
  pull: () => Promise<ConnectTreeSnapshot | null>;
}

/**
 * V2-3 动作执行器（`tree-ops`）。缺省时抽屉退化为**只读**（控件为只读披露）。
 */
export interface TreeDrawerActionRunner {
  run(req: TreeActionRequest): Promise<TreeActionOutcome>;
}

export interface TreeDrawerDeps {
  /** 抽屉容器（`#tree-drawer`）。 */
  root: HTMLElement;
  /** 悬浮入口（`#tree-fab`）。 */
  fab: HTMLElement;
  doc: Document;
  ops: TreeDrawerOps;
  /** V2-3：撤销/关断动作执行器（`createTreeOps(...).run`）。 */
  actions?: TreeDrawerActionRunner;
  /** V2-3：既有 `admin_audit-export` 入口（回执 ③）。 */
  onAuditExport?: () => void;
  /** 可读错误/状态外送（可选；不静默失败）。 */
  onNotice?: (text: string) => void;
}

export interface TreeDrawerHandle {
  open(): Promise<void>;
  close(): void;
  toggle(): Promise<void>;
  /** 重投影（订阅 `insight-changed` 等）；首开前为 no-op（惰性）。 */
  refresh(): Promise<void>;
  setFilter(filter: TreeFilter): void;
  isOpen(): boolean;
  isLoaded(): boolean;
}

interface Shell {
  body: HTMLElement;
  count: HTMLElement;
  breadcrumb: HTMLElement;
  filterInput: HTMLInputElement;
  /** V2-4：档案子视图控件（默认关；`.tree-archive` 之外）。 */
  archiveToggle: HTMLButtonElement;
  archiveControls: HTMLElement;
  archiveDetail: HTMLElement;
  archiveGroupBy: HTMLSelectElement;
  archiveQuery: HTMLInputElement;
  archiveAction: HTMLSelectElement;
  archiveSource: HTMLSelectElement;
  /** V2-3 ①③：回执 + 审计入口（`role=status aria-live=polite`）。 */
  receipt: HTMLElement;
  /** V2-3：抽屉内联二次确认（ADR-V2-013）。 */
  confirm: HTMLElement;
}

/** 动作上下文（渲染节点 / 档案卡共用；把写路径收敛到同一 `tree-ops.run`）。 */
interface ActionContext {
  label: string;
  actionTarget?: TreeActionTarget;
  actionTool?: string;
  defaultAction?: PolicyAction;
}

/** V2-4 档案分组维度（与 `ArchiveGroupBy` 同形；下拉文案）。 */
const ARCHIVE_GROUP_OPTIONS: readonly { value: ArchiveGroupBy; label: string }[] = [
  { value: 'tool', label: '按工具' },
  { value: 'action', label: '按档位' },
  { value: 'risk', label: '按 risk' },
  { value: 'source', label: '按来源' },
  { value: 'deny-cause', label: '按 deny 成因' },
];

const ARCHIVE_SOURCE_OPTIONS: readonly string[] = [
  'site-declared',
  'plugin-admin',
  'plugin-tabs',
  'plugin-bookmarks',
  'plugin-downloads',
  'plugin-notify',
  'plugin-clipboard',
  'base-builtin',
];

const ARCHIVE_ACTION_OPTIONS: readonly string[] = ['allow', 'ask', 'deny'];

const POLICY_ACTIONS: readonly PolicyAction[] = ['allow', 'ask', 'deny'];

export function mountTreeDrawer(deps: TreeDrawerDeps): TreeDrawerHandle {
  const { root, fab, doc } = deps;

  let snapshot: ConnectTreeSnapshot | null = null;
  let filter: TreeFilter = {};
  let loaded = false;
  let opened = false;
  let shell: Shell | null = null;
  /** V2-4 档案子视图：默认关。 */
  let archiveEnabled = false;
  let archiveFilter: ArchiveFilter = { groupBy: 'tool' };
  /** R2：展开态会话保持（显式展开 / 显式收起；默认 = 根 + 一级展开）。 */
  const expandedExplicit = new Set<string>();
  const collapsedExplicit = new Set<string>();
  /** R2：roving tabindex 焦点节点。 */
  let focusedId: string | null = null;
  /** 当前渲染的节点查找表（键盘/面包屑用；每次渲染重建）。 */
  let renderedById = new Map<string, TreeRow>();
  let parentById = new Map<string, string>();

  const notice = (text: string): void => {
    if (deps.onNotice) deps.onNotice(text);
  };

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setExpanded(value: boolean): void {
    fab.setAttribute('aria-expanded', value ? 'true' : 'false');
  }

  // ── R2: expansion state (session-persistent) ──────────────────────────────

  function hasChildren(row: TreeRow): boolean {
    return row.children.length > 0;
  }

  /** R2：当前渲染是否处于「内容过滤」态（命中节点的祖先链需自动展开才可见）。 */
  let filterActive = false;

  function descendantMatches(row: TreeRow): boolean {
    if (row.matches) return true;
    return row.children.some((child) => descendantMatches(child));
  }

  /** 默认展开根 + 一级；显式展开/收起覆盖默认值（会话内保持）；过滤时命中路径自动展开。 */
  function isExpanded(row: TreeRow): boolean {
    if (filterActive && descendantMatches(row)) return true;
    if (collapsedExplicit.has(row.id)) return false;
    if (expandedExplicit.has(row.id)) return true;
    return row.depth <= 1;
  }

  function toggleExpansion(row: TreeRow): void {
    if (!hasChildren(row)) return;
    if (isExpanded(row)) {
      collapsedExplicit.add(row.id);
      expandedExplicit.delete(row.id);
    } else {
      expandedExplicit.add(row.id);
      collapsedExplicit.delete(row.id);
    }
  }

  // ── rendering (textContent / createElement only) ──────────────────────────

  function ensureShell(): Shell {
    if (shell) return shell;
    root.replaceChildren();

    const header = el('div', 'tree-header');
    const title = el('span', 'tree-title', '连接树 · 按归属逐层展开（站点 / 命令 / 能力 / LLM）');
    const closeBtn = el('button', 'tree-close', '关闭');
    closeBtn.id = 'tree-close';
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => {
      close();
    });
    header.append(title, closeBtn);

    const notes = el('div', 'tree-notes');
    const noteModel = el('div', 'tree-note tree-note-model', TREE_MODEL_NOTE);
    const noteNoEscalation = el('div', 'tree-note tree-note-no-escalation', TREE_NO_ESCALATION_NOTE);
    notes.append(noteModel, noteNoEscalation);

    const breadcrumb = el('div', 'tree-breadcrumb');
    breadcrumb.id = 'tree-breadcrumb';
    breadcrumb.setAttribute('role', 'navigation');
    breadcrumb.setAttribute('aria-label', '当前节点层级路径');
    breadcrumb.textContent = '连接树';

    const filterWrap = el('div', 'tree-filter');
    const filterInput = doc.createElement('input');
    filterInput.id = 'tree-filter-input';
    filterInput.type = 'text';
    filterInput.placeholder = '检索：站点 / 能力 / 命令 / LLM';
    filterInput.setAttribute('aria-label', '检索连接树（只读过滤，不改任何授权状态）');
    filterInput.addEventListener('input', () => {
      setFilter({ query: filterInput.value });
    });
    const count = el('div', 'tree-filter-count');
    filterWrap.append(filterInput, count);

    // ── V2-4 档案子视图控件（默认关） ─────────────────────────────────────────
    const archiveControls = el('div', 'tree-archive-controls');
    const archiveDetail = el('div', 'tree-archive-detail');
    archiveDetail.hidden = true;
    const archiveToggle = el('button', 'tree-archive-toggle', '查看命令档案（分层）');
    archiveToggle.id = 'tree-archive-toggle';
    archiveToggle.type = 'button';
    archiveToggle.setAttribute('aria-pressed', 'false');
    archiveToggle.setAttribute('aria-label', '切换命令档案子视图（默认关闭）');
    archiveToggle.addEventListener('click', () => {
      setArchiveEnabled(!archiveEnabled);
    });
    const groupByLabel = el('span', 'tree-archive-control-label', '分组');
    const archiveGroupBy = doc.createElement('select');
    archiveGroupBy.id = 'tree-archive-groupby';
    archiveGroupBy.setAttribute('aria-label', '档案分组维度（展示）');
    for (const option of ARCHIVE_GROUP_OPTIONS) {
      const node = el('option', undefined, option.label);
      node.value = option.value;
      archiveGroupBy.append(node);
    }
    archiveGroupBy.addEventListener('change', () => {
      archiveFilter = { ...archiveFilter, groupBy: archiveGroupBy.value as ArchiveGroupBy };
      renderBody();
    });
    const queryLabel = el('span', 'tree-archive-control-label', '检索');
    const archiveQuery = doc.createElement('input');
    archiveQuery.id = 'tree-archive-query';
    archiveQuery.type = 'text';
    archiveQuery.placeholder = '检索：命令 / 来源 / origin / 成因';
    archiveQuery.setAttribute('aria-label', '检索命令档案（只读过滤，不改任何授权状态）');
    archiveQuery.addEventListener('input', () => {
      archiveFilter = { ...archiveFilter, query: archiveQuery.value };
      renderBody();
    });
    const actionLabel = el('span', 'tree-archive-control-label', '档位');
    const archiveAction = doc.createElement('select');
    archiveAction.id = 'tree-archive-action';
    archiveAction.setAttribute('aria-label', '按处置档位过滤');
    for (const value of ['', ...ARCHIVE_ACTION_OPTIONS]) {
      const node = el('option', undefined, value === '' ? '全部档位' : value);
      node.value = value;
      archiveAction.append(node);
    }
    archiveAction.addEventListener('change', () => {
      const value = archiveAction.value;
      archiveFilter = {
        ...archiveFilter,
        ...(value === '' ? { action: undefined } : { action: value as ArchiveCard['action'] }),
      };
      renderBody();
    });
    const sourceLabel = el('span', 'tree-archive-control-label', '来源');
    const archiveSource = doc.createElement('select');
    archiveSource.id = 'tree-archive-source';
    archiveSource.setAttribute('aria-label', '按来源过滤');
    for (const value of ['', ...ARCHIVE_SOURCE_OPTIONS]) {
      const node = el('option', undefined, value === '' ? '全部来源' : value);
      node.value = value;
      archiveSource.append(node);
    }
    archiveSource.addEventListener('change', () => {
      const value = archiveSource.value;
      archiveFilter = {
        ...archiveFilter,
        ...(value === '' ? { sourceKind: undefined } : { sourceKind: value as ArchiveCard['sourceKind'] }),
      };
      renderBody();
    });
    archiveDetail.append(
      groupByLabel,
      archiveGroupBy,
      queryLabel,
      archiveQuery,
      actionLabel,
      archiveAction,
      sourceLabel,
      archiveSource,
    );
    archiveControls.append(archiveToggle, archiveDetail);
    filterWrap.append(archiveControls);

    // V2-3：回执（① + ②）与审计入口（③）；二次确认内联区（拒绝 = 零操作）。
    const receipt = el('div', 'tree-receipt');
    receipt.id = 'tree-receipt';
    receipt.setAttribute('role', 'status');
    receipt.setAttribute('aria-live', 'polite');
    receipt.hidden = true;

    const confirm = el('div', 'tree-confirm');
    confirm.id = 'tree-confirm';
    confirm.hidden = true;

    const body = el('div', 'tree-body');

    root.append(header, notes, breadcrumb, filterWrap, receipt, confirm, body);
    shell = {
      body,
      count,
      breadcrumb,
      filterInput,
      archiveToggle,
      archiveControls,
      archiveDetail,
      archiveGroupBy,
      archiveQuery,
      archiveAction,
      archiveSource,
      receipt,
      confirm,
    };

    body.addEventListener('keydown', (event) => {
      if (archiveEnabled) return;
      onTreeKeydown(event);
    });
    // R2：焦点进入任一 treeitem（鼠标 / 键盘 / 程序化）→ 同步 roving tabindex 与面包屑。
    body.addEventListener('focusin', (event) => {
      if (archiveEnabled) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const li = target.closest('li.tree-node');
      const id = li instanceof HTMLElement ? li.dataset.nodeId : undefined;
      if (!id || id === focusedId) return;
      focusedId = id;
      const items = [...body.querySelectorAll<HTMLElement>('li.tree-node')];
      for (const item of items) {
        const selected = item.dataset.nodeId === id;
        item.tabIndex = selected ? 0 : -1;
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
      }
      updateBreadcrumb();
    });
    return shell;
  }

  // ── V2-3 actions: confirm (fail-closed) + execute + 三件套回执 ─────────────

  /** 可读作用对象标签（不携带任何明文材料）。 */
  function targetLabel(ctx: ActionContext): string {
    const target: TreeActionTarget | undefined = ctx.actionTarget;
    if (target?.origin) return `站点 ${target.origin}`;
    if (target?.capability) return `能力「${ctx.label}」`;
    if (target?.command) {
      const sub = target.command.subcommand ? ` ${target.command.subcommand}` : '';
      return `命令 ${target.command.tool}${sub}`;
    }
    if (target?.groupId) return `会话组 ${target.groupId}`;
    return ctx.label;
  }

  function hideConfirm(): void {
    const current = shell;
    if (!current) return;
    current.confirm.hidden = true;
    current.confirm.replaceChildren();
  }

  function renderReceipt(outcome: TreeActionOutcome): void {
    const current = ensureShell();
    current.receipt.replaceChildren();
    const line = el('div', 'tree-receipt-line', outcome.receipt.text);
    line.dataset.kind = outcome.receipt.kind;
    current.receipt.append(line);
    current.receipt.append(el('div', 'tree-receipt-evidence', outcome.toolSurfaceEvidence.evidence));
    if (outcome.receipt.nextStep) {
      current.receipt.append(el('div', 'tree-receipt-next', `下一步：${outcome.receipt.nextStep}`));
    }
    const audit = el('button', 'tree-audit', '查看审计（admin_audit-export）');
    audit.id = 'tree-audit-export';
    audit.type = 'button';
    audit.addEventListener('click', () => {
      if (deps.onAuditExport) deps.onAuditExport();
      else notice('审计入口未接线（请在侧栏「查看审计」中查看）。');
    });
    current.receipt.append(audit);
    current.receipt.hidden = false;
  }

  function renderReceiptError(text: string): void {
    const current = ensureShell();
    current.receipt.replaceChildren();
    const line = el('div', 'tree-receipt-line', text);
    line.dataset.kind = 'err';
    current.receipt.append(line);
    current.receipt.hidden = false;
  }

  /** 构造动作请求（把控件上的 `policyAction` 合并进目标；无第二写入口）。 */
  function requestFor(ctx: ActionContext, control: ControlDescriptor): TreeActionRequest {
    const baseTarget: TreeActionTarget | undefined = ctx.actionTarget;
    const target: TreeActionTarget | undefined =
      control.kind === 'command-policy' && control.policyAction
        ? { ...(baseTarget ?? {}), policyAction: control.policyAction }
        : baseTarget;
    const defaultAction = control.kind === 'command-policy' ? (ctx.defaultAction ?? baseTarget?.defaultAction) : undefined;
    return {
      actionId: control.actionId as TreeActionRequest['actionId'],
      ...(target ? { target: { ...target, ...(defaultAction ? { defaultAction } : {}) } } : {}),
      ...(ctx.actionTool ? { toolHint: ctx.actionTool } : {}),
      confirmed: true,
    };
  }

  async function executeAction(ctx: ActionContext, control: ControlDescriptor): Promise<void> {
    if (!deps.actions || !control.actionId) {
      notice('连接树未接线动作执行器（只读模式）：未执行任何操作。');
      return;
    }
    let outcome: TreeActionOutcome;
    try {
      outcome = await deps.actions.run(requestFor(ctx, control));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      renderReceiptError(`✖ 动作执行异常：${message}（未静默）`);
      notice(`连接树动作执行异常：${message}`);
      return;
    }
    renderReceipt(outcome);
    // 回执 ② 来自重拉实测：动作后立即重投影，展示真实工具面。
    await refresh();
  }

  function askConfirm(ctx: ActionContext, control: ControlDescriptor): void {
    if (!control.actionId) return;
    const summary = confirmationSummary(control.actionId, targetLabel(ctx));
    const current = ensureShell();
    current.confirm.replaceChildren();
    current.confirm.dataset.actionId = control.actionId;
    const title = el('div', 'tree-confirm-title', `请确认 — 作用对象：${summary.target}`);
    const consequence = el('div', 'tree-confirm-consequence', `后果：${summary.consequence}`);
    const irreversible = el('div', 'tree-confirm-irreversible', `不可逆说明：${summary.irreversible}`);
    const actions = el('div', 'tree-confirm-actions');
    const accept = el('button', 'tree-confirm-accept', '确认执行');
    accept.id = 'tree-confirm-accept';
    accept.type = 'button';
    accept.addEventListener('click', () => {
      hideConfirm();
      void executeAction(ctx, control);
    });
    const deny = el('button', 'tree-confirm-deny', '取消');
    deny.id = 'tree-confirm-deny';
    deny.type = 'button';
    // 拒绝 ⇒ 零操作：不发送任何消息、不调用任何 ops。
    deny.addEventListener('click', () => {
      hideConfirm();
      notice('已取消：未执行任何操作。');
    });
    actions.append(accept, deny);
    current.confirm.append(title, consequence, irreversible, actions);
    current.confirm.hidden = false;
  }

  /** R2：命令级覆盖的「放宽方向」也需二次确认（收紧 / 恢复默认不需）。 */
  function onControlActivate(ctx: ActionContext, control: ControlDescriptor): void {
    if (!control.actionId) return;
    if (control.kind === 'command-policy') {
      if (commandPolicyNeedsConfirmation(control.policyAction, ctx.defaultAction ?? ctx.actionTarget?.defaultAction)) {
        askConfirm(ctx, control);
        return;
      }
      void executeAction(ctx, control);
      return;
    }
    if (needsConfirmation(control.actionId)) askConfirm(ctx, control);
    else void executeAction(ctx, control);
  }

  // ── R2: tree rendering (role=tree / treeitem, lazy, keyboard) ──────────────

  function nodeTestId(row: TreeRow): string {
    return row.kind === 'command' ? `command:${row.nodeId ?? row.id}` : row.id;
  }

  function renderControls(row: TreeRow): HTMLElement | null {
    if (row.controls.length === 0) return null;
    const wrap = el('div', 'tree-controls');
    for (const control of row.controls) {
      const actionable = control.kind !== 'none' && Boolean(control.actionId) && Boolean(deps.actions);
      const ctx: ActionContext = {
        label: row.label,
        ...(row.actionTarget ? { actionTarget: row.actionTarget } : {}),
        ...(row.actionTool ? { actionTool: row.actionTool } : {}),
        ...(row.defaultAction ? { defaultAction: row.defaultAction } : {}),
      };
      if (!actionable) {
        const item = el('span', 'tree-control', control.label);
        item.dataset.kind = control.kind;
        if (control.actionId) item.dataset.actionId = control.actionId;
        if (control.policyAction) item.dataset.policy = control.policyAction;
        wrap.append(item);
        continue;
      }
      const button = el('button', 'tree-control', control.policyAction ? control.policyAction : control.label);
      button.type = 'button';
      button.dataset.kind = control.kind;
      button.dataset.actionId = control.actionId as string;
      if (control.policyAction) {
        button.dataset.policy = control.policyAction;
        button.setAttribute('aria-pressed', control.selected === true ? 'true' : 'false');
        if (control.label) button.title = control.label;
      }
      button.addEventListener('click', () => {
        onControlActivate(ctx, control);
      });
      wrap.append(button);
    }
    // R2：可覆盖行若已有用户覆盖 → 提供「恢复默认」（可逆，不需确认；同一 tree-ops 写路径）。
    if (row.overridable === true && row.overrideAction && row.actionTarget?.command) {
      const reset = el('button', 'tree-control tree-policy-reset', '恢复默认');
      reset.type = 'button';
      reset.dataset.kind = 'command-policy-reset';
      reset.dataset.actionId = 'reset-command-policy';
      reset.title = `恢复默认（当前覆盖 ${row.overrideAction}）`;
      reset.addEventListener('click', () => {
        onControlActivate(
          {
            label: row.label,
            actionTarget: row.actionTarget as TreeActionTarget,
            ...(row.defaultAction ? { defaultAction: row.defaultAction } : {}),
          },
          { kind: 'command-policy', actionId: 'reset-command-policy', label: '恢复默认' },
        );
      });
      wrap.append(reset);
    }
    return wrap;
  }

  function renderNode(row: TreeRow): HTMLElement {
    const item = el('li', 'tree-node tree-row');
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-level', String(row.depth + 1));
    item.setAttribute('aria-selected', focusedId === row.id ? 'true' : 'false');
    item.tabIndex = focusedId === row.id ? 0 : -1;
    item.dataset.depth = String(row.depth);
    item.dataset.nodeId = row.id;
    item.dataset.kind = row.kind;
    item.dataset.testId = nodeTestId(row);
    if (row.dimension) item.dataset.dimension = row.dimension;
    if (row.kind === 'face') item.classList.add('tree-group');
    if (row.action) item.dataset.action = row.action;
    if (row.sourceKind) item.dataset.sourceKind = row.sourceKind;
    if (row.overridable === false) item.dataset.hardFloor = 'true';
    if (row.overridable === true) item.dataset.overridable = 'true';
    if (row.kind === 'command' && row.effectiveAction) item.dataset.effectiveAction = row.effectiveAction;

    const expandable = hasChildren(row);
    const expanded = expandable && isExpanded(row);
    if (expandable) item.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    const head = el('div', 'tree-node-head');
    if (expandable) {
      const toggle = el('button', 'tree-toggle', expanded ? '▾' : '▸');
      toggle.type = 'button';
      toggle.tabIndex = -1;
      toggle.setAttribute('aria-label', `${expanded ? '收起' : '展开'} ${row.label}`);
      toggle.dataset.toggleNodeId = row.id;
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleExpansion(row);
        focusedId = row.id;
        renderBody();
      });
      head.append(toggle);
    } else {
      const leaf = el('span', 'tree-toggle tree-toggle-leaf', '•');
      leaf.setAttribute('aria-hidden', 'true');
      head.append(leaf);
    }
    head.append(el('span', 'tree-label', row.label));
    if (row.badges.length > 0) {
      const badges = el('span', 'tree-badges');
      for (const badge of row.badges) {
        const badgeEl = el('span', 'tree-badge', badge.label);
        badgeEl.dataset.tone = badge.tone;
        badgeEl.dataset.kind = badge.kind;
        badges.append(badgeEl);
      }
      head.append(badges);
    }
    item.append(head);

    if (row.sublabel) item.append(el('div', 'tree-sublabel', row.sublabel));

    const controls = renderControls(row);
    if (controls) item.append(controls);

    // R2：硬底线行零控件 + 不可覆盖原因可读（FR-V2-077）。
    if (row.overridable === false && row.clampReasonLabel) {
      item.append(el('div', 'tree-clamp-reason', `不可覆盖：${row.clampReasonLabel}`));
    }

    if (row.revokeHint) item.append(el('div', 'tree-revoke-hint', row.revokeHint));
    if (row.crossRefs.length > 0) {
      item.append(el('div', 'tree-sublabel', `跨层引用：${row.crossRefs.join('；')}`));
    }

    if (expandable && expanded) {
      const group = el('ul', 'tree-children');
      group.setAttribute('role', 'group');
      for (const child of row.children) group.append(renderNode(child));
      item.append(group);
    } else if (row.kind === 'face' && !expandable) {
      item.append(el('div', 'tree-empty', row.emptyHint ?? '该维度当前无内容。'));
    }
    return item;
  }

  function rebuildMaps(model: TreeRenderModel): void {
    renderedById = new Map();
    parentById = new Map();
    for (const node of collectTreeRows(model)) {
      renderedById.set(node.id, node);
    }
    const walk = (row: TreeRow, parentId: string | undefined): void => {
      if (parentId) parentById.set(row.id, parentId);
      for (const child of row.children) walk(child, row.id);
    };
    walk(model.root, undefined);
  }

  function pathOf(id: string): string[] {
    const labels: string[] = [];
    let cursor: string | undefined = id;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = renderedById.get(cursor);
      if (!node) break;
      labels.unshift(node.label);
      cursor = parentById.get(cursor);
    }
    return labels;
  }

  function updateBreadcrumb(): void {
    const current = shell;
    if (!current) return;
    if (!focusedId) {
      current.breadcrumb.textContent = '连接树';
      return;
    }
    const labels = pathOf(focusedId);
    current.breadcrumb.textContent = labels.length > 0 ? labels.join(' › ') : '连接树';
  }

  function moveFocus(id: string): void {
    focusedId = id;
    const current = ensureShell();
    const items = [...current.body.querySelectorAll<HTMLElement>('li.tree-node')];
    for (const item of items) {
      const selected = item.dataset.nodeId === id;
      item.tabIndex = selected ? 0 : -1;
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    const target = items.find((item) => item.dataset.nodeId === id);
    if (target && typeof target.focus === 'function') target.focus();
    updateBreadcrumb();
  }

  function onTreeKeydown(event: KeyboardEvent): void {
    const current = shell;
    if (!current) return;
    const items = [...current.body.querySelectorAll<HTMLElement>('li.tree-node')];
    if (items.length === 0) return;
    const index = focusedId ? items.findIndex((item) => item.dataset.nodeId === focusedId) : -1;
    const row = focusedId ? renderedById.get(focusedId) : undefined;

    const focusAt = (i: number): void => {
      const next = items[Math.max(0, Math.min(items.length - 1, i))];
      if (next?.dataset.nodeId) moveFocus(next.dataset.nodeId);
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index < 0 ? 0 : index + 1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index < 0 ? 0 : index - 1);
        return;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        return;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        if (row && hasChildren(row) && !isExpanded(row)) {
          toggleExpansion(row);
          renderBody();
          moveFocus(row.id);
        } else {
          focusAt(index + 1);
        }
        return;
      case 'ArrowLeft':
        event.preventDefault();
        if (row && hasChildren(row) && isExpanded(row)) {
          toggleExpansion(row);
          renderBody();
          moveFocus(row.id);
        } else if (focusedId) {
          const parentId = parentById.get(focusedId);
          if (parentId) moveFocus(parentId);
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (row && hasChildren(row)) {
          toggleExpansion(row);
          renderBody();
          moveFocus(row.id);
        }
        return;
      default:
        return;
    }
  }

  // ── V2-4 archive sub-view (layered policy controls; same tree-ops path) ────

  function archiveField(name: string, text: string): HTMLElement {
    const node = el('div', 'tree-archive-field', text);
    node.dataset.field = name;
    return node;
  }

  function archivePolicyControls(card: ArchiveCard): HTMLElement | null {
    if (card.overridable !== true) return null;
    const wrap = el('div', 'tree-archive-policy-controls');
    const ctx: ActionContext = {
      label: card.subcommand ? `${card.name} ${card.subcommand}` : card.name,
      actionTarget: {
        command: { tool: card.name, ...(card.subcommand ? { subcommand: card.subcommand } : {}) },
        defaultAction: card.defaultAction,
      },
      defaultAction: card.defaultAction,
    };
    for (const action of POLICY_ACTIONS) {
      const button = el('button', 'tree-archive-policy', action);
      button.type = 'button';
      button.dataset.policy = action;
      button.dataset.archiveCommand = card.cardId;
      button.setAttribute('aria-pressed', card.effectiveAction === action ? 'true' : 'false');
      button.title = card.effectiveAction === action ? `当前生效档 ${action}` : `设为 ${action}`;
      button.addEventListener('click', () => {
        onControlActivate(ctx, { kind: 'command-policy', actionId: 'set-command-policy', policyAction: action, label: `设为 ${action}` });
      });
      wrap.append(button);
    }
    if (card.overrideAction) {
      const reset = el('button', 'tree-archive-policy-reset', '恢复默认');
      reset.type = 'button';
      reset.dataset.archiveReset = card.cardId;
      reset.title = `恢复默认（当前覆盖 ${card.overrideAction}）`;
      reset.addEventListener('click', () => {
        onControlActivate(ctx, { kind: 'command-policy', actionId: 'reset-command-policy', label: '恢复默认' });
      });
      wrap.append(reset);
    }
    return wrap;
  }

  function renderArchiveCard(card: ArchiveCard): HTMLElement {
    const node = el('div', 'tree-archive-card');
    node.dataset.cardId = card.cardId;
    node.dataset.action = card.action;
    node.dataset.sourceKind = card.sourceKind;
    if (card.risk) node.dataset.risk = card.risk;
    if (card.overridable === false) node.dataset.hardFloor = 'true';
    if (card.overridable === true) node.dataset.overridable = 'true';
    node.append(
      el('div', 'tree-archive-card-title', card.subcommand ? `${card.name} ${card.subcommand}` : card.name),
      archiveField('action', `处置（policy 默认档）：${card.action}`),
      archiveField('default-action', `默认档：${card.defaultAction}`),
      archiveField(
        'effective-action',
        `生效档：${card.effectiveAction}${card.overrideAction ? `（用户覆盖 ${card.overrideAction}）` : '（= 默认档，无覆盖）'}`,
      ),
    );
    if (card.clampReasonLabel) {
      node.append(archiveField('clamp-reason', `不可覆盖：${card.clampReasonLabel}`));
    }
    if (card.denyCauseLabel) {
      node.append(archiveField('deny-cause', `deny 成因（policy 层）：${card.denyCauseLabel}`));
    }
    node.append(archiveField('auto-auth', card.autoAuthLabel));
    node.append(
      archiveField(
        'source',
        card.origin ? `来源：${card.sourceKind}（站点 ${card.origin}）` : `来源：${card.sourceKind}`,
      ),
    );
    node.append(archiveField('delay-ms', `命令间隔 delayMs=${card.delayMs}ms（与 delay 档无关）`));
    if (card.suppressed) {
      node.append(archiveField('suppressed', `抑制：${card.suppressionReason ?? '当前不在工具面'}`));
    }
    if (card.badges.length > 0) {
      const badges = el('div', 'tree-archive-badges');
      for (const badge of card.badges) {
        const badgeEl = el('span', 'tree-archive-badge', badge.label);
        badgeEl.dataset.tone = badge.tone;
        badgeEl.dataset.kind = badge.kind;
        badges.append(badgeEl);
      }
      node.append(badges);
    }
    const controls = archivePolicyControls(card);
    if (controls) node.append(controls);
    return node;
  }

  function renderArchive(): void {
    const current = ensureShell();
    if (!snapshot) return;
    const model = buildArchiveModel(snapshot, archiveFilter);
    current.body.replaceChildren();
    current.count.textContent = `档案：${model.filter.matches} / ${model.header.liveCounts.cards} 卡（分层：硬底线无控件 + 原因；可覆盖行可设 allow/ask/deny）`;

    const wrap = el('div', 'tree-archive');
    wrap.dataset.groupBy = model.filter.groupBy;
    wrap.dataset.liveTools = String(model.header.liveCounts.tools);
    wrap.dataset.liveSubs = String(model.header.liveCounts.subcommands);
    wrap.dataset.liveCards = String(model.header.liveCounts.cards);

    const header = el('div', 'tree-archive-header');
    header.append(
      el('div', 'tree-archive-title', model.header.title),
      el('div', 'tree-archive-live', model.header.liveLabel),
      el('div', 'tree-archive-baseline', model.header.baselineLabel),
      el('div', 'tree-archive-parity', model.header.parityLabel),
      el('div', 'tree-archive-readonly', model.header.readOnlyLabel),
      el('div', 'tree-archive-noexag', model.notes.noExaggerationNote),
      el(
        'div',
        'tree-archive-note-ref',
        'delay 档消歧声明见上方「不是提权面」区块（同一措辞源，档案不重复渲染）。',
      ),
    );
    const siteCards = model.cards.filter((card) => card.sourceKind === 'site-declared');
    header.append(
      el(
        'div',
        'tree-archive-site-count',
        siteCards.length > 0
          ? `站点声明卡 ${siteCards.length} 张（每张标注所属 origin）`
          : '站点声明卡 0 张（当前无站点声明工具；绑定并授权站点后出现 site_* 卡）',
      ),
    );
    wrap.append(header);

    for (const group of model.groups) {
      const section = el('div', 'tree-archive-group');
      section.dataset.groupKey = group.key;
      section.append(el('div', 'tree-archive-group-title', `${group.label}（${group.count}）`));
      if (group.cards.length === 0) {
        section.append(el('div', 'tree-empty', '该分组在当前过滤条件下无卡。'));
      } else {
        for (const card of group.cards) section.append(renderArchiveCard(card));
      }
      wrap.append(section);
    }
    if (model.cards.length === 0) {
      wrap.append(el('div', 'tree-empty', '当前过滤条件下无档案卡（只读过滤，不改任何授权状态）。'));
    }
    current.body.append(wrap);
    current.breadcrumb.textContent = '命令档案（分层）';
  }

  function setArchiveEnabled(next: boolean): void {
    archiveEnabled = next;
    const current = ensureShell();
    current.archiveToggle.setAttribute('aria-pressed', next ? 'true' : 'false');
    current.archiveToggle.textContent = next ? '关闭命令档案' : '查看命令档案（分层）';
    current.archiveDetail.hidden = !next;
    current.filterInput.disabled = next;
    renderBody();
  }

  function renderBody(): void {
    const current = ensureShell();
    current.body.replaceChildren();
    filterActive = false;

    if (!snapshot) {
      current.body.append(
        el('div', 'tree-empty', '连接树尚未加载：点击左下角「连接树」按钮按需拉取（关闭态不渲染、不轮询）。'),
      );
      current.count.textContent = '';
      return;
    }

    if (archiveEnabled) {
      renderArchive();
      return;
    }

    const model = buildTreeRows(snapshot, filter);
    rebuildMaps(model);
    current.count.textContent = model.filter.query
      ? `过滤命中 ${model.filter.matches} 个节点（只读：不改任何授权状态）`
      : `共 ${model.filter.matches} 个节点（真层级树，按归属逐层展开）`;

    if (model.degradations.length > 0) {
      const degradations = el('div', 'tree-degradations');
      for (const item of model.degradations) {
        degradations.append(el('div', 'tree-degradation', item.text));
      }
      current.body.append(degradations);
    }

    const filterActiveNow =
      Boolean(model.filter.query) ||
      filter.action !== undefined ||
      filter.sourceKind !== undefined ||
      filter.dimension !== undefined;
    filterActive = filterActiveNow;
    if (filterActiveNow && model.filter.matches === 0) {
      current.body.append(el('div', 'tree-empty', '当前过滤条件下无命中节点（只读过滤，不改任何授权状态）。'));
      current.breadcrumb.textContent = '连接树';
      return;
    }

    const tree = el('ul', 'tree');
    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-label', '连接树：按归属逐层展开');
    tree.append(renderNode(model.root));
    current.body.append(tree);

    // roving tabindex：优先保持原焦点；否则落到第一个可见节点。
    const items = [...current.body.querySelectorAll<HTMLElement>('li.tree-node')];
    if (items.length > 0) {
      const keep = focusedId && items.some((item) => item.dataset.nodeId === focusedId);
      const targetId = keep && focusedId ? focusedId : items[0]!.dataset.nodeId!;
      focusedId = targetId;
      for (const item of items) {
        const selected = item.dataset.nodeId === targetId;
        item.tabIndex = selected ? 0 : -1;
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
      }
    }
    updateBreadcrumb();
  }

  function renderError(message: string): void {
    const current = ensureShell();
    current.body.replaceChildren();
    current.body.append(el('div', 'tree-error', message));
    current.count.textContent = '';
    current.breadcrumb.textContent = '连接树';
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  async function refresh(): Promise<void> {
    // Lazy: never pull before the FAB was first opened.
    if (!opened && !loaded) return;
    let next: ConnectTreeSnapshot | null = null;
    try {
      next = await deps.ops.pull();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      renderError(`连接树拉取失败：${message}`);
      notice(`连接树拉取失败：${message}`);
      return;
    }
    if (!next) {
      renderError('连接树拉取失败：后台未返回快照（不显示陈旧状态）');
      notice('连接树拉取失败：后台未返回快照');
      return;
    }
    snapshot = next;
    loaded = true;
    renderBody();
  }

  async function open(): Promise<void> {
    if (!opened) {
      opened = true;
      root.hidden = false;
      setExpanded(true);
    }
    if (!loaded) await refresh();
  }

  function close(): void {
    if (!opened) return;
    opened = false;
    root.hidden = true;
    setExpanded(false);
    if (typeof fab.focus === 'function') fab.focus();
  }

  async function toggle(): Promise<void> {
    if (opened) close();
    else await open();
  }

  function setFilter(next: TreeFilter): void {
    filter = { ...filter, ...next };
    if (shell && next.query !== undefined) shell.filterInput.value = next.query;
    renderBody();
  }

  // ── wiring ────────────────────────────────────────────────────────────────

  root.hidden = true;
  setExpanded(false);
  fab.addEventListener('click', () => {
    void toggle();
  });
  doc.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  });

  return {
    open,
    close,
    toggle,
    refresh,
    setFilter,
    isOpen: () => opened,
    isLoaded: () => loaded,
  };
}
