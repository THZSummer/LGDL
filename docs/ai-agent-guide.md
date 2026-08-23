# LGDL AI Agent 使用指南

> 教 AI Agent（Claude Code、DeepSeek、Copilot 等）如何用 LGDL 命令帮用户画图。
> 本指南面向 AI，命令示例全部实测可用。
>
> **Web 工作台 AI 助手**（v0.5）也使用同一套命令协议：AI 在浏览器里输出
> ```` ```bash ```` 命令块（`lgdl status` / `lgdl add-node --id x --label y` …），
> 工作台解析执行——与终端 `lgdl` CLI 完全同语义。下方命令在两端通用。

---

## 1. 什么时候用 LGDL

**LGDL 适合画「表达结构关系」的图**：流程图、架构图、思维导图、时序图、类图、ER 图、状态机、甘特图、数据流图。

**不适合**：数据图表（饼图/柱状图）、照片、插画类图形。

**判断方法**：用户想要「展示节点和它们之间的关系」→ 用 LGDL；想要「展示数值」→ 换其他工具。

**9 种图类型速查：**

| 类型 | 用途 | 典型场景 |
|---|---|---|
| `flowchart` | 业务流程 | 登录流程、订单流程、审批流 |
| `mindmap` | 思维导图 | 技术选型、知识梳理、头脑风暴 |
| `sequence` | 时序图 | 系统交互、接口调用顺序 |
| `uml-class` | 类图 | 面向对象设计、数据模型 |
| `arch` | 架构图 | 系统架构、部署架构、分层 |
| `datastream` | 数据流图 | 数据流转、泳道流程 |
| `er` | ER 图 | 数据库设计、实体关系 |
| `state` | 状态机 | 订单状态、流程状态流转 |
| `gantt` | 甘特图 | 项目计划、任务排期 |

---

## 2. 三步工作流（核心范式）

**永远按这三步操作，不要跳过：**

```
第 1 步：读图   lgdl status <file>   → 理解当前图的结构
第 2 步：改图   增量命令（add-*/remove-*/update-*）→ 精确修改
第 3 步：出图   lgdl render <file>   → 渲染成 SVG 交付
```

### 第 1 步：读图（先理解，再动手）

```bash
lgdl status --file my-diagram.lgdl
```

输出是纯文本结构，AI 可直接解析：

```
# 用户登录流程 [flowchart]

## nodes
  start (用户访问) :start
  login (输入账号密码)
  verify (验证凭据) :decision

## edges
  start -> login [打开页面]
  login -> verify
```

**如果文件不存在**，用 `lgdl init` 创建：

```bash
lgdl init --file my-diagram.lgdl
# ✓ initialized my-diagram.lgdl
```

### 第 2 步：改图（用增量命令，绝不手写整个文件）

```bash
# 加节点
lgdl add-node --file my-diagram.lgdl --id login --label "输入账号密码" --kind process
# ✓ added node "login" (输入账号密码) :process

# 加边（带标签）
lgdl add-edge --file my-diagram.lgdl --from start --to login --label "打开页面"
# ✓ added edge start -> login [打开页面]

# 改节点
lgdl update-node --file my-diagram.lgdl --id login --label "输入新密码" --kind decision

# 删节点（自动清理关联边）
lgdl remove-node --file my-diagram.lgdl --id login

# 加分组建分组
lgdl add-group --file my-diagram.lgdl --id frontend --label "前端层" --contains start,login
```

**`kind` 只能使用以下 8 个值**（用别的会报错）：
`start` `end` `process` `decision` `entity` `note` `state` `milestone`

**扩展属性（图专属字段）**用 `--attrs`：
```bash
# 甘特图任务：起始日 + 工期
lgdl add-node --file plan.lgdl --id dev --label "开发" --attrs start=6 --attrs duration=8
```

**ER / UML 类图的显性字段**（不要塞进 `--attrs`，旧写法会被拒绝）：

```bash
# 实体属性（uml-class / er 的 kind: entity）
lgdl add-node --file db.lgdl --id user --label "用户" --kind entity \
  --member kind=attribute,name=id,type=int \
  --member kind=attribute,name=name,type=string

# 关联多重性：label 只放关系名，两端基数用 --cardinality-from / --cardinality-to
lgdl add-edge --file db.lgdl --from user --to order --label "拥有" \
  --cardinality-from 1 --cardinality-to "*"
```

### 第 3 步：出图（渲染交付）

```bash
lgdl render --file my-diagram.lgdl -o my-diagram.svg
# ✓ rendered my-diagram.lgdl -> my-diagram.svg (240x384, 3 nodes, 2 edges)
```

渲染失败时（有错误），先修错再渲染。

---

## 3. 命令速查表

| 命令 | 作用 | 关键参数 |
|---|---|---|
| `lgdl init <file>` | 创建空图 | — |
| `lgdl status <file>` | 输出文本结构（AI 读图） | — |
| `lgdl render <file>` | 渲染 SVG | `-o 输出文件` |
| `lgdl add-node <file>` | 加节点 | `--id` `--label` `--kind` `--group` `--member` `--attrs` |
| `lgdl remove-node <file>` | 删节点（自动清边） | `--id` |
| `lgdl update-node <file>` | 改节点 | `--id` `--label` `--kind` `--member-add` `--member-remove` `--attrs` |
| `lgdl add-edge <file>` | 加边 | `--from` `--to` `--label` `--cardinality-from` `--cardinality-to` `--attrs` |
| `lgdl update-edge <file>` | 改边 | `--from` `--to` `--label` `--cardinality-from` `--cardinality-to` `--attrs` |
| `lgdl remove-edge <file>` | 删边 | `--from` `--to` |
| `lgdl add-group <file>` | 加分组 | `--id` `--label` `--contains` |
| `lgdl remove-group <file>` | 删分组 | `--id` |

---

## 4. 最佳实践（AI 容易犯的错）

1. **不要手写整个 .lgdl 文件**——语法容易错。用 `lgdl init` + 增量命令逐步构建。
2. **`kind` 只有 8 个合法值**——不确定就先 `lgdl status` 或查上表，别编造（如 `process3`）。
3. **`id` 是标识符**——可以用数字（如 `1111`）但会被当字符串处理；别用空格和特殊符号。
4. **删节点会连带删边**——`remove-node` 后确认关联边是否需要重建。
5. **渲染前先确认没有 error**——`lgdl status` 或 `render` 会列出错误，先修再交付。
6. **边不能自环**（from === to），重复边会报错。
7. **大图（>120 节点）自动用网格布局**——不用管，引擎处理。
8. **`contains` 列表用 `,` 分隔**，可以带空格：`contains: [a, b]`。
9. **ER / 类图**：实体属性用 `--member`（`kind=attribute` / `kind=method`），关联多重性用 `--cardinality-from` / `--cardinality-to`——**不要**用 `--attrs cardinality` 或把基数拼进 `label`（0.4.0 起都被校验拒绝）。

---

## 5. 完整示例（从 0 到交付）

**任务**：画一个「用户登录流程」流程图。

```bash
# 1. 创建图
lgdl init --file login-flow.lgdl

# 2. 加节点（start 已存在，补其他节点）
lgdl add-node --file login-flow.lgdl --id login --label "输入账号密码" --kind process
lgdl add-node --file login-flow.lgdl --id verify --label "验证凭据" --kind decision
lgdl add-node --file login-flow.lgdl --id ok --label "登录成功" --kind end
lgdl add-node --file login-flow.lgdl --id fail --label "登录失败" --kind end

# 3. 加边
lgdl add-edge --file login-flow.lgdl --from start --to login --label "打开页面"
lgdl add-edge --file login-flow.lgdl --from login --to verify --label "提交"
lgdl add-edge --file login-flow.lgdl --from verify --to ok --label "通过"
lgdl add-edge --file login-flow.lgdl --from verify --to fail --label "失败"

# 4. 加分组建前端层
lgdl add-group --file login-flow.lgdl --id frontend --label "前端层" --contains start,login

# 5. 读图确认
lgdl status --file login-flow.lgdl

# 6. 渲染交付
lgdl render --file login-flow.lgdl -o login-flow.svg
```

---

## 6. 常见问题

**Q: 渲染报错怎么办？**
A: 错误信息会指出位置（如 `edges[2].from`）和原因（如 `unknown source node: "ghost"`）。用 `lgdl remove-edge` 或 `lgdl add-node` 修正后重渲染。

**Q: 用户要改图但没给文件？**
A: 先 `lgdl status` 看现有文件；没有就 `lgdl init` 新建。永远基于「当前状态」做增量修改。

**Q: 图的类型选错了？**
A: `type` 是文件头部的字段，改它需要编辑文件。最稳妥：确认内容结构后，用增量命令重建到正确的类型文件里（或用编辑器改 type 行）。
