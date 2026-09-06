/**
 * subagent.ts —— 子会话（FR-032，S-04：嵌套 AgentRunner 同线程子会话；EC-009 主会话不中断）。
 *
 * 生态位（§3.4 TSK 域 / discovery §3.3 B 组 ◐）：任务委派生态位 → 同线程、**会话
 * 隔离**（非进程隔离 —— 安全边界由 PRM 承担，非子会话语义；help 显式声明）。
 * runner 主体零改动（ADR-007/红线）：直接复用 createAgentRunner，子会话=一次
 * runAgent 实例。工具集裁剪 = 白名单子集（--tools；控 schema 膨胀 AC-011）；
 * chat 工厂由场景注入（env 级：provider.chat 包装）。子会话失败/超轮次 →
 * 结果 ok:false + 错误信息，**主会话不中断**（EC-009）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ChatTurn, ChatResult, LlmToolDef, WebCliToolCall } from './llm.js';
import { createAgentRunner } from './runner.js';
import type { RunOutcome } from './runner.js';
import type { CommandRouter, ToolContext, ToolEntry, ToolResult } from './router.js';

export interface SubagentToolDeps {
  /** 父 router（子会话工具集经其派发；白名单子集由本工具裁决）。 */
  router: CommandRouter;
  /** chat 工厂（场景注入：provider.chat 等；tools 由子会话白名单派生供给）。 */
  chat: (turns: ChatTurn[], system: string, tools: LlmToolDef[]) => Promise<ChatResult>;
  /** 子会话系统提示（可选；缺省中性声明）。 */
  system?: string | (() => string | Promise<string>);
  /** 子会话最大轮次（缺省 20，防失控）。 */
  maxRounds?: number;
}

const DEFAULT_SUBAGENT_SYSTEM =
  '你是子代理（subagent）：在父任务委派的范围内专注完成子任务。' +
  '安全边界声明：本子会话为同线程会话隔离（非进程隔离），浏览器能力安全由父级权限门禁（PRM）承担；' +
  '只使用授权给你的工具，不尝试越权操作。完成后简要汇报结果。';

export interface SubagentArgs {
  prompt?: string;
  tools?: string;
}

/** 解析工具白名单（逗号分隔；空 = 全部当前派生工具）。 */
export function parseWhitelist(toolsArg: string | undefined, router: CommandRouter): string[] {
  if (!toolsArg) return router.deriveTools().map((t) => t.name);
  return toolsArg
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 执行子会话（嵌套 AgentRunner；返回汇总 ToolResult）。 */
export async function executeSubagent(deps: SubagentToolDeps, args: SubagentArgs, ctx: ToolContext): Promise<ToolResult> {
  const prompt = args.prompt ?? '';
  if (!prompt.trim()) {
    return { ok: false, output: '✖ subagent 缺少必填参数 --prompt <子任务描述>', error: 'missing prompt' };
  }
  const whitelist = new Set(parseWhitelist(args.tools, deps.router));
  // 子会话 schema = 白名单子集（控 schema 膨胀，FR-032 AC）
  const toolDefs: LlmToolDef[] = deps.router
    .deriveTools()
    .filter((t) => whitelist.has(t.name))
    .map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));

  const outputs: string[] = [];
  const systemText = deps.system ?? DEFAULT_SUBAGENT_SYSTEM;
  const runner = createAgentRunner({
    user: prompt.trim(),
    system: async () => (typeof systemText === 'function' ? systemText() : systemText),
    maxRounds: deps.maxRounds ?? 20,
    chat: async (turns, system) => deps.chat(turns, system, toolDefs),
    dispatch: async (tc: WebCliToolCall): Promise<ToolResult> => {
      if (!whitelist.has(tc.name)) {
        return { ok: false, output: `✖ 工具 "${tc.name}" 不在子会话白名单（--tools 声明子集）`, error: 'not in subagent whitelist' };
      }
      return deps.router.dispatch(tc, ctx);
    },
    events: {
      onAssistantText: (t) => outputs.push(t),
      onToolOutput: (o) => outputs.push(o.slice(0, 800)),
    },
  });
  const outcome: RunOutcome = await runner.run();
  const ok = outcome === 'completed' || outcome === 'empty';
  const body = outputs.join('\n').slice(0, 4000);
  if (ok) {
    return { ok: true, output: body || '（子会话无文本输出）' };
  }
  // EC-009：子会话失败 → ok:false + 错误信息，主会话不中断
  const reason =
    outcome === 'llm-failed' ? '子会话 LLM 调用失败（已停止）' : outcome === 'max-rounds' ? `子会话达到轮次上限（${deps.maxRounds ?? 20}）` : `子会话结束态：${outcome}`;
  return { ok: false, output: `✖ ${reason}${body ? `\n部分输出：\n${body}` : ''}`, error: reason };
}

// ---------- ToolEntry ----------

const SUBAGENT_DESC =
  'subagent：把子任务委派给嵌套 AgentRunner 子会话并回收结果（同线程、会话隔离非进程隔离 —— 安全由父级 PRM 承担）。' +
  ' --prompt 必填（子任务描述）；--tools 白名单（逗号分隔工具全限定名，控 schema 膨胀；缺省 = 全部派生工具）。' +
  ' 参数进 args 对象：{"args":{"prompt":"检查节点 a 的连线","tools":"web-cli-help,search-content"}}。';

const SUBAGENT_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '子任务描述（必填）。' },
        tools: { type: 'string', description: '子会话工具白名单（逗号分隔）。' },
      },
    },
  },
} as const;

export function subagentHelp(): string {
  return [
    'subagent —— 子会话（嵌套 AgentRunner 同线程委派）',
    '用法：subagent --prompt <子任务描述> [--tools 白名单,逗号分隔]',
    '',
    '示例：subagent --prompt "统计当前图节点数" --tools web-cli-help,search-content',
    '安全边界（NG/FR-032）：会话隔离**非进程隔离**——浏览器能力安全由父级权限门禁（PRM）承担，不是子会话语义；' +
      '子会话失败返回 ok:false，主会话不中断（EC-009）。',
  ].join('\n');
}

/** 创建 subagent 工具条目。 */
export function createSubagentToolEntry(deps: SubagentToolDeps): ToolEntry {
  return {
    name: 'subagent',
    summary: '子会话委派（嵌套 AgentRunner；白名单裁剪；失败不中断主会话）',
    schema: { name: 'subagent', description: SUBAGENT_DESC, parameters: SUBAGENT_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'task',
    executor: async (tc, ctx) => executeSubagent(deps, { prompt: tc.args.prompt, tools: tc.args.tools }, ctx),
    help: subagentHelp,
  };
}
