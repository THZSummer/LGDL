/**
 * V2-3 树内撤销/关断的**封闭动作白名单编排**（FR-V2-030~037 / FR-V2-063；ADR-V2-008）。
 *
 * 安全结构（**机器可验，非文案承诺**）：
 *   1. `TreeActionId` 为**封闭联合**（7 值）；`run()` 只做 `switch(actionId)` 分派，
 *      **无默认写入分支**（白名单外的一律零操作）；
 *   2. 每个动作**唯一映射**既有 fail-closed 通路（`revoke` 消息 / `SettingsOps`），
 *      **不新增 SW `case`、不新增消息语义、不做 `grant`/`request`、无命令级动作**；
 *   3. 本模块**不导入** `security/policy.ts` / `security/auto-authorize.ts`，不写
 *      `riskDefaults`，不构造 `createPluginPolicyConfig` —— 结构上无法放宽判定链；
 *   4. 需二次确认的动作在 `confirmed !== true` 时**零操作**（fail-closed）；
 *   5. 失败一律返回 `kind:'err'` 可读原因（无 bare `catch`、无假成功）；
 *   6. **幂等**：重复撤销返回可读「已处于未授权/已撤销」，不报错刷屏、不产生重复审计。
 *
 * 三件套（① 回执 ② **重拉实测**工具面证据 ③ 既有 `admin_audit-export` 入口）由
 * `tree-receipt.ts` 组装；本模块只负责调用既有通路 + 重拉真值。
 *
 * 零明文：只透传既有 `OpResult.text`（v1 ops 已掩码），不读取/不构造 key、剪贴板、
 * 通知正文、URL query、书签标题。
 */
import type { EnvGuardResult } from '../../platform/env-guard.js';
import { OPTIONAL_CAPABILITY_TOOL, type OptionalCapability } from '../../platform/capability-permissions.js';
import { makeMessage, type PluginResponse } from '../../background/messaging.js';
import { STABLE_KEY, type CommandNode, type ConnectTreeSnapshot, type TreeActionId } from '../../insight/tree-model.js';
import type { OpResult, SettingsOps, SettingsTransport } from '../settings/ops.js';
import type { TreeActionTarget } from './tree-view.js';
import { commandPolicyNeedsConfirmation, needsConfirmation } from './tree-view.js';
import {
  AUDIT_ENTRY_HINT,
  AUDIT_ENTRY_POINT,
  buildReceipt,
  toolSurfaceEvidence,
  unverifiedEvidence,
  type TreeReceipt,
} from './tree-receipt.js';

/**
 * 封闭动作白名单（R2：**9 值**，固定序；ADR-V2-027 扩展 ADR-V2-008）。
 *
 * 前 7 个 = 撤销/关断面（只走既有 fail-closed 通路，永不放宽）；后 2 个 = 命令级用户
 * 覆盖（**唯一**映射新增 `command-policy-set` / `command-policy-reset` 消息通路，服务端
 * clamp 仍强制）。白名单外一律零写入（无默认写入分支）。
 */
export const TREE_ACTION_IDS: readonly TreeActionId[] = [
  'revoke-origin',
  'revoke-capability',
  'set-capability-toggle',
  'set-tabs-toggle',
  'clear-auto-auth',
  'disconnect-llm',
  'dissolve-group',
  'set-command-policy',
  'reset-command-policy',
];

const TREE_ACTION_ID_SET: ReadonlySet<string> = new Set<string>(TREE_ACTION_IDS);

/** 运行时白名单判定（防御开放联合之外的值；`false` ⇒ 零操作）。 */
export function isTreeActionId(value: unknown): value is TreeActionId {
  return typeof value === 'string' && TREE_ACTION_ID_SET.has(value);
}

export interface TreeActionRequest {
  actionId: TreeActionId;
  /** 作用对象（站点 / 能力 / 开关 / 分组）。 */
  target?: TreeActionTarget;
  /** 回执 ② 的目标工具名提示（来自渲染模型；仅用于实测对账展示）。 */
  toolHint?: string;
  /**
   * 二次确认结果：需确认的动作必须显式 `true`，否则**零操作**（fail-closed）。
   * 开关翻转（可逆）不需要确认。
   */
  confirmed?: boolean;
}

export interface TreeActionOutcome {
  receipt: TreeReceipt['receipt'];
  toolSurfaceEvidence: TreeReceipt['toolSurfaceEvidence'];
  auditEntry: TreeReceipt['auditEntry'];
}

export interface TreeOpsDeps {
  /** 既有设置操作实现（唯一写路径来源；注入以便 node 测试）。 */
  ops: SettingsOps;
  /** 既有消息传输（`revoke` 消息；注入以便 node 测试）。 */
  transport: SettingsTransport;
  /** 环境守卫（非扩展环境 → 零操作 + 可读原因）。 */
  env: EnvGuardResult;
  /** 动作后**重拉** `insight-tree` 取真值（不得回退为文案声称）。 */
  refreshSnapshot: () => Promise<ConnectTreeSnapshot | null>;
  now?: () => number;
}

export interface TreeOps {
  run(req: TreeActionRequest): Promise<TreeActionOutcome>;
}

// ---------------------------------------------------------------------------
// 既有通路返回形状（只读消费，未新增消息语义）
// ---------------------------------------------------------------------------

interface RevokePayload {
  revoked?: boolean;
  hostPermissionRemoved?: boolean;
  contentScript?: { ok?: boolean; id?: string; pattern?: string; reason?: string; alreadyRegistered?: boolean };
}

/** R2：`command-policy-set` / `command-policy-reset` 的可读回执形状（additive）。 */
interface CommandPolicyMutationView {
  ok?: boolean;
  changed?: boolean;
  text?: string;
}

// ---------------------------------------------------------------------------
// 纯 helper
// ---------------------------------------------------------------------------

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errResult(text: string): OpResult<unknown> {
  return { ok: false, kind: 'err', text };
}

/** 工具名 → 该 provider 的**唯一**既有通路标签（仅用于可读回执/测试对账）。 */
function capabilityOfCap(cap: OptionalCapability): string {
  return OPTIONAL_CAPABILITY_TOOL[cap];
}

/** 站点行提示的工具名可能是多个（`a、b`）：任一仍在工具面 ⇒ `present`。 */
function surfaceHasTool(snapshot: ConnectTreeSnapshot, tool: string): boolean {
  const group = snapshot.groups.find((g) => g.dimension === 'command');
  const names = new Set<string>();
  for (const node of (group?.children ?? []) as CommandNode[]) {
    if (node.subcommand) continue;
    if (node.presentInSurface) names.add(node.name);
  }
  return tool
    .split('、')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .some((t) => names.has(t));
}

// ---------------------------------------------------------------------------
// 工厂
// ---------------------------------------------------------------------------

export function createTreeOps(deps: TreeOpsDeps): TreeOps {
  const now = deps.now ?? (() => Date.now());

  /** 零操作（拒绝/未确认/白名单外/非扩展）：不发送任何消息、不调任何 ops。 */
  function zeroOutcome(kind: 'warn' | 'err', text: string, nextStep?: string): TreeActionOutcome {
    return {
      receipt: { ok: false, kind, text, ...(nextStep ? { nextStep } : {}) },
      toolSurfaceEvidence: {
        tool: '（无绑定工具）',
        present: true,
        checkedAt: now(),
        evidence: '未执行任何操作：工具面未发生变更（fail-closed 零操作）。',
      },
      auditEntry: { entryPoint: AUDIT_ENTRY_POINT, hint: AUDIT_ENTRY_HINT },
    };
  }

  /** 重拉实测（失败时给出可读原因，绝不用文案冒充已移除）。 */
  async function refreshForEvidence(): Promise<{ snap: ConnectTreeSnapshot | null; reason?: string }> {
    try {
      const snap = await deps.refreshSnapshot();
      return { snap };
    } catch (err) {
      return { snap: null, reason: errText(err) };
    }
  }

  /**
   * 收口：动作后重拉真值填充三件套 ②。
   * `tool` 缺省 ⇒ 本次动作不改变工具面集合（关断自动授权 / 断开 LLM / 解散分组）。
   */
  async function finish(
    actionId: TreeActionId,
    opResult: OpResult<unknown>,
    tool: string | undefined,
    nextStep?: string,
  ): Promise<TreeActionOutcome> {
    const ts = now();
    const receipt = tool
      ? await (async () => {
          const { snap, reason } = await refreshForEvidence();
          const evidence =
            snap === null
              ? unverifiedEvidence(tool, ts, reason ?? '后台未返回快照')
              : toolSurfaceEvidence(tool, surfaceHasTool(snap, tool), ts);
          return buildReceipt({ actionId, opResult, evidence, now: ts, ...(nextStep ? { nextStep } : {}) });
        })()
      : buildReceipt({ actionId, opResult, now: ts, ...(nextStep ? { nextStep } : {}) });
    return {
      receipt: receipt.receipt,
      toolSurfaceEvidence: receipt.toolSurfaceEvidence,
      auditEntry: receipt.auditEntry,
    };
  }

  // ── 每个动作的唯一既有通路实现 ────────────────────────────────────────────

  async function revokeOrigin(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const origin = req.target?.origin;
    if (!origin) return finish('revoke-origin', errResult('撤销站点授权缺少作用对象（origin）：零操作'), undefined);
    const tool = req.toolHint;
    const nextStep = '如需重新授权：在目标站点点击插件图标 / 「授权当前站点」（授权需用户手势；树内只做撤销）。';
    let res: PluginResponse<RevokePayload>;
    try {
      res = await deps.transport.send<RevokePayload>(makeMessage('revoke', { origin }));
    } catch (err) {
      return finish('revoke-origin', errResult(`撤销站点授权请求异常：${errText(err)}`), tool, '请重试；若持续失败请查看审计。');
    }
    if (!res.ok || !res.data) {
      return finish('revoke-origin', errResult(`撤销站点授权失败：${res.error ?? '后台无响应'}`), tool, nextStep);
    }
    const data = res.data;
    const revoked = data.revoked === true;
    const removed = data.hostPermissionRemoved === true;
    const cs = data.contentScript;
    const parts: string[] = [
      revoked ? `✓ 已取消 ${origin} 的站点授权` : `该站点 ${origin} 已处于未授权状态（幂等：无需重复撤销）`,
      removed
        ? 'host permission 已移除'
        : 'host permission 未移除（可能为静态权限、或此前已移除；可在 chrome://extensions 核对）',
    ];
    if (cs && cs.ok === true) parts.push('声明式注入已注销');
    else if (cs && cs.ok === false) parts.push(`声明式注入注销未完成：${cs.reason ?? '未知原因'}（授权已撤销，可重试）`);
    const kind = revoked ? (removed && cs?.ok !== false ? 'ok' : 'warn') : 'warn';
    return finish('revoke-origin', { ok: true, kind, text: parts.join('；') }, tool, nextStep);
  }

  async function revokeCapability(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const cap = req.target?.capability;
    if (!cap) return finish('revoke-capability', errResult('撤销能力缺少作用对象（capability）：零操作'), undefined);
    const tool = req.toolHint ?? capabilityOfCap(cap);
    const res = await deps.ops.revokeCapability(cap);
    return finish('revoke-capability', res, tool, '如需恢复：在「⚙ 设置 → 能力与隐私」重新授予该能力权限。');
  }

  async function setCapabilityToggle(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const cap = req.target?.capability;
    const scope = req.target?.scope;
    const enabled = req.target?.enabled;
    if (!cap || (scope !== 'read' && scope !== 'write') || typeof enabled !== 'boolean') {
      return finish('set-capability-toggle', errResult('开关翻转缺少作用对象（capability/scope/enabled）：零操作'), undefined);
    }
    const tool = req.toolHint ?? capabilityOfCap(cap);
    const res = await deps.ops.setCapabilityPrivacy(cap, scope, enabled);
    return finish('set-capability-toggle', res, tool, '开关为可逆操作：可再次点击恢复。');
  }

  async function setTabsToggle(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const enabled = req.target?.enabled;
    if (typeof enabled !== 'boolean') {
      return finish('set-tabs-toggle', errResult('标签页开关缺少目标态（enabled）：零操作'), undefined);
    }
    const tool = req.toolHint ?? 'tabs';
    const res = await deps.ops.setTabsSetting(enabled);
    return finish('set-tabs-toggle', res, tool, '开关为可逆操作：可再次点击恢复。');
  }

  async function clearAutoAuth(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const origin = req.target?.origin;
    if (!origin) return finish('clear-auto-auth', errResult('关闭自动授权缺少作用对象（origin）：零操作'), undefined);
    const res = await deps.ops.clearAutoAuth(origin);
    return finish('clear-auto-auth', res, undefined, '下一次同档位调用将恢复人工二次确认（不撤销站点授权）。');
  }

  async function disconnectLlm(): Promise<TreeActionOutcome> {
    const res = await deps.ops.clearLlm();
    return finish('disconnect-llm', res, undefined, '如需恢复：在设置页重新填入 LLM 配置。');
  }

  async function dissolveGroup(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const groupId = req.target?.groupId;
    if (!groupId) return finish('dissolve-group', errResult('解散会话组缺少作用对象（groupId）：零操作'), undefined);
    const res = await deps.ops.groupAction({ action: 'delete', groupId });
    return finish('dissolve-group', res, undefined, '分组只共享对话，不代表互相授权；本操作不触及任何站点授权。');
  }

  /**
   * R2：命令级覆盖设置（**唯一**消息通路 `command-policy-set`）。
   *
   * 本地不做任何判定 —— 写入由 SW 覆盖 store 完成，硬底线 clamp 由 SW 的判定链强制
   * （伪造消息/绕过 UI 也不能突破）。失败可读、零静默失败。
   */
  async function setCommandPolicy(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const cmd = req.target?.command;
    const desired = req.target?.policyAction;
    if (!cmd?.tool || !desired) {
      return finish('set-command-policy', errResult('命令级覆盖缺少作用对象（command.tool / policyAction）：零操作'), undefined);
    }
    const commandId = STABLE_KEY.command(cmd.tool, cmd.subcommand);
    const nextStep = '硬底线（evaluate / 未授权 origin / 未知 risk / 破坏性 / ui·state·external 放宽方向）不可覆盖：覆盖后仍按硬底线执行。';
    let res: PluginResponse<CommandPolicyMutationView>;
    try {
      res = await deps.transport.send<CommandPolicyMutationView>(
        makeMessage('command-policy-set', { commandId, policyAction: desired }),
      );
    } catch (err) {
      return finish('set-command-policy', errResult(`命令级覆盖请求异常：${errText(err)}`), undefined, '请重试；若持续失败请查看审计。');
    }
    if (!res.ok || !res.data) {
      return finish('set-command-policy', errResult(`命令级覆盖失败：${res.error ?? '后台无响应'}`), undefined, nextStep);
    }
    const data = res.data;
    const changed = data.changed === true;
    const kind = data.ok === true ? (changed ? 'ok' : 'warn') : 'err';
    return finish(
      'set-command-policy',
      { ok: data.ok === true, kind, text: data.text ?? `命令级覆盖：${commandId} → ${desired}` },
      undefined,
      nextStep,
    );
  }

  /** R2：命令级覆盖恢复默认（单条 / 全部；**唯一**消息通路 `command-policy-reset`）。 */
  async function resetCommandPolicy(req: TreeActionRequest): Promise<TreeActionOutcome> {
    const all = req.target?.resetAll === true;
    const cmd = req.target?.command;
    if (!all && !cmd?.tool) {
      return finish('reset-command-policy', errResult('恢复默认缺少作用对象（command.tool 或 resetAll=true）：零操作'), undefined);
    }
    const payload: Record<string, unknown> = all ? { all: true } : { commandId: STABLE_KEY.command(cmd!.tool, cmd!.subcommand) };
    let res: PluginResponse<CommandPolicyMutationView>;
    try {
      res = await deps.transport.send<CommandPolicyMutationView>(makeMessage('command-policy-reset', payload));
    } catch (err) {
      return finish('reset-command-policy', errResult(`恢复默认请求异常：${errText(err)}`), undefined, '请重试；若持续失败请查看审计。');
    }
    if (!res.ok || !res.data) {
      return finish('reset-command-policy', errResult(`恢复默认失败：${res.error ?? '后台无响应'}`), undefined, '请重试。');
    }
    const data = res.data;
    const changed = data.changed === true;
    return finish(
      'reset-command-policy',
      { ok: data.ok === true, kind: data.ok === true ? (changed ? 'ok' : 'warn') : 'err', text: data.text ?? '已恢复默认。' },
      undefined,
      '恢复默认后可再次在树内设置该命令的处置档。',
    );
  }

  return {
    async run(req: TreeActionRequest): Promise<TreeActionOutcome> {
      const actionId: unknown = req?.actionId;
      // 白名单外 / 缺 actionId → 零操作（结构上无默认写入分支）。
      if (!isTreeActionId(actionId)) {
        return zeroOutcome(
          'err',
          `未知动作「${String(actionId)}」不在封闭白名单内：零操作（不发送任何消息、不调用任何 ops）。`,
          '只允许封装的 9 个动作（7 个撤销/关断 + 2 个命令级覆盖）。',
        );
      }
      if (!deps.env.inExtension) {
        return zeroOutcome('err', `✖ 非扩展环境：${deps.env.banner}`, '请在扩展侧栏内操作。');
      }
      // 二次确认：需确认的动作未显式确认 ⇒ 零操作（fail-closed）。
      if (needsConfirmation(actionId) && req.confirmed !== true) {
        return zeroOutcome(
          'warn',
          `已取消「${actionId}」：未收到显式确认，未执行任何操作（fail-closed）。`,
          '如需执行，请在弹出的确认摘要中点「确认执行」。',
        );
      }
      // R2：命令级覆盖的「放宽方向」条件确认（收紧/恢复默认不需确认）。
      if (
        actionId === 'set-command-policy' &&
        commandPolicyNeedsConfirmation(req.target?.policyAction, req.target?.defaultAction) &&
        req.confirmed !== true
      ) {
        return zeroOutcome(
          'warn',
          `已取消「set-command-policy」：放宽方向（desired allow 且相对默认档是放宽）需显式确认，未执行任何操作（fail-closed）。`,
          '如需执行，请在弹出的确认摘要中点「确认执行」；收紧（ask/deny）与恢复默认无需确认。',
        );
      }

      switch (actionId) {
        case 'revoke-origin':
          return revokeOrigin(req);
        case 'revoke-capability':
          return revokeCapability(req);
        case 'set-capability-toggle':
          return setCapabilityToggle(req);
        case 'set-tabs-toggle':
          return setTabsToggle(req);
        case 'clear-auto-auth':
          return clearAutoAuth(req);
        case 'disconnect-llm':
          return disconnectLlm();
        case 'dissolve-group':
          return dissolveGroup(req);
        case 'set-command-policy':
          return setCommandPolicy(req);
        case 'reset-command-policy':
          return resetCommandPolicy(req);
      }
      // 类型上不可达；保留为**零写入**兜底（绝不在此新增写入）。
      return zeroOutcome('err', '未知动作：零操作。');
    },
  };
}
