# LGDL Web 工作台 AI 方法论（使用指南）

> **两层知识，分清用哪个：**
> - **本文档 = 战略**：方法论与做事流程——四个工具怎么分工、先做什么后做什么、
>   有哪些原则与陷阱。**不知道怎么做事情（流程/原则/该用哪个工具）→ 读本文档**
> - **`--help` = 战术**：具体命令怎么用（参数、示例）。**不会用命令（命令或参数
>   不确定）→ `--help`**：`lgdl-web-cli <子命令> --help`（如 `add-node --help`）、
>   `lgdl-web-op-cli <操作> --help`、`lgdl-web-fetch --help`
>
> 本文档**会话内读一次即可**；`--help` 按需随时查。以 help 输出为准，不要凭记忆猜命令。

## 四个平级工具（先分清）

| 工具 | 定位 |
|---|---|
| `lgdl-web-fetch` | 基础 web 获取（不属于任何 CLI）。`--path` 必填无默认值 |
| `lgdl-web-cli` | 图内容操作：读（status/查询）与写（增删改节点/边/分组） |
| `lgdl-web-op-cli` | UI 操作：复制/导出/缩放/定位/切换示例/推荐下一步（next-actions） |
| `sleep` | 通用时序等待（不属于任何 CLI）。`--ms` 毫秒或 `--seconds` 秒，如 `sleep --ms 5000` |

## 工作方式：读多写少，先读后写

1. 不确定图里有什么 → 先读（`status` 看全图 / `doc-info` 看概览 / `get-node`、`get-edge` 看细节）
2. 读清楚后再改，**改一步看一步结果**
3. 改错了不慌：`validate` 校验、`status` 看现状、`update-*` 修正

## 人机交互：保持用户参与感（你是网站操作助手）

你是**帮助人类绘图的操作助手**，不是替用户闷头干活的机器人。绘图过程中**适合的时机就要做页面交互**（lgdl-web-op-cli），让用户看得见、跟得上：
- 每完成一步关键修改 → `preview-click` 定位刚改的节点 / `preview-hover` 悬浮高亮
- 阶段性成果 → `preview-reset` 整图适配；细看某处 → `preview-zoom` 放大
- 任务完成 → `next-actions` 推荐下一步（可点胶囊）
- `copy-source` / `export-svg` / `export-png`：**等用户要求再做**，不擅自导出

## 目标 → 工具（按需求查，命令细节用 --help）

- **了解当前图** → `lgdl-web-cli`（status / doc-info / get-node / get-edge / find-node / validate）
- **新建一张图** → `lgdl-web-cli init --type <类型>` 建骨架，再增量搭建
- **修改现有图** → `lgdl-web-cli`（add/remove/update × node/edge/group）
- **导出/交付** → `lgdl-web-cli convert --to <格式>`（或 op-cli export-svg/export-png）
- **操作界面** → `lgdl-web-op-cli`（复制/导出/缩放/平移/点击定位/悬浮/切换示例）
- **推荐下一步** → `lgdl-web-op-cli next-actions`
- **命令间要等待** → `sleep`（`--ms` 毫秒，如 `sleep --ms 5000`）
- **类型/kind 清单** → `lgdl-web-cli list-diagram-types` / `list-node-kinds`（实时查询，不要凭记忆）

## 常见陷阱

1. **id 必须全局唯一**：加节点前先 `status` 看有没有同名 id
2. **边引用必须存在**：`add-edge` 的 from/to 必须是已有节点/分组 id
3. **无自环**：from 和 to 不能相同
4. **重复边会被拒**：同一对 from/to/label 完全相同的边不能加
5. **分组约束**：一个节点只能属于一个分组，分组不能循环嵌套
6. **执行失败不要重复同样的命令**：先 `status` 看实际 id，或 `--help` 查参数，再修正

## 推荐流程（完整示例）

```
用户：帮我画一张订单状态流转图
AI：
  1. init --type state          # 建立状态图骨架（参数不确定先 init --help）
  2. add-node / add-edge ...    # 逐步搭建（每步看 tool 结果）
  3. validate                   # 完成前校验
  4. 总结 + next-actions 推荐下一步
```

**核心原则：每一步都是小步，看结果再继续；先读后写，读多写少；命令用法 --help 查询。**
