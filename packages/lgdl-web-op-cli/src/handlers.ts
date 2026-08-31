/**
 * op 执行 handler 注入面（F-13 ② 新包核心设计，ADR-006）。
 *
 * 包定义协议/分发，web 注入执行回调：16 个 UI 操作分支
 * （App.tsx handleWebOp）由 web 侧注册，本包不包含任何 UI 实现
 * （FR-016/NFR-004）。未注册子命令返回与迁移前 App.tsx 一致的错误文案。
 */

/** op 执行结果：结果文本（供 AI 反馈）或错误文本。 */
export interface OpExecResult {
  ok: boolean;
  output: string;
}

/** 单个 UI 操作执行回调（web 注入）：输入子命令参数，返回结果文本。 */
export type OpHandler = (args: Record<string, string>) => OpExecResult;

/** 子命令 → handler 注册表（分发核心，ADR-006）。 */
export class OpHandlerRegistry {
  private handlers = new Map<string, OpHandler>();

  /** 注册执行回调（web 侧在 App 层注入 16 个分支实现）。 */
  register(subcommand: string, handler: OpHandler): void {
    this.handlers.set(subcommand, handler);
  }

  /** 校验子命令是否已注册（next-actions 由 AiPanel 拦截时用于判别）。 */
  has(subcommand: string): boolean {
    return this.handlers.has(subcommand);
  }

  /** 分发执行：未注册子命令 → { ok:false, output:'✖ 未知操作 "x"' }（与迁移前 App.tsx 文案一致）。 */
  execute(subcommand: string, args: Record<string, string>): OpExecResult {
    const handler = this.handlers.get(subcommand);
    if (!handler) return { ok: false, output: `✖ 未知操作 "${subcommand}"` };
    return handler(args);
  }
}

export function createOpHandlerRegistry(): OpHandlerRegistry {
  return new OpHandlerRegistry();
}
