/**
 * exec-remote.ts —— exec-remote 代理桥预留契约（FR-027/NG-004，P2 试点）。
 *
 * 生态位（§3.5 不可承载面）：需 OS 能力（真 shell/本地命令/服务端）的场景由
 * **代理端点**承载（未来 os-cli-base）。本文件只提供工具契约：端点/鉴权/超时 =
 * env 注入；未配置 → 禁用态 + 指引（EC-006 同 web-search 语义）；help 显式声明
 * 「代理 OS 能力、非本框架实现」（NG-004）。代理服务本体不在本 Feature。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformEnv } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

/** 远程执行桥契约（场景注入 env.remoteExec：包装服务端代理调用）。 */
export interface RemoteExecBridge {
  (req: { command: string; args: Record<string, string> }): Promise<{ ok: boolean; output: string; error?: string }>;
}

export interface RemoteExecArgs {
  command?: string;
  argsJson?: string;
}

/** exec-remote 执行器（桥缺失 → 禁用态 + 指引；NG-004 代理声明）。 */
export async function executeExecRemote(bridge: RemoteExecBridge | undefined, args: RemoteExecArgs): Promise<ToolResult> {
  if (!bridge) {
    return {
      ok: false,
      output:
        '✖ exec-remote 未配置：远程执行端点/凭据未注入 —— 本工具是「代理 OS 能力」的桥契约（非本框架实现，NG-004）；' +
        '需配置本地/服务端代理端点（未来 os-cli-base 方向）后使用，或改用浏览器原生工具。',
      error: 'exec-remote not configured',
    };
  }
  const command = args.command ?? '';
  if (!command.trim()) {
    return { ok: false, output: '✖ exec-remote 缺少必填参数 --command <要代理执行的命令>' };
  }
  let parsed: Record<string, string> = {};
  if (args.argsJson) {
    try {
      const v = JSON.parse(args.argsJson) as unknown;
      if (v && typeof v === 'object') parsed = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, String(val)]));
    } catch {
      return { ok: false, output: '✖ exec-remote --argsJson 非法 JSON', error: 'invalid argsJson' };
    }
  }
  const r = await bridge({ command: command.trim(), args: parsed });
  // FR-010：远程执行结果为外部来源内容 → untrusted 标记（review IMP-5 补齐）
  const trust = { source: `exec-remote://${command.trim().split(/\s+/)[0] ?? 'bridge'}`, fetchedAt: Date.now(), level: 'untrusted' as const };
  return r.ok ? { ok: true, output: r.output, trust } : { ok: false, output: r.output, error: r.error };
}

// ---------- ToolEntry ----------

const EXEC_REMOTE_DESC =
  'exec-remote：把需 OS 能力的命令代理给远程执行端点（未来 os-cli-base 方向；非本框架实现，NG-004）。' +
  ' 端点/鉴权/超时由场景注入；未配置 → 禁用态 + 指引。--command 必填；--argsJson 可选。' +
  ' 参数进 args 对象：{"args":{"command":"ls"}}。';

const EXEC_REMOTE_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        command: { type: 'string', description: '要代理执行的命令（OS 能力语义由代理服务承载）。' },
        argsJson: { type: 'string', description: '命令参数 JSON（可选）。' },
      },
    },
  },
} as const;

export function execRemoteHelp(): string {
  return [
    'exec-remote —— 远程执行代理桥（预留契约；P2 试点）',
    '用法：exec-remote --command <命令> [--argsJson {...}]',
    '',
    '边界声明（NG-004）：本工具代理「OS 能力」（真 shell/本地命令等），执行由远程代理服务完成，非本框架实现；' +
      '未配置端点 → 禁用态 + 指引（EC-006）。浏览器场景优先使用原生工具（eval-js/dom/storage 等）。',
  ].join('\n');
}

/** 创建 exec-remote 工具条目（env.remoteExec 桥注入；未配置 → 运行时禁用态）。 */
export function createExecRemoteToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'exec-remote',
    summary: '远程执行代理桥（代理 OS 能力，非本框架实现；未配置禁用）',
    schema: { name: 'exec-remote', description: EXEC_REMOTE_DESC, parameters: EXEC_REMOTE_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'exec',
    executor: async (tc) =>
      executeExecRemote(env.remoteExec as RemoteExecBridge | undefined, {
        command: tc.args.command,
        argsJson: tc.args.argsJson,
      }),
    help: execRemoteHelp,
  };
}
