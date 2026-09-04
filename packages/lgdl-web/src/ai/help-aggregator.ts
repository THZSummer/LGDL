/**
 * lgdl-web 场景的工具聚合器：base 基础工具（web-fetch/sleep，由
 * createHelpAggregator 预注册）+ 场景方注册的业务工具（lgdl-web-cli /
 * lgdl-web-op-cli）。prompts 不再写死工具枚举，AI 经 web-cli-help 动态发现。
 */
import { createHelpAggregator, type HelpAggregator } from '@lgdl/web-cli-base';
import { webCliHelp } from '@lgdl/lgdl-web-cli';
import { webOpHelp } from '@lgdl/lgdl-web-op-cli';

/** 创建 lgdl-web 场景的工具聚合器：base 基础工具 + 业务工具。 */
export function createWebCliHelpAggregator(): HelpAggregator {
  const agg = createHelpAggregator(); // 已含 web-fetch/sleep
  agg.register({ name: 'lgdl-web-cli', summary: '图内容操作（读 status/查询，写 增删改节点边分组）', render: () => webCliHelp() });
  agg.register({ name: 'lgdl-web-op-cli', summary: 'UI 操作（复制/导出/缩放/定位/全屏/推荐下一步）', render: () => webOpHelp() });
  return agg;
}
