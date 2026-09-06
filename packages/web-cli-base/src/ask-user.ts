/**
 * ask-user.ts —— ask-user 工具（FR-023：任务内澄清；与 PRM ask FR-007 语义区分）。
 *
 * 生态位（discovery §3.3 E 组 ○）：用户交互提示（read -p/确认框 生态位）→ 浏览器
 * 应用自定义 UI（React 弹层）或原生 confirm/prompt。base 只定契约：
 * 问题结构（kind: choice/confirm/text + prompt + options）/ 回答回填 /
 * 取消处理。UI 呈现归场景，应答器经 env.askUser 注入。
 *
 * **与 PRM ask（FR-007）语义区分**：PRM ask = 框架级权限裁决门禁（allow/deny，
 * 决定「工具能否执行」）；ask-user = AI 任务内主动向用户提问澄清（答案进上下文，
 * 不是权限裁决）。help 文本显式声明。
 *
 * 本文件零 LGDL/react import（NFR-001）；不 import platform（类型契约独立，
 * platform.ts 经 import type 引用本模块 —— 单向无环）。
 */
import type { ToolEntry, ToolResult } from './router.js';

export type AskUserKind = 'choice' | 'confirm' | 'text';

export interface AskUserQuestion {
  kind: AskUserKind;
  /** 问题文本（向用户呈现）。 */
  prompt: string;
  /** choice：候选选项（≤9 个；缺省 = 无选项需自由文本？非 choice 忽略）。 */
  options?: string[];
  /** 缺省回答（confirm 缺省 = 'no'；用户不答时用）。 */
  default?: string;
}

export interface AskUserAnswer {
  ok: boolean;
  /** 回答值（choice = 选中项；confirm = yes/no；text = 自由文本）。 */
  value?: string;
  /** 用户取消。 */
  canceled?: boolean;
}

/** 应答器契约（场景注入 env.askUser；UI 呈现/回填归场景）。 */
export type AskResponder = (question: AskUserQuestion) => AskUserAnswer | Promise<AskUserAnswer>;

/** 问题参数解析（工具入参 → 问题结构）。 */
export interface AskUserArgs {
  kind?: string;
  prompt?: string;
  options?: string[];
  default?: string;
}

/** 构造 AskUserQuestion（参数校验：kind 合法、prompt 必填、choice 需 options）。 */
export function buildAskQuestion(args: AskUserArgs): { ok: boolean; question?: AskUserQuestion; error?: string } {
  const kind = (args.kind ?? 'text') as AskUserKind;
  if (kind !== 'choice' && kind !== 'confirm' && kind !== 'text') {
    return { ok: false, error: `未知 ask-user 类型 "${args.kind}"（可用：choice/confirm/text）` };
  }
  const prompt = args.prompt ?? '';
  if (!prompt.trim()) {
    return { ok: false, error: 'ask-user 缺少必填参数 --prompt <问题>' };
  }
  if (kind === 'choice' && (!args.options || args.options.length === 0)) {
    return { ok: false, error: 'ask-user choice 需要 --options（逗号分隔候选，如 "A,B,C"）' };
  }
  return { ok: true, question: { kind, prompt: prompt.trim(), options: args.options, default: args.default } };
}

/** ask-user 执行器（应答器经 env.askUser 注入；未注入 → 禁用态 + 配置指引）。 */
export async function executeAskUser(responder: AskResponder | undefined, args: AskUserArgs): Promise<ToolResult> {
  if (!responder) {
    return {
      ok: false,
      output: '✖ ask-user 未注入应答器 —— 场景需提供 ask-user UI（与 PRM 权限 ask 不同：本工具是任务内澄清）',
      error: 'ask-user responder not injected',
    };
  }
  const built = buildAskQuestion(args);
  if (!built.ok || !built.question) {
    const err = built.error ?? '参数非法';
    return { ok: false, output: `✖ ${err}`, error: err };
  }
  const answer = await responder(built.question);
  if (!answer.ok || answer.canceled) {
    return { ok: false, output: '（用户取消了回答）', error: 'user canceled' };
  }
  const value = answer.value ?? built.question.default ?? '';
  return { ok: true, output: `用户回答：${value}` };
}

// ---------- ToolEntry 工厂 ----------

const ASK_USER_DESC =
  'ask-user：向用户提问并等待回答（任务内澄清）。类型 --kind choice|confirm|text（缺省 text）；' +
  ' --prompt 必填；choice 需 --options（逗号分隔）。回答回填到工具输出。' +
  ' 注意：本工具是「任务内澄清」，与权限门禁的 ask（是否允许工具执行）语义不同。' +
  ' 参数进 args 对象：{"args":{"kind":"choice","prompt":"继续吗？","options":"是,否"}}。';

const ASK_USER_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'choice/confirm/text（缺省 text）。' },
        prompt: { type: 'string', description: '问题文本（必填）。' },
        options: { type: 'string', description: 'choice 候选（逗号分隔）。' },
      },
    },
  },
} as const;

export function askUserHelp(): string {
  return [
    'ask-user —— 任务内澄清提问（向用户提问并等待回答）',
    '用法：ask-user --prompt <问题> [--kind choice|confirm|text] [--options 选项,逗号分隔]',
    '',
    '示例：ask-user --kind confirm --prompt "是否继续执行写入？"',
    '说明：与 PRM 权限 ask（FR-007：是否允许工具执行的框架级裁决）语义不同——' +
      '本工具是 AI 主动向用户澄清任务内容，回答进入上下文；UI 呈现由场景应答器提供。',
  ].join('\n');
}

/** 创建 ask-user 工具条目（应答器经 env.askUser 注入）。 */
export function createAskUserToolEntry(env: { askUser?: AskResponder }): ToolEntry {
  return {
    name: 'ask-user',
    summary: '任务内澄清提问（向用户提问并回填回答；区别于权限 ask）',
    schema: { name: 'ask-user', description: ASK_USER_DESC, parameters: ASK_USER_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'ui',
    executor: async (tc) =>
      executeAskUser(env.askUser, {
        kind: tc.args.kind,
        prompt: tc.args.prompt,
        options: tc.args.options?.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    help: askUserHelp,
  };
}
