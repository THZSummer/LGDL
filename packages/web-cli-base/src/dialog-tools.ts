/**
 * dialog-tools.ts —— dialog 对话框工具（TASK-006，DIA FR-016/017 + ADR-007）。
 *
 * 6 子命令：override-install（替换同 realm window.alert/confirm/prompt + 按策略应答）/
 * uninstall（卸载还原）/ policy-add（应答策略注册 —— untrusted 缺省拒 + 显式 trusted）/
 * list / remove / status。门禁（FR-005）：override-install = write risk 缺省 ask（deny 后
 * 不安装 —— 由 PermissionGate 先于执行器短路）；policy-add = write + `--trusted true` 双闸；
 * 命中与应答入事件通道（kind=dialog，platform-events dialogOverride）+ 审计（无明文）。
 *
 * 本文件零 LGDL/react import（NFR-001）；零 DOM 触碰（hook 真实现收敛 platform-events.ts）。
 */
import type { PlatformEnv, PlatformDialogRuleSpec } from './platform.js';
import type { AuditSink } from './audit.js';
import { DIALOG_POLICY_NOTE } from './dialog-policy.js';
import { attributionHelpLines } from './ext-attribution.js';
import type { ToolEntry, ToolContext, ToolResult } from './router.js';

/** dialog 子命令（6）。 */
export type DialogSubcommand = 'override-install' | 'uninstall' | 'policy-add' | 'list' | 'remove' | 'status';

export const DIALOG_SUBCOMMANDS: DialogSubcommand[] = ['override-install', 'uninstall', 'policy-add', 'list', 'remove', 'status'];

const DIALOG_TYPES = ['alert', 'confirm', 'prompt'] as const;
const DIALOG_ACTIONS = ['accept', 'dismiss', 'promptText'] as const;

// ---------- 审计（FR-007：无明文 —— 类型/动作/裁决；prompt 应答文本与对话框文本不回明文） ----------

function auditDialog(sink: AuditSink | undefined, action: string, detail: string): void {
  sink?.record({ type: 'dialog', ts: Date.now(), tool: 'dialog', action, detail });
}

/** executor（env.events.sources.dialogOverride 注入面；未注入 → 可读转译 EC-011）。 */
export async function executeDialogTool(env: PlatformEnv, subcommand: string, args: Record<string, string>, ctx?: ToolContext): Promise<ToolResult> {
  const audit = ctx?.services?.audit;
  const ctrl = env.events?.sources.dialogOverride;
  if (!ctrl) {
    return {
      ok: false,
      output: '✖ 对话框工具不可用（env.events 未注入 —— 事件通道/对话框 override 仅在浏览器场景可用；node 面测试注入 fake env）',
      error: 'dialog controller not injected (EC-011)',
    };
  }
  if (!DIALOG_SUBCOMMANDS.includes(subcommand as DialogSubcommand)) {
    return {
      ok: false,
      output: `✖ dialog 未知子命令 "${subcommand}"（可用：${DIALOG_SUBCOMMANDS.join('/')}）`,
      error: 'unknown subcommand',
    };
  }

  switch (subcommand as DialogSubcommand) {
    case 'override-install': {
      const r = await ctrl.install();
      if ('error' in r) return { ok: false, output: r.error, error: 'override install failed' };
      auditDialog(audit, 'override-install', '对话框 override 已安装（window.alert/confirm/prompt 替换，页面不阻塞）');
      return {
        ok: true,
        output:
          '✓ 对话框 override 已安装 —— 页面 JS alert/confirm/prompt 调用不再阻塞 UI：捕获为 dialog 事件（events subscribe --kind dialog 可观察）+ 按策略应答（缺省保守：alert 记录即返回 / confirm·prompt 无匹配 dismiss，EC-005）。卸载：dialog uninstall（可逆还原）。',
      };
    }

    case 'uninstall': {
      const r = await ctrl.uninstall();
      if ('error' in r) return { ok: false, output: r.error, error: 'override uninstall failed' };
      auditDialog(audit, 'override-uninstall', '对话框 override 已卸载（原生行为还原）');
      return { ok: true, output: '✓ 对话框 override 已卸载 —— window.alert/confirm/prompt 原生行为还原' };
    }

    case 'policy-add': {
      const typeRaw = (args.type ?? '').trim();
      const actionRaw = (args.action ?? '').trim();
      if (!(DIALOG_TYPES as readonly string[]).includes(typeRaw)) {
        return { ok: false, output: `✖ dialog policy-add 需 --type ${DIALOG_TYPES.join('/')}（收到 "${typeRaw}"）` };
      }
      if (!(DIALOG_ACTIONS as readonly string[]).includes(actionRaw)) {
        return { ok: false, output: `✖ dialog policy-add --action 需 ${DIALOG_ACTIONS.join('/')}（收到 "${actionRaw}"）` };
      }
      // untrusted 双闸（FR-005/EC-004）：策略默认视为 untrusted → 显式 --trusted true 才注册
      if (args.trusted !== 'true') {
        auditDialog(audit, 'policy-add-denied', `untrusted 策略拒：${typeRaw}/${actionRaw}`);
        return {
          ok: false,
          output:
            '✖ dialog policy-add 拒绝执行：对话框自动应答策略默认视为 untrusted（可能来自外部/采集内容），须显式声明 --trusted true（且经权限 ask 放行）后注册（FR-005/EC-004）。' +
            '破坏性文案（删除/覆盖/提交类）accept 仍受 EC-006 护栏约束。',
          error: 'untrusted policy rejected',
        };
      }
      const rule: PlatformDialogRuleSpec = {
        type: typeRaw as PlatformDialogRuleSpec['type'],
        action: actionRaw as PlatformDialogRuleSpec['action'],
        trusted: true,
        ...(args.pattern?.trim() ? { pattern: args.pattern.trim() } : {}),
        ...(actionRaw === 'promptText' && args.text !== undefined ? { text: args.text } : {}),
      };
      const r = await ctrl.addRule(rule);
      if ('error' in r) return { ok: false, output: r.error, error: 'policy-add failed' };
      auditDialog(audit, 'policy-add', `trusted 策略注册：${rule.type} → ${rule.action}${rule.pattern ? ` pattern=${rule.pattern}` : ''}`);
      return {
        ok: true,
        output: `✓ 对话框策略已注册：${rule.type} ${rule.pattern ? `pattern="${rule.pattern}"` : '(全量)'} → ${rule.action}（trusted；${DIALOG_POLICY_NOTE.split('。')[0]}）`,
      };
    }

    case 'list': {
      const rules = ctrl.listRules();
      if (rules.length === 0) {
        return { ok: true, output: `（当前无对话框应答策略 —— dialog policy-add --trusted true 注册；${DIALOG_POLICY_NOTE}）` };
      }
      const lines = rules.map((r, i) => {
        const textBit = r.action === 'promptText' && r.text !== undefined ? ` · 应答文本已脱敏（${r.text.length} 字符）` : '';
        return `  [${i}] ${r.type}${r.pattern ? ` pattern="${r.pattern}"` : '（全量）'} → ${r.action} · trusted${textBit}`;
      });
      return { ok: true, output: `对话框应答策略（${rules.length}）：\n${lines.join('\n')}\n\n${DIALOG_POLICY_NOTE}` };
    }

    case 'remove': {
      const idx = args.index;
      if (idx === undefined || !/^\d+$/.test(idx)) {
        return { ok: false, output: '✖ dialog remove 需 --index <策略序号>（dialog list 查看）' };
      }
      const r = await ctrl.removeRule(Number(idx));
      if ('error' in r) return { ok: false, output: r.error, error: 'policy remove failed' };
      auditDialog(audit, 'policy-remove', `移除策略 [${idx}]`);
      return { ok: true, output: `✓ 已移除策略 [${idx}]` };
    }

    case 'status': {
      const installed = await ctrl.installed();
      const rules = ctrl.listRules();
      return {
        ok: true,
        output: `对话框 override：${installed ? '已安装（页面 JS 模态框被捕获 + 策略应答）' : '未安装（dialog override-install 安装；安装 = write risk 默认 ask）'}\n策略规则：${rules.length} 条（dialog list 查看明细）`,
      };
    }
  }
}

// ---------- ToolEntry ----------

const DIALOG_DESC =
  'dialog：对话框 override 与应答策略（FR-016/017；页面 JS 模态框同 realm override，C-03 页内切面）。' +
  ' override-install（替换 window.alert/confirm/prompt，页面不再阻塞 —— write risk 默认 ask）/ uninstall（还原原生）' +
  ' / policy-add（应答策略：--type alert|confirm|prompt + --action accept|dismiss|promptText + [--pattern]；untrusted 缺省拒需 --trusted true）' +
  ' / list / remove / status。缺省保守：alert 记录即返回、confirm/prompt 无匹配 → dismiss（EC-005）；破坏性文案（删除/覆盖/提交类）无 trusted accept 规则 → 永不自动 accept（EC-006）；' +
  ' prompt 自动输入仅 trusted 规则显式 text 生效。浏览器原生对话框（HTTP auth/权限 prompt）不可 hook → CDP/扩展宿主归属（EC-010，FR-025）。' +
  ' 参数进 args 对象：{"subcommand":"policy-add","args":{"type":"confirm","action":"dismiss"}}。';

const DIALOG_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: DIALOG_SUBCOMMANDS,
      description: 'dialog 子命令（6：override-install/uninstall/policy-add/list/remove/status）。',
    },
    args: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'policy-add 对话框类型：alert/confirm/prompt。' },
        action: { type: 'string', description: 'policy-add 应答动作：accept/dismiss/promptText。' },
        pattern: { type: 'string', description: 'policy-add 文本/URL glob 匹配（缺省全量）。' },
        text: { type: 'string', description: 'policy-add promptText 应答文本（仅 trusted 规则显式提供生效；审计不回明文）。' },
        trusted: { type: 'string', description: 'policy-add "true" = 显式 trusted 声明（缺省 untrusted 拒，FR-005）。' },
        index: { type: 'string', description: 'remove 策略序号（list 查看）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function dialogHelp(): string {
  return [
    'dialog —— 对话框 override + 应答策略（FR-016/017/ADR-007）',
    '用法：dialog <override-install|uninstall|policy-add|list|remove|status> [--参数]',
    '',
    'risk 分级（FR-005）：',
    '  [read]  list / status',
    '  [state] remove（策略移除）',
    '  [write·缺省 ask]  override-install（deny 后不安装）/ uninstall / policy-add（+ --trusted true 双闸）',
    '',
    'override 语义：安装 = 替换同 realm window.alert/confirm/prompt（同源 iframe 尽力 hook；跨域 iframe 不可 hook → 归属，EC-009）；',
    '  安装后页面 JS 模态框 → 事件入通道（events subscribe --kind dialog）+ 按策略应答（页面不被阻塞，EC-005）；卸载还原原生（可逆）',
    DIALOG_POLICY_NOTE,
    '原生对话框（HTTP auth/权限 prompt）页内不可 hook → CDP/扩展宿主归属（EC-010，FR-025 契约预留；统一文案面 TASK-010）',
    ...attributionHelpLines(),
  ].join('\n');
}

/** 创建 dialog 工具条目（env.events 注入；group=dialog；写类子命令风险声明）。 */
export function createDialogToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'dialog',
    summary: '对话框 override + 应答策略（alert/confirm/prompt 捕获；缺省保守 + 破坏性 deny-accept 护栏）',
    schema: { name: 'dialog', description: DIALOG_DESC, parameters: DIALOG_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'dialog',
    subcommandRisks: {
      'override-install': 'write',
      uninstall: 'write',
      'policy-add': 'write',
      remove: 'state',
      list: 'read',
      status: 'read',
    },
    executor: async (tc, ctx) => executeDialogTool(env, tc.subcommand, tc.args, ctx),
    help: dialogHelp,
  };
}
