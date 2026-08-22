# LGDL 核心设计原则

## 1. 语义与呈现解耦（Semantic-Presentation Decoupling）

**LGDL 文件只包含语义，绝不包含布局信息。**

- ✅ 节点 id、label、kind（类型）
- ✅ 边 from、to、label
- ✅ 分组 groups（层级/分区）
- ❌ 坐标、宽高、颜色、形状（形状由 kind 映射，主题可换）

**理由**：AI 擅长理解语义、生成逻辑；不擅长（也不应该）计算视觉布局。布局是确定性算法问题，交给引擎。这样：
- 同样的 `.lgdl` 永远渲染出同样的图（确定性、可测试）
- AI 修改内容不会破坏布局
- 换主题/换样式不碰逻辑

## 2. 增量编辑协议（Incremental Edit Protocol）

AI 的每次修改必须是**增量操作**，而不是整图重写：

```
add-node      — 加节点（自动接入孤立检测）
remove-node   — 删节点（自动清理关联边）
update-node   — 改节点内容/类型
add-edge      — 加边
remove-edge   — 删边
```

**确定性重排**：每次渲染都是全量确定性布局（不缓存、不手工调坐标）——语义不变则输出不变，AI 可预测、可测试。增量命令只改语义（节点/边/分组），布局永远由引擎计算。

## 3. 确定性布局（Deterministic Layout）

- 默认布局算法：dagre（层级图）/ 径向树（思维导图）
- 同样的输入 → 同样的输出，AI 可预测、可测试
- 布局结果可以缓存，增量修改时复用

## 4. AI 友好（AI-Friendly）

- `lgdl status` 输出**纯文本图结构**，AI 一读就懂
- 所有 CLI 命令参数化、可脚本化
- Web 工作台可接入 AI 助手（v0.5 规划）

## 5. 图类型（Diagram Types）

| type | 说明 | 布局 |
|---|---|---|
| `flowchart` | 业务流程图 | 层级布局 |
| `mindmap` | 思维导图 | 径向树布局 |
| `uml-class` | UML 类图 | 层级 + 类卡片 |
| `arch` | 架构图 | 层级 + 分组 |
| `datastream` | 数据流图 | 泳道 |
| `sequence` | 时序图 | 时间轴布局 |
| `er` | ER 图 | 层级（LR） |
| `state` | 状态机图 | 层级（TB） |
| `gantt` | 甘特图 | 时间轴（条） |

## 6. Node Kinds（节点类型）

`kind` 决定节点的**语义角色**，形状由渲染器映射：

| kind | 语义 | 默认形状 |
|---|---|---|
| `start` / `end` | 开始/结束 | 胶囊 |
| `process` | 处理步骤 | 圆角矩形 |
| `decision` | 判断 | 菱形 |
| `entity` | 实体/数据 | 圆柱（er）/ 类卡片（uml-class） |
| `note` | 备注 | 便签（折角） |
| `state` | 状态 | 圆角矩形 |
| `milestone` | 里程碑 | 圆角矩形（gantt） |

### kind 差异显性化（v0.4）

**原则**：LGDL 的消费方是 **CLI 操作的 AI**，不是手写语法的开发者——语法不为"手写友好"妥协，为"显性、零猜测"设计。kind 之间的差异用**显性字段**表达，渲染器不做文本推断（不靠 `(` 猜方法、不解析 `+/-` 记号）。

差异按 4 层分派：

| 层 | 机制 | 示例 |
|---|---|---|
| 语义 | `kind` 枚举（8 种） | `entity` = 实体/类 |
| 专属字段 | 各 kind 可选的显性字段，**错用即 error** | `entity` 的 `members`（仅 uml-class / er） |
| 尺寸 | `NODE_SIZE` 表 + 内容自适应 | 类卡片高度 = 32 + 成员行数×18 + 16 |
| 渲染 | `SHAPES`/调色板 + 图类型覆盖 | entity → 圆柱（er）/ 三段类卡片（uml-class） |

专属字段现状：`entity` 有专属字段 `members`（属性/方法结构化对象，uml-class / er 可用）；边有专属字段 `cardinalityFrom` / `cardinalityTo`（ER/UML 多重性）。其它 kind 内容走 `label`，图专属数据走 `attrs`（gantt 的 `start/duration`）。**每个 kind 有哪些字段由文档表（lgdl-spec）定义，不存在隐式约定**。
