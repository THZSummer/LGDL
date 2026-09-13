/**
 * V2-1 浏览器能力面目录（FR-V2-012 / ADR-V2-011 / ADR-V2-012）。
 *
 * 覆盖三类能力节点（固定序）：
 *   1. **静态权限**（manifest `permissions` 5 项）：`source:'static'`、`granted:true`、
 *      **`revocable:false`**、`controls` **不含** `revoke`（如实披露不可逐项撤销）；
 *   2. **可选能力**（`optional_permissions` 4 个）：`source:'optional'`、`granted` 为注入的
 *      实测态（**不由隐私开关决定**）、`revocable:true`；
 *   3. **隐私开关**（capability-setting 6 个 + `tabs` 开关）：`source:'toggle'`、`enabled`
 *      为真值、`controls` 给可逆 `toggle`。
 *
 * 纯投影：**零 IO、零 chrome 接口、零写 store、零明文**（实测权限由 deps 注入）。
 */
import {
  OPTIONAL_CAPABILITIES,
  OPTIONAL_CAPABILITY_LABEL,
  permissionsOf,
  type OptionalCapability,
} from '../platform/capability-permissions.js';
import {
  STABLE_KEY,
  type Badge,
  type CapabilityNode,
  type ControlDescriptor,
  type CrossLink,
} from './tree-model.js';

/** manifest 静态权限面（5 项，固定声明序；零新增 / 零改动）。 */
export const STATIC_PERMISSIONS: readonly string[] = ['activeTab', 'scripting', 'storage', 'sidePanel', 'tabs'];

/** 每个静态权限的可读标签（仅展示，不构成权限语义）。 */
export const STATIC_PERMISSION_LABELS: Readonly<Record<string, string>> = {
  activeTab: '当前标签页临时访问（activeTab）',
  scripting: '脚本注入（scripting）',
  storage: '本地存储（storage）',
  sidePanel: '侧边栏（sidePanel）',
  tabs: '标签页访问（tabs）',
};

/** 静态权限不可逐项撤销的如实披露（FR-V2-038 / ADR-V2-011）。 */
export const STATIC_PERMISSION_REVOKE_HINT =
  '静态权限不可逐项撤销（需停用/卸载扩展）；可用隐私开关收敛工具面';

/** capability-setting 的 6 个隐私开关键（键序 = `CAPABILITY_SETTING_DEFAULTS` 声明序）。 */
export const CAPABILITY_TOGGLE_KEYS = [
  'bookmarksRead',
  'bookmarksWrite',
  'downloadsRead',
  'notify',
  'clipboardRead',
  'clipboardWrite',
] as const;

export type CapabilityToggleKey = (typeof CAPABILITY_TOGGLE_KEYS)[number];

export interface CapabilityToggleState {
  bookmarksRead: boolean;
  bookmarksWrite: boolean;
  downloadsRead: boolean;
  notify: boolean;
  clipboardRead: boolean;
  clipboardWrite: boolean;
}

/** `tabs` 开关的稳定键后缀（`toggle:tabs-enabled`）。 */
export const TABS_TOGGLE_KEY = 'tabs-enabled';

export interface CapabilityCatalogDeps {
  /** 可选能力实测权限态（来自扩展页/chrome permissions.contains，由调用方注入）。 */
  grants: Record<OptionalCapability, boolean>;
  /** 6 个隐私开关真值。 */
  toggles: CapabilityToggleState;
  /** `tabs` 开关真值。 */
  tabsEnabled: boolean;
}

export interface ToggleSpec {
  key: CapabilityToggleKey;
  label: string;
  capability: OptionalCapability;
  scope: 'read' | 'write';
  permissionRefs: string[];
}

/** 6 个隐私开关与可选能力/权限的映射（与 capability-setting 同源，测试同源锚定）。 */
export const CAPABILITY_TOGGLE_SPECS: readonly ToggleSpec[] = [
  { key: 'bookmarksRead', label: '书签读取（list/search/tree）', capability: 'bookmarks', scope: 'read', permissionRefs: ['bookmarks'] },
  { key: 'bookmarksWrite', label: '书签写入（add/remove/move）', capability: 'bookmarks', scope: 'write', permissionRefs: ['bookmarks'] },
  { key: 'downloadsRead', label: '下载记录读取（list/search）', capability: 'downloads', scope: 'read', permissionRefs: ['downloads'] },
  { key: 'notify', label: '系统通知（list/send/clear）', capability: 'notify', scope: 'write', permissionRefs: ['notifications'] },
  { key: 'clipboardRead', label: '剪贴板读取（read）', capability: 'clipboard', scope: 'read', permissionRefs: ['clipboardRead', 'clipboardWrite'] },
  { key: 'clipboardWrite', label: '剪贴板写入（write）', capability: 'clipboard', scope: 'write', permissionRefs: ['clipboardRead', 'clipboardWrite'] },
] as const;

function badge(kind: Badge['kind'], label: string, tone: Badge['tone']): Badge {
  return { kind, label, tone };
}

function permissionCrossLink(from: string, to: string, label: string): CrossLink {
  return { id: STABLE_KEY.link(from, to), from, to, kind: 'permission', label };
}

/** 投影静态权限节点（`revocable:false`；`controls` 不含 `revoke`）。 */
function projectStaticPermissions(): CapabilityNode[] {
  return STATIC_PERMISSIONS.map((permission) => {
    const id = STABLE_KEY.staticCapability(permission);
    return {
      id,
      kind: 'capability' as const,
      source: 'static' as const,
      permission,
      permissionRefs: [permission],
      label: STATIC_PERMISSION_LABELS[permission] ?? permission,
      granted: true,
      enabled: true,
      revocable: false,
      revokeHint: STATIC_PERMISSION_REVOKE_HINT,
      badges: [badge('granted', '已授予（静态）', 'ok')],
      crossLinks: [],
      // ADR-V2-011：静态权限永不提供 revoke 控件。
      controls: [],
    };
  });
}

/** 投影可选能力节点（`granted` = 实测；`revocable:true`）。 */
function projectOptionalCapabilities(grants: Record<OptionalCapability, boolean>): CapabilityNode[] {
  return OPTIONAL_CAPABILITIES.map((cap) => {
    const id = STABLE_KEY.optionalCapability(cap);
    const granted = grants[cap] === true;
    const controls: ControlDescriptor[] = granted
      ? [{ kind: 'revoke', actionId: 'revoke-capability', label: '撤销该能力的权限（可重新授予）' }]
      : [];
    return {
      id,
      kind: 'capability' as const,
      source: 'optional' as const,
      capability: cap,
      permission: cap,
      permissionRefs: permissionsOf(cap),
      label: OPTIONAL_CAPABILITY_LABEL[cap],
      granted,
      enabled: granted,
      revocable: true,
      badges: [
        granted
          ? badge('granted', '已授予（可选）', 'ok')
          : badge('not-granted', '未授予', 'muted'),
        badge('revocable', '可撤销', 'warn'),
      ],
      crossLinks: [],
      controls,
    };
  });
}

/** 投影 6 个隐私开关节点（`controls` 给可逆 `toggle`）。 */
function projectPrivacyToggles(toggles: CapabilityToggleState): CapabilityNode[] {
  return CAPABILITY_TOGGLE_SPECS.map((spec) => {
    const id = STABLE_KEY.toggle(spec.key);
    const capabilityId = STABLE_KEY.optionalCapability(spec.capability);
    const enabled = toggles[spec.key] === true;
    return {
      id,
      kind: 'capability' as const,
      source: 'toggle' as const,
      capability: spec.capability,
      scope: spec.scope,
      permission: spec.capability,
      permissionRefs: spec.permissionRefs,
      label: spec.label,
      granted: toggles[spec.key] === true,
      enabled,
      revocable: true,
      badges: [enabled ? badge('enabled', '已开启', 'ok') : badge('disabled', '已关闭', 'muted')],
      crossLinks: [permissionCrossLink(id, capabilityId, `作用于可选能力 ${spec.capability}`)],
      controls: [
        {
          kind: 'toggle' as const,
          actionId: 'set-capability-toggle' as const,
          label: enabled ? '关闭此开关（可逆）' : '开启此开关（可逆）',
        },
      ],
    };
  });
}

/** 投影 `tabs` 开关节点（静态权限 `tabs`，可在设置中开关）。 */
function projectTabsToggle(tabsEnabled: boolean): CapabilityNode {
  const id = STABLE_KEY.toggle(TABS_TOGGLE_KEY);
  const staticId = STABLE_KEY.staticCapability('tabs');
  return {
    id,
    kind: 'capability',
    source: 'toggle',
    permission: 'tabs',
    permissionRefs: ['tabs'],
    label: '标签页工具（tabs）',
    granted: tabsEnabled,
    enabled: tabsEnabled,
    revocable: true,
    badges: [
      tabsEnabled ? badge('enabled', '已开启', 'ok') : badge('disabled', '已关闭', 'muted'),
    ],
    crossLinks: [permissionCrossLink(id, staticId, '依赖静态权限 tabs')],
    controls: [
      {
        kind: 'toggle',
        actionId: 'set-tabs-toggle',
        label: tabsEnabled ? '关闭标签页工具（可逆）' : '开启标签页工具（可逆）',
      },
    ],
  };
}

/**
 * 投影全部能力节点（固定序：静态 → 可选 → 6 开关 → tabs 开关）。
 * 同输入 → 同输出（确定性，ADR-V2-002）。
 */
export function projectCapabilities(deps: CapabilityCatalogDeps): CapabilityNode[] {
  return [
    ...projectStaticPermissions(),
    ...projectOptionalCapabilities(deps.grants),
    ...projectPrivacyToggles(deps.toggles),
    projectTabsToggle(deps.tabsEnabled),
  ];
}
