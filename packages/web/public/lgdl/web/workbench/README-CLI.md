# LGDL Web 工作台 AI 使用指南（lgdl-web-cli Skill）

> 你是 AI 助手，通过 **lgdl-web-cli 工具调用**操作 Web 工作台里的图。
> 本指南教你**怎么用**——不是命令大全，而是"遇到需求怎么找到并用对命令"。

## 三个平级工具（先分清）

| 工具 | 用途 |
|---|---|
| `lgdl-web-fetch` | **基础 web 获取**，不属于任何 CLI：`{ path }`，获取文档/网页原文。**path 必填、无默认值**，读本指南必须显式传：`{"path": "lgdl/web/workbench/README-CLI.md"}` |
| `lgdl-web-cli` | 图内容操作：`{ subcommand, args }`，增删改查当前文档的图 |
| `lgdl-web-op-cli` | UI 操作：`{ subcommand, args }`，复制/导出/缩放/定位等界面动作 |

## 工作方式：读多写少

实际业务读多写少。**先了解图，再修改图**：

1. 不确定图里有什么 → 先读
2. 读清楚后再改，改一步看一步结果
3. 改错了不用慌——`validate` 校验、`status` 看现状、`update-*` 修正

## 目标 → 命令（按需求查）

**想了解当前图**（优先做这个）：
- 看全图结构 → `status`
- 看概览（类型/规模/节点 kind 分布）→ `doc-info`
- 看某个节点细节（成员/attrs/分组）→ `get-node --id <id>`
- 看某条边 → `get-edge --from <id> --to <id> [--label <标签>]`
- 搜索节点 → `find-node --label <关键词>`
- 校验语法 → `validate`

**想新建一张图**：
1. `init --type <类型>` 建立对应类型的骨架（类型见下文）
2. 再逐条 `add-node` / `add-edge` 搭建

**想修改现有图**：
- 加节点 → `add-node --id <id> --label <名> [--kind <类型>] [--group <分组>] [--attrs k=v]`
- 删节点（自动清理关联边）→ `remove-node --id <id>`
- 改节点 → `update-node --id <id> [--new-id <新id>] [--label <名>] [--kind <类型>] [--attrs k=v]`
- 加边 → `add-edge --from <id> --to <id> [--label <关系名>] [--cardinality-from <基数>] [--cardinality-to <基数>]`
- 删边 → `remove-edge --from <id> --to <id> [--edge-label <标签>]`
- 改边 → `update-edge --from <id> --to <id> [--edge-label <旧标签>] [--label <新标签>] [--new-from <id>] [--new-to <id>] [--cardinality-* <v>] [--attrs k=v]`
- 分组：`add-group --id <id> [--label <名>] [--contains id1,id2]` / `remove-group --id <id>` / `update-group --id <id> [--label <名>] [--member-add <id>] [--member-remove <id>]`

**想导出/交付**：
- 导出其他格式 → `convert --to mermaid|plantuml|json`

**想操作界面**（不是图内容，是 UI）→ 用 `lgdl-web-op-cli`：
- 复制源码 / 收缩-展开编辑器 / 导出 SVG/PNG / 缩放-平移-重置预览 / 点击-悬浮元素定位 / 切换示例
- **任务完成后推荐下一步**：`next-actions`（actions = `[{"label":"短文案","prompt":"完整指令"}]`），
  以可点击胶囊卡片展示在聊天框，用户点选后把 prompt 发给你继续执行

## 图类型与节点 kind（查 type / kind 用）

- 图类型（9 种）：`flowchart` 流程图 / `mindmap` 思维导图 / `uml-class` 类图 / `arch` 架构图 / `datastream` 数据流图 / `sequence` 时序图 / `er` 实体关系图 / `state` 状态图 / `gantt` 甘特图
- 节点 kind（8 种）：`start` 开始 / `end` 结束 / `process` 处理 / `decision` 判断 / `entity` 实体 / `note` 便签 / `state` 状态 / `milestone` 里程碑
- 需要确认最新清单 → `list-diagram-types` / `list-node-kinds`（实时查询，不要凭记忆）

## 常见陷阱

1. **id 必须全局唯一**：加节点前先 `status` 看有没有同名 id
2. **边引用必须存在**：`add-edge` 的 from/to 必须是已有节点/分组 id
3. **无自环**：from 和 to 不能相同
4. **重复边会被拒**：同一对 from/to/label 完全相同的边不能加
5. **分组约束**：一个节点只能属于一个分组，分组不能循环嵌套
6. **执行失败不要重复同样的命令**：先 `status` 看实际 id，再修正

## 推荐流程（完整示例）

```
用户：帮我画一张订单状态流转图
AI：
  1. init --type state          # 建立状态图骨架
  2. add-node / add-edge ...    # 逐步搭建（每步看 tool 结果）
  3. validate                   # 完成前校验
  4. 输出总结
```

**核心原则：每一步都是小步，看结果再继续；先读后写，读多写少。**
