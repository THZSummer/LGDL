/**
 * next-actions：lgdl-web-op-cli 的推荐下一步子命令（F-13 ② 自 web/next-actions.ts 迁出）。
 *
 * AI 完成任务后，若还有合理的下一步动作，调用该命令把 2-4 个动作
 * （label + prompt）以胶囊卡片消息放入聊天框；用户点击胶囊即把 prompt
 * 作为用户指令发送，AI 继续执行——形成「AI 推荐 → 用户点选 → AI 执行」闭环。
 *
 * 文本/结构化参数：actions = JSON 数组字符串，如
 *   [{"label":"增加配色分组","prompt":"给当前图增加配色分组"},{"label":"补充节点","prompt":"补充 2 个业务节点"}]
 */

export interface NextAction {
  /** 胶囊显示文案（短，如「增加配色分组」） */
  label: string;
  /** 点击胶囊后作为用户指令发送给 AI 的完整 prompt */
  prompt: string;
}

/** 解析 next-actions 的 actions 参数；非法输入返回空数组（调用方报缺参错误）。 */
export function parseNextActions(raw: string): NextAction[] {
  if (!raw || !raw.trim()) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (a): a is NextAction =>
        !!a && typeof a === 'object' && typeof (a as NextAction).label === 'string' && typeof (a as NextAction).prompt === 'string',
    )
    .map((a) => ({ label: a.label, prompt: a.prompt }));
}
