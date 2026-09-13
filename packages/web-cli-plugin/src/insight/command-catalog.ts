/**
 * V2-1 CLI 命令档案投影（FR-V2-013 / ADR-V2-011 / ADR-V2-012 / ADR-V2-014）。
 *
 * 对注入的 `ToolSurfaceEntry[]`（工具面真值）逐条有档：每个工具一个工具节点
 * （`cmd:<name>`）+ 每个子命令一个子命令节点（`cmd:<name>#<sub>`）。**不复制真值**：
 * `action` 由 `PLUGIN_RISK_DEFAULTS` + S1/S3 + 开关抑制态推导，`risk` 取 base registry
 * 的 effective risk（`subcommandRisks[sub] ?? risk`）。
 *
 * 结构保证（ADR-V2-011）：**`action==='deny'` ⇒ `controls === []`**（`deny`/`delay` 不可
 * 渲染成可关开关）；命令级**无任何写入动作**（V2-3 动作表不含命令级条目）。
 *
 * 纯投影：零 IO、零 chrome 接口、零写 store、零明文。
 */
import type { PolicyAction, ToolRisk } from '@lgdl/web-cli-base';
import { isToolRisk } from '../protocol/descriptor.js';
import { PLUGIN_RISK_DEFAULTS, PLUGIN_SITE_GROUP } from '../security/policy.js';
import {
  BOOKMARKS_SUBCOMMAND_RISKS,
  BOOKMARKS_SUBCOMMANDS,
  BOOKMARKS_TOOL_NAME,
} from '../tools/bookmarks-tools.js';
import { CLIPBOARD_SUBCOMMAND_RISKS, CLIPBOARD_SUBCOMMANDS, CLIPBOARD_TOOL_NAME } from '../tools/clipboard-tools.js';
import { DOWNLOADS_SUBCOMMAND_RISKS, DOWNLOADS_SUBCOMMANDS, DOWNLOADS_TOOL_NAME } from '../tools/downloads-tools.js';
import { NOTIFY_SUBCOMMAND_RISKS, NOTIFY_SUBCOMMANDS, NOTIFY_TOOL_NAME } from '../tools/notify-tools.js';
import { TABS_SUBCOMMAND_RISKS, TABS_SUBCOMMANDS, TABS_TOOL_NAME } from '../tools/tabs-tools.js';
import {
  STABLE_KEY,
  normalizeStableOrigin,
  type Badge,
  type CommandNode,
  type ControlDescriptor,
  type CrossLink,
  type DenyCause,
  type SourceKind,
} from './tree-model.js';

/** 注入的平面工具面条目（由 background 从 `deriveTools()` + `router.query` 组装）。 */
export interface ToolSurfaceEntry {
  name: string;
  group?: string;
  risk?: ToolRisk;
  subcommandRisks?: Record<string, ToolRisk>;
  subcommands: string[];
  /** 是否出现在当前 `deriveTools()` 工具面（false ⇒ 被开关/授权状态抑制）。 */
  presentInSurface: boolean;
  suppressionReason?: string;
}

export interface CommandCatalogDeps {
  /** 命令间 `delayMs` 真值（来自 `host.delayConfig()`；ADR-V2-014）。 */
  delayMs: number;
  /** 当前活跃站点 origin（site 工具的 S1 判据）。 */
  activeOrigin?: string;
  /** 站点是否已授权（S1）。缺省视为未授权（fail-closed）。 */
  isOriginAuthorized?: (origin: string) => boolean;
}

/** 命令来源分类（8 值；FR-V2-055 / ADR-V2-012 预留）。 */
export function sourceKindOf(name: string): SourceKind {
  if (name.startsWith('site_')) return 'site-declared';
  if (name.startsWith('admin_')) return 'plugin-admin';
  if (name === TABS_TOOL_NAME) return 'plugin-tabs';
  if (name === BOOKMARKS_TOOL_NAME) return 'plugin-bookmarks';
  if (name === DOWNLOADS_TOOL_NAME) return 'plugin-downloads';
  if (name === NOTIFY_TOOL_NAME) return 'plugin-notify';
  if (name === CLIPBOARD_TOOL_NAME) return 'plugin-clipboard';
  return 'base-builtin';
}

interface ActionDecision {
  action: PolicyAction;
  denyCause?: DenyCause;
  /** 硬底线语境（evaluate/未知 risk）：仅作徽标，不改变 `action` 真值。 */
  hardDeny: boolean;
}

/**
 * 推导单条命令的处置档。
 *
 *   site 工具：S1（未授权/无 origin → deny）→ S3（risk 缺失/非法 → deny）→
 *              evaluate（→ deny）→ `PLUGIN_RISK_DEFAULTS`；
 *   非 site ：S3（缺失/非法 → deny）→ evaluate（→ deny）→ `PLUGIN_RISK_DEFAULTS`。
 */
export function deriveAction(input: {
  group?: string;
  risk?: ToolRisk;
  isSiteOriginAuthorized: boolean;
}): ActionDecision {
  const isSite = input.group === PLUGIN_SITE_GROUP;
  if (isSite && !input.isSiteOriginAuthorized) {
    return { action: 'deny', denyCause: 's1-unauthorized', hardDeny: false };
  }
  if (input.risk === undefined || !isToolRisk(input.risk)) {
    return { action: 'deny', denyCause: 's3-unknown-risk', hardDeny: true };
  }
  if (input.risk === 'evaluate') {
    return { action: 'deny', denyCause: 'evaluate-floor', hardDeny: true };
  }
  const action = PLUGIN_RISK_DEFAULTS[input.risk];
  if (action === undefined) {
    return { action: 'deny', denyCause: 's3-unknown-risk', hardDeny: true };
  }
  return { action, hardDeny: false };
}

function actionBadge(action: PolicyAction): Badge {
  if (action === 'allow') return { kind: 'action-allow', label: 'allow（默认放行）', tone: 'ok' };
  if (action === 'ask') return { kind: 'action-ask', label: 'ask（需确认）', tone: 'warn' };
  return { kind: 'action-deny', label: 'deny / delay（fail-closed，不可放宽）', tone: 'danger' };
}

function suppressionFallback(entry: ToolSurfaceEntry): string {
  const source = sourceKindOf(entry.name);
  if (entry.group === PLUGIN_SITE_GROUP) return '站点未授权或未绑定：该站点工具暂不在工具面中';
  if (source === 'plugin-tabs') return 'tabs 开关已关闭：工具面已移除 tabs';
  if (source === 'plugin-bookmarks') return '书签能力未授权或读写开关均已关闭：工具面已移除 bookmarks';
  if (source === 'plugin-downloads') return '下载记录能力未授权或开关已关闭：工具面已移除 downloads';
  if (source === 'plugin-notify') return '通知能力未授权或开关已关闭：工具面已移除 notify';
  if (source === 'plugin-clipboard') return '剪贴板能力未授权或读写开关均已关闭：工具面已移除 clipboard';
  return '该命令当前不在工具面中';
}

function crossLinksFor(name: string, id: string, sourceKind: SourceKind, activeOrigin?: string): CrossLink[] {
  const links: CrossLink[] = [];
  if (sourceKind === 'site-declared' && activeOrigin) {
    const siteId = STABLE_KEY.site(activeOrigin);
    links.push({ id: STABLE_KEY.link(id, siteId), from: id, to: siteId, kind: 'origin', label: '来源站点（展示用，不构成授权）' });
  }
  const capabilityTool: Partial<Record<string, string>> = {
    [TABS_TOOL_NAME]: 'cap:static:tabs',
    [BOOKMARKS_TOOL_NAME]: 'cap:opt:bookmarks',
    [DOWNLOADS_TOOL_NAME]: 'cap:opt:downloads',
    [NOTIFY_TOOL_NAME]: 'cap:opt:notify',
    [CLIPBOARD_TOOL_NAME]: 'cap:opt:clipboard',
  };
  const target = capabilityTool[name];
  if (target) links.push({ id: STABLE_KEY.link(id, target), from: id, to: target, kind: 'permission', label: '依赖权限/能力' });
  return links;
}

/** 命令级控件：**无任何写入路径**；`deny` ⇒ `[]`（ADR-V2-011）。 */
function controlsFor(action: PolicyAction): ControlDescriptor[] {
  if (action === 'deny') return [];
  return [{ kind: 'none', label: '只读展示：命令级策略不可在树内修改（不提供命令级写入）' }];
}

function makeCommandNode(
  entry: ToolSurfaceEntry,
  subcommand: string | undefined,
  risk: ToolRisk | undefined,
  deps: CommandCatalogDeps,
): CommandNode {
  const id = STABLE_KEY.command(entry.name, subcommand);
  const sourceKind = sourceKindOf(entry.name);
  const origin = deps.activeOrigin;
  const isSiteOriginAuthorized = origin ? deps.isOriginAuthorized?.(origin) === true : false;
  const decision = deriveAction({ group: entry.group, risk, isSiteOriginAuthorized });
  const suppressed = entry.presentInSurface !== true;
  const badges: Badge[] = [actionBadge(decision.action)];
  if (decision.hardDeny) badges.push({ kind: 'hard-deny', label: '硬底线：不可放行', tone: 'danger' });
  if (suppressed) badges.push({ kind: 'suppressed', label: '已抑制（不在工具面）', tone: 'muted' });
  return {
    id,
    kind: 'command',
    cardId: id,
    name: entry.name,
    ...(subcommand ? { subcommand } : {}),
    group: entry.group ?? '',
    ...(risk ? { risk } : {}),
    action: decision.action,
    ...(decision.denyCause ? { denyCause: decision.denyCause } : {}),
    sourceKind,
    delayMs: deps.delayMs,
    presentInSurface: entry.presentInSurface === true,
    suppressed,
    ...(suppressed ? { suppressionReason: entry.suppressionReason ?? suppressionFallback(entry) } : {}),
    badges,
    crossLinks: crossLinksFor(entry.name, id, sourceKind, origin),
    controls: controlsFor(decision.action),
  };
}

/**
 * 投影全部命令节点（工具节点 + 子命令节点，保持注入序 + 子命令 enum 序）。
 * 同输入 → 同输出（确定性）。
 */
export function projectCommands(entries: readonly ToolSurfaceEntry[], deps: CommandCatalogDeps): CommandNode[] {
  const out: CommandNode[] = [];
  for (const entry of entries) {
    out.push(makeCommandNode(entry, undefined, entry.risk, deps));
    for (const sub of entry.subcommands) {
      const risk = entry.subcommandRisks?.[sub] ?? entry.risk;
      out.push(makeCommandNode(entry, sub, risk, deps));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 当前被开关/授权状态抑制的能力工具（背景侧传入实时状态；纯函数）
// ---------------------------------------------------------------------------

export interface CapabilitySurfaceState {
  tabsEnabled: boolean;
  toggles: {
    bookmarksRead: boolean;
    bookmarksWrite: boolean;
    downloadsRead: boolean;
    notify: boolean;
    clipboardRead: boolean;
    clipboardWrite: boolean;
  };
  /** 权限撤销导致的抑制标记（`host.isCapabilitySuppressed`）。 */
  suppressed: Record<'bookmarks' | 'downloads' | 'notify' | 'clipboard', boolean>;
}

function capabilityEntry(
  name: string,
  group: string,
  risk: ToolRisk,
  subcommandRisks: Record<string, ToolRisk>,
  subcommands: readonly string[],
  reason: string,
): ToolSurfaceEntry {
  return {
    name,
    group,
    risk,
    subcommandRisks,
    subcommands: [...subcommands],
    presentInSurface: false,
    suppressionReason: reason,
  };
}

/**
 * 合成「当前不在工具面」的能力工具条目（`presentInSurface:false` + 可读原因）。
 *
 * 与 host 的注册规则同源：整工具被移除 ⇔ 开关全关 / 权限撤销抑制 / `tabs` 开关关闭。
 * 仅消费 tool 模块导出的子命令/风险常量，不复制注册逻辑。
 */
export function suppressedCapabilitySurface(state: CapabilitySurfaceState): ToolSurfaceEntry[] {
  const out: ToolSurfaceEntry[] = [];
  if (!state.tabsEnabled) {
    out.push(capabilityEntry(TABS_TOOL_NAME, 'plugin', 'write', TABS_SUBCOMMAND_RISKS, TABS_SUBCOMMANDS, 'tabs 开关已关闭：工具面已移除 tabs'));
  }
  const bookmarksOff = (!state.toggles.bookmarksRead && !state.toggles.bookmarksWrite) || state.suppressed.bookmarks;
  if (bookmarksOff) {
    out.push(capabilityEntry(BOOKMARKS_TOOL_NAME, 'plugin', 'write', BOOKMARKS_SUBCOMMAND_RISKS, BOOKMARKS_SUBCOMMANDS, '书签读写开关均已关闭或权限已撤销：工具面已移除 bookmarks'));
  }
  if (!state.toggles.downloadsRead || state.suppressed.downloads) {
    out.push(capabilityEntry(DOWNLOADS_TOOL_NAME, 'plugin', 'read', DOWNLOADS_SUBCOMMAND_RISKS, DOWNLOADS_SUBCOMMANDS, '下载记录开关已关闭或权限已撤销：工具面已移除 downloads'));
  }
  if (!state.toggles.notify || state.suppressed.notify) {
    out.push(capabilityEntry(NOTIFY_TOOL_NAME, 'plugin', 'write', NOTIFY_SUBCOMMAND_RISKS, NOTIFY_SUBCOMMANDS, '通知开关已关闭或权限已撤销：工具面已移除 notify'));
  }
  const clipboardOff = (!state.toggles.clipboardRead && !state.toggles.clipboardWrite) || state.suppressed.clipboard;
  if (clipboardOff) {
    out.push(capabilityEntry(CLIPBOARD_TOOL_NAME, 'plugin', 'state', CLIPBOARD_SUBCOMMAND_RISKS, CLIPBOARD_SUBCOMMANDS, '剪贴板读写开关均已关闭或权限已撤销：工具面已移除 clipboard'));
  }
  return out;
}
