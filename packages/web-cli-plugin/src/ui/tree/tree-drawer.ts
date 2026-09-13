/**
 * V2-2 连接树 DOM 挂载（FR-V2-020/021/022/024；ADR-V2-004 / ADR-V2-005）。
 *
 * 惰性 + 零注入：抽屉是 `#panel-main` 的覆盖层；**首次点开 FAB 才**拉取
 * `insight-tree` 并建 DOM；关闭态 `[hidden]` → 无渲染、无轮询（NFR-V22-005）。
 * 渲染只用 `createElement` / `textContent`（**零标记字符串注入**，防 XSS，与 v1
 * 消息渲染一致）。
 *
 * 本模块**不做任何写操作**：控件以只读 `ControlDescriptor` 呈现（V2-3 才接线）。
 * `deny` 行 `controls===[]`，故结构上不存在可开关/可覆盖的入口（ADR-V2-011）。
 *
 * 键盘可达：FAB `aria-expanded` 同步；Esc 关闭；关闭后焦点回归 FAB。
 */
import {
  TREE_MODEL_NOTE,
  TREE_NO_ESCALATION_NOTE,
  buildTreeRows,
  confirmationSummary,
  needsConfirmation,
  type TreeActionTarget,
  type TreeFilter,
  type TreeRow,
} from './tree-view.js';
import type { TreeActionOutcome, TreeActionRequest } from './tree-ops.js';
import type { ConnectTreeSnapshot, ControlDescriptor } from '../../insight/tree-model.js';

export interface TreeDrawerOps {
  /** 拉取完整快照（sidepanel 侧 = `insight-tree` pull）。 */
  pull: () => Promise<ConnectTreeSnapshot | null>;
}

/**
 * V2-3 动作执行器（`tree-ops`）。缺省时抽屉退化为**只读**（V2-2 行为，控件为只读披露）。
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
  filterInput: HTMLInputElement;
  /** V2-3 ①③：回执 + 审计入口（`role=status aria-live=polite`）。 */
  receipt: HTMLElement;
  /** V2-3：抽屉内联二次确认（ADR-V2-013）。 */
  confirm: HTMLElement;
}

export function mountTreeDrawer(deps: TreeDrawerDeps): TreeDrawerHandle {
  const { root, fab, doc } = deps;

  let snapshot: ConnectTreeSnapshot | null = null;
  let filter: TreeFilter = {};
  let loaded = false;
  let opened = false;
  let shell: Shell | null = null;

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

  // ── rendering (textContent / createElement only) ──────────────────────────

  function ensureShell(): Shell {
    if (shell) return shell;
    root.replaceChildren();

    const header = el('div', 'tree-header');
    const title = el('span', 'tree-title', '连接树 · 四维度总览（站点 / 能力 / 命令 / LLM）');
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

    root.append(header, notes, filterWrap, receipt, confirm, body);
    shell = { body, count, filterInput, receipt, confirm };
    return shell;
  }

  // ── V2-3 actions: confirm (fail-closed) + execute + 三件套回执 ─────────────

  /** 可读作用对象标签（不携带任何明文材料）。 */
  function targetLabel(row: TreeRow): string {
    const target: TreeActionTarget | undefined = row.actionTarget;
    if (target?.origin) return `站点 ${target.origin}`;
    if (target?.capability) return `能力「${row.label}」`;
    if (target?.groupId) return `会话组 ${target.groupId}`;
    return row.label;
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

  async function executeAction(row: TreeRow, control: ControlDescriptor): Promise<void> {
    if (!deps.actions || !control.actionId) {
      notice('连接树未接线动作执行器（只读模式）：未执行任何操作。');
      return;
    }
    const req: TreeActionRequest = {
      actionId: control.actionId,
      ...(row.actionTarget ? { target: row.actionTarget } : {}),
      ...(row.actionTool ? { toolHint: row.actionTool } : {}),
      // 只有需要确认的动作会经 `#tree-confirm` 接受路径到达这里；显式确认。
      confirmed: true,
    };
    let outcome: TreeActionOutcome;
    try {
      outcome = await deps.actions.run(req);
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

  function askConfirm(row: TreeRow, control: ControlDescriptor): void {
    if (!control.actionId) return;
    const summary = confirmationSummary(control.actionId, targetLabel(row));
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
      void executeAction(row, control);
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

  function onControlActivate(row: TreeRow, control: ControlDescriptor): void {
    if (!control.actionId) return;
    if (needsConfirmation(control.actionId)) askConfirm(row, control);
    else void executeAction(row, control);
  }

  function renderRow(row: TreeRow): HTMLElement {
    const wrap = el('div', 'tree-row');
    wrap.dataset.depth = String(row.depth);
    wrap.dataset.nodeId = row.id;
    wrap.dataset.dimension = row.dimension;
    if (row.action) wrap.dataset.action = row.action;
    if (row.sourceKind) wrap.dataset.sourceKind = row.sourceKind;

    wrap.append(el('div', 'tree-label', row.label));
    if (row.sublabel) wrap.append(el('div', 'tree-sublabel', row.sublabel));

    if (row.badges.length > 0) {
      const badges = el('div', 'tree-badges');
      for (const badge of row.badges) {
        const item = el('span', 'tree-badge', badge.label);
        item.dataset.tone = badge.tone;
        item.dataset.kind = badge.kind;
        badges.append(item);
      }
      wrap.append(badges);
    }

    // ADR-V2-011: a `deny` command carries `controls === []`, so this block is
    // never reached for it — the deny row cannot render an actionable control.
    if (row.controls.length > 0) {
      const controls = el('div', 'tree-controls');
      for (const control of row.controls) {
        const actionable = control.kind !== 'none' && Boolean(control.actionId) && Boolean(deps.actions);
        if (!actionable) {
          // 只读披露（命令级 `none`、或抽屉未接线动作执行器时）：非交互元素。
          const item = el('span', 'tree-control', control.label);
          item.dataset.kind = control.kind;
          if (control.actionId) item.dataset.actionId = control.actionId;
          controls.append(item);
          continue;
        }
        const button = el('button', 'tree-control', control.label);
        button.type = 'button';
        button.dataset.kind = control.kind;
        button.dataset.actionId = control.actionId as string;
        button.addEventListener('click', () => {
          onControlActivate(row, control);
        });
        controls.append(button);
      }
      wrap.append(controls);
    }

    if (row.revokeHint) wrap.append(el('div', 'tree-revoke-hint', row.revokeHint));
    if (row.crossRefs.length > 0) {
      wrap.append(el('div', 'tree-sublabel', `跨层引用：${row.crossRefs.join('；')}`));
    }
    return wrap;
  }

  function renderBody(): void {
    const current = ensureShell();
    current.body.replaceChildren();

    if (!snapshot) {
      current.body.append(
        el('div', 'tree-empty', '连接树尚未加载：点击左下角「连接树」按钮按需拉取（关闭态不渲染、不轮询）。'),
      );
      current.count.textContent = '';
      return;
    }

    const model = buildTreeRows(snapshot, filter);
    current.count.textContent = model.filter.query
      ? `过滤命中 ${model.filter.matches} 行（只读：不改任何授权状态）`
      : `共 ${model.filter.matches} 行（只读投影）`;

    if (model.degradations.length > 0) {
      const degradations = el('div', 'tree-degradations');
      for (const item of model.degradations) {
        degradations.append(el('div', 'tree-degradation', item.text));
      }
      current.body.append(degradations);
    }

    for (const group of model.groups) {
      const section = el('div', 'tree-group');
      section.dataset.dimension = group.dimension;
      const heading = el('div', 'tree-group-title');
      heading.append(
        el('span', 'tree-group-name', group.label),
        el('span', 'tree-group-count', `（${group.count}）`),
      );
      section.append(heading);
      if (group.rows.length === 0) {
        section.append(el('div', 'tree-empty', group.emptyHint));
      } else {
        for (const row of group.rows) section.append(renderRow(row));
      }
      current.body.append(section);
    }
  }

  function renderError(message: string): void {
    const current = ensureShell();
    current.body.replaceChildren();
    current.body.append(el('div', 'tree-error', message));
    current.count.textContent = '';
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
